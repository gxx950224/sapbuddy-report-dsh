import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SapReportsService, LIMITS, readLimitedJson } from '../service.js';
import { apply, createRoute, createTool, inject } from '../index.js';

const credentials = { endpoint: 'https://sap.example/sap/zai?lang=zh', username: 'ALICE', password: 'private-password', mode: 'action' };
const catalog = { ET_LIST: [{ TCODE: 'mb52', TEXT: 'Warehouse stocks', REPORT: 'RM07MLBS', GROUP: 'Inventory' }], EV_MSG: 'OK, 1 tcodes' };
const metadata = { EV_REPORT: 'RM07MLBS', ET_PARAMS: [{ SELNAME: 'WERKS', KIND: 'S', TEXT: 'Plant', OBLIGATORY: 'X', LOW: '1000', SIGN: 'I', OPTION: 'EQ' }, { SELNAME: 'P_FLAG', KIND: 'P', TEXT: 'Flag', TYPE: 'CHECKBOX', DEFAULT: false }], ET_FIELDS: [{ FIELDNAME: 'MATNR', SCRTEXT_L: 'Material', DATATYPE: 'CHAR' }], EV_MSG: 'OK' };
const execution = { EV_JSON: '[{"matnr":"00001"},{"matnr":"00002"}]', EV_ROWS: 2, EV_TRUNCATED: '', EV_MSG: 'OK' };
function harness(t, overrides = {}, options = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    const action = body.action ?? new URL(url).pathname.split('/').at(-1);
    calls.push({ url, init, body, action });
    const value = Object.hasOwn(overrides, action) ? overrides[action] : ({ get_user_tcodes: catalog, get_report_meta: metadata, run_alv_report: execution })[action];
    if (typeof value === 'function') return value({ url, init, body, calls });
    return Response.json(value);
  };
  const service = new SapReportsService({ fetchImpl, settingsFile: null, ...options });
  t.after(() => service.dispose());
  return { service, calls, overrides };
}
const code = expected => error => { assert.equal(error.code, expected); return true; };
const connected = async service => (await service.connect(credentials)).connectionId;
const runArgs = connectionId => ({ connectionId, tcode: 'MB52', variant: '', selection: [], max_rows: 5000 });

test('connect uses exact HTTPS action endpoint, logged-in user, Basic auth and sanitized return', async t => {
  const { service, calls } = harness(t);
  const result = await service.connect({ ...credentials, sapClient: '100' });
  assert.equal(calls[0].url, 'https://sap.example/sap/zai?lang=zh&sap-client=100');
  assert.deepEqual(calls[0].body, { action: 'get_user_tcodes', uname: '', catalog_only: true });
  assert.equal(calls[0].init.headers.authorization, `Basic ${Buffer.from('ALICE:private-password').toString('base64')}`);
  assert.equal(calls[0].init.redirect, 'manual');
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(result.tcodes, [{ tcode: 'MB52', text: 'Warehouse stocks', report: 'RM07MLBS', group: 'Inventory' }]);
  assert.equal(result.endpoint, 'https://sap.example/sap/zai?sap-client=100');
  assert.equal(JSON.stringify(result).includes(credentials.password), false);
  assert.deepEqual(service.status().connections, [{ connectionId: result.connectionId, username: 'ALICE', endpoint: result.endpoint, tlsVerified: true }]);
  assert.equal(result.tlsVerified, true);
});

test('allowUntrustedTls must be a boolean', async t => {
  const { service, calls } = harness(t);
  for (const allowUntrustedTls of ['true', 1, {}]) await assert.rejects(service.connect({ ...credentials, allowUntrustedTls }), code('INVALID_INPUT'));
  assert.equal(calls.length, 0);
});

