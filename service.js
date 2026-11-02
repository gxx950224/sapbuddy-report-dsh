import { randomUUID } from 'node:crypto';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

// 连接配置落在插件目录，密码不落盘
const SETTINGS_FILE = fileURLToPath(new URL('./connection.json', import.meta.url));

function readSettings(file) {
  if (!file) return { endpoint: '', username: '', sapClient: '', password: '', allowUntrustedTls: false };
  try {
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    return {
      endpoint: String(saved.endpoint ?? ''),
      username: String(saved.username ?? ''),
      sapClient: String(saved.sapClient ?? ''),
      password: String(saved.password ?? ''),
      allowUntrustedTls: saved.allowUntrustedTls === true,
    };
  } catch {
    return { endpoint: '', username: '', sapClient: '', password: '', allowUntrustedTls: false };
  }
}

function saveSettings(file, { endpoint, username, password, allowUntrustedTls }) {
  if (!file) return;
  try {
    let sapClient = '';
    try { sapClient = new URL(endpoint).searchParams.get('sap-client') ?? ''; } catch { sapClient = ''; }
    writeFileSync(file, `${JSON.stringify({ endpoint, username, sapClient, password, allowUntrustedTls: allowUntrustedTls === true }, null, 2)}\n`, { mode: 0o600 });
    chmodSync(file, 0o600);
  } catch {
    // 插件目录不可写时静默跳过，不影响连接
  }
}

// 仅在连接显式开启 allowUntrustedTls 时使用：跳过证书校验的 https 实现。
function insecureFetch(target, init) {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(new URL(target), {
      method: init.method,
      headers: init.headers,
      rejectUnauthorized: false,
      signal: init.signal,
    }, response => {
      const headers = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) for (const item of value) headers.append(name, item);
        else if (value !== undefined) headers.set(name, String(value));
      }
      resolve(new Response(Readable.toWeb(response), {
        status: response.statusCode ?? 502,
        statusText: response.statusMessage ?? '',
        headers,
      }));
    });
    request.on('error', reject);
    request.end(init.body);
  });
}

const REPORT_INTFIDS = Object.freeze({
  get_user_tcodes: 'AI_RPT_CATALOG',
  get_report_meta: 'AI_RPT_META',
  run_alv_report: 'AI_RPT_RUN',
});

