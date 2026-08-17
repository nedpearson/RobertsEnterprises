const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages().find(p => p.url().includes('railway.com'));
  
  const res = await page.evaluate(async () => {
    try {
      // Railway uses GraphQL at /graphql v2
      const r = await fetch('https://backboard.railway.app/graphql/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ projects { edges { node { id name environments { edges { node { id name } } } } } } }'
        })
      });
      return await r.json();
    } catch(e) { return e.toString(); }
  });
  console.log(JSON.stringify(res, null, 2));
  browser.close();
})();