test('relaxed TLS transport honours method, body, headers and status', async t => {
  const seen = [];
  const insecureFetchImpl = async (url, init) => {
    seen.push({ url, init });
    return Response.json(catalog);
  };
  const service = new SapReportsService({ fetchImpl: async () => { throw new Error('verified transport must not be used'); }, insecureFetchImpl, settingsFile: null });
  t.after(() => service.dispose());
  const result = await service.connect({ ...credentials, allowUntrustedTls: true });
  assert.equal(seen.length, 1);
  assert.equal(seen[0].init.method, 'POST');
  assert.equal(seen[0].init.redirect, 'manual');
  assert.equal(seen[0].init.headers.authorization, `Basic ${Buffer.from('ALICE:private-password').toString('base64')}`);
  assert.equal(seen[0].init.body, JSON.stringify({ action: 'get_user_tcodes', uname: '', catalog_only: true }));
  assert.deepEqual(result.tcodes, [{ tcode: 'MB52', text: 'Warehouse stocks', report: 'RM07MLBS', group: 'Inventory' }]);
  assert.equal(result.tlsVerified, false);
  assert.equal(service.status().connections[0].tlsVerified, false);
});

test('settings persist the connection for reuse with owner-only file mode', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'sap-reports-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const settingsFile = join(dir, 'connection.json');
  const { service } = harness(t, {}, { settingsFile, insecureFetchImpl: async () => Response.json(catalog) });
  assert.deepEqual(service.settings(), { endpoint: '', username: '', sapClient: '', password: '', allowUntrustedTls: false });
  await service.connect({ ...credentials, sapClient: '123', allowUntrustedTls: true });
  const saved = service.settings();
  assert.equal(saved.username, 'ALICE');
  assert.equal(saved.sapClient, '123');
  assert.equal(saved.allowUntrustedTls, true);
  assert.match(saved.endpoint, /sap-client=123/u);
  const raw = JSON.parse(await readFile(settingsFile, 'utf8'));
  assert.equal(raw.password, credentials.password);
  assert.equal(raw.username, 'ALICE');
  assert.equal(raw.sapClient, '123');
  assert.equal((await stat(settingsFile)).mode & 0o777, 0o600);
  await assert.rejects(service.dispatch({ action: 'settings' }, { caller: 'tool' }), code('INVALID_ACTION'));
});

test('paths appends each operation before preserved query and omits action body field', async t => {
  const { service, calls } = harness(t);
  const { connectionId } = await service.connect({ ...credentials, mode: 'paths', endpoint: 'https://sap.example/sap/zai/?sap-client=200&lang=en' });
  await service.meta({ connectionId, tcode: 'MB52', variant: 'SAFE' });
  assert.equal(calls[0].url, 'https://sap.example/sap/zai/get_user_tcodes?sap-client=200&lang=en');
  assert.deepEqual(calls[2].body, { tcode: 'MB52', report: 'RM07MLBS', variant: 'SAFE' });
  assert.equal(new URL(calls[2].url).pathname, '/sap/zai/get_report_meta');
});

test('rejects unsafe endpoint or credentials before any network request', async t => {
  const { service, calls } = harness(t);
  for (const endpoint of ['http://sap.example', 'https://user:pass@sap.example', 'https://sap.example/#secret', 'https://sap.example/?access_token=secret']) await assert.rejects(service.connect({ ...credentials, endpoint }), code('INVALID_ENDPOINT'));
  for (const invalid of [{ username: '' }, { username: 'alice:bob' }, { password: '' }, { sapClient: '10' }, { mode: 'GET' }]) await assert.rejects(service.connect({ ...credentials, ...invalid }), code('INVALID_INPUT'));
  assert.equal(calls.length, 0);
});

test('rechecks current catalog before meta/run and prevents arbitrary report override', async t => {
  const overrides = {};
  const { service, calls } = harness(t, overrides);
  const connectionId = await connected(service);
  overrides.get_user_tcodes = { tcodes: [] };
  await assert.rejects(service.meta({ connectionId, tcode: 'MB52' }), code('TCODE_FORBIDDEN'));
  await assert.rejects(service.run(runArgs(connectionId)), code('TCODE_FORBIDDEN'));
  await assert.rejects(service.run({ ...runArgs(connectionId), report: 'Z_UNAUTHORIZED' }), code('INVALID_INPUT'));
  assert.deepEqual(calls.map(call => call.action), ['get_user_tcodes', 'get_user_tcodes', 'get_user_tcodes']);
});

