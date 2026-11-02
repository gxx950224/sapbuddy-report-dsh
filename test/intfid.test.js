import test from 'node:test';
import assert from 'node:assert/strict';
import { SapReportsService, LIMITS } from '../service.js';
import { createRoute, createTool } from '../index.js';

// Synthetic responses from the design contract, not captures from a live SAP system.
const credentials = { endpoint: 'https://sap.example/sap/bc/zsx_intf_serv/zsx_oa?sap-client=100&sap-language=ZH', username: 'ALICE', password: 'private-intfid-password', mode: 'intfid' };
const ids = { get_user_tcodes: 'AI_RPT_CATALOG', get_report_meta: 'AI_RPT_META', run_alv_report: 'AI_RPT_RUN' };
const catalog = { ET_LIST: [{ TCODE: 'MB52', TEXT: '库存', REPORT: 'RM07MLBS' }], EV_MSG: 'OK' };
const meta = { EV_REPORT: 'RM07MLBS', ET_PARAMS: [{ SELNAME: 'WERKS', KIND: 'S', TEXT: '工厂', OBLIGATORY: 'X', LOW: '0010', HIGH: '', SIGN: 'I', OPTION: 'EQ' }, { SELNAME: 'WERKS', KIND: 'S', LOW: '0020', HIGH: '0029', SIGN: 'E', OPTION: 'BT' }], ET_FIELDS: [{ FIELDNAME: 'MATNR', SCRTEXT_L: '物料', DATATYPE: 'CHAR' }], ET_VARIANTS: [{ NAME: 'SAFE', TEXT: '限定范围' }], EV_MSG: 'OK' };
const rows = { EV_JSON: '[{"matnr":"0000123","amount":"9007199254740993.01"}]', EV_ROWS: 1, EV_TRUNCATED: '', EV_MSG: 'OK' };
const codes = expected => error => { assert.equal(error.code, expected); return true; };
function harness(t, overrides = {}, options = {}) {
  const calls = [];
  const service = new SapReportsService({ settingsFile: null,
    fetchImpl: async (url, init) => {
      const parsed = new URL(url);
      const body = JSON.parse(init.body);
      const id = parsed.searchParams.get('intfid') ?? ids[body.action ?? parsed.pathname.split('/').at(-1)];
      const call = { url: parsed, init, body, id };
      calls.push(call);
      const value = Object.hasOwn(overrides, id) ? overrides[id] : ({ AI_RPT_CATALOG: catalog, AI_RPT_META: meta, AI_RPT_RUN: rows })[id];
      return typeof value === 'function' ? value(call) : Response.json(value);
    },
    ...options,
  });
  t.after(() => service.dispose());
  return { service, calls, overrides };
}
const connect = async service => (await service.connect(credentials)).connectionId;
const runArgs = connectionId => ({ connectionId, tcode: 'MB52', variant: 'SAFE', selection: [] });

test('intfid maps all operations to fixed query IDs on the same path with exact camelCase bodies', async t => {
  const { service, calls } = harness(t);
  const connectionId = await connect(service);
  await service.meta({ connectionId, tcode: 'MB52', variant: 'SAFE' });
  const selection = [{ selname: 'WERKS', kind: 'S', sign: 'I', option: 'EQ', low: '0010', high: '' }];
  await service.run({ ...runArgs(connectionId), selection });
  assert.deepEqual(calls.map(call => call.id), ['AI_RPT_CATALOG', 'AI_RPT_CATALOG', 'AI_RPT_META', 'AI_RPT_CATALOG', 'AI_RPT_META', 'AI_RPT_RUN']);
  for (const call of calls) {
    assert.equal(call.url.pathname, '/sap/bc/zsx_intf_serv/zsx_oa');
    assert.equal(call.url.searchParams.get('sap-client'), '100');
    assert.equal(call.url.searchParams.get('sap-language'), 'ZH');
    assert.deepEqual(call.url.searchParams.getAll('intfid'), [call.id]);
    assert.equal(call.init.method, 'POST');
    assert.equal(call.init.redirect, 'manual');
    assert.equal(call.init.headers.authorization, `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`);
    for (const key of ['action', 'uname', 'report', 'intfid', 'function', 'catalog_only', 'max_rows']) assert.equal(Object.hasOwn(call.body, key), false);
  }
  assert.deepEqual(calls[0].body, { catalogOnly: true });
  assert.deepEqual(calls[2].body, { tcode: 'MB52', variant: 'SAFE' });
  assert.deepEqual(calls.at(-1).body, { tcode: 'MB52', variant: 'SAFE', selection, maxRows: 5000 });
});

