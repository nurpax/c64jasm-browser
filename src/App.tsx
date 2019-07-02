import React, { Fragment } from 'react';

import Editor from './Editor'

const App: React.FC = () => {
  return (
    <Fragment>
      <header id="pageHeader">Header</header>
      <div id="mainCode">
        <Editor />
      </div>
      <nav id="mainNav">Nav</nav>
      <div id="siteDisasm">Disassembly</div>
      <footer id="pageFooter">Footer</footer>
    </Fragment>
  );
}

export default App;
