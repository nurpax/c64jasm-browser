import React, { Fragment } from 'react';

import { SourceLoc, assembleWithOptions, disassemble } from 'c64jasm';

import { Diag } from './types'
import Editor from './Editor';
import Disasm from './Disasm';
import DiagnosticsList from './DiagnosticsList';

import styles from './App.module.css';

interface AppState {
  sourceCode: string;
  disassembly: string[];
  diagnostics: Diag[];
};

class App extends React.Component<{}, AppState> {
  state = {
    sourceCode: '',
    disassembly: [],
    diagnostics: []
  }

  handleSetSource = (text: string) => {
      const options = {
        readFileSync: (fname: string) => text
      }
      const res = assembleWithOptions("foo.asm", options);
      if (res.errors.length === 0) {
        this.setState({
          disassembly: disassemble(res.prg),
          diagnostics: []
        });
      } else {
        this.setState({
          diagnostics: res.errors
        })
      }
    }

  render () {
    const diags = this.state.diagnostics;
    return (
      <Fragment>
        <header id="pageHeader">Header</header>
        <div id="mainCode">
          <Editor onSourceChanged={this.handleSetSource} diagnostics={this.state.diagnostics} />
        </div>
        <div id="siteDisasm">
          <Disasm disassembly={this.state.disassembly} />
        </div>
        <div id="mainDiag">
          <DiagnosticsList diagnostics={diags} />
        </div>
        <footer id="pageFooter">Footer</footer>
      </Fragment>
    );
  }
}

export default App;
