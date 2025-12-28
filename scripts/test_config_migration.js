#!/usr/bin/env node
// Test that config migration and merge works: serve index.html and mock /api/file/getFile response
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8770;
const ROOT = process.cwd();

// Example old config that uses old key name 'customColorMap'
const oldConfig = {
  widgetId: 'test-widget',
  blockId: 'test-block-123',
  customColorMap: { "Todo": "#ff0000" },
  ignoreStatuses: ["Done"]
};

function serveFile(req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  let filePath = path.join(ROOT, urlPath === '/' ? '/index.html' : urlPath);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const stream = fs.createReadStream(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.html' ? 'text/html; charset=utf-8' : (ext === '.js' ? 'application/javascript' : 'application/octet-stream');
    res.writeHead(200, {'Content-Type': mime});
    stream.pipe(res);
  });
}

(async () => {
  const server = http.createServer(serveFile);
  await new Promise((res, rej) => server.listen(PORT, err => err ? rej(err) : res()));
  console.log('Static server running at http://localhost:' + PORT);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Intercept fetch at page level (avoid CORS issues for absolute 127.0.0.1 calls)
  await page.evaluateOnNewDocument((mock) => {
    const origFetch = window.fetch;
    window.fetch = function(input, init) {
      try {
        const url = (typeof input === 'string') ? input : (input && input.url) || '';
        if (typeof url === 'string' && url.indexOf('/api/file/getFile') !== -1) {
          return Promise.resolve(new Response(JSON.stringify(mock), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
      } catch (e) { /* ignore */ }
      return origFetch.apply(this, arguments);
    };
  }, oldConfig);

  // also set request interception to silence other requests
  await page.setRequestInterception(true);
  page.on('request', req => { req.continue(); });

  page.on('console', msg => console.log('[PAGE]', msg.text()));

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle2' });

  // ensure widgetId is set and manually trigger loadConfig since in tests frameElement may not exist
  await page.evaluate(() => {
    try { window.widgetId = 'test-widget'; if (typeof loadConfig === 'function') loadConfig(); } catch (e) { console.warn('manual loadConfig failed', e); }
  });

  // wait for config to be loaded (loadConfig should set #configBlockId and window.customColorMap)
  await page.waitForFunction(() => {
    const el = document.getElementById('configBlockId');
    return (el && el.value && el.value.length > 0) || (window.customColorMap && Object.keys(window.customColorMap).length > 0);
  }, { timeout: 4000 }).catch(() => {});

  const result = await page.evaluate(() => {
    return {
      blockId: document.getElementById('configBlockId')?.value || null,
      customColors: window.customColorMap || null,
      ignoreStatuses: window.ignoreStatuses || null
    };
  });

  console.log('Migration test result:', result);

  const ok = result.blockId === 'test-block-123' && result.customColors && result.customColors.Todo === '#ff0000' && Array.isArray(result.ignoreStatuses) && result.ignoreStatuses.includes('Done');
  console.log('Config migration test', ok ? 'PASSED' : 'FAILED');

  await browser.close();
  server.close();
  process.exit(ok ? 0 : 2);
})();