#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8766;
const ROOT = process.cwd();
const MOCK_FILE = path.join(ROOT, 'test-large-10000.json');

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

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--enable-precise-memory-info'] });
  const page = await browser.newPage();

  // intercept requests to mock API
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (req.method() === 'POST' && url.endsWith('/api/av/renderAttributeView')) {
      // respond with {code:0, data: mockData}
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 0, data: mockData }) });
      return;
    }
    // also serve local files normally
    req.continue();
  });

  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    console.log('[PAGE]', text);
  });
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.toString()));

  const url = `http://localhost:${PORT}/index.html`;
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle2' });

  // ensure calendar element has a blockId so refreshData will attempt fetch
  await page.evaluate(() => {
    const el = document.getElementById('calendar');
    if (el) el.dataset.blockId = 'mock-db';
    // enable profiling flags for memory measurements
    window.DEBUG = false;
    window.DEBUG_PROFILING = true;
  });

  // wait for runProfile to be available
  await page.waitForFunction(() => window.runProfile !== undefined, { timeout: 10000 }).catch(() => {});

  // Warm-up
  try {
    await page.evaluate(async () => { if (window.refreshData) await window.refreshData(); });
  } catch (e) { console.warn('Warm-up refreshData failed:', e && e.message); }

  console.log('Starting runProfile with mocked large dataset...');
  const result = await page.evaluate(async () => {
    if (window.runProfile) {
      try {
        const r = await window.runProfile({iterations: 30, delay: 100});
        return {ok: true, r};
      } catch (e) {
        return {ok: false, error: e && e.message};
      }
    } else {
      return {ok: false, error: 'runProfile not found'};
    }
  });

  console.log('runProfile result:', result);

  await browser.close();
  server.close();
  console.log('Captured page logs:');
  logs.forEach(l => console.log('  ', l));

  if (result && result.ok && result.r) {
    console.log('[HEADLESS_MOCK_REPORT] avg=', result.r.avg);
    console.log('[HEADLESS_MOCK_REPORT] times=', result.r.times.join(', '));
  }
})();