test('ABAP meta preserves repeated ranges, empty and false defaults, aliases and variants', async t => {
  const { service } = harness(t, { get_report_meta: { ...metadata, et_params: undefined, ET_PARAMS: [...metadata.ET_PARAMS, { SELNAME: 'WERKS', KIND: 'S', LOW: '2000', HIGH: '2999', SIGN: 'E', OPTION: 'BT' }, { SELNAME: 'P_MODE', KIND: 'P', DEFAULT: '', OPTIONS: [{ VALUE: 'A', LABEL: 'All' }] }], ET_VARIANTS: [{ VARIANT: 'SAFE', TEXT: 'Safe scope' }] } });
  const result = await service.meta({ connectionId: await connected(service), tcode: 'mb52' });
  assert.equal(result.selection.length, 4);
  assert.equal(result.selection[0].obligatory, true);
  assert.equal(result.selection[1].default, '');
  assert.equal(result.selection[2].high, '2999');
  assert.deepEqual(result.selection[3].options, [{ value: 'A', label: 'All' }]);
  assert.deepEqual(result.variants, [{ name: 'SAFE', text: 'Safe scope' }]);
  assert.deepEqual(result.fields, [{ field: 'MATNR', label: 'Material', type: 'CHAR' }]);
});

test('run parses serialized EV_JSON, aligns field casing, truncates locally and counts returned rows', async t => {
  const { service, calls } = harness(t);
  const result = await service.run({ ...runArgs(await connected(service)), max_rows: 1, selection: [{ selname: 'WERKS', kind: 'S', sign: 'I', option: 'EQ', low: '1000', high: '' }] });
  assert.deepEqual(result, { rows: [{ matnr: '00001' }], fields: [{ field: 'matnr', label: 'Material', type: 'CHAR' }], rowCount: 1, truncated: true, message: 'OK' });
  assert.equal(calls.at(-1).body.report, 'RM07MLBS');
  assert.equal(calls.at(-1).body.max_rows, 1);
  assert.equal(calls.at(-1).body.selection[0].low, '1000');
});

test('normalized envelopes, numeric strings, no fields and variant-only metadata are accepted', async t => {
  const { service, calls } = harness(t, {
    get_user_tcodes: { ok: true, data: { tcodes: catalog.ET_LIST } },
    get_report_meta: { success: true, data: { report: 'RM07MLBS', selection: [], fields: [] } },
    run_alv_report: { ok: true, data: { rows: [{ id: '0001', amount: '12345678901234567890.01' }], rowCount: 99, truncated: false } },
  });
  const result = await service.run({ ...runArgs(await connected(service)), variant: 'SAFE' });
  assert.deepEqual(result.fields, [{ field: 'id', label: 'id' }, { field: 'amount', label: 'amount' }]);
  assert.equal(result.rows[0].amount, '12345678901234567890.01');
  assert.equal(result.truncated, true);
  assert.deepEqual(calls.at(-1).body.selection, []);
});

test('valid multi-ranges and explicit blank checkbox are sent unchanged', async t => {
  const { service, calls } = harness(t);
  const selection = [{ selname: 'WERKS', kind: 'S', sign: 'I', option: 'BT', low: '1000', high: '2000' }, { selname: 'WERKS', kind: 'S', sign: 'E', option: 'EQ', low: '1500', high: '' }, { selname: 'P_FLAG', kind: 'P', sign: 'I', option: 'EQ', low: '', high: '' }];
  await service.run({ ...runArgs(await connected(service)), selection });
  assert.deepEqual(calls.at(-1).body.selection, selection);
});

test('blank obligatory, unknown fields, malformed and reversed ranges never execute', async t => {
  const { service, calls } = harness(t);
  const args = runArgs(await connected(service));
  const row = { selname: 'WERKS', kind: 'S', sign: 'I', option: 'EQ', low: '1000', high: '' };
  for (const [change, expected] of [[{ low: '  ' }, 'REQUIRED_SELECTION'], [{ sign: 'E' }, 'REQUIRED_SELECTION'], [{ selname: 'UNKNOWN' }, 'INVALID_SELECTION'], [{ kind: 'P' }, 'INVALID_SELECTION'], [{ sign: 'Q' }, 'INVALID_SELECTION'], [{ option: 'BT' }, 'INVALID_SELECTION'], [{ option: 'BT', low: '2000', high: '1000' }, 'INVALID_SELECTION'], [{ high: '2000' }, 'INVALID_SELECTION'], [{ option: 'BAD' }, 'INVALID_INPUT']]) await assert.rejects(service.run({ ...args, selection: [{ ...row, ...change }] }), code(expected));
  assert.equal(calls.some(call => call.action === 'run_alv_report'), false);
});