export const LIMITS = Object.freeze({ timeoutMs: 60_000, idleMs: 30 * 60_000, requestBytes: 256 * 1024, responseBytes: 8 * 1024 * 1024, maxRows: 10_000, maxConnections: 8, maxSelection: 500 });
export class SapError extends Error {
  constructor(code, message, status = 400) { super(message); this.name = 'SapError'; this.code = code; this.status = status; }
}
const fail = (code, message, status) => { throw new SapError(code, message, status); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const pick = (value, ...keys) => {
  if (!object(value)) return undefined;
  for (const key of keys) {
    const found = Object.keys(value).find(candidate => candidate.toLowerCase() === key.toLowerCase());
    if (found !== undefined) return value[found];
  }
};
const text = value => value === undefined || value === null ? '' : String(value);
const truth = value => value === true || value === 1 || ['x', 'true', '1'].includes(text(value).trim().toLowerCase());
function input(value, keys) {
  if (!object(value) || Object.keys(value).some(key => !keys.includes(key))) fail('INVALID_INPUT', 'Request contains an unknown field or is not an object.');
}
function string(value, name, max = 256, optional = false) {
  if (optional && value === undefined) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) fail('INVALID_INPUT', `${name} must be text of at most ${max} characters without control characters.`);
  return value;
}
function identifier(value, name, max = 40) {
  const result = string(value, name, max).trim().toUpperCase();
  if (!/^[A-Z0-9_/$=-]+$/u.test(result)) fail('INVALID_INPUT', `${name} is not a valid SAP identifier.`);
  return result;
}
function array(value, name, optional = false) {
  if (optional && value === undefined) return [];
  if (!Array.isArray(value)) fail('SAP_RESPONSE', `SAP response ${name} must be an array.`, 502);
  return value;
}
function parse(value, name) {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { fail('SAP_RESPONSE', `SAP returned invalid JSON in ${name}.`, 502); }
}
function safeMessage(value, connection) {
  let result = text(object(value) ? pick(value, 'message', 'value', 'text') : value).replace(/[\u0000-\u001f\u007f]/gu, ' ');
  if (connection?.password) {
    for (const secret of [connection.password, Buffer.from(`${connection.username}:${connection.password}`, 'utf8').toString('base64')]) result = result.split(secret).join('[redacted]');
  }
  return result.slice(0, 1000);
}
function unwrap(value, connection) {
  if (!object(value) && !Array.isArray(value)) fail('SAP_RESPONSE', 'SAP response must be a JSON object or array.', 502);
  const error = pick(value, 'error');
  const status = text(pick(value, 'status')).toLowerCase();
  if (connection?.mode === 'intfid' && ['e', 'a', 'x'].includes(status.trim())) {
    fail('SAP_ERROR', safeMessage(pick(value, 'msgtxt', 'message', 'ev_msg') || 'SAP rejected the interface request.', connection), 502);
  }
  if (pick(value, 'ok', 'success') === false || error || ['error', 'failed', 'failure'].includes(status)) {
    fail('SAP_ERROR', safeMessage(error || pick(value, 'message', 'ev_msg') || 'SAP rejected the request.', connection), 502);
  }
  const returns = pick(value, 'return', 'et_return');
  const fatal = (Array.isArray(returns) ? returns : returns ? [returns] : []).find(row => ['E', 'A', 'X'].includes(text(pick(row, 'type')).toUpperCase()));
  if (fatal) fail('SAP_ERROR', safeMessage(pick(fatal, 'message') || 'SAP rejected the request.', connection), 502);
  const msg = pick(value, 'ev_msg');
  if (text(msg).trim() && !/^ok(?:\b|[, :(])/iu.test(text(msg).trim())) fail('SAP_ERROR', safeMessage(msg, connection), 502);
  if (pick(value, 'ok', 'success') === true && pick(value, 'data') !== undefined) return unwrap(pick(value, 'data'), connection);
  return value;
}
export async function readLimitedJson(message, limit, code = 'REQUEST_TOO_LARGE') {
  const over = () => fail(code, code === 'REQUEST_TOO_LARGE' ? 'JSON request exceeds 256 KiB.' : 'SAP response exceeds the size limit.', code === 'REQUEST_TOO_LARGE' ? 413 : 502);
  if (Number(message.headers.get('content-length')) > limit) { await message.body?.cancel().catch(() => {}); over(); }
  if (!message.body) fail('INVALID_JSON', 'An application/json body is required.');
  const reader = message.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel().catch(() => {}); over(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks, size).toString('utf8')); }
  catch { fail(code === 'REQUEST_TOO_LARGE' ? 'INVALID_JSON' : 'SAP_RESPONSE', 'Response or request body is not valid JSON.', code === 'REQUEST_TOO_LARGE' ? 400 : 502); }
}
function normalizeFields(value, rows = []) {
  if (value === undefined) return [...new Set(rows.flatMap(row => Object.keys(row)))].map(field => ({ field, label: field }));
  return array(value, 'fields').map(row => {
    const field = text(pick(row, 'field', 'fieldname')).trim();
    if (!field) fail('SAP_RESPONSE', 'SAP field metadata is missing a field name.', 502);
    const type = pick(row, 'type', 'datatype', 'inttype');
    return { field, label: text(pick(row, 'label', 'text', 'scrtext_l', 'scrtext_m', 'coltext')) || field, ...(type === undefined ? {} : { type: text(type) }) };
  });
}
function normalizeTcodes(value) {
  const source = Array.isArray(value) ? value : pick(value, 'tcodes', 'et_list');
  const seen = new Set();
  return array(source, 'tcodes/ET_LIST').map(row => {
    const tcode = text(pick(row, 'tcode')).trim().toUpperCase();
    if (!tcode || !/^[A-Z0-9_/$=-]{1,20}$/u.test(tcode)) fail('SAP_RESPONSE', 'SAP returned an invalid transaction code.', 502);
    return { tcode, text: text(pick(row, 'text', 'label')) || tcode, report: text(pick(row, 'report', 'pgmna')).trim(), ...(pick(row, 'group') === undefined ? {} : { group: text(pick(row, 'group')) }) };
  }).filter(row => !seen.has(row.tcode) && seen.add(row.tcode));
}
function normalizeMeta(value, report) {
  if (!object(value)) fail('SAP_RESPONSE', 'SAP metadata must be an object.', 502);
  const source = pick(value, 'selection', 'et_params');
  if (source === undefined) fail('SAP_RESPONSE', 'SAP metadata must include selection or ET_PARAMS (an empty array is allowed).', 502);
  const selection = array(source, 'selection/ET_PARAMS').map(row => {
    const selname = text(pick(row, 'selname')).trim().toUpperCase();
    const kind = text(pick(row, 'kind')).trim().toUpperCase();
    if (!selname || !['P', 'S'].includes(kind)) fail('SAP_RESPONSE', 'SAP selection metadata needs selname and kind P or S.', 502);
    const result = { selname, kind, text: text(pick(row, 'text', 'label')) || selname, obligatory: truth(pick(row, 'obligatory', 'required')) };
    for (const key of ['type', 'default', 'low', 'high', 'sign', 'option']) {
      const item = pick(row, key, ...(key === 'type' ? ['datatype', 'inttype'] : []));
      if (item !== undefined && item !== null) result[key] = typeof item === 'boolean' && ['default', 'low', 'high'].includes(key) ? (item ? 'X' : '') : text(item);
    }
    result.sign = result.sign?.trim().toUpperCase() || 'I';
    result.option = result.option?.trim().toUpperCase() || 'EQ';
    const options = pick(row, 'options');
    if (options !== undefined) result.options = array(options, 'options').map(option => ({ value: text(pick(option, 'value')), label: text(pick(option, 'label', 'text', 'value')) }));
    return result;
  });
  const descriptors = new Map();
  for (const row of selection) {
    const shared = descriptors.get(row.selname);
    if (!shared) {
      descriptors.set(row.selname, { kind: row.kind, text: row.text, obligatory: row.obligatory, ...(row.type ? { type: row.type } : {}), ...(row.options ? { options: row.options } : {}) });
      continue;
    }
    if (shared.kind !== row.kind) fail('SAP_RESPONSE', 'SAP returned inconsistent kinds for one selection field.', 502);
    shared.obligatory ||= row.obligatory;
    if (shared.text === row.selname && row.text !== row.selname) shared.text = row.text;
    if (!shared.type && row.type) shared.type = row.type;
    if (!shared.options?.length && row.options) shared.options = row.options;
  }
  for (const row of selection) Object.assign(row, descriptors.get(row.selname));
  const variants = pick(value, 'variants', 'et_variants');
  return { report: text(pick(value, 'report', 'ev_report')) || report, selection, fields: normalizeFields(pick(value, 'fields', 'et_fields')), ...(variants === undefined ? {} : { variants: array(variants, 'variants').map(row => ({ name: text(pick(row, 'name', 'variant')), text: text(pick(row, 'text', 'label')) })) }) };
}
function normalizedSelection(value, meta) {
  if (!Array.isArray(value) || value.length > LIMITS.maxSelection) fail('INVALID_SELECTION', `selection must be an array of at most ${LIMITS.maxSelection} rows.`);
  const definitions = new Map(meta.selection.map(row => [row.selname, row]));
  const parameters = new Set();
  const result = value.map(row => {
    input(row, ['selname', 'kind', 'sign', 'option', 'low', 'high']);
    const selname = identifier(row.selname, 'selname', 30);
    const definition = definitions.get(selname);
    if (!definition) fail('INVALID_SELECTION', `Unknown selection field: ${selname}.`);
    const kind = string(row.kind, 'kind', 1).toUpperCase();
    const sign = string(row.sign ?? 'I', 'sign', 1).toUpperCase();
    const option = string(row.option ?? 'EQ', 'option', 2).toUpperCase();
    const low = string(row.low ?? '', 'low', 1024);
    const high = string(row.high ?? '', 'high', 1024);
    if (kind !== definition.kind || !['I', 'E'].includes(sign) || !['EQ', 'NE', 'GT', 'GE', 'LT', 'LE', 'BT', 'NB', 'CP', 'NP'].includes(option)) fail('INVALID_SELECTION', `Invalid kind, sign or option for ${selname}.`);
    if (kind === 'P' && (sign !== 'I' || option !== 'EQ' || high !== '' || parameters.has(selname))) fail('INVALID_SELECTION', `${selname} is a single parameter; use one I/EQ row without high.`);
    if (kind === 'P') parameters.add(selname);
    if (['BT', 'NB'].includes(option)) {
      if (!low.trim() || !high.trim()) fail('INVALID_SELECTION', `${selname} range requires both low and high.`);
      const numeric = /^[-+]?\d+(?:\.\d+)?$/u;
      const ordered = numeric.test(low) && numeric.test(high) ? Number(low) <= Number(high) : low <= high;
      if (!ordered) fail('INVALID_SELECTION', `${selname} range low must not exceed high.`);
    } else if (high !== '') fail('INVALID_SELECTION', `${selname} high is only valid with BT or NB.`);
    if (definition.options?.length && low !== '' && !definition.options.some(item => item.value === low)) fail('INVALID_SELECTION', `${selname} value is not among its allowed options.`);
    return { selname, kind, sign, option, low, high };
  });
  for (const definition of meta.selection) {
    if (!definition.obligatory) continue;
    const supplied = result.filter(row => row.selname === definition.selname);
    // Explicit blank overrides must never be silently replaced by a variant/default.
    const effective = supplied.length ? supplied : meta.selection.filter(row => row.selname === definition.selname).map(row => ({ sign: row.sign ?? 'I', low: row.low ?? row.default ?? '' }));
    if (!effective.some(row => row.sign === 'I' && row.low.trim() !== '')) fail('REQUIRED_SELECTION', `Required selection field is blank: ${definition.selname}.`);
  }
  return result;
}
function publicEndpoint(endpoint) {
  const url = new URL(endpoint);
  const client = url.searchParams.get('sap-client');
  url.search = '';
  if (client !== null) url.searchParams.set('sap-client', client);
  return url.href;
}
export class SapReportsService {
  #connections = new Map();
  #controllers = new Set();
  #fetch; #insecureFetch; #settingsFile; #now; #timeoutMs; #idleMs; #responseBytes; #timer; #disposed = false;
  constructor({ fetchImpl = globalThis.fetch, insecureFetchImpl = insecureFetch, settingsFile = SETTINGS_FILE, now = Date.now, timeoutMs = LIMITS.timeoutMs, idleMs = LIMITS.idleMs, responseBytes = LIMITS.responseBytes } = {}) {
    this.#fetch = fetchImpl; this.#insecureFetch = insecureFetchImpl; this.#settingsFile = settingsFile; this.#now = now; this.#timeoutMs = timeoutMs; this.#idleMs = idleMs; this.#responseBytes = responseBytes;
    this.#timer = setInterval(() => this.#expire(), Math.min(idleMs, 60_000));
    this.#timer.unref?.();
  }
  #drop(connection) {
    connection.closed = true;
    connection.password = '';
    for (const controller of connection.controllers) controller.abort();
    this.#connections.delete(connection.id);
  }
  #expire() {
    for (const connection of this.#connections.values()) if (this.#now() - connection.lastUsed >= this.#idleMs) this.#drop(connection);
  }
  #connection(id) {
    string(id, 'connectionId', 100);
    if (this.#disposed) fail('SERVICE_UNAVAILABLE', 'SAP Reports has been unloaded.', 503);
    const connection = this.#connections.get(id);
    if (!connection || !connection.ready) fail('CONNECTION_NOT_FOUND', 'Connection is unavailable. Connect in the SAP Reports page.', 404);
    if (this.#now() - connection.lastUsed >= this.#idleMs) { this.#drop(connection); fail('CONNECTION_EXPIRED', 'SAP connection expired after inactivity. Reconnect in the SAP Reports page.', 401); }
    connection.lastUsed = this.#now();
    return connection;
  }
  async #request(connection, action, params, signal) {
    if (this.#disposed || connection.closed) fail('CONNECTION_NOT_FOUND', 'SAP connection is closed.', 404);
    const url = new URL(connection.endpoint);
    if (connection.mode === 'paths') url.pathname = `${url.pathname.replace(/\/+$/u, '')}/${action}`;
    let payload = connection.mode === 'action' ? { action, ...params } : params;
    if (connection.mode === 'intfid') {
      if (!Object.hasOwn(REPORT_INTFIDS, action)) fail('INVALID_ACTION', 'Unsupported SAP report operation.');
      url.searchParams.set('intfid', REPORT_INTFIDS[action]);
      payload = action === 'get_user_tcodes'
        ? { catalogOnly: true }
        : action === 'get_report_meta'
          ? { tcode: params.tcode, variant: params.variant }
          : { tcode: params.tcode, variant: params.variant, selection: params.selection, maxRows: params.max_rows };
    }
    const body = JSON.stringify(payload);
    if (Buffer.byteLength(body) > LIMITS.requestBytes) fail('REQUEST_TOO_LARGE', 'SAP request exceeds 256 KiB.', 413);
    const controller = new AbortController();
    this.#controllers.add(controller); connection.controllers.add(controller);
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.#timeoutMs);
    try {
      if (controller.signal.aborted) fail('CANCELLED', 'SAP request was cancelled.', 499);
      const send = connection.allowUntrustedTls ? this.#insecureFetch : this.#fetch;
      const response = await send(url.href, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Basic ${Buffer.from(`${connection.username}:${connection.password}`, 'utf8').toString('base64')}` }, body, redirect: 'manual', signal: controller.signal });
      if (response.status >= 300 && response.status < 400) { await response.body?.cancel().catch(() => {}); fail('SAP_REDIRECT', 'SAP redirected the request. Enter the final HTTPS endpoint; credentials are never forwarded through redirects.', 502); }
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        if (response.status === 401) fail('SAP_AUTH', 'SAP rejected the username or password.', 401);
        if (response.status === 403) fail('SAP_FORBIDDEN', 'The SAP user is not authorized for this operation.', 403);
        fail('SAP_HTTP', `SAP returned HTTP ${response.status}.`, 502);
      }
      const result = unwrap(await readLimitedJson(response, this.#responseBytes, 'SAP_RESPONSE_TOO_LARGE'), connection);
      if (connection.mode === 'intfid') {
        if (response.status === 202) fail('SAP_ASYNC_RESPONSE', 'SAP returned HTTP 202 instead of a synchronous report result. Check that the report interface uses INTFMD=SYN.', 502);
        const message = text(pick(result, 'ev_msg')).trim();
        if (!message) fail('SAP_RESPONSE', 'SAP intfid response must include EV_MSG=OK on success.', 502);
        if (message.toUpperCase() !== 'OK') fail('SAP_ERROR', safeMessage(message, connection), 502);
      }
      if (controller.signal.aborted) fail(timedOut ? 'SAP_TIMEOUT' : 'CANCELLED', timedOut ? 'SAP request timed out.' : 'SAP request was cancelled.', timedOut ? 504 : 499);
      return result;
    } catch (error) {
      if (timedOut) fail('SAP_TIMEOUT', 'SAP request timed out.', 504);
      if (controller.signal.aborted) fail('CANCELLED', 'SAP request was cancelled.', 499);
      if (error instanceof SapError) throw error;
      fail('SAP_NETWORK', 'Unable to reach SAP over verified HTTPS. Check the endpoint, network and certificate trust.', 502);
    } finally {
      clearTimeout(timer); signal?.removeEventListener('abort', cancel);
      this.#controllers.delete(controller); connection.controllers.delete(controller);
    }
  }
  async #list(connection, signal) {
    return normalizeTcodes(await this.#request(connection, 'get_user_tcodes', { uname: '', catalog_only: true }, signal));
  }
  async #authorize(connection, tcode, signal) {
    const match = (await this.#list(connection, signal)).find(row => row.tcode === tcode);
    if (!match) fail('TCODE_FORBIDDEN', 'This transaction is not in the current SAP user’s authorized report catalog.', 403);
    return match;
  }
  async connect(args, signal) {
    input(args, ['endpoint', 'username', 'password', 'mode', 'sapClient', 'allowUntrustedTls']);
    if (this.#disposed) fail('SERVICE_UNAVAILABLE', 'SAP Reports has been unloaded.', 503);
    const endpoint = string(args.endpoint, 'endpoint', 2048).trim();
    let url;
    try { url = new URL(endpoint); } catch { fail('INVALID_ENDPOINT', 'Enter a valid HTTPS SAP endpoint.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) fail('INVALID_ENDPOINT', 'The SAP endpoint must use HTTPS without embedded credentials or a fragment.');
    // Query credentials would escape the password-only lifetime and leak through URLs.
    if ([...url.searchParams.keys()].some(key => /pass|token|secret|authorization|api[-_]?key/iu.test(key))) fail('INVALID_ENDPOINT', 'Put credentials only in the username and password fields, not endpoint query parameters.');
    const username = string(args.username, 'username', 128).trim();
    const password = string(args.password, 'password', 1024);
    if (!username || username.includes(':') || !password) fail('INVALID_INPUT', 'A username (without a colon) and password are required.');
    if (args.mode !== undefined && !['action', 'paths', 'intfid'].includes(args.mode)) fail('INVALID_INPUT', 'mode must be intfid.');
    if (args.allowUntrustedTls !== undefined && typeof args.allowUntrustedTls !== 'boolean') fail('INVALID_INPUT', 'allowUntrustedTls must be true or false.');
    if (args.mode === 'intfid' && [...url.searchParams.keys()].some(key => key.trim().toLowerCase() === 'intfid')) fail('INVALID_ENDPOINT', 'Do not include intfid in the endpoint. The plugin selects the three fixed report interface IDs.');
    if (args.sapClient !== undefined && args.sapClient !== '') {
      if (typeof args.sapClient !== 'string' || !/^\d{3}$/u.test(args.sapClient)) fail('INVALID_INPUT', 'sapClient must contain exactly three digits.');
      url.searchParams.set('sap-client', args.sapClient);
    }
    this.#expire();
    if (this.#connections.size >= LIMITS.maxConnections) fail('CONNECTION_LIMIT', 'Disconnect an existing SAP connection before adding another.', 409);
    const connection = { id: randomUUID(), endpoint: url.href, username, password, mode: args.mode ?? 'intfid', allowUntrustedTls: args.allowUntrustedTls === true, lastUsed: this.#now(), controllers: new Set(), closed: false };
    this.#connections.set(connection.id, connection);
    try {
      const tcodes = await this.#list(connection, signal);
      if (connection.closed || this.#disposed) fail('CANCELLED', 'SAP connection was cancelled.', 499);
      connection.lastUsed = this.#now();
      connection.ready = true;
      saveSettings(this.#settingsFile, connection);
      return { connectionId: connection.id, username, endpoint: publicEndpoint(connection.endpoint), tlsVerified: !connection.allowUntrustedTls, tcodes };
    } catch (error) { this.#drop(connection); throw error; }
  }
  settings(args = {}) {
    input(args, []);
    return readSettings(this.#settingsFile);
  }
  status(args = {}) {
    input(args, []); this.#expire();
    return { connections: [...this.#connections.values()].filter(connection => connection.ready).map(connection => ({ connectionId: connection.id, username: connection.username, endpoint: publicEndpoint(connection.endpoint), tlsVerified: !connection.allowUntrustedTls })) };
  }
  async list(args, signal) {
    input(args, ['connectionId']);
    return { tcodes: await this.#list(this.#connection(args.connectionId), signal) };
  }
  async meta(args, signal) {
    input(args, ['connectionId', 'tcode', 'variant']);
    const connection = this.#connection(args.connectionId);
    const tcode = identifier(args.tcode, 'tcode', 20);
    const variant = string(args.variant, 'variant', 30, true).trim();
    const allowed = await this.#authorize(connection, tcode, signal);
    return normalizeMeta(await this.#request(connection, 'get_report_meta', { tcode, report: allowed.report, variant }, signal), allowed.report);
  }
  async run(args, signal) {
    input(args, ['connectionId', 'tcode', 'variant', 'selection', 'max_rows']);
    const connection = this.#connection(args.connectionId);
    const tcode = identifier(args.tcode, 'tcode', 20);
    const variant = string(args.variant, 'variant', 30, true).trim();
    const maxRows = args.max_rows ?? 5000;
    if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > LIMITS.maxRows) fail('INVALID_INPUT', 'max_rows must be an integer between 1 and 10000.');
    const allowed = await this.#authorize(connection, tcode, signal);
    const meta = normalizeMeta(await this.#request(connection, 'get_report_meta', { tcode, report: allowed.report, variant }, signal), allowed.report);
    const selection = normalizedSelection(args.selection ?? [], meta);
    const value = await this.#request(connection, 'run_alv_report', { tcode, report: allowed.report, variant, selection, max_rows: maxRows }, signal);
    const rawRows = Array.isArray(value) ? value : pick(value, 'rows', 'ev_json');
    const allRows = array(parse(rawRows, 'EV_JSON'), 'rows/EV_JSON');
    if (allRows.some(row => !object(row))) fail('SAP_RESPONSE', 'SAP report rows must be JSON objects.', 502);
    const rows = allRows.slice(0, maxRows);
    const declaredCount = Number(pick(value, 'rowCount', 'ev_rows'));
    const truncated = truth(pick(value, 'truncated', 'ev_truncated')) || allRows.length > maxRows || (Number.isFinite(declaredCount) && declaredCount > rows.length);
    const sourceFields = pick(value, 'fields', 'et_fields');
    const fields = normalizeFields(sourceFields ?? (meta.fields.length ? meta.fields : undefined), rows).map(field => ({ ...field, field: Object.keys(rows[0] ?? {}).find(key => key.toLowerCase() === field.field.toLowerCase()) ?? field.field }));
    const message = safeMessage(pick(value, 'message', 'ev_msg'), connection);
    return { rows, fields, rowCount: rows.length, truncated, ...(message ? { message } : {}) };
  }
  disconnect(args) {
    input(args, ['connectionId']); string(args.connectionId, 'connectionId', 100);
    const connection = this.#connections.get(args.connectionId);
    if (connection) this.#drop(connection);
    return { disconnected: true };
  }
  async dispatch(args, { caller = 'ui', signal } = {}) {
    if (!object(args)) fail('INVALID_INPUT', 'Request must be a JSON object.');
    const { action, ...params } = args;
    const allowed = caller === 'tool' ? ['status', 'list', 'meta', 'run'] : ['settings', 'connect', 'disconnect', 'status', 'list', 'meta', 'run'];
    if (!allowed.includes(action)) fail('INVALID_ACTION', 'This action is not available to this caller.');
    return this[action](params, signal);
  }
  dispose() {
    this.#disposed = true; clearInterval(this.#timer);
    for (const connection of this.#connections.values()) this.#drop(connection);
    for (const controller of this.#controllers) controller.abort();
    this.#controllers.clear();
  }
}
export function errorEnvelope(error) {
  return { ok: false, error: { code: error instanceof SapError ? error.code : 'INTERNAL_ERROR', message: error instanceof SapError ? error.message : 'SAP Reports could not complete the request.' } };
}
