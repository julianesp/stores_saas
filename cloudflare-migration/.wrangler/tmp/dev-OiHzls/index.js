var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// .wrangler/tmp/bundle-v2hsAw/checked-fetch.js
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
var urls;
var init_checked_fetch = __esm({
  ".wrangler/tmp/bundle-v2hsAw/checked-fetch.js"() {
    "use strict";
    urls = /* @__PURE__ */ new Set();
    __name(checkURL, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_checked_fetch();
    init_modules_watch_stub();
  }
});

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// src/utils/tenant-manager.ts
var tenant_manager_exports = {};
__export(tenant_manager_exports, {
  TenantManager: () => TenantManager,
  generateTenantId: () => generateTenantId
});
function generateTenantId() {
  return `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
var TenantManager;
var init_tenant_manager = __esm({
  "src/utils/tenant-manager.ts"() {
    "use strict";
    init_checked_fetch();
    init_modules_watch_stub();
    TenantManager = class {
      static {
        __name(this, "TenantManager");
      }
      constructor(env) {
        this.env = env;
      }
      /**
       * Get tenant information by Clerk User ID
       */
      async getTenantByClerkId(clerkUserId) {
        const cachedTenant = await this.env.TENANTS.get(`clerk:${clerkUserId}`, "json");
        if (cachedTenant) {
          return cachedTenant;
        }
        const result = await this.env.TENANTS_DB.prepare("SELECT * FROM tenants WHERE clerk_user_id = ?").bind(clerkUserId).first();
        if (result) {
          await this.env.TENANTS.put(
            `clerk:${clerkUserId}`,
            JSON.stringify(result),
            { expirationTtl: 3600 }
          );
        }
        return result;
      }
      /**
       * Get tenant information by tenant ID
       */
      async getTenantById(tenantId) {
        const result = await this.env.TENANTS_DB.prepare("SELECT * FROM tenants WHERE id = ?").bind(tenantId).first();
        return result;
      }
      /**
       * Create a new tenant and their isolated database
       */
      async createTenant(id, clerkUserId, email) {
        const databaseName = `store_${id}`;
        const tenant = {
          id,
          clerkUserId,
          email,
          databaseName,
          databaseId: `db_${id}`,
          // This would come from Cloudflare API
          subscriptionStatus: "trial",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        await this.env.TENANTS_DB.prepare(
          `INSERT INTO tenants (id, clerk_user_id, email, database_name, database_id, subscription_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          tenant.id,
          tenant.clerkUserId,
          tenant.email,
          tenant.databaseName,
          tenant.databaseId,
          tenant.subscriptionStatus,
          tenant.createdAt,
          tenant.updatedAt
        ).run();
        await this.env.TENANTS.put(
          `clerk:${clerkUserId}`,
          JSON.stringify(tenant),
          { expirationTtl: 3600 }
        );
        return tenant;
      }
      /**
       * Update tenant subscription status
       */
      async updateTenantSubscription(tenantId, status) {
        await this.env.TENANTS_DB.prepare(
          `UPDATE tenants
         SET subscription_status = ?, updated_at = ?
         WHERE id = ?`
        ).bind(status, (/* @__PURE__ */ new Date()).toISOString(), tenantId).run();
        const tenant = await this.getTenantById(tenantId);
        if (tenant) {
          await this.env.TENANTS.delete(`clerk:${tenant.clerkUserId}`);
        }
      }
      /**
       * Get D1 database binding for a specific tenant
       *
       * IMPORTANT: In production, you need to:
       * 1. Pre-create D1 databases for each tenant
       * 2. Add them to wrangler.toml as bindings
       * 3. Map tenant -> binding dynamically
       *
       * For now, this is a placeholder that shows the concept
       */
      getTenantDatabase(tenant) {
        throw new Error("getTenantDatabase not implemented - each tenant needs separate D1 binding");
      }
      /**
       * List all tenants (for admin purposes)
       */
      async listTenants(limit = 100, offset = 0) {
        const result = await this.env.TENANTS_DB.prepare("SELECT * FROM tenants ORDER BY created_at DESC LIMIT ? OFFSET ?").bind(limit, offset).all();
        return result.results || [];
      }
      /**
       * Delete tenant and all associated data
       * DANGEROUS OPERATION - requires confirmation
       */
      async deleteTenant(tenantId) {
        const tenant = await this.getTenantById(tenantId);
        if (!tenant) {
          throw new Error("Tenant not found");
        }
        await this.env.TENANTS_DB.prepare("DELETE FROM tenants WHERE id = ?").bind(tenantId).run();
        await this.env.TENANTS.delete(`clerk:${tenant.clerkUserId}`);
      }
    };
    __name(generateTenantId, "generateTenantId");
  }
});

// .wrangler/tmp/bundle-v2hsAw/middleware-loader.entry.ts
init_checked_fetch();
init_modules_watch_stub();

// .wrangler/tmp/bundle-v2hsAw/middleware-insertion-facade.js
init_checked_fetch();
init_modules_watch_stub();