test('single parameters and radio options validate; max_rows must be integer within cap', async t => {
  const { service, calls } = harness(t, { get_report_meta: { selection: [{ selname: 'P_MODE', kind: 'P', options: [{ value: 'A', label: 'All' }] }], fields: [] } });
  const args = runArgs(await connected(service));
  const row = { selname: 'P_MODE', kind: 'P', low: 'A' };
  for (const selection of [[row, row], [{ ...row, low: 'B' }], [{ ...row, option: 'NE' }]]) await assert.rejects(service.run({ ...args, selection }), code('INVALID_SELECTION'));
  for (const max_rows of [0, -1, 10001, 1.1, '5']) await assert.rejects(service.run({ ...args, max_rows }), code('INVALID_INPUT'));
  assert.equal(calls.some(call => call.action === 'run_alv_report'), false);
});

test('HTTP statuses and redirects normalize without exposing upstream response body', async t => {
  for (const [status, expected] of [[401, 'SAP_AUTH'], [403, 'SAP_FORBIDDEN'], [500, 'SAP_HTTP'], [302, 'SAP_REDIRECT']]) {
    const { service, calls } = harness(t, { get_user_tcodes: () => new Response(credentials.password, { status, headers: { location: 'https://other.example' } }) });
    await assert.rejects(service.connect(credentials), error => { assert.equal(error.code, expected); assert.ok(!error.message.includes(credentials.password)); return true; });
    assert.equal(calls.length, 1);
    assert.equal(service.status().connections.length, 0);
  }
});

test('SAP errors, ABAP EV_MSG and BAPI returns fail with redacted messages', async t => {
  for (const body of [{ ok: false, error: { code: 'BAD', message: `Denied ${credentials.password}` } }, { EV_MSG: 'No ALV data captured', EV_JSON: '' }, { ET_RETURN: [{ TYPE: 'E', MESSAGE: 'Missing permission' }] }, { status: 'error', message: 'Report unavailable' }]) {
    const { service } = harness(t, { get_user_tcodes: body });
    await assert.rejects(service.connect(credentials), error => { assert.equal(error.code, 'SAP_ERROR'); assert.ok(!error.message.includes(credentials.password)); return true; });
  }
});

test('invalid SAP JSON, missing shape, invalid serialized rows and oversized body fail', async t => {
  const { service } = harness(t, { get_user_tcodes: () => new Response('<html>login</html>') });
  await assert.rejects(service.connect(credentials), code('SAP_RESPONSE'));
  const large = harness(t, {}, { responseBytes: 10 });
  await assert.rejects(large.service.connect(credentials), code('SAP_RESPONSE_TOO_LARGE'));
  const missing = harness(t, { get_user_tcodes: {} });
  await assert.rejects(missing.service.connect(credentials), code('SAP_RESPONSE'));
  for (const EV_JSON of ['invalid', '[1,2]', '{}']) {
    const malformed = harness(t, { run_alv_report: { EV_JSON, EV_MSG: 'OK' } });
    await assert.rejects(malformed.service.run(runArgs(await connected(malformed.service))), code('SAP_RESPONSE'));
  }
});

test('streamed body limit applies without content-length', async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"long":"abcdef"}')); controller.close(); } });
  await assert.rejects(readLimitedJson(new Response(stream), 5, 'SAP_RESPONSE_TOO_LARGE'), code('SAP_RESPONSE_TOO_LARGE'));
});

