import React, { Fragment } from 'react';

const App: React.FC = () => {
  return (
    <Fragment>
      <header id="pageHeader">Header</header>
      <article id="mainArticle">Article</article>
      <nav id="mainNav">Nav</nav>
      <div id="siteAds">Ads</div>
      <footer id="pageFooter">Footer</footer>
    </Fragment>
  );
}

export default App;
