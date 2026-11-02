# SAP Reports API contract

This bundle is a dependency-free JavaScript ESM adapter. It requires a SAP HTTPS JSON wrapper exposing the three operations below; it does not publish ABAP function modules, speak RFC, or implement an OData service. The supplied ABAP reference is a development starting point, not a complete HTTP/security implementation.

## Harness endpoint and callers

The Host registers the exact authenticated route `POST /api/sap-reports` through `connection.fetch.register`, with `requestBody: 'buffered'`. The existing Harness Connection carrier owns `/api`, Host/Origin checks, and browser/API authentication. Browser calls send `Content-Type: application/json` and the Harness authentication cookie. A prefix-stripping deployment proxy must preserve the advertised application base path on the browser side.

All plugin requests use `{ "action": "...", ...parameters }`. Successful responses are `{ "ok": true, "data": ... }`; failures are `{ "ok": false, "error": { "code": "...", "message": "..." } }`, with a suitable HTTP failure status. Responses have `Cache-Control: no-store`. Harness authentication/routing rejection occurs before this route and may use the Harness's own response format.

`SapReportsService` implements the operations once. The route and `sap_reports` tool call the same dispatcher. The UI alone can `connect` and `disconnect`; the tool supports `status`, `list`, `meta`, and `run`. The tool never accepts credentials. Every SAP operation after connect requires an explicit `connectionId`, even if only one exists. `status` does not select or use a connection and does not contact SAP. Connection discovery is shared across agents in this Harness profile; it is not a separate per-session authorization boundary. Choose the system/account the user intends before using a discovered ID.

| Action | Parameters (in addition to `action`) | `data` |
| --- | --- | --- |
| `connect` | `endpoint`, `username`, `password`, `mode: "action" \| "paths" \| "intfid"`, optional `sapClient` | `{connectionId, username, endpoint, tcodes}` |
| `status` | none | `{connections:[{connectionId,username,endpoint}]}` |
| `list` | `connectionId` | `{tcodes:[{tcode,text,report,group?}]}` |
| `meta` | `connectionId`, `tcode`, optional `variant` | `{report,selection,fields,variants?}` |
| `run` | `connectionId`, `tcode`, optional `variant`, `selection`, `max_rows` | `{rows,fields,rowCount,truncated,message?}` |
| `disconnect` | `connectionId` | `{disconnected:true}`; idempotent |

Unknown request fields are rejected. For tool calls, declared fields belonging to another action are ignored, so transports that always emit every optional schema property remain compatible; the HTTP route retains strict action-specific input validation. Callers cannot provide a report name, another SAP username, a custom authorization header, or a replacement endpoint on list/meta/run. The service refreshes `get_user_tcodes` before both meta and run, checks membership, and takes the report name from that authorized catalog. Run additionally refreshes metadata for the selected variant before validating the supplied selections. Thus meta performs two SAP requests; run performs three.

### Connect

```json
{
  "action": "connect",
  "endpoint": "https://sap.example/sap/bc/zai?sap-client=100",
  "username": "ALICE",
  "password": "user-entered secret",
  "mode": "action",
  "sapClient": "100"
}
```

`endpoint` must be HTTPS, at most 2048 characters, without embedded URL credentials or fragments. Query keys containing `pass`, `token`, `secret`, `authorization`, or `api-key`/`api_key` are rejected. Put all credentials in their dedicated fields. `sapClient`, when nonempty, must be three digits and replaces `sap-client` in the URL query. Username is nonempty, at most 128 characters, without `:`; password is nonempty and at most 1024 characters. Control characters are rejected.

The first catalog request verifies the connection. Its ID becomes discoverable only after success. Returned endpoints omit all query parameters except `sap-client`; the actual in-memory endpoint retains its original query for SAP requests. Returned connection/catalog/status data contain no password or Authorization header.

### Metadata and selections

