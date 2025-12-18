#!/usr/bin/env node
// Generate a large test JSON by expanding keyValues to have many rows
// Usage: node scripts/generate_large_json.js --base ../20251216214116-96xxwtd.json --out ../test-large-10000.json --count 10000

const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { base: null, out: null, count: 1000 };
  for (let i=0;i<args.length;i++){
    const a = args[i];
    if (a === '--base' && args[i+1]) out.base = args[++i];
    else if (a === '--out' && args[i+1]) out.out = args[++i];
    else if (a === '--count' && args[i+1]) out.count = parseInt(args[++i],10);
  }
  return out;
}

function ensureKey(map, keyName) {
  if (!map[keyName]) {
    map[keyName] = { key: { id: 'k-' + keyName, name: keyName }, values: [] };
  }
  return map[keyName];
}

function generate(baseData, count) {
  const result = JSON.parse(JSON.stringify(baseData));
  // build new keyValues map from base but clear values
  const kvMap = {};
  baseData.keyValues.forEach(kv => {
    kvMap[kv.key.name] = { key: kv.key, values: [] };
  });

  // Choose keys
  const nameKey = Object.keys(kvMap).find(k => /项目|标题|内容|TODO|headline/i.test(k)) || Object.keys(kvMap)[0];
  const statusKey = Object.keys(kvMap).find(k => /状态|status/i.test(k)) || Object.keys(kvMap)[0];
  const startKey = Object.keys(kvMap).find(k => /开始|start/i.test(k)) || Object.keys(kvMap)[0];
  const endKey = Object.keys(kvMap).find(k => /截止|end/i.test(k)) || Object.keys(kvMap)[0];

  // Generate rows
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const id = `genrow-${i}`;
    // name
    kvMap[nameKey].values.push({ id: `${id}-name`, keyID: kvMap[nameKey].key.id, blockID: id, type: 'block', block: { content: `Generated Task ${i}` } });
    // status random from a few
    const statuses = ['正常','推迟','完成','预定'];
    const st = statuses[i % statuses.length];
    kvMap[statusKey].values.push({ id: `${id}-status`, keyID: kvMap[statusKey].key.id, blockID: id, type: 'select', mSelect: [{ content: st, color: (i%14)+1 }] });
    // start / end dates
    const start = new Date(now + (i%30)*24*3600*1000);
    const end = new Date(start.getTime() + (1 + (i%7))*24*3600*1000);
    kvMap[startKey].values.push({ id: `${id}-start`, keyID: kvMap[startKey].key.id, blockID: id, type: 'date', date: { content: start.getTime(), isNotEmpty: true } });
    kvMap[endKey].values.push({ id: `${id}-end`, keyID: kvMap[endKey].key.id, blockID: id, type: 'date', date: { content: end.getTime(), isNotEmpty: true } });
  }

  // Replace keyValues in result
  result.keyValues = Object.values(kvMap);
  // also set view itemIds
  if (result.views && result.views.length>0) {
    result.views[0].itemIds = Array.from({length: count}, (_,i)=>`genrow-${i}`);
  }
  return result;
}

(function main(){
  const argv = parseArgs();
  if (!argv.base) { console.error('missing --base'); process.exit(1); }
  if (!argv.out) argv.out = path.join(path.dirname(argv.base), `test-large-${argv.count}.json`);
  const basePath = path.resolve(argv.base);
  if (!fs.existsSync(basePath)) { console.error('base file not found', basePath); process.exit(1); }
  const raw = fs.readFileSync(basePath,'utf8');
  const base = JSON.parse(raw);
  console.log('Generating', argv.count, 'rows into', argv.out);
  const out = generate(base, argv.count);
  fs.writeFileSync(argv.out, JSON.stringify(out));
  console.log('Done');
})();
