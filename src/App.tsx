import React, { Fragment } from 'react';

import { SourceLoc, assembleWithOptions, disassemble } from 'c64jasm';

import { Diag } from './types'
import { findCharOffset }  from './editing'
import Editor from './Editor';
import Disasm from './Disasm';
import DiagnosticsList from './DiagnosticsList';

import styles from './App.module.css';

interface AppState {
  sourceCode: string;
  disassembly: string[];
  diagnosticsIndex: number | undefined;
  diagnostics: Diag[];
};

class App extends React.Component<{}, AppState> {
  state = {
    sourceCode: '',
    disassembly: [],
    diagnosticsIndex: 0,
    diagnostics: []
  }

  componentDidMount () {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (e: KeyboardEvent) => {
    if (e.key == 'F4') {
      this.setState((prevState) => {
        if (prevState.diagnostics.length == 0) {
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
    if (e.key == 'Escape') {
      this.setState({ diagnosticsIndex: undefined });
      e.preventDefault();
    }
  }

  handleOnClickDiagnostic = (idx: number) => {
    this.setState({
      diagnosticsIndex: idx
    })
  }

  handleSetSource = (text: string) => {
    const options = {
      readFileSync: (fname: string) => text
    }
    const res = assembleWithOptions("foo.asm", options);
    if (res.errors.length === 0) {
      this.setState({
        sourceCode: text,
        disassembly: disassemble(res.prg),
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

  render () {
    const diags: Diag[] = this.state.diagnostics;
    let editorErrorLoc = undefined;
    if (diags.length !== 0 && this.state.diagnosticsIndex !== undefined) {
      const d = diags[this.state.diagnosticsIndex];
      editorErrorLoc = findCharOffset(this.state.sourceCode, d.loc);
    }
    return (
      <Fragment>
        <header id="pageHeader">
          <div className={styles.appTitle}>Try C64jasm in a Browser!</div>
        </header>
        <div id="mainCode">
          <Editor
            onSourceChanged={this.handleSetSource}
            diagnostics={this.state.diagnostics}
            errorCharOffset={editorErrorLoc}
          />
        </div>
        <div id="siteDisasm">
          <Disasm disassembly={this.state.disassembly} />
        </div>
        <div id="mainDiag">
          <DiagnosticsList
            onClickItem={this.handleOnClickDiagnostic}
            diagnostics={this.state.diagnostics}
            selectedIndex={this.state.diagnosticsIndex} />
        </div>
        <footer id="pageFooter"></footer>
      </Fragment>
    );
  }
}

export default App;