```json
{
  "report": "RM07MLBS",
  "selection": [
    {"selname":"WERKS","kind":"S","text":"Plant","type":"CHAR","obligatory":true,"low":"1000","high":"","sign":"I","option":"EQ"},
    {"selname":"P_FLAG","kind":"P","text":"Include blocked","type":"CHECKBOX","obligatory":false,"default":""},
    {"selname":"P_MODE","kind":"P","text":"Mode","obligatory":false,"options":[{"value":"A","label":"All"}]}
  ],
  "fields": [{"field":"MATNR","label":"Material","type":"CHAR"}],
  "variants": [{"name":"SAFE","text":"Approved plant scope"}]
}
```

Selection metadata must explicitly include an array, including `[]` when no metadata is available. Repeated `selname` rows are retained to represent variant ranges. Shared descriptors are propagated to all rows: obligatory is ORed, the first meaningful text/type/options are retained, and different kinds for the same name are rejected. Each row retains its own default/low/high/sign/option. Blank or absent metadata signs/options normalize to `I`/`EQ`. Boolean metadata defaults/low/high become `"X"`/`""`, so an unchecked checkbox is preserved. Empty strings are distinct from missing values.

Selection values are strings. Use SAP internal formats (for example `YYYYMMDD` dates and `HHMMSS` times), and preserve leading zeros and decimal precision. Supported signs are `I`/`E`; options are `EQ`, `NE`, `GT`, `GE`, `LT`, `LE`, `BT`, `NB`, `CP`, `NP`.

```json
{
  "action":"run",
  "connectionId":"ID returned by connect",
  "tcode":"MB52",
  "variant":"SAFE",
  "selection":[
    {"selname":"WERKS","kind":"S","sign":"I","option":"BT","low":"1000","high":"2000"},
    {"selname":"WERKS","kind":"S","sign":"E","option":"EQ","low":"1500","high":""},
    {"selname":"P_FLAG","kind":"P","sign":"I","option":"EQ","low":"","high":""}
  ],
  "max_rows":5000
}
```

`variant` defaults to `""`, `selection` to `[]`, and `max_rows` to 5000. Transaction codes are uppercased and limited to 20 characters; variant names to 30; selection names to 30. At most 500 selection rows are accepted, with low/high at most 1024 characters each.

Validation rejects unknown selection fields, kind mismatches, invalid signs/options, duplicate P parameters, and P parameters other than a single `I`/`EQ` row with empty high. `BT`/`NB` need both bounds and ordered low/high; other operators require empty high. Numeric-looking ranges use numeric comparison; other ranges use string comparison. SAP remains responsible for data-type conversion, conversion exits, date/time validity, domain constraints, dynamic screen logic, and application-specific rules. Options metadata, when supplied, restricts nonblank low values to its declared values. It should be used for simple single-value controls, not unrestricted pattern/range domains.

An obligatory field needs a nonblank inclusive value. If the caller provides any rows for that field, those explicit values take precedence over metadata defaults: explicit blanks and exclusion-only rows fail validation. If the field is omitted, variant/default values returned by metadata are used to validate it. Omitted rows are not injected into the run request; the SAP wrapper/report must apply the same variant/default values it reported. Send desired catalog defaults explicitly when they are not native report defaults. Empty P rows are forwarded unchanged to allow clearing an optional checkbox/parameter from a variant.

With `selection: []` metadata, variant-only execution is supported with no supplied selection overrides. The adapter cannot infer obligatory or dynamic screen fields absent from metadata; the SAP endpoint must validate them. Metadata retrieval itself must avoid unsafe or interactive report execution. A safe configured field catalog or tested safe variant is preferable.

## SAP HTTPS wire requests

All SAP calls use `POST`, `Content-Type: application/json`, `Accept: application/json`, and UTF-8 HTTP Basic authentication for the connected end user. The adapter uses the standard Node fetch TLS verification behavior; it does not install a custom insecure agent or disable certificate checks. Configure trusted private CAs at the runtime/deployment level when needed. No cookies or response authentication headers are retained. Redirects of every kind are rejected, including same-host redirects; enter the final HTTPS URL.

In `action` mode, each request goes to the exact configured endpoint (including its query) and includes the operation as `action`:

```json
{"action":"get_user_tcodes","uname":"","catalog_only":true}
```

