import React from 'react';

import { assemble, disassemble } from 'c64jasm';

import { Diag, SourceFile } from './types';
import * as asmBuiltins from './asmBuiltins';
import { findCharOffset }  from './editing';

import Editor from './Editor';
import Disasm from './Disasm';
import DiagnosticsList from './DiagnosticsList';
import SourceTabs from './SourceTabs';
import Help from './Help';

import styles from './App.module.css';

const config = { useWebWorkers: true };

function setQueryStringParameter(name: string, value: string) {
  const params = new URLSearchParams(window.location.search);
  params.set(name, value);
  window.history.replaceState({}, "", decodeURIComponent(`${window.location.pathname}?${params}`));
}

export function debounce<F extends (...params: any[]) => void>(fn: F, delay: number) {
  let timeoutID: number|undefined = undefined;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutID);
    timeoutID = window.setTimeout(() => fn.apply(this, args), delay);
  } as F;
}


function Emoji(props: {emoji: string}) {
  return <span aria-label='emoji' role='img'>{props.emoji}</span>
}

interface SourceFiles {
  selected: number;
  files: SourceFile[];
};

interface AppState {
  gist: {
    id: string;
    loadCount: number;
    loading: boolean;
  };
  sourceFiles: SourceFiles;
  disassembly: string[];
  prg: Buffer;
  diagnosticsIndex: number | undefined;
  diagnostics: Diag[];
  helpVisible: boolean;
};

class SourceFileMapCache {
  private cache: { [name: string]: Buffer } = {};

  update(newFiles: SourceFile[]) {
    let changed = false;
    for (let source of newFiles) {
      if (this.cache[source.name] !== source.text) {
        this.cache[source.name] = source.text;
        changed = true;
      }
      this.cache[source.name] = source.text;
    }
    return changed;
  }

  getSourceMap() {
    return this.cache;
  }
}

class App extends React.Component<{}, AppState> {

  private sourceFileMapCache = new SourceFileMapCache();
  private assemblerWorker: Worker | undefined = undefined;

  state = {
    gist: {
      id: '',
      loadCount: 0,
      loading: false
    },
    sourceFiles: {
      selected: 0,
      files: [
        { name: 'main.asm', text: Buffer.from(''), cursorOffset: 0 },
        { name: 'c64.asm', text: Buffer.from(asmBuiltins.c64), cursorOffset: 0 },
        { name: 'plugin.js', text: Buffer.from(asmBuiltins.plugin), cursorOffset: 0 }
      ]
    },
    disassembly: [],
    prg: Buffer.from([]),
    diagnosticsIndex: 0,
    diagnostics: [] as Diag[],
    helpVisible: false
  }