// src/index.ts
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/index.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/hono.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/hono-base.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/compose.js
init_checked_fetch();
init_modules_watch_stub();
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/context.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/request.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/http-exception.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/request/constants.js
init_checked_fetch();
init_modules_watch_stub();
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/body.js
init_checked_fetch();
init_modules_watch_stub();
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
init_checked_fetch();
init_modules_watch_stub();
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
init_checked_fetch();
init_modules_watch_stub();
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
init_checked_fetch();
init_modules_watch_stub();
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
init_checked_fetch();
init_modules_watch_stub();
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class {
  static {
    __name(this, "Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app11) {
    const subApp = this.basePath(path);
    app11.routes.map((r) => {
      let handler;
      if (app11.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app11.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/index.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/router/reg-exp-router/router.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/router/reg-exp-router/matcher.js
init_checked_fetch();
init_modules_watch_stub();
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }, "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
init_checked_fetch();
init_modules_watch_stub();
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class {
  static {
    __name(this, "Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
init_checked_fetch();
init_modules_watch_stub();
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/reg-exp-router/prepared-router.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/router/smart-router/index.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/router/smart-router/router.js
init_checked_fetch();
init_modules_watch_stub();
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/index.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/router/trie-router/router.js
init_checked_fetch();
init_modules_watch_stub();

// node_modules/hono/dist/router/trie-router/node.js
init_checked_fetch();
init_modules_watch_stub();
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  static {
    __name(this, "Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
init_checked_fetch();
init_modules_watch_stub();
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  }, "cors2");
}, "cors");

// src/middleware/auth.ts
init_checked_fetch();
init_modules_watch_stub();
init_tenant_manager();
async function authMiddleware(c, next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({
      success: false,
      error: "Unauthorized",
      message: "Missing or invalid authorization header"
    }, 401);
  }
  const token = authHeader.substring(7);
  try {
    const clerkUserId = await verifyClerkToken(token, c.env);
    if (!clerkUserId) {
      return c.json({
        success: false,
        error: "Unauthorized",
        message: "Invalid token"
      }, 401);
    }
    const tenantManager = new TenantManager(c.env);
    let tenant = await tenantManager.getTenantByClerkId(clerkUserId);
    if (!tenant) {
      const { generateTenantId: generateTenantId2 } = await Promise.resolve().then(() => (init_tenant_manager(), tenant_manager_exports));
      const payload = await decodeClerkToken(token);
      tenant = await tenantManager.createTenant(
        generateTenantId2(),
        clerkUserId,
        payload.email || ""
      );
    }
    if (tenant.subscriptionStatus === "expired" || tenant.subscriptionStatus === "canceled") {
      return c.json({
        success: false,
        error: "Subscription required",
        message: "Your subscription has expired. Please renew to continue."
      }, 402);
    }
    const userProfile = await c.env.DB.prepare("SELECT id FROM user_profiles WHERE clerk_user_id = ?").bind(clerkUserId).first();
    if (!userProfile) {
      return c.json({
        success: false,
        error: "User profile not found",
        message: "Please complete your profile setup"
      }, 400);
    }
    tenant.id = userProfile.id;
    tenant.clerk_user_id = clerkUserId;
    c.set("tenant", tenant);
    c.set("clerkUserId", clerkUserId);
    await next();
  } catch (error) {
    console.error("Auth error:", error);
    return c.json({
      success: false,
      error: "Unauthorized",
      message: "Token verification failed"
    }, 401);
  }
}
__name(authMiddleware, "authMiddleware");
async function verifyClerkToken(token, env) {
  try {
    const payload = await decodeClerkToken(token);
    return payload.sub || null;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}
__name(verifyClerkToken, "verifyClerkToken");
async function decodeClerkToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  const payload = JSON.parse(
    atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
  );
  return payload;
}
__name(decodeClerkToken, "decodeClerkToken");

// src/routes/products.ts
init_checked_fetch();
init_modules_watch_stub();

// src/utils/db-helpers.ts
init_checked_fetch();
init_modules_watch_stub();
var TenantDB = class {
  static {
    __name(this, "TenantDB");
  }
  constructor(db, tenantId) {
    this.db = db;
    this.tenantId = tenantId;
  }
  /**
   * Get all records from a table (filtered by tenant)
   */
  async getAll(table) {
    const { results } = await this.db.prepare(`SELECT * FROM ${table} WHERE tenant_id = ? ORDER BY created_at DESC`).bind(this.tenantId).all();
    return results || [];
  }
  /**
   * Get a single record by ID (filtered by tenant)
   */
  async getById(table, id) {
    return await this.db.prepare(`SELECT * FROM ${table} WHERE tenant_id = ? AND id = ?`).bind(this.tenantId, id).first();
  }
  /**
   * Query with custom WHERE clause (tenant_id is automatically added)
   *
   * Example:
   * const products = await tenantDB.query('products', 'stock > ? AND sale_price < ?', [0, 10000]);
   */
  async query(table, whereClause, params = []) {
    let sql = `SELECT * FROM ${table} WHERE tenant_id = ?`;
    const bindings = [this.tenantId];
    if (whereClause) {
      sql += ` AND (${whereClause})`;
      bindings.push(...params);
    }
    const { results } = await this.db.prepare(sql).bind(...bindings).all();
    return results || [];
  }
  /**
   * Insert a new record (tenant_id is automatically added)
   */
  async insert(table, data) {
    data.tenant_id = this.tenantId;
    if (!data.created_at) {
      data.created_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    if (!data.updated_at) {
      data.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map(() => "?").join(", ");
    await this.db.prepare(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
    ).bind(...values).run();
    return data.id;
  }
  /**
   * Update a record (tenant_id validation is automatic)
   */
  async update(table, id, data) {
    delete data.tenant_id;
    data.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    const sets = Object.keys(data).map((k) => `${k} = ?`).join(", ");
    const values = Object.values(data);
    await this.db.prepare(
      `UPDATE ${table} SET ${sets} WHERE tenant_id = ? AND id = ?`
    ).bind(...values, this.tenantId, id).run();
  }
  /**
   * Delete a record (tenant_id validation is automatic)
   */
  async delete(table, id) {
    await this.db.prepare(`DELETE FROM ${table} WHERE tenant_id = ? AND id = ?`).bind(this.tenantId, id).run();
  }
  /**
   * Count records (filtered by tenant)
   */
  async count(table, whereClause, params = []) {
    let sql = `SELECT COUNT(*) as count FROM ${table} WHERE tenant_id = ?`;
    const bindings = [this.tenantId];
    if (whereClause) {
      sql += ` AND (${whereClause})`;
      bindings.push(...params);
    }
    const result = await this.db.prepare(sql).bind(...bindings).first();
    return result?.count || 0;
  }
  /**
   * Execute raw SQL with tenant_id automatically bound
   * USE WITH CAUTION - Prefer using the helper methods above
   */
  async raw(sql, params = []) {
    const { results } = await this.db.prepare(sql).bind(this.tenantId, ...params).all();
    return results || [];
  }
  /**
   * Search records (simple LIKE search)
   */
  async search(table, column, searchTerm) {
    const { results } = await this.db.prepare(
      `SELECT * FROM ${table} WHERE tenant_id = ? AND ${column} LIKE ? ORDER BY created_at DESC`
    ).bind(this.tenantId, `%${searchTerm}%`).all();
    return results || [];
  }
  /**
   * Get records with pagination
   */
  async paginate(table, limit = 50, offset = 0, orderBy = "created_at DESC") {
    const { results } = await this.db.prepare(
      `SELECT * FROM ${table} WHERE tenant_id = ? ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    ).bind(this.tenantId, limit, offset).all();
    const total = await this.count(table);
    return {
      data: results || [],
      total
    };
  }
  /**
   * Batch insert (multiple records at once)
   */
  async batchInsert(table, records) {
    if (records.length === 0) return;
    const statements = records.map((data) => {
      data.tenant_id = this.tenantId;
      if (!data.created_at) data.created_at = (/* @__PURE__ */ new Date()).toISOString();
      const columns = Object.keys(data);
      const values = Object.values(data);
      const placeholders = values.map(() => "?").join(", ");
      return this.db.prepare(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
      ).bind(...values);
    });
    await this.db.batch(statements);
  }
  /**
   * Get the tenant ID (for debugging/logging)
   */
  getTenantId() {
    return this.tenantId;
  }
};
function generateId(prefix = "") {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${randomPart}` : `${timestamp}_${randomPart}`;
}
__name(generateId, "generateId");

// src/routes/products.ts
var app = new Hono2();
app.get("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const products = await tenantDB.getAll("products");
    const productsWithParsedImages = products.map((product) => ({
      ...product,
      images: product.images ? typeof product.images === "string" ? JSON.parse(product.images) : product.images : []
    }));
    return c.json({
      success: true,
      data: productsWithParsedImages
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return c.json({
      success: false,
      error: "Failed to fetch products"
    }, 500);
  }
});
app.get("/:id", async (c) => {
  const tenant = c.get("tenant");
  const productId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const product = await tenantDB.getById("products", productId);
    if (!product) {
      return c.json({
        success: false,
        error: "Product not found"
      }, 404);
    }
    const productWithParsedImages = {
      ...product,
      images: product.images ? typeof product.images === "string" ? JSON.parse(product.images) : product.images : []
    };
    return c.json({
      success: true,
      data: productWithParsedImages
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return c.json({
      success: false,
      error: "Failed to fetch product"
    }, 500);
  }
});
app.post("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const body = await c.req.json();
    if (!body.name || body.sale_price === void 0) {
      return c.json({
        success: false,
        error: "Missing required fields: name, sale_price"
      }, 400);
    }
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const productData = {
      id: generateId("prod"),
      barcode: body.barcode || null,
      name: body.name,
      description: body.description || null,
      category_id: body.category_id || null,
      supplier_id: body.supplier_id || null,
      cost_price: body.cost_price || 0,
      sale_price: body.sale_price,
      stock: body.stock || 0,
      min_stock: body.min_stock || 0,
      expiration_date: body.expiration_date || null,
      image_url: body.image_url || null,
      images: body.images ? JSON.stringify(body.images) : null
    };
    await tenantDB.insert("products", productData);
    const product = await tenantDB.getById("products", productData.id);
    return c.json({
      success: true,
      data: product,
      message: "Product created successfully"
    }, 201);
  } catch (error) {
    console.error("Error creating product:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to create product"
    }, 500);
  }
});
app.put("/:id", async (c) => {
  const tenant = c.get("tenant");
  const productId = c.req.param("id");
  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const existing = await tenantDB.getById("products", productId);
    if (!existing) {
      return c.json({
        success: false,
        error: "Product not found"
      }, 404);
    }
    await tenantDB.update("products", productId, body);
    const product = await tenantDB.getById("products", productId);
    return c.json({
      success: true,
      data: product,
      message: "Product updated successfully"
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return c.json({
      success: false,
      error: "Failed to update product"
    }, 500);
  }
});
app.delete("/:id", async (c) => {
  const tenant = c.get("tenant");
  const productId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const existing = await tenantDB.getById("products", productId);
    if (!existing) {
      return c.json({
        success: false,
        error: "Product not found"
      }, 404);
    }
    await tenantDB.delete("products", productId);
    return c.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return c.json({
      success: false,
      error: "Failed to delete product"
    }, 500);
  }
});
app.get("/search", async (c) => {
  const tenant = c.get("tenant");
  const query = c.req.query("q") || "";
  const category = c.req.query("category");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    let products;
    if (category) {
      products = await tenantDB.query(
        "products",
        "category_id = ? AND name LIKE ?",
        [category, `%${query}%`]
      );
    } else {
      products = await tenantDB.search("products", "name", query);
    }
    const productsWithParsedImages = products.map((product) => ({
      ...product,
      images: product.images ? typeof product.images === "string" ? JSON.parse(product.images) : product.images : []
    }));
    return c.json({
      success: true,
      data: productsWithParsedImages
    });
  } catch (error) {
    console.error("Error searching products:", error);
    return c.json({
      success: false,
      error: "Failed to search products"
    }, 500);
  }
});
app.get("/low-stock", async (c) => {
  const tenant = c.get("tenant");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const products = await tenantDB.raw(
      `SELECT * FROM products WHERE tenant_id = ? AND stock <= min_stock ORDER BY (stock - min_stock) ASC`,
      []
    );
    const productsWithParsedImages = products.map((product) => ({
      ...product,
      images: product.images ? typeof product.images === "string" ? JSON.parse(product.images) : product.images : []
    }));
    return c.json({
      success: true,
      data: productsWithParsedImages
    });
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    return c.json({
      success: false,
      error: "Failed to fetch low stock products"
    }, 500);
  }
});
var products_default = app;

// src/routes/customers.ts
init_checked_fetch();
init_modules_watch_stub();
var app2 = new Hono2();
app2.get("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const customers = await tenantDB.getAll("customers");
    return c.json({
      success: true,
      data: customers
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return c.json({
      success: false,
      error: "Failed to fetch customers"
    }, 500);
  }
});
app2.get("/:id", async (c) => {
  const tenant = c.get("tenant");
  const customerId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const customer = await tenantDB.getById("customers", customerId);
    if (!customer) {
      return c.json({
        success: false,
        error: "Customer not found"
      }, 404);
    }
    return c.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return c.json({
      success: false,
      error: "Failed to fetch customer"
    }, 500);
  }
});
app2.post("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const body = await c.req.json();
    if (!body.name) {
      return c.json({
        success: false,
        error: "Missing required field: name"
      }, 400);
    }
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const customerData = {
      id: generateId("cust"),
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      address: body.address || null,
      city: body.city || null,
      id_number: body.id_number || null,
      loyalty_points: body.loyalty_points || 0
    };
    await tenantDB.insert("customers", customerData);
    const customer = await tenantDB.getById("customers", customerData.id);
    return c.json({
      success: true,
      data: customer,
      message: "Customer created successfully"
    }, 201);
  } catch (error) {
    console.error("Error creating customer:", error);
    return c.json({
      success: false,
      error: "Failed to create customer"
    }, 500);
  }
});
app2.put("/:id", async (c) => {
  const tenant = c.get("tenant");
  const customerId = c.req.param("id");
  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const existing = await tenantDB.getById("customers", customerId);
    if (!existing) {
      return c.json({
        success: false,
        error: "Customer not found"
      }, 404);
    }
    await tenantDB.update("customers", customerId, body);
    const customer = await tenantDB.getById("customers", customerId);
    return c.json({
      success: true,
      data: customer,
      message: "Customer updated successfully"
    });
  } catch (error) {
    console.error("Error updating customer:", error);
    return c.json({
      success: false,
      error: "Failed to update customer"
    }, 500);
  }
});
app2.delete("/:id", async (c) => {
  const tenant = c.get("tenant");
  const customerId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const existing = await tenantDB.getById("customers", customerId);
    if (!existing) {
      return c.json({
        success: false,
        error: "Customer not found"
      }, 404);
    }
    await tenantDB.delete("customers", customerId);
    return c.json({
      success: true,
      message: "Customer deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return c.json({
      success: false,
      error: "Failed to delete customer"
    }, 500);
  }
});
var customers_default = app2;

