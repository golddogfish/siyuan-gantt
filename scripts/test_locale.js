#!/usr/bin/env node
// Local Puppeteer test: verify locale detection and UI text for en/zh
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const PORT = 8767;
const ROOT = process.cwd();

function serveFile(req, res) {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/parent.html' || url.startsWith('/parent.html')) {
    // allow ?locale=xx
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

  // static file serve
  let filePath = path.join(ROOT, url === '/' ? '/index.html' : url);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404); res.end('Not found'); return;
    }
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

  async function testLocale(locale, expectedRefreshText, expectedProjectList, expectedConfigHeader, expectedEnterDb) {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${PORT}/parent.html?locale=${encodeURIComponent(locale)}`);

    // Wait for iframe to load and for currentLocale to be set
    await page.waitForSelector('#gantt_iframe');
    const frame = await page.frames().find(f => f.url().endsWith('/index.html'));
    if (!frame) throw new Error('iframe frame not found');

    // Wait for the calendar toolbar or currentLocale to be available
    await frame.waitForFunction(() => typeof window.currentLocale !== 'undefined', { timeout: 5000 });

    // wait for buttons to render
    await frame.waitForSelector('.fc-button', { timeout: 5000 });

    const info = await frame.evaluate(() => {
      const locale = window.currentLocale;
      const btns = Array.from(document.querySelectorAll('.fc-toolbar .fc-button')).map(b => b.textContent.trim()).filter(Boolean);
      const projectHeader = document.querySelector('.fc-resource-area-header')?.textContent.trim() || null;
      const diag = {
        currentLocale: locale,
        headerDataKey: document.querySelector('.color-config-header')?.dataset?.i18n || null,
        headerText: document.querySelector('.color-config-header')?.textContent.trim() || null,
        tVal: (typeof t === 'function') ? t('ganttConfig') : null
      };
      return { locale, btns, projectHeader, diag };
    });

    // open settings panel
    const settingsBtn = await frame.$('.fc-settingsButton-button') || (await frame.$x("//button[contains(., '⚙️')]")).shift();
    if (settingsBtn) {
      try { await settingsBtn.click(); } catch (e) {}
      // wait for overlay to show
      await frame.waitForSelector('#overlay.show', { timeout: 2000 }).catch(() => {});
      // small delay to allow translations to apply
      await new Promise(r => setTimeout(r, 300));
    }

    const cfg = await frame.evaluate(() => {
      const header = document.querySelector('.color-config-header')?.textContent.trim() || null;
      const enterMsg = document.querySelector('#ignoreStatusItems div')?.textContent.trim() || null;
      return { header, enterMsg };
    });

    // search for project header anywhere in document
    const projectHeader = await frame.evaluate((expected) => {
      const all = Array.from(document.querySelectorAll('*'));
      const el = all.find(e => e.textContent && e.textContent.includes(expected));
      return el ? el.textContent.trim() : null;
    }, expectedProjectList);

    // merge project header into info
    info.projectHeader = projectHeader;

    const found = info.btns.some(t => t.includes(expectedRefreshText));
    const projectOk = info.projectHeader && info.projectHeader.includes(expectedProjectList);
    const cfgOk = (cfg.header && cfg.header.includes(expectedConfigHeader)) && (cfg.enterMsg && cfg.enterMsg.includes(expectedEnterDb));

    return { locale: info.locale, btns: info.btns, projectHeader: info.projectHeader, cfgHeader: cfg.header, cfgEnter: cfg.enterMsg, ok: found && projectOk && cfgOk };
  }

  try {
    const resEn = await testLocale('en-US', 'Refresh', 'Project List', 'Gantt Configuration', 'Please enter database ID and save');
    console.log('EN result:', resEn);
    const resZh = await testLocale('zh-CN', '刷新', '项目列表', '甘特图配置', '请先输入数据库ID并保存');
    console.log('ZH result:', resZh);

    if (!resEn.ok || !resZh.ok) {
      console.error('Locale test failed');
      process.exitCode = 2;
    } else {
      console.log('Locale tests passed');
    }
  } catch (e) {
    console.error('Error during tests:', e);
    process.exitCode = 3;
  } finally {
    await browser.close();
    server.close();
  }
})();
