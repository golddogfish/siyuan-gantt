// Minimal test harness for profile & console suppression code
// Use real console in Node to observe behavior (don't override global.console)

const DEBUG = true;
const DEBUG_PROFILING = true;

// IIFE (same logic as in index.html)
(function(){
    try {
        const _orig_log = console.log && console.log.bind ? console.log.bind(console) : function(){};
        const _orig_debug = console.debug && console.debug.bind ? console.debug.bind(console) : _orig_log;
        const _orig_info = console.info && console.info.bind ? console.info.bind(console) : _orig_log;

        if (!DEBUG) {
            console.log = function(){};
            console.debug = function(){};
        } else {
            console.log = _orig_log;
            console.debug = _orig_debug;
        }

        if (!DEBUG_PROFILING) {
            console.info = function(){};
        } else {
            console.info = _orig_info;
        }
    } catch (e) {
        // noop
    }
})();

function profileStart(label) {
    if (!DEBUG_PROFILING || typeof performance === 'undefined') return null;
    return {label, t: performance.now(), mem: (performance && performance.memory) ? performance.memory.usedJSHeapSize : null};
}
function profileEnd(ctx) {
    if (!ctx) return;
    const t2 = performance.now();
    const mem2 = (performance && performance.memory) ? performance.memory.usedJSHeapSize : null;
    const timeMs = (t2 - ctx.t).toFixed(2);
    const memDiff = (mem2 !== null && ctx.mem !== null) ? (mem2 - ctx.mem) : null;
    console.info(`[PROFILE] ${ctx.label}: ${timeMs}ms` + (memDiff !== null ? `, memDiff=${(memDiff/1024).toFixed(2)}KB` : ""));
}

// test calling profileStart/profileEnd (should be no-op when DEBUG_PROFILING=false)
const p = profileStart('test');
profileEnd(p);

console.log('Test completed');