// src/routes/sales.ts
init_checked_fetch();
init_modules_watch_stub();
var app3 = new Hono2();
app3.get("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const sales = await tenantDB.getAll("sales");
    const allItems = await tenantDB.getAll("sale_items");
    const itemsMap = /* @__PURE__ */ new Map();
    allItems.forEach((item) => {
      if (!itemsMap.has(item.sale_id)) {
        itemsMap.set(item.sale_id, []);
      }
      itemsMap.get(item.sale_id).push(item);
    });
    const salesWithItems = sales.map((sale) => ({
      ...sale,
      items: itemsMap.get(sale.id) || []
    }));
    return c.json({
      success: true,
      data: salesWithItems
    });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return c.json({
      success: false,
      error: "Failed to fetch sales"
    }, 500);
  }
});
app3.get("/:id", async (c) => {
  const tenant = c.get("tenant");
  const saleId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const sale = await tenantDB.getById("sales", saleId);
    if (!sale) {
      return c.json({
        success: false,
        error: "Sale not found"
      }, 404);
    }
    const items = await tenantDB.query("sale_items", "sale_id = ?", [saleId]);
    return c.json({
      success: true,
      data: { ...sale, items }
    });
  } catch (error) {
    console.error("Error fetching sale:", error);
    return c.json({
      success: false,
      error: "Failed to fetch sale"
    }, 500);
  }
});
app3.post("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const body = await c.req.json();
    if (!body.total || !body.payment_method || !body.items || body.items.length === 0) {
      return c.json({
        success: false,
        error: "Missing required fields: total, payment_method, items"
      }, 400);
    }
    for (const item of body.items) {
      if (!item.product_id || typeof item.quantity !== "number" || item.quantity <= 0 || typeof item.unit_price !== "number" || typeof item.subtotal !== "number") {
        return c.json({
          success: false,
          error: "Invalid item data: each item must include product_id (string), quantity (number > 0), unit_price (number) and subtotal (number)"
        }, 400);
      }
    }
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const saleCount = await tenantDB.count("sales");
    const saleNumber = `VTA-${dateStr}-${String(saleCount + 1).padStart(6, "0")}`;
    const saleData = {
      id: generateId("sale"),
      sale_number: saleNumber,
      cashier_id: body.cashier_id || tenant.id,
      customer_id: body.customer_id ?? null,
      subtotal: body.subtotal ?? 0,
      tax: body.tax ?? 0,
      discount: body.discount ?? 0,
      total: body.total,
      payment_method: body.payment_method,
      status: body.status || "completada",
      points_earned: body.points_earned ?? 0,
      notes: body.notes ?? null
    };
    if (body.payment_method === "credito") {
      saleData.payment_status = body.payment_status ?? "pendiente";
      saleData.amount_paid = body.amount_paid ?? 0;
      saleData.amount_pending = body.amount_pending ?? body.total;
      saleData.due_date = body.due_date ?? null;
    } else {
      saleData.payment_status = null;
      saleData.amount_paid = null;
      saleData.amount_pending = null;
      saleData.due_date = null;
    }
    await tenantDB.insert("sales", saleData);
    const itemsToInsert = body.items.map((item) => ({
      id: generateId("item"),
      sale_id: saleData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount || 0,
      subtotal: item.subtotal
    }));
    await tenantDB.batchInsert("sale_items", itemsToInsert);
    for (const item of body.items) {
      const product = await tenantDB.getById("products", item.product_id);
      if (product) {
        const newStock = product.stock - item.quantity;
        await tenantDB.update("products", item.product_id, {
          stock: newStock
        });
      }
    }
    const sale = await tenantDB.getById("sales", saleData.id);
    const items = await tenantDB.query("sale_items", "sale_id = ?", [saleData.id]);
    return c.json({
      success: true,
      data: { ...sale, items },
      message: "Sale created successfully"
    }, 201);
  } catch (error) {
    console.error("Error creating sale:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to create sale"
    }, 500);
  }
});
var sales_default = app3;

