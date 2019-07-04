import React, { Fragment } from 'react';

import { SourceLoc, assembleWithOptions, disassemble } from 'c64jasm';

import Editor from './Editor';
import Disasm from './Disasm';

import styles from './App.module.css';

class Diagnostic extends React.Component<{ error: { loc: SourceLoc, msg: string } }> {
  render () {
    const { loc, msg }  = this.props.error;
    return (
      <div>
        main.asm:{loc.start.line}:{loc.start.column}: error: {msg}
      </div>
    )
  }
}

type Diag = { loc: SourceLoc, msg: string, formatted: string };

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
          <div className={styles.diagnostics}>
            {diags.map((d: Diag) => <Diagnostic key={JSON.stringify(d.loc)} error={d} />)}
          </div>
        </div>
        <footer id="pageFooter">Footer</footer>
      </Fragment>
    );
  }
}

export default App;