```json
{"action":"get_report_meta","tcode":"MB52","report":"RM07MLBS","variant":"SAFE"}
```

```json
{"action":"run_alv_report","tcode":"MB52","report":"RM07MLBS","variant":"SAFE","selection":[{"selname":"WERKS","kind":"S","sign":"I","option":"EQ","low":"1000","high":""}],"max_rows":5000}
```

`uname` is always empty so SAP uses the authenticated `sy-uname`. There is no impersonation input. `report` comes from the current authorized catalog; it may be empty when the server resolves it from tcode.

In `paths` mode, append `/get_user_tcodes`, `/get_report_meta`, or `/run_alv_report` to the endpoint pathname after removing trailing slashes. Preserve its query. For example, `https://sap.example/sap/zai/?sap-client=100` becomes `https://sap.example/sap/zai/get_user_tcodes?sap-client=100`. JSON parameters are identical except the `action` property is omitted. Neither mode sends raw `IV_*`/`IT_*` importing names: the SAP HTTP wrapper maps these lowercase API parameters to the ABAP function signature, including `selection` to `IT_SELTAB` and `max_rows` to `IV_MAX_ROWS`.

### Existing SAP interface mode (`intfid`, version 1.1.0)

Select `mode: "intfid"` for the existing `ZSX_OA` interface described in the supplied ZAI design. Use the final HTTPS URL of the existing SICF node, without an `intfid` query parameter. The design-derived example is `https://sap.example/sap/bc/zsx_intf_serv/zsx_oa?sap-client=100&sap-language=ZH`; its published path and query handling still require verification on the development SAP system. This plugin change creates no SAP nodes, handler classes, function modules, DDIC objects, or interface configuration rows.

All three operations POST to the same pathname. The adapter uses `URL.searchParams.set('intfid', fixedID)` and preserves the other query parameters, including `sap-client` and language. It does not append operation path segments or send `action`, `uname`, `report`, `intfid`, or a function name in the JSON body.

| Internal operation | Fixed query value | Exact JSON body shape |
| --- | --- | --- |
| `get_user_tcodes` | `intfid=AI_RPT_CATALOG` | `{ "catalogOnly": true }` |
| `get_report_meta` | `intfid=AI_RPT_META` | `{ "tcode": "MB52", "variant": "" }` |
| `run_alv_report` | `intfid=AI_RPT_RUN` | `{ "tcode": "MB52", "variant": "", "selection": [], "maxRows": 5000 }` |

The Harness UI/tool request still uses `max_rows`; only this SAP wire adapter converts it to `maxRows`. Selection row keys remain `selname`, `kind`, `sign`, `option`, `low`, `high`, with their order and string values preserved. Catalog bodies are nonempty. Report program resolution and user identity belong to SAP (`sy-uname` and the authorized tcode catalog). The existing refreshed-catalog authorization check still runs before meta/run, but this mode does not send the resolved report name.

The three interface IDs are fixed plugin constants. Additional caller-supplied interface IDs, function names, or report names are rejected. In this mode, connect rejects any existing `intfid` URL query key, including mixed-case and percent-encoded keys decoded by `URLSearchParams`; blank values also conflict. It never silently replaces an endpoint-supplied interface ID. Existing `action` and `paths` request/response behavior remains compatible.

The existing entrance must route the query through `GET_FORM_FIELDS` and read the JSON body through `GET_CDATA`, deserialize it as the configured input DDIC type, invoke the configured function with `IS_DATA`, then serialize `ES_RETURN`. Configure all three interfaces with `INTFMD='SYN'` and real `FUCITYP`/`FUCETYP` input/output types. An existing asynchronous `OA001` configuration does not satisfy these synchronous report operations. The design suggests `Z_AI_RPT_CATALOG`, `Z_AI_RPT_META`, and `Z_AI_RPT_RUN`; those SAP objects/configurations must be implemented and approved independently. The existing entry's `S_RFC` authorization must permit the three intended functions for the end user. Each function must also enforce report allowlisting, `S_TCODE`, program and business permissions.