// src/routes/categories.ts
init_checked_fetch();
init_modules_watch_stub();
var app4 = new Hono2();
app4.get("/", async (c) => {
  try {
    const result = await c.env.DB.prepare("SELECT * FROM categories ORDER BY name").all();
    return c.json({
      success: true,
      data: result.results || []
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return c.json({
      success: false,
      error: "Failed to fetch categories"
    }, 500);
  }
});
app4.get("/:id", async (c) => {
  const categoryId = c.req.param("id");
  try {
    const category = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(categoryId).first();
    if (!category) {
      return c.json({
        success: false,
        error: "Category not found"
      }, 404);
    }
    return c.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return c.json({
      success: false,
      error: "Failed to fetch category"
    }, 500);
  }
});
app4.post("/", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name) {
      return c.json({
        success: false,
        error: "Missing required field: name"
      }, 400);
    }
    const categoryData = {
      id: generateId("cat"),
      name: body.name,
      description: body.description || null,
      color: body.color || null,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    await c.env.DB.prepare(
      "INSERT INTO categories (id, name, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      categoryData.id,
      categoryData.name,
      categoryData.description,
      categoryData.color,
      categoryData.created_at,
      categoryData.updated_at
    ).run();
    const result = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(categoryData.id).first();
    return c.json({
      success: true,
      data: result,
      message: "Category created successfully"
    }, 201);
  } catch (error) {
    console.error("Error creating category:", error);
    return c.json({
      success: false,
      error: "Failed to create category"
    }, 500);
  }
});
app4.put("/:id", async (c) => {
  const categoryId = c.req.param("id");
  try {
    const body = await c.req.json();
    const existing = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(categoryId).first();
    if (!existing) {
      return c.json({
        success: false,
        error: "Category not found"
      }, 404);
    }
    const updates = [];
    const values = [];
    if (body.name !== void 0) {
      updates.push("name = ?");
      values.push(body.name);
    }
    if (body.description !== void 0) {
      updates.push("description = ?");
      values.push(body.description);
    }
    if (body.color !== void 0) {
      updates.push("color = ?");
      values.push(body.color);
    }
    if (updates.length > 0) {
      updates.push("updated_at = ?");
      values.push((/* @__PURE__ */ new Date()).toISOString());
      values.push(categoryId);
      await c.env.DB.prepare(
        `UPDATE categories SET ${updates.join(", ")} WHERE id = ?`
      ).bind(...values).run();
    }
    const category = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(categoryId).first();
    return c.json({
      success: true,
      data: category,
      message: "Category updated successfully"
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return c.json({
      success: false,
      error: "Failed to update category"
    }, 500);
  }
});
app4.delete("/:id", async (c) => {
  const categoryId = c.req.param("id");
  try {
    const existing = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(categoryId).first();
    if (!existing) {
      return c.json({
        success: false,
        error: "Category not found"
      }, 404);
    }
    await c.env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(categoryId).run();
    return c.json({
      success: true,
      message: "Category deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return c.json({
      success: false,
      error: "Failed to delete category"
    }, 500);
  }
});
var categories_default = app4;

// src/routes/suppliers.ts
init_checked_fetch();
init_modules_watch_stub();
var app5 = new Hono2();
app5.get("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const suppliers = await tenantDB.getAll("suppliers");
    return c.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return c.json({
      success: false,
      error: "Failed to fetch suppliers"
    }, 500);
  }
});
app5.get("/:id", async (c) => {
  const tenant = c.get("tenant");
  const supplierId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const supplier = await tenantDB.getById("suppliers", supplierId);
    if (!supplier) {
      return c.json({
        success: false,
        error: "Supplier not found"
      }, 404);
    }
    return c.json({
      success: true,
      data: supplier
    });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return c.json({
      success: false,
      error: "Failed to fetch supplier"
    }, 500);
  }
});
app5.post("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const body = await c.req.json();
    if (!body.name) {
      return c.json({
        success: false,
        error: "Missing required field: name"
      }, 400);
    }
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const supplierData = {
      id: generateId("sup"),
      name: body.name,
      contact_name: body.contact_name ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      city: body.city ?? null,
      notes: body.notes ?? null,
      tax_id: body.tax_id ?? null,
      payment_type: body.payment_type || "contado",
      credit_days: body.credit_days ?? 0,
      credit_limit: body.credit_limit ?? 0,
      current_debt: 0,
      default_discount: body.default_discount ?? 0,
      visit_day: body.visit_day ?? null,
      website: body.website ?? null,
      whatsapp: body.whatsapp ?? null,
      business_hours: body.business_hours ?? null,
      rating: body.rating ?? null,
      status: body.status || "activo",
      delivery_days: body.delivery_days ?? 0,
      minimum_order: body.minimum_order ?? 0,
      total_purchased: 0,
      last_purchase_date: null
    };
    await tenantDB.insert("suppliers", supplierData);
    const supplier = await tenantDB.getById("suppliers", supplierData.id);
    return c.json({
      success: true,
      data: supplier,
      message: "Supplier created successfully"
    }, 201);
  } catch (error) {
    console.error("Error creating supplier:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to create supplier"
    }, 500);
  }
});
app5.put("/:id", async (c) => {
  const tenant = c.get("tenant");
  const supplierId = c.req.param("id");
  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const existing = await tenantDB.getById("suppliers", supplierId);
    if (!existing) {
      return c.json({
        success: false,
        error: "Supplier not found"
      }, 404);
    }
    await tenantDB.update("suppliers", supplierId, body);
    const supplier = await tenantDB.getById("suppliers", supplierId);
    return c.json({
      success: true,
      data: supplier,
      message: "Supplier updated successfully"
    });
  } catch (error) {
    console.error("Error updating supplier:", error);
    return c.json({
      success: false,
      error: "Failed to update supplier"
    }, 500);
  }
});
app5.delete("/:id", async (c) => {
  const tenant = c.get("tenant");
  const supplierId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const existing = await tenantDB.getById("suppliers", supplierId);
    if (!existing) {
      return c.json({
        success: false,
        error: "Supplier not found"
      }, 404);
    }
    await tenantDB.delete("suppliers", supplierId);
    return c.json({
      success: true,
      message: "Supplier deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return c.json({
      success: false,
      error: "Failed to delete supplier"
    }, 500);
  }
});
app5.get("/:id/products", async (c) => {
  const tenant = c.get("tenant");
  const supplierId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const products = await tenantDB.query("products", "supplier_id = ?", [supplierId]);
    return c.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error("Error fetching supplier products:", error);
    return c.json({
      success: false,
      error: "Failed to fetch supplier products"
    }, 500);
  }
});
app5.get("/:id/stats", async (c) => {
  const tenant = c.get("tenant");
  const supplierId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const supplier = await tenantDB.getById("suppliers", supplierId);
    if (!supplier) {
      return c.json({
        success: false,
        error: "Supplier not found"
      }, 404);
    }
    const productCount = await tenantDB.count("products", "supplier_id = ?", [supplierId]);
    let purchaseOrdersCount = 0;
    try {
      purchaseOrdersCount = await tenantDB.count("purchase_orders", "supplier_id = ?", [supplierId]);
    } catch (e) {
    }
    const stats = {
      supplier_name: supplier.name,
      total_products: productCount,
      total_purchased: supplier.total_purchased,
      current_debt: supplier.current_debt,
      credit_available: supplier.credit_limit - supplier.current_debt,
      purchase_orders_count: purchaseOrdersCount,
      last_purchase_date: supplier.last_purchase_date,
      status: supplier.status,
      rating: supplier.rating
    };
    return c.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching supplier stats:", error);
    return c.json({
      success: false,
      error: "Failed to fetch supplier statistics"
    }, 500);
  }
});
var suppliers_default = app5;

