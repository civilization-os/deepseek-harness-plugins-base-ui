window.__ModuleLoader__.load({id:"@civilization/deepseek-harness-base-ui",factory:(require)=>{
var module={exports:{}};var exports=module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  GuardianSection: () => GuardianSection,
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");

// src/client/controller.js
var GuardianController = class {
  state = { summary: { total: 0, active: 0, unhealthy: 0, disabled: 0 }, entries: [], history: [], loading: true, saving: false, error: "" };
  listeners = /* @__PURE__ */ new Set();
  generation = 0;
  constructor(call) {
    this.call = call;
  }
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.state;
  publish(next) {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }
  async request(endpoint, args = {}, silent = false) {
    const generation = ++this.generation;
    if (!silent) this.publish({ loading: endpoint === "list", saving: endpoint !== "list", error: "" });
    try {
      const result = await this.call(endpoint, args);
      if (generation !== this.generation && endpoint === "list") return false;
      if (!result.ok) {
        if (!silent) this.publish({ loading: false, saving: false, error: result.error.message || "failed" });
        return false;
      }
      this.publish({ ...result.value, loading: false, saving: false, error: "" });
      return true;
    } catch {
      if (!silent) this.publish({ loading: false, saving: false, error: "failed" });
      return false;
    }
  }
};

// src/client/locales.js
var zh = {
  nav: "Cordis \u770B\u62A4",
  title: "Cordis \u770B\u62A4",
  intro: "\u89C2\u5BDF\u6574\u4E2A Loader \u63D2\u4EF6\u6811\uFF0C\u5E76\u5904\u7406\u6CA1\u6709\u6B63\u5E38\u8FD0\u884C\u7684\u6761\u76EE\u3002",
  refresh: "\u5237\u65B0",
  fixAll: "\u4FEE\u590D\u5168\u90E8",
  total: "\u5168\u90E8\u6761\u76EE",
  active: "\u8FD0\u884C\u4E2D",
  unhealthy: "\u9700\u5904\u7406",
  disabled: "\u5DF2\u7981\u7528",
  search: "\u641C\u7D22\u540D\u79F0\u6216\u6761\u76EE ID",
  empty: "\u6CA1\u6709\u5339\u914D\u7684\u63D2\u4EF6\u3002",
  module: "\u6A21\u5757",
  entryId: "\u6761\u76EE ID",
  parent: "\u7236\u7EA7",
  retry: "\u91CD\u8BD5",
  disable: "\u7981\u7528",
  enable: "\u542F\u7528",
  protected: "\u53D7\u4FDD\u62A4",
  loading: "\u6B63\u5728\u8BFB\u53D6 Cordis \u6811\u2026",
  failed: "\u64CD\u4F5C\u5931\u8D25",
  phase_pending: "\u7B49\u5F85\u4F9D\u8D56",
  phase_loading: "\u52A0\u8F7D\u4E2D",
  phase_active: "\u8FD0\u884C\u4E2D",
  phase_failed: "\u542F\u52A8\u5931\u8D25",
  phase_disposed: "\u5DF2\u91CA\u653E",
  phase_unloading: "\u5378\u8F7D\u4E2D",
  phase_none: "\u672A\u8FD0\u884C",
  phase_unknown: "\u672A\u77E5",
  issue_failed: "\u542F\u52A8\u5931\u8D25",
  "issue_not-running": "\u5DF2\u542F\u7528\u4F46\u672A\u8FD0\u884C",
  issue_stalled: "\u957F\u65F6\u95F4\u672A\u5B8C\u6210",
  group_unhealthy: "\u9700\u8981\u5904\u7406",
  group_active: "\u6B63\u5E38\u8FD0\u884C",
  group_disabled: "\u5DF2\u7981\u7528",
  history: "\u6700\u8FD1\u72B6\u6001\u53D8\u5316",
  confirmDisable: "\u786E\u8BA4\u7981\u7528\u8FD9\u4E2A\u5F02\u5E38\u63D2\u4EF6\uFF1F",
  confirmFixAll: "\u786E\u8BA4\u91CD\u8BD5\u5F53\u524D\u6240\u6709\u5F02\u5E38\u63D2\u4EF6\uFF1F",
  noHistory: "\u8FD8\u6CA1\u6709\u72B6\u6001\u53D8\u5316\u8BB0\u5F55\u3002"
};
var en = {
  nav: "Cordis watchdog",
  title: "Cordis watchdog",
  intro: "Observe the complete Loader plugin tree and recover entries that are not running normally.",
  refresh: "Refresh",
  fixAll: "Repair all",
  total: "All entries",
  active: "Active",
  unhealthy: "Needs attention",
  disabled: "Disabled",
  search: "Search module or entry ID",
  empty: "No matching plugins.",
  module: "Module",
  entryId: "Entry ID",
  parent: "Parent",
  retry: "Retry",
  disable: "Disable",
  enable: "Enable",
  protected: "Protected",
  loading: "Reading the Cordis tree\u2026",
  failed: "Operation failed",
  phase_pending: "Waiting for dependencies",
  phase_loading: "Loading",
  phase_active: "Active",
  phase_failed: "Failed",
  phase_disposed: "Disposed",
  phase_unloading: "Unloading",
  phase_none: "Not running",
  phase_unknown: "Unknown",
  issue_failed: "Failed to start",
  "issue_not-running": "Enabled but not running",
  issue_stalled: "Transition is taking too long",
  group_unhealthy: "Needs attention",
  group_active: "Running normally",
  group_disabled: "Disabled",
  history: "Recent state changes",
  confirmDisable: "Disable this unhealthy plugin?",
  confirmFixAll: "Retry every unhealthy plugin now?",
  noHistory: "No state changes recorded yet."
};

// src/client/styles.css
var styles_default = ".cgw{--cgw-green:#5bc69a;--cgw-amber:#e6ad55;--cgw-red:#e77676;max-width:920px;padding:8px 0 36px;color:var(--dsw-alias-label-primary);font:inherit}.cgw-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:21px 23px;border:1px solid var(--dsw-alias-border-l4);border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--dsw-alias-bg-layer-2) 94%,var(--cgw-green)),var(--dsw-alias-bg-layer-2));box-shadow:inset 3px 0 var(--cgw-green)}.cgw h2{margin:2px 0 7px;font-size:24px;letter-spacing:-.5px}.cgw p{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.55}.cgw-kicker{color:var(--cgw-green)!important;font:700 10px/1.2 ui-monospace,monospace!important;letter-spacing:1.7px}.cgw-actions{display:flex;gap:8px}.cgw button{padding:8px 13px;border:1px solid var(--dsw-alias-border-l4);border-radius:9px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit;font-size:12px;cursor:pointer}.cgw button:disabled{opacity:.45;cursor:default}.cgw .cgw-primary{border-color:color-mix(in srgb,var(--cgw-green) 48%,transparent);background:color-mix(in srgb,var(--cgw-green) 13%,var(--dsw-alias-bg-layer-1))}.cgw-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:12px 0}.cgw-stats article{display:flex;flex-direction:column;gap:2px;padding:13px 15px;border:1px solid var(--dsw-alias-border-l4);border-radius:12px;background:var(--dsw-alias-bg-layer-2)}.cgw-stats article[data-alert=true]{border-color:color-mix(in srgb,var(--cgw-red) 48%,transparent)}.cgw-stats strong{font:650 20px/1 ui-monospace,monospace}.cgw-stats span{color:var(--dsw-alias-label-tertiary);font-size:11px}.cgw-search{display:flex;align-items:center;gap:9px;padding:0 12px;border:1px solid var(--dsw-alias-border-l4);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}.cgw-search span{color:var(--dsw-alias-label-tertiary);font-size:20px}.cgw-search input{width:100%;padding:10px 0;border:0;outline:0;background:transparent;color:inherit;font:inherit}.cgw-groups{display:flex;flex-direction:column;gap:12px;margin-top:14px}.cgw-group{overflow:hidden;border:1px solid var(--dsw-alias-border-l4);border-radius:14px;background:var(--dsw-alias-bg-layer-2)}.cgw-group>header{border-bottom:0}.cgw-group:has(ul)>header{border-bottom:1px solid var(--dsw-alias-border-l4)}.cgw .cgw-group-toggle{display:grid;width:100%;grid-template-columns:auto 1fr auto;align-items:center;gap:9px;padding:12px 16px;border:0;border-radius:0;background:transparent;text-align:left}.cgw-group-toggle h3{margin:0;font-size:13px}.cgw-chevron{display:block;color:var(--dsw-alias-label-tertiary);font-size:18px;line-height:1;transform:rotate(0);transition:transform .15s ease}.cgw-group-toggle[aria-expanded=true] .cgw-chevron{transform:rotate(90deg)}.cgw-count{padding:2px 7px;border-radius:99px;background:var(--dsw-alias-bg-layer-3);font:11px ui-monospace,monospace}.cgw-group ul{margin:0;padding:0;list-style:none}.cgw-group li{display:grid;grid-template-columns:4px 1fr;border-bottom:1px solid var(--dsw-alias-border-l4)}.cgw-group li:last-child{border-bottom:0}.cgw-rail{background:var(--cgw-green)}.cgw-group-unhealthy .cgw-rail{background:var(--cgw-red)}.cgw-group-disabled .cgw-rail{background:#777}.cgw-entry{padding:13px 15px}.cgw-entry-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}.cgw-entry-head>div{display:flex;min-width:0;flex-direction:column;gap:3px}.cgw-entry strong{font-size:13px}.cgw-entry code,.cgw-entry dd{overflow-wrap:anywhere;color:var(--dsw-alias-label-tertiary);font:11px/1.45 ui-monospace,monospace}.cgw-phase{flex:0 0 auto;padding:3px 8px;border-radius:99px;font-size:10px}.cgw-phase-good{color:var(--cgw-green);background:color-mix(in srgb,var(--cgw-green) 12%,transparent)}.cgw-phase-bad{color:var(--cgw-red);background:color-mix(in srgb,var(--cgw-red) 12%,transparent)}.cgw-phase-off{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-3)}.cgw dl{display:grid;gap:4px;margin:10px 0 0}.cgw dl div{display:grid;grid-template-columns:68px 1fr;gap:8px}.cgw dt{color:var(--dsw-alias-label-tertiary);font-size:10px}.cgw dd{margin:0}.cgw-row-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:10px}.cgw-row-actions span{color:var(--dsw-alias-label-tertiary);font-size:11px}.cgw .cgw-danger{color:var(--cgw-red)}.cgw-history{margin-top:14px;padding:12px 15px;border:1px solid var(--dsw-alias-border-l4);border-radius:12px;background:var(--dsw-alias-bg-layer-2);font-size:12px}.cgw-history summary{cursor:pointer}.cgw-history ol{display:grid;gap:7px;margin:12px 0 0;padding:0;list-style:none}.cgw-history li{display:grid;grid-template-columns:80px 1fr auto;gap:10px;color:var(--dsw-alias-label-secondary)}.cgw-history time{color:var(--dsw-alias-label-tertiary);font:11px ui-monospace,monospace}.cgw-history code{overflow-wrap:anywhere}.cgw-error,.cgw-empty{padding:18px!important;text-align:center}.cgw-error{color:var(--cgw-red)!important}@media(max-width:720px){.cgw-hero{align-items:flex-start;flex-direction:column}.cgw-stats{grid-template-columns:repeat(2,1fr)}.cgw-history li{grid-template-columns:72px 1fr}.cgw-history li span{grid-column:2}.cgw-entry-head{flex-direction:column}.cgw-phase{align-self:flex-start}}\n";

// src/client/index.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var inject = ["slots", "locale", "connection"];
var namespace = "settings.cordis-guardian";
function apply(ctx) {
  const controller = new GuardianController((endpoint, args) => ctx.connection.rpc.call("/cordis-guardian", endpoint, args));
  ctx.effect(() => ctx.locale.register(namespace, { zh, en }));
  ctx.effect(() => {
    const style = document.createElement("style");
    style.textContent = styles_default;
    document.head.append(style);
    return () => style.remove();
  });
  ctx.on("connection/reset", () => {
    void controller.request("list");
  });
  const t = ctx.locale.bind(namespace);
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "cordis-guardian",
    order: 18,
    label: () => t("nav"),
    locale: namespace,
    inject: () => ({ controller })
  }, GuardianSection));
}
function GuardianSection({ t, controller }) {
  const state = (0, import_react.useSyncExternalStore)(controller.subscribe, controller.getSnapshot);
  const [query, setQuery] = (0, import_react.useState)("");
  const [expanded, setExpanded] = (0, import_react.useState)({ unhealthy: true, active: false, disabled: false });
  (0, import_react.useEffect)(() => {
    void controller.request("list");
    const timer = setInterval(() => {
      void controller.request("list", {}, true);
    }, 2e3);
    return () => clearInterval(timer);
  }, [controller]);
  const filtered = (0, import_react.useMemo)(() => state.entries.filter((entry) => `${entry.id} ${entry.moduleName}`.toLowerCase().includes(query.trim().toLowerCase())), [state.entries, query]);
  const groups = [
    ["unhealthy", filtered.filter((entry) => entry.issue)],
    ["active", filtered.filter((entry) => !entry.issue && entry.enabled)],
    ["disabled", filtered.filter((entry) => !entry.enabled)]
  ];
  const act = async (entry, action) => {
    if (action === "disable" && !window.confirm(t("confirmDisable"))) return;
    await controller.request("act", { id: entry.id, action, confirmed: true });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "cgw", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "cgw-hero", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "cgw-kicker", children: "RUNTIME / LOADER" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: t("title") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("intro") })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "cgw-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: state.loading || state.saving, onClick: () => controller.request("list"), children: t("refresh") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "cgw-primary", disabled: !state.summary.unhealthy || state.saving, onClick: () => window.confirm(t("confirmFixAll")) && controller.request("fix-all", { confirmed: true }), children: t("fixAll") })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cgw-stats", children: [["total", "total"], ["active", "active"], ["unhealthy", "unhealthy"], ["disabled", "disabled"]].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", { "data-alert": key === "unhealthy" && state.summary[key] > 0, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: state.summary[key] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t(label) })
    ] }, key)) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "cgw-search", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u2315" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: t("search") })
    ] }),
    state.loading && !state.entries.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "cgw-empty", children: t("loading") }) : null,
    state.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "cgw-error", role: "alert", children: state.error === "failed" ? t("failed") : state.error }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cgw-groups", children: groups.map(([name, entries]) => {
      if (!entries.length) return null;
      const open = query.trim() ? true : expanded[name];
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: `cgw-group cgw-group-${name}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "cgw-group-toggle", "aria-expanded": open, onClick: () => setExpanded((current) => ({ ...current, [name]: !current[name] })), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cgw-chevron", "aria-hidden": "true", children: "\u203A" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: t(`group_${name}`) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "cgw-count", children: entries.length })
        ] }) }),
        open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: entries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntryRow, { entry, t, busy: state.saving, act }, entry.id)) }) : null
      ] }, name);
    }) }),
    !state.loading && !filtered.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "cgw-empty", children: t("empty") }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { className: "cgw-history", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: [
        t("history"),
        " \xB7 ",
        state.history.length
      ] }),
      state.history.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", { children: [...state.history].reverse().map((event, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", { children: new Date(event.at).toLocaleTimeString() }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: event.id }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t(`phase_${event.phase ?? "none"}`) })
      ] }, `${event.id}-${event.at}-${index}`)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: t("noHistory") })
    ] })
  ] });
}
function EntryRow({ entry, t, busy, act }) {
  const short = entry.moduleName.split("/").at(-1);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cgw-rail", "aria-hidden": "true" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "cgw-entry", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "cgw-entry-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: short }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: entry.id })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `cgw-phase cgw-phase-${entry.issue ? "bad" : entry.enabled ? "good" : "off"}`, children: entry.issue ? t(`issue_${entry.issue}`) : t(`phase_${entry.phase ?? "none"}`) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: t("module") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: entry.moduleName })
        ] }),
        entry.parentId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: t("parent") }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: entry.parentId })
        ] }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "cgw-row-actions", children: entry.protected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t("protected") }) : !entry.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => act(entry, "enable"), children: t("enable") }) : entry.issue ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => act(entry, "retry"), children: t("retry") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "cgw-danger", disabled: busy, onClick: () => act(entry, "disable"), children: t("disable") })
      ] }) : null })
    ] })
  ] });
}

return module.exports;}});
