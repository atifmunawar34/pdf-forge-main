// Shared CDP harness
export const CDP = 'http://localhost:9226';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function connect() {
  const list = await (await fetch(`${CDP}/json/list`)).json();
  const page = list.find((t) => t.url.includes('localhost:3000'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown')
      errors.push(m.params.exceptionDetails?.exception?.description?.split('\n')[0] || 'exception');
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error')
      errors.push('console: ' + (m.params.args?.[0]?.value || m.params.args?.[0]?.description || '').toString().split('\n')[0]);
    if (m.method === 'Network.loadingFailed')
      errors.push('net-fail: ' + (m.params.errorText || ''));
  };
  const send = (m, p = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  await new Promise((r) => (ws.onopen = r));
  await send('Page.enable'); await send('Runtime.enable'); await send('DOM.enable'); await send('Network.enable');
  const ev = async (x) => {
    const r = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true });
    return r.result?.exceptionDetails ? 'ERR:' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text || '').split('\n')[0] : r.result?.result?.value;
  };
  return { ws, send, ev, errors };
}

export const ok = (name, cond, extra = '') =>
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`);
