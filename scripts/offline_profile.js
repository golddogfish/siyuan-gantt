#!/usr/bin/env node
// Offline profiler: parse a SiYuan render JSON and build resources/events repeatedly
// Usage: node scripts/offline_profile.js --file ../20251216214116-96xxwtd.json --iterations 10

const fs = require('fs');
const path = require('path');

function nowMs() { return Number(process.hrtime.bigint()/1000000n); }

function siyuanColorMap() {
    return {
        1: '#FF5252', 2: '#FF7043', 3: '#FF4081', 4: '#9735ed', 5: '#29B6F6',
        6: '#18FFFF', 7: '#3EC300', 8: '#f8c421', 9: '#FFD740', 10: '#FFAB40',
        11: '#8D6E63', 12: '#BDBDBD', 13: '#616161', 14: '#212121'
    };
}

function parseArgs() {
    const args = process.argv.slice(2);
    const out = {file: null, iterations: 5};
    for (let i=0;i<args.length;i++){
        const a = args[i];
        if (a === '--file' && args[i+1]) { out.file = args[++i]; }
        else if (a === '--iterations' && args[i+1]) { out.iterations = parseInt(args[++i],10); }
        else if (a === '--help') { console.log('Usage: node scripts/offline_profile.js --file <path> --iterations <n>'); process.exit(0); }
    }
    return out;
}

function buildMaps(data) {
    // Build a map: blockId -> attributes (name/status/start/end)
    const blockMap = Object.create(null);
    if (!data.keyValues) return blockMap;
    data.keyValues.forEach(kv => {
        const keyName = kv.key && kv.key.name ? kv.key.name : '';
        const values = kv.values || [];
        values.forEach(v => {
            const bid = v.blockID;
            if (!bid) return;
            if (!blockMap[bid]) blockMap[bid] = {};
            const target = blockMap[bid];
            // name
            if (/项目|TODO|标题|headline|内容/i.test(keyName)) {
                target.name = v.block && (v.block.content || v.block.text) ? (v.block.content || v.block.text || '') : (v.text && v.text.content ? v.text.content : target.name);
            }
            // status
            if (/状态|status/i.test(keyName)) {
                // prefer mSelect
                if (v.mSelect && v.mSelect.length>0) target.status = v.mSelect[0].content;
                else if (v.text && v.text.content) target.status = v.text.content;
            }
            // start / end
            if (/开始|start/i.test(keyName)) {
                if (v.date && v.date.content) target.start = new Date(parseInt(v.date.content));
            }
            if (/截止|end/i.test(keyName)) {
                if (v.date && v.date.content) target.end = new Date(parseInt(v.date.content));
            }
        });
    });
    return blockMap;
}

function buildResourcesEvents(blockMap) {
    const resources = [];
    const events = [];
    const cmap = siyuanColorMap();
    Object.keys(blockMap).forEach(bid => {
        const item = blockMap[bid];
        if (!item.start && !item.end) return; // skip if no date
        resources.push({id: bid, title: item.name || bid});
        const start = item.start || item.end;
        const endD = item.end || item.start;
        const endPlusOne = new Date(endD);
        endPlusOne.setDate(endPlusOne.getDate() + 1);
        let color = '#3788d8';
        if (item.status) {
            // try to parse status color number if present (e.g., '7')
            const m = item.status.match(/(\d+)/);
            if (m) {
                const num = parseInt(m[1],10);
                if (cmap[num]) color = cmap[num];
            }
        }
        events.push({id: bid + '_event', resourceId: bid, title: item.status || item.name || '', start: start.toISOString().slice(0,10), end: endPlusOne.toISOString().slice(0,10), backgroundColor: color});
    });
    return {resources, events};
}

function profileRun(data, iterations) {
    const times = [];
    const mems = [];
    let lastHeap = null;
    for (let i=0;i<iterations;i++){
        const t0 = nowMs();
        const blockMap = buildMaps(data);
        const re = buildResourcesEvents(blockMap);
        const t1 = nowMs();
        times.push(t1 - t0);
        const heap = process.memoryUsage().heapUsed;
        mems.push(heap);
        lastHeap = heap;
    }
    const sum = times.reduce((a,b)=>a+b,0);
    const avg = (times.length ? (sum / times.length) : 0).toFixed(2);
    console.log('[OFFLINE_PROFILE] iterations=%d avg=%sms times=[%s]', iterations, avg, times.map(t=>t.toFixed(2)).join(', '));
    if (mems.length) {
        const memDiff = mems[mems.length-1] - mems[0];
        console.log('[OFFLINE_PROFILE] heapStart=%sKB heapEnd=%sKB diff=%sKB', Math.round(mems[0]/1024), Math.round(mems[mems.length-1]/1024), Math.round(memDiff/1024));
    }
}

(function main(){
    const argv = parseArgs();
    if (!argv.file) { console.error('Error: --file <path> required'); process.exit(1); }
    const full = path.resolve(argv.file);
    if (!fs.existsSync(full)) { console.error('File not found:', full); process.exit(1); }
    const raw = fs.readFileSync(full, 'utf8');
    let data;
    try { data = JSON.parse(raw); } catch (e) { console.error('JSON parse error:', e); process.exit(1); }

    console.log('Loaded file:', argv.file);
    profileRun(data, argv.iterations || 5);
})();
