window.__ModuleLoader__.load({
  id: '@local/sap-reports',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const ns = 'sapReports';
    const dictionaries = {
      zh: {
        title: 'SAP 报表', subtitle: '选择事务码，填写条件，查询 ALV 数据',
        connectTitle: '连接 SAP 系统',
        endpoint: 'HTTPS 请求地址', username: '账号', password: '密码', client: 'SAP Client（可选）',
        connect: '连接并加载报表', connecting: '正在连接 SAP…', connected: '已连接', disconnect: '断开连接',
        catalog: '报表事务码', search: '搜索事务码或报表名称', reports: '个报表', refresh: '刷新目录',
        noReports: '此账号没有可访问的报表。请确认 SAP 报表目录和事务码权限。', noMatch: '没有匹配的报表',
        allReports: '可访问报表', pickTitle: '选择一个报表', pickHint: '点击左侧事务码，加载对应的选择屏幕。',
        selection: '选择条件', program: '程序',
        maxRows: '最大返回行数',
        query: '查询报表', querying: '正在执行 SAP 报表…', loading: '正在加载选择屏幕…',
        noMeta: '接口未返回选择字段。可输入变式并加载；没有必填参数的报表可直接查询。',
        reset: '重置条件', add: '添加条件', remove: '移除条件', include: '包含', exclude: '排除',
        low: '值 / 起始值', high: '结束值', required: '必填',
        EQ: '等于', NE: '不等于', BT: '介于', NB: '不介于', GE: '大于等于', LE: '小于等于', GT: '大于', LT: '小于', CP: '匹配模式', NP: '不匹配模式',
        results: '查询结果', notRun: '填写选择条件后点击“查询报表”。', noRows: '查询成功，没有符合条件的数据。',
        rows: '行', truncated: '结果已截断，请缩小查询范围或调整最大返回行数。', filter: '筛选当前返回数据',
        prev: '上一页', next: '下一页', page: '页', cancel: '停止等待', cancelled: '已停止等待。SAP 服务端报表可能仍在运行。',
        queryStale: '条件已修改，下方为上一次查询结果。', export: '导出 Excel',
        exportError: '导出失败，请重试。', failed: '请求失败，请检查连接后重试。', requiredError: '请填写必填字段：',
        rangeError: '区间条件需要起始值和结束值：', invalidRows: '最大返回行数应为 1 到 10000 的整数。',
        expired: '连接已失效，请重新输入密码并连接。', details: '连接信息',
        dateHint: '日期格式 YYYYMMDD', timeHint: '时间格式 HHMMSS', boolean: '启用',
        returned: '已返回', shown: '匹配', error: '操作未完成',
        collapse: '收起目录', expand: '展开目录', collapseSelection: '收起条件', expandSelection: '展开条件', viewJson: '查看入参', multiSelect: '多选', tabSingle: '选择单值', tabRange: '选择范围', tabExSingle: '排除单值', tabExRange: '排除范围',
        apply: '确定', cancelDialog: '取消', closeDialog: '关闭', copy: '复制', copied: '已复制', emptyTab: '该页签暂无条件',
                allowUntrusted: '允许不受信任的证书',
        untrustedWarning: '已关闭证书校验：SAP 账号密码会经过未验证身份的 TLS 通道，可能被中间人截获，请勿用于生产系统。',
        tlsUnverified: '当前连接未校验 TLS 证书，仅建议在测试系统使用。',
      },
      en: {
        title: 'SAP Reports', subtitle: 'Choose a transaction, set criteria, and query ALV data',
        connectTitle: 'Connect to SAP',
        endpoint: 'HTTPS endpoint', username: 'Username', password: 'Password', client: 'SAP Client (optional)',
        connect: 'Connect and load reports', connecting: 'Connecting to SAP…', connected: 'Connected', disconnect: 'Disconnect',
        catalog: 'Report transactions', search: 'Search transactions or reports', reports: 'reports', refresh: 'Refresh catalog',
        noReports: 'No reports are available. Check the SAP catalog and transaction permissions.', noMatch: 'No matching reports',
        allReports: 'Available reports', pickTitle: 'Choose a report', pickHint: 'Select a transaction on the left to load its selection screen.',
        selection: 'Selection criteria', program: 'Program',
        maxRows: 'Maximum rows',
        query: 'Run report', querying: 'Executing SAP report…', loading: 'Loading selection screen…',
        noMeta: 'No selection fields were returned. Load a variant, or run directly if the report has no required parameters.',
        reset: 'Reset criteria', add: 'Add condition', remove: 'Remove condition', include: 'Include', exclude: 'Exclude',
        low: 'Value / from', high: 'To', required: 'Required',
        EQ: 'Equal', NE: 'Not equal', BT: 'Between', NB: 'Not between', GE: 'At least', LE: 'At most', GT: 'Greater', LT: 'Less', CP: 'Pattern', NP: 'Not pattern',
        results: 'Results', notRun: 'Fill the selection criteria, then run the report.', noRows: 'Query succeeded with no matching rows.',
        rows: 'rows', truncated: 'Results were truncated. Narrow the criteria or adjust the maximum rows.', filter: 'Filter returned data',
        prev: 'Previous', next: 'Next', page: 'page', cancel: 'Stop waiting', cancelled: 'Stopped waiting. The SAP report may still be running on the server.',
        queryStale: 'Criteria changed. These results are from the previous query.', export: 'Export Excel',
        exportError: 'Export failed. Please retry.', failed: 'Request failed. Check the connection and retry.', requiredError: 'Required field: ',
        rangeError: 'Both range values are required: ', invalidRows: 'Maximum rows must be an integer between 1 and 10000.',
        expired: 'Connection expired. Enter your password to reconnect.', details: 'Connection details',
        dateHint: 'Date format YYYYMMDD', timeHint: 'Time format HHMMSS', boolean: 'Enabled',
        returned: 'Returned', shown: 'Matched', error: 'Operation incomplete',
        collapse: 'Collapse list', expand: 'Expand list', collapseSelection: 'Collapse criteria', expandSelection: 'Expand criteria', viewJson: 'Show request JSON', multiSelect: 'Multiple selection', tabSingle: 'Include single', tabRange: 'Include range', tabExSingle: 'Exclude single', tabExRange: 'Exclude range',
        apply: 'Apply', cancelDialog: 'Cancel', closeDialog: 'Close', copy: 'Copy', copied: 'Copied', emptyTab: 'No criteria on this tab',
                allowUntrusted: 'Allow untrusted certificate',
        untrustedWarning: 'Certificate verification is off: the SAP password travels over an unauthenticated TLS channel and could be intercepted. Do not use against production.',
        tlsUnverified: 'This connection does not verify the TLS certificate. Use it only against test systems.',
      },
    };
    const css = `
.sap-reports{height:100%;min-height:0;padding-top:26px;display:flex;flex-direction:column;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font-size:14px;line-height:1.5;overflow:auto}
.sap-reports *{box-sizing:border-box}.sap-reports h1,.sap-reports h2,.sap-reports p{margin:0}.sap-reports h1{font-size:22px;font-weight:600;letter-spacing:-.4px}.sap-reports h2{font-size:16px;font-weight:600}.sap-reports .sr-muted{color:var(--dsw-alias-label-secondary);font-size:12px}.sap-reports .sr-header{padding:24px 28px 20px;border-bottom:1px solid var(--dsw-alias-border-l1);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.sap-reports .sr-header-title{display:flex;align-items:center;gap:12px}.sap-reports .sr-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sap-reports button,.sap-reports input,.sap-reports select{font:inherit}.sap-reports button{cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;min-height:34px;padding:6px 12px;white-space:nowrap}.sap-reports button:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}.sap-reports button:disabled{opacity:.5;cursor:not-allowed}.sap-reports .sr-primary{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);font-weight:600}.sap-reports :is(button,input,select,summary):focus-visible{outline:none;border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 22%,transparent)}.sap-reports input,.sap-reports select{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:7px;min-height:36px;padding:7px 10px;width:100%;min-width:0}.sap-reports input[type=checkbox]{width:17px;min-height:17px;accent-color:var(--dsw-alias-brand-primary)}.sap-reports input::placeholder{color:var(--dsw-alias-label-secondary)}.sap-reports .sr-connect{max-width:660px;width:100%;margin:48px auto;padding:0 24px}.sap-reports .sr-card{padding:22px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}.sap-reports .sr-form{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px}.sap-reports label.sr-field{display:flex;flex-direction:column;gap:6px;font-size:13px}.sap-reports .sr-wide{grid-column:1/-1}.sap-reports .sr-connect footer{margin-top:18px}.sap-reports .sr-status{font-size:12px;color:var(--dsw-alias-state-success-primary)}.sap-reports .sr-layout{display:grid;grid-template-columns:250px minmax(0,1fr);flex:1;min-height:0}.sap-reports .sr-catalog{padding:20px 14px;border-right:1px solid var(--dsw-alias-border-l1);overflow:auto;min-height:200px}.sap-reports .sr-catalog-head{padding:0 4px 12px;display:flex;align-items:center;justify-content:space-between;gap:6px}.sap-reports .sr-catalog input{margin-bottom:14px}.sap-reports details>summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px;padding:10px 4px;user-select:none}.sap-reports .sr-tree{list-style:none;margin:0;padding:0 0 0 8px}.sap-reports .sr-tree button{width:100%;display:flex;flex-direction:column;align-items:flex-start;text-align:left;white-space:normal;gap:2px;margin:2px 0;border-color:transparent;background:transparent;padding:10px}.sap-reports .sr-tree button[aria-current=true]{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2);box-shadow:inset 3px 0 var(--dsw-alias-brand-primary)}.sap-reports .sr-code{font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px;font-weight:600}.sap-reports .sr-content{overflow:auto;min-width:0;padding:24px 28px;display:flex;flex-direction:column;gap:20px}.sap-reports .sr-empty{padding:64px 24px;text-align:center;color:var(--dsw-alias-label-secondary);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px}.sap-reports .sr-section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px}.sap-reports .sr-variant{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:8px}.sap-reports .sr-variant label{flex:1;min-width:130px}.sap-reports .sr-variant .sr-limit{max-width:160px}.sap-reports .sr-selections{margin-top:18px}.sap-reports .sr-selection-field{padding:14px 0;border-top:1px solid var(--dsw-alias-border-l1)}.sap-reports .sr-field-title{font-size:13px;margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.sap-reports .sr-required{color:var(--dsw-alias-state-error-primary)}.sap-reports .sr-condition{display:grid;grid-template-columns:90px 125px minmax(90px,1fr) minmax(90px,1fr) 34px;gap:7px;margin:7px 0;align-items:center}.sap-reports .sr-condition.sr-parameter{grid-template-columns:minmax(0,1fr)}.sap-reports .sr-condition button{padding:4px;min-width:34px}.sap-reports .sr-querybar{display:flex;justify-content:flex-end;gap:8px;padding-top:18px}.sap-reports .sr-notice{padding:10px 14px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;font-size:13px;overflow-wrap:anywhere}.sap-reports .sr-error{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary);margin:16px 28px 0}.sap-reports .sr-warning{color:var(--dsw-alias-state-warn-primary);margin-bottom:12px}.sap-reports .sr-result-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}.sap-reports .sr-result-head input{max-width:240px}.sap-reports .sr-table-wrap{overflow:auto;max-height:510px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px}.sap-reports table{border-collapse:separate;border-spacing:0;width:100%;font-size:12px;text-align:left}.sap-reports th{position:sticky;top:0;background:var(--dsw-alias-bg-layer-2);z-index:1;font-weight:600}.sap-reports td,.sap-reports th{padding:10px 14px;white-space:nowrap;border-bottom:1px solid var(--dsw-alias-border-l1);max-width:420px;overflow:hidden;text-overflow:ellipsis}.sap-reports tbody tr:hover{background:var(--dsw-alias-bg-layer-2)}.sap-reports .sr-pagination{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-top:14px;flex-wrap:wrap}.sap-reports .sr-check{display:flex;align-items:center;gap:8px;min-height:36px}.sap-reports .sr-connection-detail{overflow-wrap:anywhere}.sap-reports .sr-progress{color:var(--dsw-alias-brand-primary)}
@media(max-width:1000px){.sap-reports .sr-layout{grid-template-columns:210px minmax(0,1fr)}.sap-reports .sr-content{padding:18px}.sap-reports .sr-condition{grid-template-columns:80px 110px minmax(80px,1fr) 34px}.sap-reports .sr-condition .sr-high{grid-column:3;grid-row:2}.sap-reports .sr-condition button{grid-column:4;grid-row:1}.sap-reports .sr-condition.sr-parameter{grid-template-columns:1fr}}
@media(max-width:720px){.sap-reports .sr-layout{display:flex;flex-direction:column;min-height:unset}.sap-reports .sr-catalog{max-height:280px;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l1)}.sap-reports .sr-content{overflow:visible}.sap-reports .sr-header{padding:18px}.sap-reports .sr-connect{margin:24px auto}.sap-reports .sr-form{grid-template-columns:1fr}.sap-reports .sr-card{padding:16px}.sap-reports .sr-condition{grid-template-columns:75px minmax(95px,1fr) 34px}.sap-reports .sr-condition .sr-low{grid-column:1/3;grid-row:2}.sap-reports .sr-condition .sr-high{grid-column:1/3;grid-row:3}.sap-reports .sr-condition button{grid-column:3}.sap-reports .sr-condition.sr-parameter{grid-template-columns:1fr}.sap-reports .sr-condition.sr-parameter .sr-low{grid-column:1;grid-row:1}}
`;
    const extraCss = `
.sap-reports .sr-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:24px;z-index:60}
.sap-reports .sr-modal{background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;width:min(760px,100%);max-height:80vh;display:flex;flex-direction:column;box-shadow:0 18px 48px rgba(15,23,42,.28)}
.sap-reports .sr-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.sap-reports .sr-modal-head h3{font-size:15px;font-weight:600}
.sap-reports .sr-modal-body{padding:16px 20px;overflow-y:auto;overflow-x:hidden;max-height:62vh}
.sap-reports .sr-modal-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 20px;border-top:1px solid var(--dsw-alias-border-l1)}
.sap-reports .sr-icon-btn{min-height:28px;min-width:28px;padding:2px 8px;line-height:1}
.sap-reports .sr-tabs{display:flex;gap:4px;border-bottom:1px solid var(--dsw-alias-border-l1);margin-bottom:12px;flex-wrap:wrap}
.sap-reports .sr-tab{border:1px solid transparent;border-bottom:none;border-radius:8px 8px 0 0;background:transparent;font-size:13px;padding:6px 12px;min-height:30px}
.sap-reports .sr-tab-active{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-brand-primary);font-weight:600}
.sap-reports .sr-multi{display:flex;flex-direction:column;gap:6px;margin-bottom:10px;min-width:0}
.sap-reports .sr-multi-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 34px;gap:6px;align-items:center}
.sap-reports .sr-multi-row.sr-single{grid-template-columns:minmax(0,1fr) 34px}
.sap-reports .sr-layout.sr-collapsed{grid-template-columns:56px minmax(0,1fr)}
.sap-reports .sr-layout.sr-collapsed .sr-catalog{padding:20px 8px}
.sap-reports .sr-layout.sr-collapsed .sr-catalog-head{flex-direction:column;gap:6px}
.sap-reports .sr-multi-row .sr-low,.sap-reports .sr-multi-row .sr-high{min-width:0}
.sap-reports .sr-multi>*{min-width:0;max-width:100%}
.sap-reports .sr-json{margin:0;font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px;white-space:pre-wrap;word-break:break-word;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:12px;max-height:52vh;overflow:auto}
.sap-reports .sr-filter-row th{padding:4px 8px}
.sap-reports .sr-filter-row input{min-height:28px;font-size:12px;padding:3px 6px}
.sap-reports th[scope=col]{cursor:pointer;user-select:none}
.sap-reports .sr-sort{font-size:10px;margin-left:4px;color:var(--dsw-alias-brand-primary)}
.sap-reports .sr-group-row td{background:var(--dsw-alias-bg-layer-2);font-weight:600}
.sap-reports .sr-subtotal-row td,.sap-reports .sr-total-row td{background:var(--dsw-alias-bg-layer-1);font-weight:600}
.sap-reports .sr-total-row td{border-top:2px solid var(--dsw-alias-border-l2)}
.sap-reports .sr-field.sr-inline{flex-direction:row;align-items:center;gap:6px;white-space:nowrap}
.sap-reports .sr-field.sr-inline select,.sap-reports .sr-jump{min-height:30px;width:auto;min-width:72px}
.sap-reports .sr-jump{width:72px}
.sap-reports .sr-multi>button{align-self:flex-start;min-height:34px}
.sap-reports .sr-multi-row .sr-icon-btn{min-height:36px;min-width:36px;padding:0 10px}
.sap-reports .sr-multi-row input{min-height:36px}
.sap-reports .sr-condition button{min-height:36px;padding:0 14px}
.sap-reports .sr-modal-foot button{min-height:34px;padding:6px 18px}
.sap-reports .sr-selection-field .sr-condition{grid-template-columns:110px 130px minmax(120px,1fr) minmax(120px,1fr) auto}
.sap-reports .sr-modal-head .sr-icon-btn{min-height:30px;min-width:30px;padding:0 9px}
`;
    function Icon({size = 22}) {
      return h('svg', {width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.6,'aria-hidden':true},
        h('rect',{x:3,y:3,width:18,height:18,rx:3}),h('path',{d:'M3 9h18M9 9v12M9 15h12M15 3v6'}));
    }
    function asText(value) { return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value); }
    function fieldList(meta) {
      return [...new Map((meta?.selection || []).map(field => [field.selname, field])).values()];
    }
    function seeds(meta) {
      const values = {};
      for (const f of meta?.selection || []) {
        const low = asText(f.low ?? f.default ?? '');
        const row = {selname:f.selname,kind:f.kind || 'P',sign:f.sign || 'I',option:f.option || 'EQ',low,high:asText(f.high ?? '')};
        (values[f.selname] ||= []).push(row);
      }
      return values;
    }
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        for (const [lang,dict] of Object.entries(dictionaries)) ctx.effect(() => ctx.locale.register(ns,lang,dict));
        const t = ctx.locale.bind(ns);
        let state = {connection:null,tcodes:[],selected:null,meta:null,values:{},variant:'',loadedVariant:'',maxRows:5000,result:null,stale:false,busy:'',error:'',search:'',catalogOpen:true,selOpen:true,dialog:null};
        const listeners = new Set();
        let generation = 0;
        let controller;
        let disposed = false;
        const draft = {endpoint:'',username:'',mode:'intfid',sapClient:'',allowUntrustedTls:false};
        const update = patch => { if (disposed) return; state = {...state,...patch}; for (const fn of listeners) fn(); };
        const subscribe = fn => { listeners.add(fn); return () => listeners.delete(fn); };
        const snapshot = () => state;
        async function call(action,params,signal) {
          const response = await fetch('/api/sap-reports',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...params}),signal});
          let payload;
          try { payload = await response.json(); } catch { throw new Error(`${t('failed')} (HTTP ${response.status})`); }
          if (!response.ok || !payload.ok) {
            const error = new Error(payload.error?.message || t('failed'));
            error.code = payload.error?.code;
            throw error;
          }
          return payload.data;
        }
        async function perform(busy,operation,success) {
          controller?.abort();
          const request = ++generation;
          controller = new AbortController();
          update({busy,error:''});
          try {
            const result = await operation(controller.signal);
            if (request === generation && !disposed) success(result);
          } catch (error) {
            if (request !== generation || disposed) return;
            if (/CONNECTION_(EXPIRED|NOT_FOUND)|NOT_CONNECTED/.test(error.code || '')) {
              update({connection:null,tcodes:[],selected:null,meta:null,values:{},result:null,error:t('expired')});
            } else if (error.name !== 'AbortError') update({error:error.message || t('failed')});
          } finally { if (request === generation) update({busy:''}); }
        }
        function selectReport(report,variant = '') {
          update({selected:report,meta:null,values:{},variant,loadedVariant:'',result:null,filter:'',page:0,stale:false});
          perform('meta',signal => call('meta',{connectionId:state.connection.connectionId,tcode:report.tcode,variant},signal),meta => update({meta,values:seeds(meta),loadedVariant:variant}));
        }
        function setValues(selname,index,patch) {
          const rows = state.values[selname].map((row,i) => i === index ? {...row,...patch} : row);
          update({values:{...state.values,[selname]:rows},stale:!!state.result});
        }
        // 空参数是显式传值（例如未勾选的 ABAP 复选框）；空的选择条件不发送
        function buildSelection() {
          return Object.values(state.values).flat().filter(row => row.kind === 'P' || row.low !== '' || row.high !== '');
        }
        function run() {
          if (!Number.isInteger(Number(state.maxRows)) || Number(state.maxRows)<1 || Number(state.maxRows)>10000) return update({error:t('invalidRows')});
          for (const f of fieldList(state.meta)) {
            const rows = state.values[f.selname] || [];
            if (f.obligatory && !rows.some(row => row.sign === 'I' && row.low.trim())) return update({error:t('requiredError')+(f.text || f.selname)});
            if (rows.some(row => ['BT','NB'].includes(row.option) && (!row.low.trim() || !row.high.trim()))) return update({error:t('rangeError')+(f.text || f.selname)});
          }
          const selection = buildSelection();
          perform('run',signal => call('run',{connectionId:state.connection.connectionId,tcode:state.selected.tcode,variant:'',selection,max_rows:Number(state.maxRows)},signal),result => update({result,stale:false}));
        }
        function cancel() { ++generation; controller?.abort(); update({busy:'',error:t('cancelled')}); }
        function exportExcel() {
          const result = state.result;
          if (!result?.rows?.length) return;
          const fields = columns(result, state.meta);
          const escape = value => asText(value)
            .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
          const head = `<tr>${fields.map(field => `<th>${escape(field.label || field.field)}</th>`).join('')}</tr>`;
          const body = result.rows.map(row => `<tr>${fields.map(field => `<td>${escape(cell(row, field.field))}</td>`).join('')}</tr>`).join('');
          const html = `<html><head><meta charset="utf-8"></head><body><table border="1">${head}${body}</table></body></html>`;
          try {
            const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = Object.assign(document.createElement('a'), {
              href: url,
              download: `${state.selected?.tcode || 'report'}-${new Date().toISOString().slice(0, 10)}.xls`,
            });
            link.click();
            const timer = setTimeout(() => URL.revokeObjectURL(url), 1000);
            ctx.effect(() => () => { clearTimeout(timer); URL.revokeObjectURL(url); });
          } catch { update({ error: t('exportError') }); }
        }
        function columns(result,meta) {
          // SAP 返回的 ALV 字段目录是权威来源：只显示报表实际输出的列，不再从行数据补未知键
          if (result?.fields?.length) return result.fields;
          const fields = meta?.fields || [];
          const found = new Set(fields.map(f => f.field.toLowerCase()));
          const extra = [];
          for (const row of result?.rows || []) for (const key of Object.keys(row)) if (!found.has(key.toLowerCase())) {found.add(key.toLowerCase());extra.push({field:key,label:key});}
          return [...fields,...extra];
        }
        function cell(row,key) {
          if (Object.prototype.hasOwnProperty.call(row,key)) return row[key];
          const match = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
          return match ? row[match] : '';
        }
        function ConnectForm({busy}) {
          const [form,setForm] = React.useState({...draft,password:''});
          // 首次打开时读取插件目录下的连接配置，免去重复填写
          React.useEffect(() => {
            let alive = true;
            call('settings',{}).then(saved => {
              if (!alive || !saved) return;
              setForm(old => ({...old,
                endpoint: old.endpoint || saved.endpoint || '',
                username: old.username || saved.username || '',
                sapClient: old.sapClient || saved.sapClient || '',
                password: old.password || saved.password || '',
                allowUntrustedTls: old.allowUntrustedTls || saved.allowUntrustedTls === true}));
            }).catch(() => {});
            return () => { alive = false; };
          }, []);
          const change = (key,value) => {setForm(old => ({...old,[key]:value}));if(key !== 'password') draft[key]=value;};
          const input = (key,label,type='text',extra={}) => h('label',{className:'sr-field'+(key==='endpoint'?' sr-wide':'')},t(label),h('input',{type,value:form[key],onChange:e=>change(key,e.target.value),disabled:!!busy,required:['endpoint','username','password'].includes(key),...extra}));
          return h('div',{className:'sr-connect'},h('div',{className:'sr-card'},h('h2',null,t('connectTitle')),
            h('form',{className:'sr-form',onSubmit:e => {e.preventDefault();const credentials={...form,mode:'intfid'};setForm(old=>({...old,password:''}));perform('connect',signal=>call('connect',credentials,signal),connection=>update({connection,tcodes:connection.tcodes || [],selected:null,meta:null,result:null}));}},
              input('endpoint','endpoint','url',{placeholder:'https://sap.example.com/sap/bc/zsx_intf_serv/zsx_oa?sap-client=100',autoComplete:'url'}),input('username','username','text',{autoComplete:'username'}),input('password','password','password',{autoComplete:'current-password'}),
              input('sapClient','client','text',{placeholder:'100',maxLength:3,pattern:'[0-9]{3}',inputMode:'numeric'}),
              h('label',{className:'sr-check sr-wide',title:t('untrustedWarning')},h('input',{type:'checkbox',checked:!!form.allowUntrustedTls,disabled:!!busy,onChange:e=>change('allowUntrustedTls',e.target.checked)}),t('allowUntrusted')),
              h('button',{type:'submit',className:'sr-primary sr-wide',disabled:!!busy},t(busy?'connecting':'connect')))));
        }
        function Catalog({s}) {
          const filtered = s.tcodes.filter(r => `${r.tcode} ${r.text} ${r.report}`.toLowerCase().includes(s.search.toLowerCase()));
          const groups = new Map();
          for(const report of filtered) {const group=report.group || t('allReports');if(!groups.has(group))groups.set(group,[]);groups.get(group).push(report);}
          return h('aside',{className:'sr-catalog','aria-label':t('catalog')},
            h('div',{className:'sr-catalog-head'},s.catalogOpen&&h('h2',null,t('catalog')),s.catalogOpen&&h('span',{className:'sr-muted'},`${s.tcodes.length} ${t('reports')}`),h('button',{type:'button',className:'sr-icon-btn','aria-label':t(s.catalogOpen?'collapse':'expand'),title:t(s.catalogOpen?'collapse':'expand'),onClick:()=>update({catalogOpen:!s.catalogOpen})},s.catalogOpen?'«':'»')),
            s.catalogOpen&&h('input',{'aria-label':t('search'),placeholder:t('search'),value:s.search,onChange:e=>update({search:e.target.value}),type:'search'}),
            s.catalogOpen&&[...groups].map(([group,reports]) => h('details',{key:group,open:true},h('summary',null,`${group} (${reports.length})`),h('ul',{className:'sr-tree'},reports.map(report=>h('li',{key:report.tcode},h('button',{type:'button',disabled:!!s.busy && s.busy!=='meta','aria-current':s.selected?.tcode===report.tcode,onClick:()=>selectReport(report)},h('span',{className:'sr-code'},report.tcode),h('span',{className:'sr-muted'},report.text || report.report))))))),
            s.catalogOpen&&!filtered.length&&h('p',{className:'sr-muted'},t(s.tcodes.length?'noMatch':'noReports')));
        }
        function ValueInput({field,row,index,high=false,disabled,onValue}) {
          const key=high?'high':'low';
          const label=`${field.text || field.selname} ${t(high?'high':'low')} ${index+1}`;
          const type=(field.type || '').toUpperCase();
          const value=row[key];
          if (!high && ['BOOL','BOOLEAN','CHECKBOX','ABAP_BOOL'].includes(type)) return h('label',{className:'sr-check sr-low'},h('input',{type:'checkbox',checked:value==='X'||value==='true'||value==='1','aria-label':label,disabled,onChange:e=>{const v=e.target.checked?'X':'';(onValue||((k,val)=>setValues(field.selname,index,{[k]:val})))('low',v);}}),t('boolean'));
          if (!high && field.options?.length) return h('select',{className:'sr-low',value,disabled,'aria-label':label,onChange:e=>(onValue||((k,val)=>setValues(field.selname,index,{[k]:val})))('low',e.target.value)},h('option',{value:''},'—'),field.options.map(opt=>h('option',{key:opt.value,value:opt.value},opt.label || opt.value)));
          const isDate=['D','DATS','DATE'].includes(type);
          const isTime=['T','TIMS','TIME'].includes(type);
          const iso=/^\d{8}$/.test(value)?`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`:'';
          const timestamp=iso ? Date.parse(`${iso}T00:00:00Z`) : NaN;
          const canonical=Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0,10)===iso;
          const useCalendar=isDate && !['CP','NP'].includes(row.option) && (value==='' || canonical);
          const display=useCalendar && value ? iso : value;
          return h('input',{className:high?'sr-high':'sr-low',type:useCalendar?'date':'text',value:display,disabled,'aria-label':label,placeholder:isDate?t('dateHint'):isTime?t('timeHint'):t(high?'high':'low'),onChange:e=>{const v=useCalendar?e.target.value.replaceAll('-',''):e.target.value;(onValue||((k,val)=>setValues(field.selname,index,{[k]:val})))(key,v);}});
        }
        function Modal({ title, children, footer, onClose }) {
          React.useEffect(() => {
            const onKey = event => { if (event.key === 'Escape') onClose(); };
            window.addEventListener('keydown', onKey);
            return () => window.removeEventListener('keydown', onKey);
          }, [onClose]);
          return h('div', { className: 'sr-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, onMouseDown: event => { if (event.target === event.currentTarget) onClose(); } },
            h('div', { className: 'sr-modal' },
              h('div', { className: 'sr-modal-head' }, h('h3', null, title), h('button', { type: 'button', className: 'sr-icon-btn', 'aria-label': t('closeDialog'), onClick: onClose }, '×')),
              h('div', { className: 'sr-modal-body' }, children),
              footer && h('div', { className: 'sr-modal-foot' }, ...footer)));
        }
        function JsonDialog({ s, onClose }) {
          const payload = { tcode: s.selected?.tcode || '', variant: '', selection: buildSelection(), max_rows: Number(s.maxRows) || 0 };
          const text = JSON.stringify(payload, null, 2);
          const [copied, setCopied] = React.useState(false);
          return h(Modal, { title: t('viewJson'), onClose, footer: [
            h('button', { type: 'button', onClick: () => { if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => setCopied(true)).catch(() => {}); } }, copied ? t('copied') : t('copy')),
            h('button', { type: 'button', className: 'sr-primary', onClick: onClose }, t('closeDialog'))] },
          h('pre', { className: 'sr-json' }, text));
        }
        function MultiSelectDialog({ field, s, onClose }) {
          const rows = s.values[field.selname] || [];
          const [draft, setDraft] = React.useState(rows.map(row => ({ ...row })));
          const tabs = [
            { key: 'single', label: t('tabSingle'), sign: 'I', option: 'EQ' },
            { key: 'range', label: t('tabRange'), sign: 'I', option: 'BT' },
            { key: 'exSingle', label: t('tabExSingle'), sign: 'E', option: 'EQ' },
            { key: 'exRange', label: t('tabExRange'), sign: 'E', option: 'BT' }];
          const [tab, setTab] = React.useState(tabs[0].key);
          const active = tabs.find(item => item.key === tab);
          const isRange = item => ['BT', 'NB'].includes(item.option);
          const list = draft.filter(item => item.sign === active.sign && (active.option === 'BT' ? isRange(item) : !isRange(item)));
          const add = () => setDraft([...draft, { selname: field.selname, kind: 'S', sign: active.sign, option: active.option, low: '', high: '' }]);
          const patch = (target, key, value) => setDraft(draft.map(item => item === target ? { ...item, [key]: value } : item));
          const remove = target => setDraft(draft.filter(item => item !== target));
          const apply = () => update({ values: { ...s.values, [field.selname]: draft.filter(item => item.low !== '' || item.high !== '') }, stale: !!s.result, dialog: null });
          return h(Modal, { title: `${field.text || field.selname} · ${t('multiSelect')}`, onClose, footer: [
            h('button', { type: 'button', onClick: onClose }, t('cancelDialog')),
            h('button', { type: 'button', className: 'sr-primary', onClick: apply }, t('apply'))] },
          h(React.Fragment, null,
            h('div', { className: 'sr-tabs' }, tabs.map(item => h('button', { key: item.key, type: 'button', className: item.key === tab ? 'sr-tab sr-tab-active' : 'sr-tab', onClick: () => setTab(item.key) }, item.label))),
            h('div', { className: 'sr-multi' }, list.length === 0 && h('p', { className: 'sr-muted' }, t('emptyTab')),
              list.map((row, index) => h('div', { key: index, className: active.option === 'BT' ? 'sr-multi-row' : 'sr-multi-row sr-single' },
                h(ValueInput, { field, row, index, disabled: false, onValue: (key, value) => patch(row, key, value) }),
                active.option === 'BT' && h(ValueInput, { field, row, index, high: true, disabled: false, onValue: (key, value) => patch(row, key, value) }),
                h('button', { type: 'button', className: 'sr-icon-btn', 'aria-label': t('remove'), onClick: () => remove(row) }, '×'))),
              h('button', { type: 'button', onClick: add }, `+ ${t('add')}`))));
        }
        function SelectionField({ field, s }) {
          const rows = s.values[field.selname] || [];
          const first = rows[0] || { selname: field.selname, kind: field.kind, sign: 'I', option: 'EQ', low: '', high: '' };
          const patchFirst = patch => {
            const next = rows.length ? rows.map((row, index) => index === 0 ? { ...row, ...patch } : row) : [{ ...first, ...patch }];
            update({ values: { ...s.values, [field.selname]: next }, stale: !!s.result });
          };
          return h('div', { className: 'sr-selection-field' },
            h('div', { className: 'sr-field-title' }, h('strong', null, field.text || field.selname), h('span', { className: 'sr-code sr-muted' }, field.selname), field.obligatory && h('span', { className: 'sr-required' }, `* ${t('required')}`)),
            field.kind === 'S'
              ? h('div', { className: 'sr-condition' },
                  h('select', { value: first.sign, disabled: !!s.busy, 'aria-label': `${field.selname} ${t('include')}/${t('exclude')}`, onChange: e => patchFirst({ sign: e.target.value }) }, h('option', { value: 'I' }, t('include')), h('option', { value: 'E' }, t('exclude'))),
                  h('select', { value: first.option, disabled: !!s.busy, 'aria-label': `${field.selname} OPTION`, onChange: e => patchFirst({ option: e.target.value, high: ['BT', 'NB'].includes(e.target.value) ? first.high : '' }) }, ['EQ', 'NE', 'BT', 'NB', 'GE', 'LE', 'GT', 'LT', 'CP', 'NP'].map(op => h('option', { key: op, value: op }, t(op)))),
                  h(ValueInput, { field, row: first, index: 0, disabled: !!s.busy }),
                  ['BT', 'NB'].includes(first.option) ? h(ValueInput, { field, row: first, index: 0, high: true, disabled: !!s.busy }) : h('span', { className: 'sr-high' }),
                  h('button', { type: 'button', disabled: !!s.busy, title: t('multiSelect'), onClick: () => update({ dialog: { kind: 'multi', field: field.selname } }) }, rows.length > 1 ? `${t('multiSelect')} (${rows.length})` : t('multiSelect')))
              : h(ValueInput, { field, row: first, index: 0, disabled: !!s.busy }));
        }
        function Selection({ s }) {
          const fields = fieldList(s.meta);
          return h('section', { className: 'sr-card', 'aria-label': t('selection') },
            h('div', { className: 'sr-section-title' },
              h('div', null, h('h2', null, `${s.selected.tcode} · ${s.selected.text || t('selection')}`), h('p', { className: 'sr-muted' }, `${t('program')}: ${s.meta?.report || s.selected.report || '—'}`)),
              h('div', { className: 'sr-actions' },
                h('label', { className: 'sr-field sr-inline' }, t('maxRows'), h('input', { type: 'number', min: 1, max: 10000, step: 1, disabled: !!s.busy, value: s.maxRows, onChange: e => update({ maxRows: e.target.value, stale: !!s.result }) })),
                h('button', { type: 'button', disabled: !s.meta || !!s.busy, onClick: () => update({ values: seeds(s.meta), stale: !!s.result }) }, t('reset')))),
            s.busy === 'meta' ? h('p', { className: 'sr-progress', role: 'status' }, t('loading'))
              : s.meta && s.selOpen && h('div', { className: 'sr-selections' }, fields.map(field => h(SelectionField, { key: field.selname, field, s })), !fields.length && h('p', { className: 'sr-notice' }, t('noMeta'))),
            h('div', { className: 'sr-querybar' },
              s.busy === 'run' && h('button', { type: 'button', onClick: cancel }, t('cancel')),
              h('button', { type: 'button', disabled: !s.meta, onClick: () => update({ selOpen: !s.selOpen }) }, t(s.selOpen ? 'collapseSelection' : 'expandSelection')),
              h('button', { type: 'button', disabled: !!s.busy || !s.meta, onClick: () => update({ dialog: 'json' }) }, t('viewJson')),
              h('button', { type: 'button', className: 'sr-primary', disabled: !!s.busy || !s.meta, onClick: run }, t(s.busy === 'run' ? 'querying' : 'query'))));
        }
        function Results({ s }) {
          const fields = React.useMemo(() => columns(s.result, s.meta), [s.result, s.meta]);
          const rows = s.result?.rows || [];
          return h('section', { className: 'sr-card', 'aria-label': t('results') },
            h('div', { className: 'sr-result-head' },
              h('div', null, h('h2', null, t('results')), s.result && h('p', { className: 'sr-muted', role: 'status' }, `${t('returned')} ${rows.length} ${t('rows')}`)),
              s.result && h('div', { className: 'sr-actions' },
                h('button', { type: 'button', disabled: !rows.length, onClick: exportExcel }, t('export')))),
            s.result?.truncated && h('p', { className: 'sr-notice sr-warning' }, t('truncated')),
            s.stale && h('p', { className: 'sr-notice sr-warning' }, t('queryStale')),
            !s.result ? h('p', { className: 'sr-muted' }, t('notRun'))
              : !rows.length ? h('p', { className: 'sr-muted' }, t('noRows'))
              : h('div', { className: 'sr-table-wrap', tabIndex: 0, 'aria-label': t('results') },
                  h('table', null,
                    h('thead', null, h('tr', null, fields.map(field => h('th', { key: field.field, scope: 'col', title: field.field }, field.label || field.field)))),
                    h('tbody', null, rows.map((row, index) => h('tr', { key: index }, fields.map(field => h('td', { key: field.field, title: asText(cell(row, field.field)) }, asText(cell(row, field.field))))))))));
        }
        function Page() {
          const s=React.useSyncExternalStore(subscribe,snapshot,snapshot);
          React.useSyncExternalStore(fn=>ctx.locale.subscribe(fn),()=>ctx.locale.getSnapshot(),()=>ctx.locale.getSnapshot());
          return h('div',{className:'sap-reports'},h('style',null,css),h('style',null,extraCss),
            h('header',{className:'sr-header'},h('div',{className:'sr-header-title'},h(Icon,{size:28}),h('div',null,h('h1',null,t('title')))),
              s.connection && h('div',{className:'sr-actions'},h('span',{className:'sr-status'},`● ${t('connected')} · ${s.connection.username}`),h('button',{type:'button',disabled:!!s.busy,onClick:()=>perform('list',signal=>call('list',{connectionId:s.connection.connectionId},signal),data=>{const stillAllowed=data.tcodes.some(r=>r.tcode===s.selected?.tcode);update({tcodes:data.tcodes,...(!stillAllowed?{selected:null,meta:null,result:null,values:{}}:{})});})},t('refresh')),h('button',{type:'button',disabled:!!s.busy,onClick:()=>perform('disconnect',signal=>call('disconnect',{connectionId:s.connection.connectionId},signal),()=>update({connection:null,tcodes:[],selected:null,meta:null,values:{},result:null}))},t('disconnect')))),
            s.error && h('div',{className:'sr-notice sr-error',role:'alert'},h('strong',null,`${t('error')} · `),s.error),
            !s.connection?h(ConnectForm,{busy:s.busy}):h('div',{className:'sr-layout'+(s.catalogOpen?'':' sr-collapsed')},h(Catalog,{s}),h('main',{className:'sr-content'},
              !s.selected?h('div',{className:'sr-empty'},h(Icon,{size:48}),h('h2',null,t('pickTitle')),h('p',null,t('pickHint')),h('details',{className:'sr-connection-detail'},h('summary',null,t('details')),h('p',{className:'sr-muted'},s.connection.endpoint))):h(React.Fragment,null,h(Selection,{s}),h(Results,{s})))),s.dialog==='json'&&h(JsonDialog,{s,onClose:()=>update({dialog:null})}),s.dialog&&s.dialog.kind==='multi'&&h(MultiSelectDialog,{field:fieldList(s.meta).find(f=>f.selname===s.dialog.field),s,onClose:()=>update({dialog:null})}));
        }
        ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:'sap-reports',order:20,label:()=>t('title')},Icon));
        ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:'sap-reports'},Page));
        ctx.effect(()=>()=>{disposed=true;++generation;controller?.abort();listeners.clear();state={};draft.endpoint='';draft.username='';});
      },
    };
  },
});