Two compatibility points remain **unverified against live SAP**: whether the published node's `GET_FORM_FIELDS` receives the URL query, and whether its `PRETTY_NAME=CAMEL_CASE` deserializer maps `catalogOnly` to `CATALOG_ONLY`, `maxRows` to `MAX_ROWS`, and all selection keys to the actual DDIC structure. Output uses the design's `PRETTY_NAME=NONE` ABAP field names. The unit tests assert these design contracts; they cannot prove SAP deserialization. Obtain sanitized real request/response samples during development integration, including empty internal tables, and add those as fixtures after verifying the mappings. Do not put `intfid` into the JSON body or change the shared SAP serializer based on an untested assumption.

## Accepted SAP response forms

JSON keys in SAP responses and metadata are matched case-insensitively. Avoid duplicate keys differing only in case. Business row keys and cell values are preserved, without automatic number/date conversion. For exact large integers/decimals, serialize values as JSON strings in SAP.

Each operation may return its direct object, or `{ "ok": true, "data": ... }` / `{ "success": true, "data": ... }`. Plain `{data: ...}` without an explicit success flag is not unwrapped. XML, SOAP, OData `d/results`, and arbitrary RFC gateway envelopes are not supported; adapt the HTTP wrapper to the forms below.

| Operation | Normalized form | Raw ABAP form |
| --- | --- | --- |
| catalog | `{tcodes:[{tcode,text,report,group?}]}` or the array itself | `{ET_LIST:[{TCODE,TEXT,REPORT,GROUP?}],EV_MSG:"OK"}` |
| metadata | `{report,selection:[...],fields:[...],variants?:[...]}` | `{EV_REPORT,ET_PARAMS:[...],ET_FIELDS:[...],ET_VARIANTS?:[...],EV_MSG:"OK"}` |
| run | `{rows:[objects],fields?:[...],rowCount?:number,truncated?:boolean,message?:string}` or an array of objects | `{EV_JSON:"[...serialized rows...]",EV_ROWS:number,EV_TRUNCATED:"X" or "",EV_MSG:"OK"}`; optional `ET_FIELDS` |

`EV_JSON` may also be an already decoded array. Missing/invalid rows fail; successful empty results must send `rows:[]` or `EV_JSON:"[]"`. `EV_ROWS`/`rowCount` are advisory: the returned `rowCount` always equals the number of rows delivered. `truncated` is true if SAP marks it, SAP reports more rows than delivered, or the adapter slices rows at `max_rows`. SAP truth values include boolean true, number 1, or case-insensitive strings `X`, `true`, `1`.

Field aliases: `field`/`FIELDNAME`; label `label`, `text`, `SCRTEXT_L`, `SCRTEXT_M`, `COLTEXT`; type `type`, `DATATYPE`, `INTTYPE`. Missing labels fall back to the field name. Selection aliases: `selname`, `kind`, `text`/`label`, `obligatory`/`required`, `type`/`datatype`/`inttype`, and `default`, `low`, `high`, `sign`, `option`, `options:[{value,label|text}]`. Variants accept `name`/`variant` and `text`/`label`. Catalog report accepts `report`/`PGMNA`. These are JSON aliases, not automatic introspection of ABAP types.

Run fields use explicit run metadata first, then nonempty metadata from the preceding meta call, then keys discovered from returned rows. Field names are aligned case-insensitively with the first returned row to accommodate uppercase ABAP field catalogs and lowercase `/ui2/cl_json` row names.

### SAP errors

The following cause `SAP_ERROR`: `{ok:false,...}`, `{success:false,...}`, truthy `error`, `status` equal to `error`/`failed`/`failure`, `RETURN` or `ET_RETURN` entries with type `E`, `A`, or `X`, and a nonempty `EV_MSG` that does not begin with `OK` (case-insensitive word boundary). This matches the reference ABAP convention. Use `message` for informational messages in normalized success responses; raw ABAP success `EV_MSG` should be `OK`, `OK, truncated to ...`, or `OK (from catalog)`.

