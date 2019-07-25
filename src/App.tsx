import React from 'react';

import { assemble, disassemble } from 'c64jasm';

import { Diag } from './types';
import * as asmBuiltins from './asmBuiltins';
import { findCharOffset }  from './editing';

import Editor from './Editor';
import Disasm from './Disasm';
import DiagnosticsList from './DiagnosticsList';
import Help from './Help';

import styles from './App.module.css';

export function debounce<F extends (...params: any[]) => void>(fn: F, delay: number) {
  let timeoutID: number|undefined = undefined;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutID);
    timeoutID = window.setTimeout(() => fn.apply(this, args), delay);
  } as F;
}

const config = { useWebWorkers: true };

function Emoji(props: {emoji: string}) {
  return <span aria-label='emoji' role='img'>{props.emoji}</span>
}

interface AppState {
  sourceCode: string;
  disassembly: string[];
  prg: Buffer;
  diagnosticsIndex: number | undefined;
  diagnostics: Diag[];
  helpVisible: boolean;
};

class App extends React.Component<{}, AppState> {

  assemblerWorker: Worker | undefined = undefined;

  state = {
    sourceCode: '',
    disassembly: [],
    prg: Buffer.from([]),
    diagnosticsIndex: 0,
    diagnostics: [],
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
          return { diagnosticsIndex: 0 };
        }
        if (prevState.diagnosticsIndex === undefined) {
          return { diagnosticsIndex: 0 };
        }
        if (e.shiftKey) {
          return {
            diagnosticsIndex: Math.max(0, prevState.diagnosticsIndex - 1)
          }
        } else {
          return {
            diagnosticsIndex: Math.min(prevState.diagnostics.length - 1, prevState.diagnosticsIndex + 1)
          }
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

  handleOnClickDiagnostic = (idx: number) => {
    this.setState({
      diagnosticsIndex: idx
    })
  }

  debouncedCompile = debounce((asmArgs: any) => {
    if (config.useWebWorkers && this.assemblerWorker) {
      this.assemblerWorker.postMessage(asmArgs);
    }
  }, 250);

  handleSetSource = (text: string) => {
    const sourceFileMap: {[ndx: string]: string} = {
      "main.asm": text,
      "c64.asm": asmBuiltins.c64
    };

    if (config.useWebWorkers && this.assemblerWorker) {
      this.debouncedCompile({ sourceFileMap });
      this.setState({
        sourceCode: text,
        diagnosticsIndex: undefined
      })
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
          sourceCode: text,
          prg: res.prg,
          disassembly: disassemble(res.prg, disasmOptions),
          diagnostics: [],
          diagnosticsIndex: undefined
        });
      } else {
        this.setState({
          sourceCode: text,
          diagnostics: res.errors,
          diagnosticsIndex: undefined
        })
      }
    }
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

  render () {
    const diags: Diag[] = this.state.diagnostics;
    let editorErrorLoc = undefined;
    if (diags.length !== 0 && this.state.diagnosticsIndex !== undefined) {
      const d = diags[this.state.diagnosticsIndex];
      editorErrorLoc = findCharOffset(this.state.sourceCode, d.loc);
    }
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
          <Editor
            onSourceChanged={this.handleSetSource}
            diagnostics={this.state.diagnostics}
            errorCharOffset={editorErrorLoc}
          />
        </div>
        <div id="siteDisasm">
          <Disasm disassembly={this.state.disassembly} prg={this.state.prg} />
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