function hanging({ init }) {
  return new Promise((_resolve, reject) => {
    if (init.signal.aborted) reject(new DOMException('aborted', 'AbortError'));
    else init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
}
test('60s production timeout is configurable for mocked timeout verification', async t => {
  assert.equal(LIMITS.timeoutMs, 60_000);
  const { service } = harness(t, { get_user_tcodes: hanging }, { timeoutMs: 5 });
  await assert.rejects(service.connect(credentials), code('SAP_TIMEOUT'));
  assert.deepEqual(service.status(), { connections: [] });
});

test('caller abort, disconnect and unload cancel in-flight requests', async t => {
  for (const mode of ['caller', 'disconnect', 'dispose']) {
    const overrides = {};
    const { service } = harness(t, overrides);
    const connectionId = await connected(service);
    overrides.get_user_tcodes = hanging;
    const controller = new AbortController();
    const pending = service.list({ connectionId }, controller.signal);
    if (mode === 'caller') controller.abort();
    if (mode === 'disconnect') service.disconnect({ connectionId });
    if (mode === 'dispose') service.dispose();
    await assert.rejects(pending, code('CANCELLED'));
    if (mode !== 'caller') assert.deepEqual(service.status(), { connections: [] });
  }
});

test('idle expiry, missing explicit connection and disconnect are handled safely', async t => {
  let now = 100;
  const { service, calls } = harness(t, {}, { now: () => now });
  const connectionId = await connected(service);
  now += LIMITS.idleMs;
  await assert.rejects(service.list({ connectionId }), code('CONNECTION_EXPIRED'));
  await assert.rejects(service.list({ connectionId }), code('CONNECTION_NOT_FOUND'));
  await assert.rejects(service.list({}), code('INVALID_INPUT'));
  assert.deepEqual(service.disconnect({ connectionId }), { disconnected: true });
  assert.deepEqual(service.status(), { connections: [] });
  assert.equal(calls.length, 1);
});

test('connection limit and pending connect disposal prevent late credential resurrection', async t => {
  const { service } = harness(t);
  for (let i = 0; i < LIMITS.maxConnections; i++) await connected(service);
  await assert.rejects(service.connect(credentials), code('CONNECTION_LIMIT'));
  const pendingHarness = harness(t, { get_user_tcodes: hanging });
  const pending = pendingHarness.service.connect(credentials);
  assert.deepEqual(pendingHarness.service.status(), { connections: [] });
  pendingHarness.service.dispose();
  await assert.rejects(pending, code('CANCELLED'));
  assert.equal(pendingHarness.service.status().connections.length, 0);
});

test('UI and tool share results; tool cannot connect/disconnect or supply credentials', async t => {
  const { service } = harness(t);
  const route = createRoute(service);
  const tool = createTool(service);
  const exec = { signal: new AbortController().signal };
  const request = body => new Request('http://localhost/api/sap-reports', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const connectedResult = await (await route.fetch(request({ action: 'connect', ...credentials }))).json();
  const args = { action: 'list', connectionId: connectedResult.data.connectionId };
  assert.deepEqual(await (await route.fetch(request(args))).json(), await tool.execute(args, exec));
  const run = { action: 'run', ...runArgs(args.connectionId) };
  assert.deepEqual(await (await route.fetch(request(run))).json(), await tool.execute(run, exec));
  for (const action of ['connect', 'disconnect']) assert.equal((await tool.execute({ action, ...credentials }, exec)).error.code, 'INVALID_ACTION');
  assert.equal((await tool.execute({ ...args, password: 'secret' }, exec)).error.code, 'INVALID_INPUT');
  assert.deepEqual(tool.parameters.properties.action.enum, ['status', 'list', 'meta', 'run']);
  assert.equal(route.path, '/api/sap-reports');
  assert.equal(route.requestBody, 'buffered');
});

test('tool accepts action-irrelevant declared fields emitted by strict transports', async t => {
  const { service, calls } = harness(t);
  const tool = createTool(service);
  const exec = { signal: new AbortController().signal };
  const padded = { connectionId: '', tcode: '', variant: '', selection: [], max_rows: 5000 };
  assert.deepEqual(await tool.execute({ action: 'status', ...padded }, exec), { ok: true, data: { connections: [] } });
  assert.equal(calls.length, 0);
  const connectionId = await connected(service);
  assert.deepEqual(await tool.execute({ ...padded, action: 'list', connectionId }, exec), { ok: true, data: await service.list({ connectionId }) });
  assert.deepEqual(await tool.execute({ ...padded, action: 'meta', connectionId, tcode: 'MB52' }, exec), { ok: true, data: await service.meta({ connectionId, tcode: 'MB52', variant: '' }) });
  assert.equal((await tool.execute({ ...padded, action: 'status', password: 'secret' }, exec)).error.code, 'INVALID_INPUT');
});

test('route rejects invalid body, content type and large request with JSON errors', async t => {
  const { service } = harness(t);
  const route = createRoute(service);
  for (const [body, type, expected, status] of [['{bad', 'application/json', 'INVALID_JSON', 400], ['{}', 'text/plain', 'INVALID_CONTENT_TYPE', 415], ['x'.repeat(LIMITS.requestBytes + 1), 'application/json', 'REQUEST_TOO_LARGE', 413]]) {
    const result = await route.fetch(new Request('http://localhost/api/sap-reports', { method: 'POST', headers: { 'content-type': type }, body }));
    assert.equal(result.status, status);
    assert.equal((await result.json()).error.code, expected);
    assert.equal(result.headers.get('cache-control'), 'no-store');
  }
});

test('repeated descriptors retain required flags, labels, type and options for every range', async t => {
  const { service, calls } = harness(t, { get_report_meta: { ET_PARAMS: [
    { SELNAME: 'MODE', KIND: 'S', TEXT: 'Mode', OBLIGATORY: 'X', TYPE: 'CHAR', OPTIONS: [{ VALUE: 'A', LABEL: 'All' }], LOW: 'A' },
    { SELNAME: 'MODE', KIND: 'S', LOW: 'A', SIGN: 'E', OPTION: 'EQ' },
  ] } });
  const connectionId = await connected(service);
  const result = await service.meta({ connectionId, tcode: 'MB52' });
  assert.equal(result.selection[1].obligatory, true);
  assert.equal(result.selection[1].type, 'CHAR');
  assert.equal(result.selection[1].text, 'Mode');
  assert.deepEqual(result.selection[1].options, [{ value: 'A', label: 'All' }]);
  assert.equal(result.selection[1].sign, 'E');
  await assert.rejects(service.run({ ...runArgs(connectionId), selection: [{ selname: 'MODE', kind: 'S', low: 'B' }] }), code('INVALID_SELECTION'));
  assert.equal(calls.some(call => call.action === 'run_alv_report'), false);
});

test('blank SAP SIGN/OPTION normalize for obligatory variant parameters', async t => {
  const { service } = harness(t, { get_report_meta: { ET_PARAMS: [{ SELNAME: 'P_PLANT', KIND: 'P', OBLIGATORY: 'X', LOW: '1000', SIGN: '', OPTION: '' }] } });
  const connectionId = await connected(service);
  const meta = await service.meta({ connectionId, tcode: 'MB52', variant: 'SAFE' });
  assert.equal(meta.selection[0].sign, 'I');
  assert.equal(meta.selection[0].option, 'EQ');
  assert.equal((await service.run({ ...runArgs(connectionId), variant: 'SAFE' })).rowCount, 2);
  await assert.rejects(service.run({ ...runArgs(connectionId), variant: 'SAFE', selection: [{ selname: 'P_PLANT', kind: 'P', low: '' }] }), code('REQUIRED_SELECTION'));
});

test('Host registers inspected contracts and disposes both effects', async () => {
  const disposed = [];
  let cleanup;
  assert.deepEqual(inject, ['connection', 'tools']);
  apply({ effect: callback => { cleanup = callback(); }, connection: { fetch: { register: route => { assert.equal(route.path, '/api/sap-reports'); return async () => disposed.push('route'); } } }, tools: { register: tool => { assert.equal(tool.name, 'sap_reports'); assert.equal(typeof tool.output.render, 'function'); return () => disposed.push('tool'); } } });
  await cleanup();
  assert.deepEqual(disposed, ['tool', 'route']);
});