// src/routes/purchase-orders.ts
init_checked_fetch();
init_modules_watch_stub();
var app6 = new Hono2();
app6.get("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const orders = await tenantDB.getAll("purchase_orders");
    const allItems = await tenantDB.getAll("purchase_order_items");
    const itemsMap = /* @__PURE__ */ new Map();
    allItems.forEach((item) => {
      if (!itemsMap.has(item.purchase_order_id)) {
        itemsMap.set(item.purchase_order_id, []);
      }
      itemsMap.get(item.purchase_order_id).push(item);
    });
    const ordersWithItems = orders.map((order) => ({
      ...order,
      items: itemsMap.get(order.id) || []
    }));
    return c.json(
      {
        success: true,
        data: ordersWithItems
      }
    );
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch purchase orders"
      },
      500
    );
  }
});
app6.get("/:id", async (c) => {
  const tenant = c.get("tenant");
  const orderId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const order = await tenantDB.getById("purchase_orders", orderId);
    if (!order) {
      return c.json(
        {
          success: false,
          error: "Purchase order not found"
        },
        404
      );
    }
    const items = await tenantDB.query(
      "purchase_order_items",
      "purchase_order_id = ?",
      [orderId]
    );
    return c.json(
      {
        success: true,
        data: { ...order, items }
      }
    );
  } catch (error) {
    console.error("Error fetching purchase order:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch purchase order"
      },
      500
    );
  }
});
app6.get("/supplier/:supplierId", async (c) => {
  const tenant = c.get("tenant");
  const supplierId = c.req.param("supplierId");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const orders = await tenantDB.query(
      "purchase_orders",
      "supplier_id = ?",
      [supplierId]
    );
    return c.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error("Error fetching supplier purchase orders:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch supplier purchase orders"
      },
      500
    );
  }
});
app6.post("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const body = await c.req.json();
    if (!body.supplier_id || !body.items || body.items.length === 0) {
      return c.json(
        {
          success: false,
          error: "Missing required fields: supplier_id, items"
        },
        400
      );
    }
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const orderCount = await tenantDB.count("purchase_orders");
    const orderNumber = `OC-${dateStr}-${String(orderCount + 1).padStart(6, "0")}`;
    const subtotal = body.items.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0
    );
    const tax = body.tax ?? 0;
    const total = subtotal + tax;
    const orderData = {
      id: generateId("po"),
      supplier_id: body.supplier_id,
      order_number: orderNumber,
      status: body.status || "pendiente",
      order_date: now.toISOString(),
      expected_date: body.expected_date ?? null,
      received_date: null,
      subtotal,
      tax,
      total,
      notes: body.notes ?? null
    };
    await tenantDB.insert("purchase_orders", orderData);
    const itemsToInsert = body.items.map((item) => ({
      id: generateId("poi"),
      purchase_order_id: orderData.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      subtotal: item.quantity * item.unit_cost
    }));
    await tenantDB.batchInsert("purchase_order_items", itemsToInsert);
    const order = await tenantDB.getById("purchase_orders", orderData.id);
    const items = await tenantDB.query(
      "purchase_order_items",
      "purchase_order_id = ?",
      [orderData.id]
    );
    return c.json(
      {
        success: true,
        data: { ...order, items },
        message: "Purchase order created successfully"
      },
      201
    );
  } catch (error) {
    console.error("Error creating purchase order:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Failed to create purchase order"
      },
      500
    );
  }
});
app6.put("/:id", async (c) => {
  const tenant = c.get("tenant");
  const orderId = c.req.param("id");
  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const existing = await tenantDB.getById("purchase_orders", orderId);
    if (!existing) {
      return c.json(
        {
          success: false,
          error: "Purchase order not found"
        },
        404
      );
    }
    await tenantDB.update("purchase_orders", orderId, body);
    const order = await tenantDB.getById("purchase_orders", orderId);
    return c.json({
      success: true,
      data: order,
      message: "Purchase order updated successfully"
    });
  } catch (error) {
    console.error("Error updating purchase order:", error);
    return c.json(
      {
        success: false,
        error: "Failed to update purchase order"
      },
      500
    );
  }
});
app6.put("/:id/receive", async (c) => {
  const tenant = c.get("tenant");
  const orderId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const order = await tenantDB.getById("purchase_orders", orderId);
    if (!order) {
      return c.json(
        {
          success: false,
          error: "Purchase order not found"
        },
        404
      );
    }
    const items = await tenantDB.query(
      "purchase_order_items",
      "purchase_order_id = ?",
      [orderId]
    );
    for (const item of items) {
      const product = await tenantDB.getById("products", item.product_id);
      if (product) {
        const newStock = product.stock + item.quantity;
        await tenantDB.update("products", item.product_id, {
          stock: newStock,
          cost_price: item.unit_cost
          // Update cost price with latest purchase cost
        });
      }
    }
    await tenantDB.update("purchase_orders", orderId, {
      status: "recibida",
      received_date: (/* @__PURE__ */ new Date()).toISOString()
    });
    const updatedOrder = await tenantDB.getById("purchase_orders", orderId);
    return c.json({
      success: true,
      data: updatedOrder,
      message: "Purchase order received and inventory updated"
    });
  } catch (error) {
    console.error("Error receiving purchase order:", error);
    return c.json(
      {
        success: false,
        error: "Failed to receive purchase order"
      },
      500
    );
  }
});
app6.delete("/:id", async (c) => {
  const tenant = c.get("tenant");
  const orderId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const existing = await tenantDB.getById("purchase_orders", orderId);
    if (!existing) {
      return c.json(
        {
          success: false,
          error: "Purchase order not found"
        },
        404
      );
    }
    const items = await tenantDB.query(
      "purchase_order_items",
      "purchase_order_id = ?",
      [orderId]
    );
    for (const item of items) {
      await tenantDB.delete("purchase_order_items", item.id);
    }
    await tenantDB.delete("purchase_orders", orderId);
    return c.json({
      success: true,
      message: "Purchase order deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting purchase order:", error);
    return c.json(
      {
        success: false,
        error: "Failed to delete purchase order"
      },
      500
    );
  }
});
var purchase_orders_default = app6;

