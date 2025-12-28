const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8768;
const ROOT = process.cwd();
const MOCK_FILE = path.join(ROOT, 'data', '20251216214116-96xxwtd.json');

function serveFile(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const map = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.json':'application/json' };
    res.setHeader('Content-Type', map[ext] || 'application/octet-stream');
    res.end(data);
  });
}

(async () => {
  const mockDataRaw = fs.readFileSync(MOCK_FILE, 'utf8');
  const mockData = JSON.parse(mockDataRaw);
  const server = http.createServer(serveFile);
  await new Promise((res, rej) => server.listen(PORT, err => err ? rej(err) : res()));
  console.log('Serving', ROOT, 'on http://localhost:' + PORT);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (req.method() === 'POST' && url.endsWith('/api/av/renderAttributeView')) {
      // adapt raw DB JSON: expose the first view under data.view so client code can parse it
      const payload = { id: mockData.id, view: (mockData.views && mockData.views[0]) || null, blocks: mockData.blocks || mockData.blockMap || [] };
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data: payload }) });
      return;
    }
    req.continue();
  });

  page.on('console', msg => console.log('[PAGE]', msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.toString()));

  const url = `http://localhost:${PORT}/index.html`;
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle2' });

  // ensure calendar element has a blockId so refreshData will attempt fetch
  // By default do NOT enable page-level DEBUG to avoid leaking debug logs in release tests.
  const enableDebug = !!(process.env.TEST_DEBUG === '1' || process.env.TEST_DEBUG === 'true');
  await page.evaluate((dbg) => {
    const el = document.getElementById('calendar');
    if (el) el.dataset.blockId = 'real-db';
    // only enable DEBUG when explicitly requested via TEST_DEBUG env var
    try { window.DEBUG = !!dbg; } catch (e) {}
  }, enableDebug);

  // run refreshData
  await page.evaluate(async () => { if (window.refreshData) await window.refreshData(); });

  // get resource titles and output
  const titles = await page.evaluate(() => (window._fullResourcePool || []).map(r => r.title));
  console.log('Parsed titles count:', titles.length);
  console.log('Parsed titles sample:', titles.slice(0, 20));

  await browser.close();
  server.close();
  console.log('Test finished');
})();