  componentDidMount () {
    document.addEventListener('keydown', this.handleKeyDown);

    this.assemblerWorker = new Worker('worker.js');
    if (this.assemblerWorker !== null) {
      this.assemblerWorker.addEventListener('message', (msg: MessageEvent) => {
        this.handleWorkerMessage(msg);
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const gistId = urlParams.get('gist_id');
    if (gistId !== null) {
      this.loadGist(gistId);
    }
  }

  setGistLoadingStatus = (loading: boolean) => {
    this.setState(prevState => {
      return {
        gist: {
          ...prevState.gist,
          loading
        }
      }
    });
  }

  loadGist = (gistId: string) => {
    this.setGistLoadingStatus(true);
    fetch(`https://api.github.com/gists/${gistId}`, { headers: { 'Accept': 'application/vnd.github.v3.base64'} })
      .then(resp => {
        if (resp.status !== 200) {
          throw new Error(`Gist load failed with HTTP status code ${resp.status}: ${resp.statusText}`);
        }
        return resp;
      })
      .then(resp => resp.json())
      .then(json => {
        this.setGistLoadingStatus(false);

        // Stick gist_id into the current browser URL
        setQueryStringParameter('gist_id', gistId);

        this.setState(prevState => {
          const files: SourceFile[] = [];
          let selected = 0;
          for (const file of Object.values(json.files) as any) {
            files.push({
              name: file.filename,
              text: Buffer.from(file.content, 'base64'),
              cursorOffset: 0
            })
            if (file.filename === 'main.asm') {
              selected = files.length-1;
            }
          }
          files.push({ name: 'c64.asm', text: Buffer.from(asmBuiltins.c64), cursorOffset: 0 });
          return {
            gist: {
              ...prevState.gist,
              gistId,
              loadCount: prevState.gist.loadCount+1
            },
            sourceFiles: {
              files,
              selected
            }
          }
        }, () => this.recompile());
      })
      .catch(err => {
        console.log(err);
        // TODO show error in GUI.  The below code just
        // recovers enough to make the UI usable
        this.setState(prevState => {
          return {
            gist: {
              ...prevState.gist,
              loading: false
            }
          }
        });
      });
  }

  getCurrentSource = () => {
    return this.state.sourceFiles.files[this.state.sourceFiles.selected];
  }

  updateCurrentSource = (sourceFiles: SourceFiles, text: Buffer, cursorOffset: number) => {
    return {
      ...sourceFiles,
      files: sourceFiles.files.map((e, idx) => {
        if (idx === sourceFiles.selected) {
          return {
            ...e,
            text,
            cursorOffset
          }
        }
        return e;
      })
    }
  }

  handleWorkerMessage = (e: any) => {
    if (e.data.diagnostics.length === 0) {
      this.setState({
        prg: e.data.prg,
        disassembly: e.data.disassembly,
        diagnostics: e.data.diagnostics,
      });
    } else {
      this.setState({
        diagnostics: e.data.diagnostics,
      });
    }
  };

  handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'F4') {
      this.setState((prevState) => {
        if (prevState.diagnostics.length === 0) {
          return this.updateDiagnosticsIndexState(prevState, 0);
        }
        if (prevState.diagnosticsIndex === undefined) {
          return this.updateDiagnosticsIndexState(prevState, 0);
        }
        if (e.shiftKey) {
          const newIdx = Math.max(0, prevState.diagnosticsIndex - 1);
          return this.updateDiagnosticsIndexState(prevState, newIdx);
        } else {
          const newIdx = Math.min(prevState.diagnostics.length - 1, prevState.diagnosticsIndex + 1);
          return this.updateDiagnosticsIndexState(prevState, newIdx);
        }
      })
      e.preventDefault();
    }
    if (e.key === 'Escape') {
      // Clear focus from diagnostics list and
      // exit help if it happens to be visible.
      this.setState({
        diagnosticsIndex: undefined,
        helpVisible: false
      });
      e.preventDefault();
    }
  }

  findSourceForDiagnostic = (diag: Diag) => {
    let newTabIdx = this.state.sourceFiles.selected;
    const files = this.state.sourceFiles.files;
    for (let i = 0; i < files.length; i++) {
      const source = files[i];
      if (source.name === diag.loc.source) {
        newTabIdx = i;
      }
    }
    return newTabIdx;
  }

  updateDiagnosticsIndexState = (prevState: AppState, idx: number) => {
    const diag: Diag = this.state.diagnostics[idx];
    const newTabIdx = this.findSourceForDiagnostic(diag);
    if (prevState.sourceFiles.selected !== newTabIdx) {
      return {
        diagnosticsIndex: idx,
        sourceFiles: {
          ...prevState.sourceFiles,
          selected: newTabIdx
        }
      }
    } else {
      return {
        diagnosticsIndex: idx,
        sourceFiles: prevState.sourceFiles
      }
    }
  }

  handleOnClickDiagnostic = (idx: number) => {
    this.setState(prevState => this.updateDiagnosticsIndexState(prevState, idx));
  }

  debouncedCompile = debounce((asmArgs: any) => {
    if (config.useWebWorkers && this.assemblerWorker) {
      this.assemblerWorker.postMessage(asmArgs);
    }
  }, 250);

  recompile = () => {
    const changed = this.sourceFileMapCache.update(this.state.sourceFiles.files);
    // Don't recompile if none of the source files changed since the previous
    // compile.
    if (!changed) {
      return;
    }
    const sourceFileMap = this.sourceFileMapCache.getSourceMap();
    // TODO shouldn't recompile if only cursorOffset changed
    if (config.useWebWorkers && this.assemblerWorker) {
      this.debouncedCompile({ sourceFileMap });
      this.setState({ diagnosticsIndex: undefined });
    } else {
      const options = {
        readFileSync: (fname: string) => {
          if (fname in sourceFileMap) {
            return sourceFileMap[fname];
          }
          throw new Error(`File not found ${fname}`);
        }
      }
      const res = assemble("main.asm", options);
      if (res.errors.length === 0) {
        const disasmOptions = {
          isInstruction: res.debugInfo.info().isInstruction
        };
        this.setState({
          prg: res.prg,
          disassembly: disassemble(res.prg, disasmOptions),
          diagnostics: [],
          diagnosticsIndex: undefined
        });
      } else {
        this.setState({
          diagnostics: res.errors,
          diagnosticsIndex: undefined
        });
      }
    }
  }

  handleSetSource = (text: string, cursorOffset: number) => {
    this.setState(prevState => {
      return {
        sourceFiles: this.updateCurrentSource(prevState.sourceFiles, Buffer.from(text), cursorOffset),
      }
    }, () => this.recompile());
  }

  // If typing in the editor, clear any diagnostics selection
  handleClearDiagnosticsSelectionOnKey = (e: React.KeyboardEvent) => {
    if (e.key === 'F4' || e.key === 'Shift') {
      return;
    }
    if (this.state.diagnosticsIndex !== undefined) {
      this.setState({ diagnosticsIndex: undefined });
    }
  }

  // If typing in the editor, clear any diagnostics selection
  handleClearDiagnosticsSelectionOnMouse = (e: React.MouseEvent) => {
    if (this.state.diagnosticsIndex !== undefined) {
      this.setState({ diagnosticsIndex: undefined });
    }
  }

  handleClickHelp = (e: React.MouseEvent) => {
    e.preventDefault();
    this.setState({ helpVisible: true });
  }

  handleCloseHelp = () => {
    this.setState({ helpVisible: false });
  }

  handleSourceTabSelected = (idx: number) => {
    this.setState(prevState => {
      return {
        sourceFiles: {
          ...prevState.sourceFiles,
          selected: idx
        }
      }
    });
  }
  render () {
    const diags: Diag[] = this.state.diagnostics;
    let editorErrorLoc = undefined;
    if (diags.length !== 0 && this.state.diagnosticsIndex !== undefined) {
      const d = diags[this.state.diagnosticsIndex];
      const tabIdx = this.findSourceForDiagnostic(d);
      const src = this.state.sourceFiles.files[tabIdx];
      editorErrorLoc = findCharOffset(src.text.toString(), d.loc);
    }
    // A list of diagnostics for the current file
    const currentTabDiagnostics = this.state.diagnostics.filter(diag => {
      return diag.loc.source === this.getCurrentSource().name;
    });

    return (
      <div id='root'>
        <nav id="mainNav">
          <div className={styles.navContainer}>
            <div className={styles.appTitle}><a href='https://nurpax.github.io/c64jasm/'>c64jasm</a> online</div>
            <p>A little experimental 6502 assembler for the C64</p>
            <p><Emoji emoji='👉' /> <a onClick={this.handleClickHelp} href='/' target='_blank'>help</a></p>
            <p><Emoji emoji='👉' /> <a href='https://github.com/nurpax/c64jasm-browser'>source code</a></p>
          </div>
        </nav>
        <div
          onKeyDown={this.handleClearDiagnosticsSelectionOnKey}
          onMouseDown={this.handleClearDiagnosticsSelectionOnMouse}
          onMouseUp={this.handleClearDiagnosticsSelectionOnMouse}
          id="mainCode"
        >
          <Editor // Note: key is reset for name and counter to force update editor on tab switches or gist loads
            key={`${this.state.gist.id}/${this.state.gist.loadCount}/${this.getCurrentSource().name}`}
            defaultValue={this.getCurrentSource().text.toString()}
            defaultCursorOffset={this.getCurrentSource().cursorOffset}
            onSourceChanged={this.handleSetSource}
            diagnostics={currentTabDiagnostics}
            errorCharOffset={editorErrorLoc}
          />
        </div>
        <div id="siteDisasm">
          <Disasm disassembly={this.state.disassembly} prg={this.state.prg} />
        </div>
        <div id="mainSourceTabs">
          <SourceTabs
            setSelected={this.handleSourceTabSelected}
            selected={this.state.sourceFiles.selected}
            files={this.state.sourceFiles.files}
            onLoadGist={this.loadGist}
            loadingGist={this.state.gist.loading}
          />
        </div>
        <div id="mainDiag">
          <DiagnosticsList
            onClickItem={this.handleOnClickDiagnostic}
            diagnostics={this.state.diagnostics}
            selectedIndex={this.state.diagnosticsIndex} />
        </div>
        <Help visible={this.state.helpVisible} onClose={this.handleCloseHelp} />
      </div>
    );
  }
}

export default App;