test('intfid keeps language query, respects sapClient override, and defaults absent variant to empty', async t => {
  const { service, calls } = harness(t);
  const { connectionId } = await service.connect({ ...credentials, sapClient: '200' });
  await service.meta({ connectionId, tcode: 'MB52' });
  assert.equal(calls[0].url.searchParams.get('sap-client'), '200');
  assert.equal(calls[0].url.searchParams.get('sap-language'), 'ZH');
  assert.deepEqual(calls.at(-1).body, { tcode: 'MB52', variant: '' });
});

test('intfid rejects existing query keys regardless of casing or percent encoding before contacting SAP', async t => {
  const { service, calls } = harness(t);
  for (const key of ['intfid', 'INTFID', 'InTfId', '%69ntfid', 'intf%69d', '%49%4e%54%46%49%44']) {
    await assert.rejects(service.connect({ ...credentials, endpoint: `${credentials.endpoint}&${key}=OTHER` }), codes('INVALID_ENDPOINT'));
    await assert.rejects(service.connect({ ...credentials, endpoint: `${credentials.endpoint}&${key}=` }), codes('INVALID_ENDPOINT'));
  }
  assert.equal(calls.length, 0);
});

test('intfid cannot be selected with an unknown mode or caller-supplied interface/function name', async t => {
  const { service, calls } = harness(t);
  for (const mode of ['INTFID', 'intfid ', 'other', '']) await assert.rejects(service.connect({ ...credentials, mode }), codes('INVALID_INPUT'));
  for (const extra of [{ intfid: 'OTHER' }, { functionName: 'Z_OTHER' }, { FUCNAM: 'Z_OTHER' }]) await assert.rejects(service.connect({ ...credentials, ...extra }), codes('INVALID_INPUT'));
  assert.equal(calls.length, 0);
  const connectionId = await connect(service);
  await assert.rejects(service.run({ ...runArgs(connectionId), intfid: 'OTHER' }), codes('INVALID_INPUT'));
  await assert.rejects(service.meta({ connectionId, tcode: 'MB52', report: 'Z_OTHER' }), codes('INVALID_INPUT'));
});

