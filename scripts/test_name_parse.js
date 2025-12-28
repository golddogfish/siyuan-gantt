const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8767;
const ROOT = process.cwd();

const MOCKS = [
  // Case A: typical value={ keyID, block: { content }}
  {
    name: 'array.value.block',
    view: {
      columns: [{id: 'colName', name: '项目名称'}, {id: 'sCol', name: '状态'}, {id: 'startCol', name: '开始日'}, {id: 'endCol', name: '截止日'}],
      rows: [
        { id: 'r1', cells: [{ value: { keyID: 'colName', block: { content: 'Real Project A' } } }, { value: { keyID: 'sCol', mSelect: [{ content: '正常', color: 7 }] } }, { value: { keyID: 'startCol', date: { content: 1700000000000 } } }] }
      ]
    }
  },
  // Case B: array with keyID on outer and text.content inside
  {
    name: 'array.keyID.text',
    view: {
      columns: [{id: 'colName', name: '项目名称'}, {id: 'sCol', name: '状态'}, {id: 'startCol', name: '开始日'}, {id: 'endCol', name: '截止日'}],
      rows: [
        { id: 'r2', cells: [{ keyID: 'colName', value: { text: { content: 'Real Project B' } } }, { value: { keyID: 'sCol', mSelect: [{ content: '进行中', color: 5 }] } }, { value: { keyID: 'startCol', date: { content: 1700000000000 } } }] }
      ]
    }
  },
  // Case C: map style
  {
    name: 'map.style',
    view: {
      columns: [{id: 'colName', name: '项目名称'}, {id: 'sCol', name: '状态'}, {id: 'startCol', name: '开始日'}, {id: 'endCol', name: '截止日'}],
      rows: [
        { id: 'r3', cells: { colName: { value: { block: { content: 'Real Project C' } } }, sCol: { value: { keyID: 'sCol', mSelect: [{ content: '未开始', color: 6 }] } }, startCol: { value: { keyID: 'startCol', date: { content: 1700000000000 } } } } }
      ]
    }
  },
  // Case D: value is direct string
  {
    name: 'direct.string',
    view: {
      columns: [{id: 'colName', name: '项目名称'}, {id: 'sCol', name: '状态'}, {id: 'startCol', name: '开始日'}, {id: 'endCol', name: '截止日'}],
      rows: [
        { id: 'r4', cells: [{ value: { keyID: 'colName', content: 'Real Project D' } }, { value: { keyID: 'sCol', mSelect: [{ content: '完成', color: 8 }] } }, { value: { keyID: 'startCol', date: { content: 1700000000000 } } }] }
      ]
    }
  }
];

(async () => {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(ROOT, urlPath);
    if (filePath.endsWith('index.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.statusCode = 404; res.end('Not found'); return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const map = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json' };
        res.setHeader('Content-Type', map[ext] || 'application/octet-stream');
        res.end(data);
      });
      return;
    }
    res.statusCode = 404; res.end('Not found');
  });

  await new Promise((res, rej) => server.listen(PORT, err => err ? rej(err) : res()));
  console.log('Server running at http://localhost:' + PORT);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setRequestInterception(true);

  let currentMockIndex = 0;

  page.on('request', req => {
    const url = req.url();
    if (req.method() === 'POST' && url.endsWith('/api/av/renderAttributeView')) {
      const data = { code: 0, data: { id: 'mock', view: MOCKS[currentMockIndex].view } };
      req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      return;
    }
    req.continue();
  });

  page.on('console', msg => console.log('[PAGE]', msg.text()));

  const url = `http://localhost:${PORT}/index.html`;
  await page.goto(url, { waitUntil: 'networkidle2' });

  // set blockId
  await page.evaluate(() => { const el = document.getElementById('calendar'); if (el) el.dataset.blockId = 'mock'; });

  for (let i = 0; i < MOCKS.length; i++) {
    currentMockIndex = i;
    console.log('Testing mock:', MOCKS[i].name);
    // run refreshData
    await page.evaluate(async () => { if (window.refreshData) await window.refreshData(); });
    // get resource titles
    const titles = await page.evaluate(() => {
      return (window._fullResourcePool || []).map(r => r.title);
    });
    console.log('Parsed titles:', titles);
    if (!titles || titles.length === 0) {
      console.error('FAIL: no titles parsed for mock', MOCKS[i].name);
      process.exit(1);
    }
  }

  await browser.close();
  server.close();
  console.log('All tests executed');
})();
