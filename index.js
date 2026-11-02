import { LIMITS, SapError, SapReportsService, errorEnvelope, readLimitedJson } from './service.js';

export const name = 'sap-reports';
export const inject = ['connection', 'tools'];
const string = description => ({ type: 'string', description });
const selectionSchema = {
  type: 'array', maxItems: LIMITS.maxSelection,
  description: 'Selection rows from meta. Preserve SAP string values and leading zeros; repeated S rows are supported.',
  items: {
    type: 'object', additionalProperties: false, required: ['selname', 'kind', 'sign', 'option', 'low', 'high'],
    properties: {
      selname: string('Selection field from meta.'), kind: { type: 'string', enum: ['P', 'S'] },
      sign: { type: 'string', enum: ['I', 'E'] },
      option: { type: 'string', enum: ['EQ', 'NE', 'GT', 'GE', 'LT', 'LE', 'BT', 'NB', 'CP', 'NP'] },
      low: string('Value, lower bound or pattern; use SAP internal date format YYYYMMDD.'),
      high: string('Upper bound for BT/NB; otherwise an empty string.'),
    },
  },
};
export function createTool(service) {
  return {
    name: 'sap_reports',
    description: 'Query the authorized SAP report catalog, selection metadata and ALV rows. The user connects in the SAP Reports page. Use status to discover sanitized connection IDs, then select the connection the user intends; meta provides selections and variants before run. Only execute reports the user requested; SAP report execution may have application-specific effects.',
    parameters: {
      type: 'object', additionalProperties: false, required: ['action'],
      properties: {
        action: { type: 'string', enum: ['status', 'list', 'meta', 'run'], description: 'status lists connections without contacting SAP; list refreshes the authorized catalog; meta reads selection definitions; run executes the selected report.' },
        connectionId: string('Explicit ID from the user’s active connection, required for list/meta/run. Never infer a connection when the intended system or user is ambiguous.'),
        tcode: string('Authorized transaction code from list, required for meta/run.'),
        variant: string('Optional SAP variant name for meta/run; use an empty string for none.'),
        selection: selectionSchema,
        max_rows: { type: 'integer', minimum: 1, maximum: LIMITS.maxRows, description: 'run only; maximum returned rows, default 5000. Results indicate truncation.' },
      },
    },
    output: {
      schema: { type: 'object', properties: { ok: { type: 'boolean' }, data: { type: 'object' }, error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } }, required: ['code', 'message'] } }, required: ['ok'] },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    timeoutMs: 190_000,
    async execute(args, exec) {
      try {
        // Some tool transports emit every declared property, including optional fields.
        // Project only this action's fields; undeclared keys still reach strict validation.
        const fields = { status: [], list: ['connectionId'], meta: ['connectionId', 'tcode', 'variant'], run: ['connectionId', 'tcode', 'variant', 'selection', 'max_rows'] };
        const declared = ['action', 'connectionId', 'tcode', 'variant', 'selection', 'max_rows'];
        const relevant = fields[args.action];
        const request = relevant && Object.keys(args).every(key => declared.includes(key))
          ? Object.fromEntries(Object.entries(args).filter(([key]) => key === 'action' || relevant.includes(key)))
          : args;
        return { ok: true, data: await service.dispatch(request, { caller: 'tool', signal: exec.signal }) };
      } catch (error) { return errorEnvelope(error); }
    },
  };
}
export function createRoute(service) {
  return {
    path: '/api/sap-reports', methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      let envelope; let status = 200;
      try {
        if (request.method !== 'POST') throw new SapError('METHOD_NOT_ALLOWED', 'Use POST with a JSON body.', 405);
        if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new SapError('INVALID_CONTENT_TYPE', 'Use application/json.', 415);
        const args = await readLimitedJson(request, LIMITS.requestBytes);
        envelope = { ok: true, data: await service.dispatch(args, { caller: 'ui', signal: request.signal }) };
      } catch (error) { envelope = errorEnvelope(error); status = error instanceof SapError ? error.status : 500; }
      return new Response(JSON.stringify(envelope), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
    },
  };
}
export function apply(ctx) {
  ctx.effect(() => {
    const service = new SapReportsService();
    let unregisterRoute; let unregisterTool;
    try {
      unregisterRoute = ctx.connection.fetch.register(createRoute(service));
      unregisterTool = ctx.tools.register(createTool(service));
    } catch (error) {
      service.dispose();
      void unregisterRoute?.();
      unregisterTool?.();
      throw error;
    }
    return async () => {
      service.dispose();
      unregisterTool?.();
      await unregisterRoute?.();
    };
  });
}