SAP messages are limited to 1000 characters, stripped of control characters, and redacted for the connection's password and Basic credential token. HTTP error bodies and native transport exception details are not returned. HTTP 401 becomes `SAP_AUTH`; 403 becomes `SAP_FORBIDDEN`; other non-2xx responses become `SAP_HTTP`; redirects become `SAP_REDIRECT`. No automatic retries occur.

### Additional `intfid` response requirements

The raw `ES_RETURN` forms in the table above are the expected existing-interface responses. A successful result must include `EV_MSG` equal to `OK` after trimming edge whitespace and ignoring case, including empty catalogs and empty reports. For this mode, missing, empty or whitespace-only `EV_MSG` is `SAP_RESPONSE`; an empty structure is not a successful result. For a synchronous response, a non-OK `EV_MSG`, including a legacy-style `OK, 1 tcodes` or `OK (from catalog)`, is `SAP_ERROR`. Send `ET_LIST:[]` for an empty catalog, explicit `ET_PARAMS:[]`/`ET_FIELDS:[]` when appropriate, and `EV_JSON:"[]"` for an empty report, all with `EV_MSG:"OK"`. Bare arrays without the required message do not meet this mode's success contract. `action` and `paths` retain their existing optional-message behavior.

Only in `intfid` mode, the existing entry's `STATUS` values `E`, `A`, or `X` (trimmed and case-insensitive) signal `SAP_ERROR`. Its `MSGTXT` is returned through the same message sanitization/redaction as other SAP errors, including Chinese permission/configuration messages. This applies to HTTP 200 and HTTP 202. For example, HTTP 202 with `{ "STATUS": "E", "MSGTXT": "无接口执行权限" }` surfaces that business error rather than an empty result.

HTTP 202 is **never accepted as synchronous business success** in `intfid` mode. Recognized business errors take precedence, including STATUS E/A/X and explicit errors such as `EV_MSG:"无权限"`; otherwise a valid decoded JSON response with status 202 becomes `SAP_ASYNC_RESPONSE`, even if it contains `EV_MSG:"OK"`, plausible report rows, a success flag, or an empty structure. Invalid/oversized response bodies still fail the JSON/size checks. HTTP 401/403 continue to mean `SAP_AUTH`/`SAP_FORBIDDEN`; these are distinct from an interface authorization failure encoded in HTTP 200/202 JSON. No retries or asynchronous polling are added.

## Limits, lifetime, and cancellation

| Limit | Value |
| --- | --- |
| Timeout per SAP request, including body reading | 60 seconds |
| Maximum report rows | 10000; default 5000 |
| Plugin JSON request and outgoing SAP request | 256 KiB |
| SAP JSON response bytes, including streamed chunks | 8 MiB |
| Concurrent stored connections, including pending connects | 8 |
| Connection idle expiry | 30 minutes |
| Expiry cleanup sweep | At most 60 seconds |

The UI route is buffered by the Harness carrier before plugin validation. The 256 KiB plugin limit prevents parsing/processing larger bodies, but does not replace the carrier's own upstream buffer cap (configured on Connection). Set a suitably small reverse-proxy/carrier request limit if pre-buffer resource control is required.

Credentials are retained only in private process memory; this plugin does not log, persist, or put them into tool arguments, session records, local storage, or files. Disconnect, idle expiry, failed connect, and plugin unload remove connection records and abort their active fetches. JavaScript strings are garbage-collected, so this is reference removal rather than a guaranteed physical-memory wipe. Reload/restart requires reconnecting. Status polling does not extend idle lifetime. Expired IDs may produce `CONNECTION_EXPIRED` before the cleanup sweep or `CONNECTION_NOT_FOUND` after removal; clients should clear their connection for either.

Browser disconnect/cancel passes the Harness `Request.signal` into the service; tool cancellation uses its execution signal. Report transport abort returns `CANCELLED` where a response is still deliverable. Cancellation/timeout cannot guarantee that SAP has stopped an already running `SUBMIT` or rolled back report effects. The server must enforce its own runtime and transaction policies. A run may consume up to three 60-second requests; the tool declares a 190-second total timeout.

## Required SAP server controls