// src/routes/debtors.ts
init_checked_fetch();
init_modules_watch_stub();
var app7 = new Hono2();
app7.get("/", async (c) => {
  return c.json({ success: true, data: [], message: "Get all debtors (customers with debt)" });
});
app7.get("/:id/credit-sales", async (c) => {
  return c.json({ success: true, data: [], message: `Get credit sales for customer ${c.req.param("id")}` });
});
app7.post("/:id/payments", async (c) => {
  return c.json({ success: true, message: "Register credit payment" }, 201);
});
var debtors_default = app7;

// src/routes/user-profiles.ts
init_checked_fetch();
init_modules_watch_stub();
var app8 = new Hono2();
app8.get("/", async (c) => {
  try {
    const tenant = c.get("tenant");
    const result = await c.env.DB.prepare(
      "SELECT * FROM user_profiles WHERE clerk_user_id = ?"
    ).bind(tenant.clerk_user_id).first();
    if (!result) {
      return c.json({
        success: false,
        error: "User profile not found",
        data: null
      }, 404);
    }
    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to fetch user profile",
      data: null
    }, 500);
  }
});
app8.get("/all", async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM user_profiles ORDER BY created_at DESC"
    ).all();
    return c.json({
      success: true,
      data: result.results || []
    });
  } catch (error) {
    console.error("Error fetching user profiles:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to fetch user profiles",
      data: null
    }, 500);
  }
});
app8.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const tenant = c.get("tenant");
    const currentProfile = await c.env.DB.prepare(
      "SELECT * FROM user_profiles WHERE id = ?"
    ).bind(id).first();
    if (!currentProfile) {
      return c.json({
        success: false,
        error: "User profile not found",
        data: null
      }, 404);
    }
    if (currentProfile.clerk_user_id !== tenant.clerk_user_id && !currentProfile.is_superadmin) {
      return c.json({
        success: false,
        error: "Unauthorized",
        data: null
      }, 403);
    }
    const allowedFields = [
      "full_name",
      "phone",
      "subscription_status",
      "trial_start_date",
      "trial_end_date",
      "subscription_id",
      "last_payment_date",
      "next_billing_date",
      "loyalty_points",
      "loyalty_tier"
    ];
    const updates = [];
    const values = [];
    for (const field of allowedFields) {
      if (body[field] !== void 0) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }
    if (updates.length === 0) {
      return c.json({
        success: false,
        error: "No fields to update",
        data: null
      }, 400);
    }
    updates.push("updated_at = datetime('now')");
    values.push(id);
    await c.env.DB.prepare(
      `UPDATE user_profiles SET ${updates.join(", ")} WHERE id = ?`
    ).bind(...values).run();
    const updated = await c.env.DB.prepare(
      "SELECT * FROM user_profiles WHERE id = ?"
    ).bind(id).first();
    return c.json({
      success: true,
      data: updated,
      message: "User profile updated successfully"
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to update user profile",
      data: null
    }, 500);
  }
});
var user_profiles_default = app8;

