import React, { Fragment } from 'react';

import { assembleWithOptions, disassemble } from 'c64jasm'

import Editor from './Editor'
import Disasm from './Disasm';

interface AppState {
  sourceCode: string;
  disassembly: string[];
};

class App extends React.Component<{}, AppState> {
  state = {
    sourceCode: '',
    disassembly: []
  }

  handleSetSource = (text: string) => {
      const options = {
        readFileSync: (fname: string) => text
      }
      const res = assembleWithOptions("foo.asm", options);
      if (res.errors.length === 0) {
        this.setState({disassembly: disassemble(res.prg)});
      }
    }

  render () {
    return (
      <Fragment>
        <header id="pageHeader">Header</header>
        <div id="mainCode">
          <Editor onSourceChanged={this.handleSetSource} />
        </div>
        <nav id="mainNav">Nav</nav>
        <div id="siteDisasm">
          <Disasm disassembly={this.state.disassembly} />
        </div>
        <footer id="pageFooter">Footer</footer>
      </Fragment>
    );
  }
}

export default App;
