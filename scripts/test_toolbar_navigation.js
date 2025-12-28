#!/usr/bin/env node
// Puppeteer test: verify toolbar doesn't duplicate refresh label on prev/next navigation
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8767;
const ROOT = process.cwd();

function serveFile(req, res) {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/parent.html' || url.startsWith('/parent.html')) {
    const qs = req.url.split('?')[1] || '';
    const params = new URLSearchParams(qs);
    const locale = params.get('locale') || 'zh-CN';
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Parent - ${locale}</title></head><body>
      <script>window.siyuan = { config: { locale: '${locale}' } };</script>
      <iframe src="/index.html" style="width:100%;height:1200px;border:0" id="gantt_iframe"></iframe>
      </body></html>`;
    res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
    res.end(html);
    return;
  }
  let filePath = path.join(ROOT, url === '/' ? '/index.html' : url);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) { res.writeHead(404); res.end('Not found'); return; }
    const stream = fs.createReadStream(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.html' ? 'text/html; charset=utf-8' : (ext === '.js' ? 'application/javascript' : (ext === '.css' ? 'text/css' : 'application/octet-stream'));
    res.writeHead(200, {'Content-Type': mime});
    stream.pipe(res);
  });
}

(async () => {
  const server = http.createServer(serveFile);
  await new Promise((res, rej) => server.listen(PORT, err => err ? rej(err) : res()));
  console.log('Static server running at http://localhost:' + PORT);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

async function captureSnapshots(frame, duration = 600, interval = 30) {
      const end = Date.now() + duration;
      const snaps = [];
      while (Date.now() < end) {
        const list = await frame.evaluate(() => Array.from(document.querySelectorAll('.fc-toolbar .fc-button')).map(b => b.textContent.trim()).filter(Boolean));
        snaps.push(list);
        await new Promise(r => setTimeout(r, interval));
      }
      return snaps;
    }

    async function checkLocale(locale, refreshText) {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${PORT}/parent.html?locale=${encodeURIComponent(locale)}`);
      await page.waitForSelector('#gantt_iframe', { timeout: 5000 });
      const frame = await page.frames().find(f => f.url().endsWith('/index.html'));
      if (!frame) throw new Error('frame not found');

      await frame.waitForSelector('.fc-button', { timeout: 5000 });
      await new Promise(r => setTimeout(r, 300));

      const before = await frame.evaluate(() => Array.from(document.querySelectorAll('.fc-toolbar .fc-button')).map(b => b.textContent.trim()).filter(Boolean));

      // click prev and collect snapshots to detect transient duplication
      const prev = await frame.$('.fc-prev-button');
      if (prev) {
        await prev.click();
        const snapsPrev = await captureSnapshots(frame, 600, 30);
        // take last snapshot as afterPrev and also record if any snapshot had duplication
        var afterPrev = snapsPrev[snapsPrev.length - 1] || [];
        var dupDuringPrev = snapsPrev.some(list => list.some(t => {
          if (!t) return false;
          const len = t.length;
          if (len % 2 !== 0) return false;
          const half = t.slice(0, len/2);
          return (half + half) === t;
        }));
      } else {
        var afterPrev = before;
        var dupDuringPrev = false;
      }

      // click next and collect snapshots
      const next = await frame.$('.fc-next-button');
      if (next) {
        await next.click();
        const snapsNext = await captureSnapshots(frame, 600, 30);
        var afterNext = snapsNext[snapsNext.length - 1] || [];
        var dupDuringNext = snapsNext.some(list => list.some(t => {
          if (!t) return false;
          const len = t.length;
          if (len % 2 !== 0) return false;
          const half = t.slice(0, len/2);
          return (half + half) === t;
        }));
      } else {
        var afterNext = before;
        var dupDuringNext = false;
      }

      function hasDup(list) {
        return list.some(t => {
          if (!t) return false;
          const len = t.length;
          if (len % 2 !== 0) return false;
          const half = t.slice(0, len/2);
          return (half + half) === t;
        });
      }

      const dupBefore = hasDup(before);
      const dupAfterPrev = hasDup(afterPrev);
      const dupAfterNext = hasDup(afterNext);

      return { locale, before, afterPrev, afterNext, dupBefore, dupAfterPrev, dupAfterNext, dupDuringPrev, dupDuringNext };
    }

  try {
    console.log('Testing zh-CN...');
    const zh = await checkLocale('zh-CN', '刷新');
    console.log('ZH:', zh);
    console.log('Testing en-US...');
    const en = await checkLocale('en-US', 'Refresh');
    console.log('EN:', en);

    const ok = !(zh.dupAfterPrev || zh.dupAfterNext || en.dupAfterPrev || en.dupAfterNext);
    console.log('Toolbar navigation duplication test', ok ? 'PASSED' : 'FAILED');
    process.exitCode = ok ? 0 : 2;
  } catch (e) {
    console.error('Error running toolbar test', e);
    process.exitCode = 3;
  } finally {
    await browser.close();
    server.close();
  }
})();