// src/routes/credit-payments.ts
init_checked_fetch();
init_modules_watch_stub();
var app9 = new Hono2();
app9.get("/sale/:saleId", async (c) => {
  const tenant = c.get("tenant");
  const tenantDB = new TenantDB(c.env.DB, tenant.id);
  const saleId = c.req.param("saleId");
  try {
    const payments = await tenantDB.raw(
      `SELECT * FROM credit_payments WHERE tenant_id = ? AND sale_id = ? ORDER BY created_at ASC`,
      [saleId]
    );
    return c.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Error al obtener historial de pagos"
      },
      500
    );
  }
});
app9.get("/customer/:customerId", async (c) => {
  const tenant = c.get("tenant");
  const tenantDB = new TenantDB(c.env.DB, tenant.id);
  const customerId = c.req.param("customerId");
  try {
    const payments = await tenantDB.raw(
      `SELECT * FROM credit_payments WHERE tenant_id = ? AND customer_id = ? ORDER BY created_at DESC`,
      [customerId]
    );
    return c.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error("Error fetching customer payments:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Error al obtener pagos del cliente"
      },
      500
    );
  }
});
app9.post("/", async (c) => {
  const tenant = c.get("tenant");
  const tenantDB = new TenantDB(c.env.DB, tenant.id);
  try {
    const body = await c.req.json();
    const {
      sale_id,
      customer_id,
      amount,
      payment_method,
      cashier_id,
      notes
    } = body;
    if (!sale_id || !customer_id || !amount || !payment_method || !cashier_id) {
      return c.json(
        {
          success: false,
          error: "Faltan campos requeridos: sale_id, customer_id, amount, payment_method, cashier_id"
        },
        400
      );
    }
    const sale = await tenantDB.getById("sales", sale_id);
    if (!sale) {
      return c.json(
        {
          success: false,
          error: "Venta no encontrada"
        },
        404
      );
    }
    const currentAmountPaid = sale.amount_paid || 0;
    const newAmountPaid = currentAmountPaid + amount;
    const newAmountPending = sale.total - newAmountPaid;
    let paymentStatus;
    if (newAmountPending <= 0) {
      paymentStatus = "pagado";
    } else if (newAmountPaid > 0 && newAmountPending < sale.total) {
      paymentStatus = "parcial";
    } else {
      paymentStatus = "pendiente";
    }
    const creditPaymentId = generateId("pay");
    const creditPayment = {
      id: creditPaymentId,
      tenant_id: tenant.id,
      sale_id,
      customer_id,
      amount,
      payment_method,
      cashier_id,
      notes: notes || void 0,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    await tenantDB.insert("credit_payments", creditPayment);
    await tenantDB.update("sales", sale_id, {
      amount_paid: newAmountPaid,
      amount_pending: newAmountPending,
      payment_status: paymentStatus
    });
    const customer = await tenantDB.getById("customers", customer_id);
    if (customer) {
      const currentDebt = customer.current_debt || 0;
      await tenantDB.update("customers", customer_id, {
        current_debt: Math.max(0, currentDebt - amount)
      });
    }
    return c.json({
      success: true,
      data: {
        payment: creditPayment,
        sale: {
          id: sale_id,
          amount_paid: newAmountPaid,
          amount_pending: newAmountPending,
          payment_status: paymentStatus
        }
      }
    });
  } catch (error) {
    console.error("Error registering credit payment:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Error al registrar pago"
      },
      500
    );
  }
});
var credit_payments_default = app9;

