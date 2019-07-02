import React, { Fragment } from 'react';

const App: React.FC = () => {
  return (
    <Fragment>
      <header id="pageHeader">Header</header>
      <div id="mainCode">Assembly code</div>
      <nav id="mainNav">Nav</nav>
      <div id="siteDisasm">Disassembly</div>
      <footer id="pageFooter">Footer</footer>
    </Fragment>
  );
}

export default App;