test('intfid HTTP 202 and 200 STATUS E/A/X use Chinese MSGTXT and redact credentials', async t => {
  for (const status of [200, 202]) {
    for (const STATUS of ['E', ' a ', 'x']) {
      const { service } = harness(t, { AI_RPT_CATALOG: () => Response.json({ status: STATUS, msgtxt: `无接口执行权限 ${credentials.password} ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}` }, { status }) });
      await assert.rejects(service.connect(credentials), error => {
        assert.equal(error.code, 'SAP_ERROR');
        assert.match(error.message, /无接口执行权限/u);
        assert.equal(error.message.includes(credentials.password), false);
        assert.equal(error.message.includes(Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')), false);
        return true;
      });
      assert.deepEqual(service.status(), { connections: [] });
    }
  }
});

test('intfid HTTP 202 is never synchronous success even with OK or success-looking data', async t => {
  for (const body of [catalog, { STATUS: 'S', MSGTXT: '已接收', ...catalog }, {}, { ET_LIST: [] }, { EV_MSG: '', ET_LIST: [] }]) {
    const { service } = harness(t, { AI_RPT_CATALOG: () => Response.json(body, { status: 202 }) });
    await assert.rejects(service.connect(credentials), codes('SAP_ASYNC_RESPONSE'));
    assert.deepEqual(service.status(), { connections: [] });
  }
});

test('intfid rejects accepted-but-asynchronous meta and run responses', async t => {
  for (const id of ['AI_RPT_META', 'AI_RPT_RUN']) {
    const { service } = harness(t, { [id]: () => Response.json(id === 'AI_RPT_META' ? meta : rows, { status: 202 }) });
    const connectionId = await connect(service);
    await assert.rejects(service.run(runArgs(connectionId)), codes('SAP_ASYNC_RESPONSE'));
  }
});

test('intfid success needs nonempty OK EV_MSG on catalog, meta and run', async t => {
  for (const [id, success] of [['AI_RPT_CATALOG', catalog], ['AI_RPT_META', meta], ['AI_RPT_RUN', rows]]) {
    for (const missing of [undefined, '', '   ']) {
      const body = { ...success };
      if (missing === undefined) delete body.EV_MSG;
      else body.EV_MSG = missing;
      const { service } = harness(t, { [id]: body });
      if (id === 'AI_RPT_CATALOG') await assert.rejects(service.connect(credentials), codes('SAP_RESPONSE'));
      else await assert.rejects(service.run(runArgs(await connect(service))), codes('SAP_RESPONSE'));
    }
  }
  const { service } = harness(t, { AI_RPT_CATALOG: {} });
  await assert.rejects(service.connect(credentials), codes('SAP_RESPONSE'));
});

test('intfid requires exact OK after trimming and case-folding, not legacy OK-prefixed messages', async t => {
  for (const [id, success] of [['AI_RPT_CATALOG', catalog], ['AI_RPT_META', meta], ['AI_RPT_RUN', rows]]) {
    for (const EV_MSG of ['OK, 1 tcodes', 'OK (from catalog)', 'OK: done']) {
      const { service } = harness(t, { [id]: { ...success, EV_MSG } });
      if (id === 'AI_RPT_CATALOG') await assert.rejects(service.connect(credentials), codes('SAP_ERROR'));
      else await assert.rejects(service.run(runArgs(await connect(service))), codes('SAP_ERROR'));
    }
  }
  const { service } = harness(t, { AI_RPT_CATALOG: { ET_LIST: catalog.ET_LIST, ev_msg: '  ok  ' }, AI_RPT_META: { ...meta, EV_MSG: ' oK ' }, AI_RPT_RUN: { ...rows, EV_MSG: ' ok ' } });
  assert.equal((await service.run(runArgs(await connect(service)))).rowCount, 1);
});

test('intfid non-OK EV_MSG and structural errors are not mistaken for empty results', async t => {
  const failed = harness(t, { AI_RPT_CATALOG: { ET_LIST: [], EV_MSG: '无权访问目录' } });
  await assert.rejects(failed.service.connect(credentials), codes('SAP_ERROR'));
  const missing = harness(t, { AI_RPT_CATALOG: { EV_MSG: 'OK' } });
  await assert.rejects(missing.service.connect(credentials), codes('SAP_RESPONSE'));
  const badRows = harness(t, { AI_RPT_RUN: { EV_JSON: '', EV_MSG: 'OK' } });
  await assert.rejects(badRows.service.run(runArgs(await connect(badRows.service))), codes('SAP_RESPONSE'));
});

test('intfid accepts OK empty catalog, metadata arrays and serialized empty report', async t => {
  const emptyCatalog = harness(t, { AI_RPT_CATALOG: { ET_LIST: [], EV_MSG: 'OK' } });
  assert.deepEqual((await emptyCatalog.service.connect(credentials)).tcodes, []);
  const { service } = harness(t, { AI_RPT_META: { EV_REPORT: 'RM07MLBS', ET_PARAMS: [], ET_FIELDS: [], ET_VARIANTS: [], EV_MSG: 'OK' }, AI_RPT_RUN: { EV_JSON: '[]', EV_ROWS: 0, EV_TRUNCATED: '', EV_MSG: 'OK' } });
  const result = await service.run(runArgs(await connect(service)));
  assert.deepEqual(result, { rows: [], fields: [], rowCount: 0, truncated: false, message: 'OK' });
});

test('intfid preserves variant, repeated S rows, exclusions and leading zeros', async t => {
  const { service, calls } = harness(t);
  const connectionId = await connect(service);
  const metadata = await service.meta({ connectionId, tcode: 'MB52', variant: 'SAFE' });
  assert.equal(metadata.selection.length, 2);
  assert.equal(metadata.selection[0].low, '0010');
  assert.equal(metadata.selection[1].low, '0020');
  const selection = metadata.selection.map(({ selname, kind, sign, option, low, high }) => ({ selname, kind, sign, option, low, high }));
  const result = await service.run({ ...runArgs(connectionId), selection });
  assert.deepEqual(calls.at(-1).body.selection, selection);
  assert.equal(calls.at(-1).body.variant, 'SAFE');
  assert.equal(result.rows[0].matnr, '0000123');
  assert.equal(result.rows[0].amount, '9007199254740993.01');
});

test('intfid defaults maxRows to 5000, accepts 10000 and rejects higher or noninteger bounds', async t => {
  const { service, calls } = harness(t);
  const connectionId = await connect(service);
  await service.run(runArgs(connectionId));
  assert.equal(calls.at(-1).body.maxRows, 5000);
  await service.run({ ...runArgs(connectionId), max_rows: 10000 });
  assert.equal(calls.at(-1).body.maxRows, 10000);
  const previous = calls.length;
  for (const max_rows of [10001, 0, 1.1, '5000']) await assert.rejects(service.run({ ...runArgs(connectionId), max_rows }), codes('INVALID_INPUT'));
  assert.equal(calls.length, previous);
});

test('intfid refreshes authorization before metadata and execution', async t => {
  const overrides = {};
  const { service, calls } = harness(t, overrides);
  const connectionId = await connect(service);
  overrides.AI_RPT_CATALOG = { ET_LIST: [], EV_MSG: 'OK' };
  await assert.rejects(service.meta({ connectionId, tcode: 'MB52' }), codes('TCODE_FORBIDDEN'));
  await assert.rejects(service.run(runArgs(connectionId)), codes('TCODE_FORBIDDEN'));
  assert.deepEqual(calls.map(call => call.id), ['AI_RPT_CATALOG', 'AI_RPT_CATALOG', 'AI_RPT_CATALOG']);
});

test('intfid retains HTTP auth, redirect and response byte limits', async t => {
  for (const [status, code] of [[401, 'SAP_AUTH'], [403, 'SAP_FORBIDDEN'], [302, 'SAP_REDIRECT'], [500, 'SAP_HTTP']]) {
    const { service, calls } = harness(t, { AI_RPT_CATALOG: () => new Response(credentials.password, { status, headers: { location: 'https://other.example' } }) });
    await assert.rejects(service.connect(credentials), error => { assert.equal(error.code, code); assert.equal(error.message.includes(credentials.password), false); return true; });
    assert.equal(calls.length, 1);
  }
  const oversized = harness(t, {}, { responseBytes: 10 });
  await assert.rejects(oversized.service.connect(credentials), codes('SAP_RESPONSE_TOO_LARGE'));
  const bodyLimit = harness(t);
  const connectionId = await connect(bodyLimit.service);
  const selection = Array.from({ length: 300 }, () => ({ selname: 'WERKS', kind: 'S', sign: 'I', option: 'EQ', low: '0'.repeat(1024), high: '' }));
  await assert.rejects(bodyLimit.service.run({ ...runArgs(connectionId), selection }), codes('REQUEST_TOO_LARGE'));
  assert.equal(bodyLimit.calls.some(call => call.id === 'AI_RPT_RUN'), false);
});

function hanging({ init }) {
  return new Promise((_resolve, reject) => {
    const abort = () => reject(new DOMException('aborted', 'AbortError'));
    if (init.signal.aborted) abort();
    else init.signal.addEventListener('abort', abort, { once: true });
  });
}
test('intfid retains timeout, caller cancellation and cleanup', async t => {
  assert.equal(LIMITS.timeoutMs, 60_000);
  const timed = harness(t, { AI_RPT_CATALOG: hanging }, { timeoutMs: 5 });
  await assert.rejects(timed.service.connect(credentials), codes('SAP_TIMEOUT'));
  const cancelled = harness(t, { AI_RPT_CATALOG: hanging });
  const controller = new AbortController();
  const pending = cancelled.service.connect(credentials, controller.signal);
  controller.abort();
  await assert.rejects(pending, codes('CANCELLED'));
  assert.deepEqual(cancelled.service.status(), { connections: [] });
});

test('intfid UI and tool share metadata, execution and business failures', async t => {
  const overrides = {};
  const { service } = harness(t, overrides);
  const route = createRoute(service);
  const tool = createTool(service);
  const exec = { signal: new AbortController().signal };
  const ui = async args => (await route.fetch(new Request('http://localhost/api/sap-reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(args) }))).json();
  const response = await ui({ action: 'connect', ...credentials });
  assert.equal(response.ok, true);
  const connectionId = response.data.connectionId;
  for (const args of [{ action: 'meta', connectionId, tcode: 'MB52', variant: 'SAFE' }, { action: 'run', ...runArgs(connectionId) }]) assert.deepEqual(await ui(args), await tool.execute(args, exec));
  overrides.AI_RPT_RUN = () => Response.json({ STATUS: ' E ', MSGTXT: '无权限执行报表' }, { status: 202 });
  const args = { action: 'run', ...runArgs(connectionId) };
  assert.deepEqual(await ui(args), await tool.execute(args, exec));
  assert.equal((await ui(args)).error.code, 'SAP_ERROR');
  assert.equal((await tool.execute({ action: 'connect', ...credentials }, exec)).error.code, 'INVALID_ACTION');
});

test('legacy action and paths retain their existing bodies and optional EV_MSG behavior', async t => {
  for (const mode of ['action', 'paths']) {
    const { service, calls } = harness(t, { AI_RPT_CATALOG: { tcodes: catalog.ET_LIST }, AI_RPT_META: { selection: [], fields: [] }, AI_RPT_RUN: { rows: [{ id: '001' }] } });
    const { connectionId } = await service.connect({ ...credentials, mode });
    await service.run(runArgs(connectionId));
    for (const call of calls) assert.equal(call.url.searchParams.has('intfid'), false);
    const extra = mode === 'action' ? { action: 'get_user_tcodes' } : {};
    assert.deepEqual(calls[0].body, { ...extra, uname: '', catalog_only: true });
    assert.equal(calls.at(-1).body.report, 'RM07MLBS');
    assert.equal(calls.at(-1).body.max_rows, 5000);
    assert.equal(Object.hasOwn(calls.at(-1).body, 'maxRows'), false);
    assert.equal(calls.at(-1).url.pathname, mode === 'action' ? '/sap/bc/zsx_intf_serv/zsx_oa' : '/sap/bc/zsx_intf_serv/zsx_oa/run_alv_report');
  }
});