// src/index.ts
var app10 = new Hono2();
app10.use("/*", cors({
  origin: ["http://localhost:3000", "https://tudominio.com"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true
}));
app10.get("/health", (c) => {
  return c.json({
    success: true,
    message: "Tienda POS API is running",
    environment: c.env.ENVIRONMENT || "unknown",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app10.get("/", (c) => {
  return c.json({
    success: true,
    message: "Tienda POS Multi-Tenant API",
    version: "1.0.0",
    docs: "/docs"
  });
});
app10.use("/api/*", authMiddleware);
app10.route("/api/products", products_default);
app10.route("/api/customers", customers_default);
app10.route("/api/sales", sales_default);
app10.route("/api/categories", categories_default);
app10.route("/api/suppliers", suppliers_default);
app10.route("/api/purchase-orders", purchase_orders_default);
app10.route("/api/debtors", debtors_default);
app10.route("/api/user-profiles", user_profiles_default);
app10.route("/api/credit-payments", credit_payments_default);
app10.notFound((c) => {
  return c.json({
    success: false,
    error: "Not Found",
    message: "The requested endpoint does not exist"
  }, 404);
});
app10.onError((err, c) => {
  console.error("Global error handler:", err);
  return c.json({
    success: false,
    error: "Internal Server Error",
    message: c.env.ENVIRONMENT === "development" ? err.message : "An error occurred"
  }, 500);
});
var src_default = app10;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_checked_fetch();
init_modules_watch_stub();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_checked_fetch();
init_modules_watch_stub();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-v2hsAw/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../../.nvm/versions/node/v22.21.1/lib/node_modules/wrangler/templates/middleware/common.ts
init_checked_fetch();
init_modules_watch_stub();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-v2hsAw/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