1. Authenticate each request as the end user. Never substitute a broadly privileged technical account. Legacy `uname:""` must resolve to `sy-uname`; `intfid` sends no username in its JSON body and must use the authenticated `sy-uname`.
2. Return only the report catalog intersected with the user's `S_TCODE` authorization. Re-check report allowlisting, tcode/program authorization, business authorization, and report/tcode correspondence on metadata and execution endpoints themselves; the plugin's catalog check does not replace server security.
3. Resolve report programs safely, disallow arbitrary supplied programs, and reject unsupported dialog, parameter/Enjoy, interactive, or pure WRITE-list transactions. Limit the catalog to tested ALV/SALV reports appropriate for the intended use, including avoiding reports with unwanted side effects.
4. Enforce bounds, timeout, obligatory parameters, valid domain/range values, dynamic screen rules, and variant authorization on SAP. The client adapter cannot reproduce the full ABAP selection-screen runtime.
5. Clear `cl_salv_bs_runtime_info` on success and every failure path. Catch exceptions and return structured errors; never present an interactive SAP GUI dialog through the HTTP endpoint.
6. Serialize empty internal tables as JSON arrays. Serialize large numeric values as strings where precision matters. Supply sufficient selection and field metadata, including checkbox/radio semantics and required flags.
7. Audit user, tcode/report, execution time, and outcome according to the system's policy without recording passwords or Authorization headers. Protect the user-to-Harness leg with HTTPS when it is not local, and trust only intended Harness/API users.

8. For the existing `ZSX_OA` entrance, review `INTFDR` before enabling the three interface rows. The supplied design reports that enabled raw logging in `ZBCX_INTF_SERVICE` stores full request/results and executes `COMMIT WORK`. Keep that raw-report logging disabled unless explicitly reviewed and approved; use function-level audit records without complete business rows. Review this commit behavior and each allowed report's side effects. A report producing SALV output is not evidence that it is read-only. Do not activate interface rows before development acceptance.

## Verification

Run `node --test test/*.test.js` from the bundle directory. The tests mock fetch and exercise protocol shapes, normalized/raw ABAP results, repeated metadata, allowlist checks, selection validation, row bounds, credential handling, redirects, timeouts, aborts, expiry, disposal, and UI/tool parity. The intfid tests cover fixed query IDs and camelCase bodies, HTTP 200/202 and STATUS/MSGTXT errors, strict EV_MSG=OK, empty tables, variant ranges with leading zeros, limits and old-mode compatibility. Their payloads are synthetic examples from the design, not captured SAP fixtures. No live SAP system is used. Live SAP HTTP publication, query-to-GET_FORM_FIELDS routing, DDIC camelCase deserialization, certificate trust, `S_RFC`/`AUTHORITY-CHECK` behavior, ABAP metadata extraction, and execution of specific reports require integration testing against your development SAP system.

The tool adds one compact model-facing definition and no system-prompt section. Its input/output schemas are available in the Host registration. An exact first-turn token delta depends on the selected model's tokenizer and tool serialization and is not measured by these transport tests.

### TLS certificate trust

By default every request uses verified HTTPS; a self-signed or otherwise untrusted SAP test certificate fails with `SAP_NETWORK` (`DEPTH_ZERO_SELF_SIGNED_CERT`). `connect` accepts an optional boolean `allowUntrustedTls` (default `false`). When it is `true`, requests for that connection only are sent through `node:https` with `rejectUnauthorized:false`; the endpoint must still be `https:`. The connect result and `status` report `tlsVerified:false` for such connections so the UI can warn that the Basic credentials travel over an unauthenticated channel. Prefer trusting the issuing CA (`NODE_EXTRA_CA_CERTS`) for anything beyond a throwaway test system.

### Connection modes

The UI now exposes a single mode: the existing `intfid` SAP interface (three fixed IDs `AI_RPT_CATALOG`, `AI_RPT_META`, `AI_RPT_RUN`). `connect` defaults to `intfid` when `mode` is omitted. The legacy `action` and `paths` modes remain accepted by the service for backward compatibility only; they are deprecated and are no longer reachable from the connect form.
