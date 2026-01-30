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

// .wrangler/tmp/bundle-ikGurw/checked-fetch.js
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
  ".wrangler/tmp/bundle-ikGurw/checked-fetch.js"() {
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

// node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "node_modules/wrangler/templates/modules-watch-stub.js"() {
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

// src/utils/clerk-helpers.ts
var clerk_helpers_exports = {};
__export(clerk_helpers_exports, {
  fetchClerkUser: () => fetchClerkUser,
  getClerkUserEmail: () => getClerkUserEmail,
  getClerkUserFullName: () => getClerkUserFullName
});
async function fetchClerkUser(clerkUserId, clerkSecretKey) {
  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: {
        "Authorization": `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      console.error(`Failed to fetch Clerk user: ${response.status} ${response.statusText}`);
      return null;
    }
    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error("Error fetching Clerk user:", error);
    return null;
  }
}
function getClerkUserEmail(user, clerkUserId) {
  if (!user || !user.email_addresses || user.email_addresses.length === 0) {
    return `user_${clerkUserId}@placeholder.com`;
  }
  return user.email_addresses[0].email_address;
}
function getClerkUserFullName(user) {
  if (!user) {
    return "Usuario";
  }
  const firstName = user.first_name || "";
  const lastName = user.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();
  if (fullName) {
    return fullName;
  }
  if (user.username) {
    return user.username;
  }
  return "Usuario";
}
var init_clerk_helpers = __esm({
  "src/utils/clerk-helpers.ts"() {
    "use strict";
    init_checked_fetch();
    init_modules_watch_stub();
    __name(fetchClerkUser, "fetchClerkUser");
    __name(getClerkUserEmail, "getClerkUserEmail");
    __name(getClerkUserFullName, "getClerkUserFullName");
  }
});

// .wrangler/tmp/bundle-ikGurw/middleware-loader.entry.ts
init_checked_fetch();
init_modules_watch_stub();

// .wrangler/tmp/bundle-ikGurw/middleware-insertion-facade.js
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
  route(path, app23) {
    const subApp = this.basePath(path);
    app23.routes.map((r) => {
      let handler;
      if (app23.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app23.errorHandler)(c, () => r.handler(c, next))).res, "handler");
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
    let clerkUser = null;
    let userEmail = "";
    if (!tenant) {
      const clerkSecretKey = c.env.CLERK_SECRET_KEY;
      if (clerkSecretKey) {
        const { fetchClerkUser: fetchClerkUser2, getClerkUserEmail: getClerkUserEmail2 } = await Promise.resolve().then(() => (init_clerk_helpers(), clerk_helpers_exports));
        clerkUser = await fetchClerkUser2(clerkUserId, clerkSecretKey);
        userEmail = getClerkUserEmail2(clerkUser, clerkUserId);
      } else {
        userEmail = `user_${clerkUserId}@placeholder.com`;
      }
    }
    if (!tenant) {
      try {
        const { generateTenantId: generateTenantId2 } = await Promise.resolve().then(() => (init_tenant_manager(), tenant_manager_exports));
        console.log("Creating tenant for clerk_user_id:", clerkUserId, "email:", userEmail);
        tenant = await tenantManager.createTenant(
          generateTenantId2(),
          clerkUserId,
          userEmail
        );
      } catch (error) {
        console.error("Error creating tenant:", error);
        return c.json({
          success: false,
          error: "Failed to create tenant",
          message: error instanceof Error ? error.message : "Unknown error"
        }, 500);
      }
    }
    let userProfile = await c.env.DB.prepare("SELECT id, is_superadmin FROM user_profiles WHERE clerk_user_id = ?").bind(clerkUserId).first();
    if (!userProfile) {
      try {
        if (!clerkUser) {
          const clerkSecretKey = c.env.CLERK_SECRET_KEY;
          if (clerkSecretKey) {
            const { fetchClerkUser: fetchClerkUser2, getClerkUserEmail: getClerkUserEmail2 } = await Promise.resolve().then(() => (init_clerk_helpers(), clerk_helpers_exports));
            clerkUser = await fetchClerkUser2(clerkUserId, clerkSecretKey);
            userEmail = getClerkUserEmail2(clerkUser, clerkUserId);
          } else {
            console.warn("CLERK_SECRET_KEY not configured, using placeholder email");
            userEmail = `user_${clerkUserId}@placeholder.com`;
          }
        }
        const existingProfileByEmail = await c.env.DB.prepare("SELECT id, clerk_user_id, email FROM user_profiles WHERE email = ?").bind(userEmail).first();
        if (existingProfileByEmail) {
          console.warn("\u26A0\uFE0F Email already exists in database:", userEmail, "for clerk_user_id:", existingProfileByEmail.clerk_user_id);
          console.warn("Current clerk_user_id trying to register:", clerkUserId);
          if (existingProfileByEmail.clerk_user_id === clerkUserId) {
            console.log("Same clerk_user_id, returning existing profile");
            userProfile = { id: existingProfileByEmail.id, is_superadmin: 0 };
          } else {
            return c.json({
              success: false,
              error: "Email already registered",
              message: `The email ${userEmail} is already associated with another account. Please use a different email or contact support.`
            }, 409);
          }
        } else {
          const { getClerkUserFullName: getClerkUserFullName2 } = await Promise.resolve().then(() => (init_clerk_helpers(), clerk_helpers_exports));
          const fullName = getClerkUserFullName2(clerkUser);
          const superAdminEmail = "admin@neurai.dev";
          const isSuperAdmin = userEmail === superAdminEmail;
          console.log("Creating user_profile for clerk_user_id:", clerkUserId, "email:", userEmail, "name:", fullName);
          const profileId = `usr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const now = (/* @__PURE__ */ new Date()).toISOString();
          const trialEnd = /* @__PURE__ */ new Date();
          trialEnd.setDate(trialEnd.getDate() + 15);
          await c.env.DB.prepare(
            `INSERT INTO user_profiles (
              id, clerk_user_id, email, role, full_name, is_superadmin,
              subscription_status, trial_start_date, trial_end_date, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            profileId,
            clerkUserId,
            userEmail,
            "admin",
            fullName,
            isSuperAdmin ? 1 : 0,
            isSuperAdmin ? "active" : "trial",
            isSuperAdmin ? null : now,
            isSuperAdmin ? null : trialEnd.toISOString(),
            now,
            now
          ).run();
          console.log("User profile created successfully:", profileId);
          userProfile = { id: profileId, is_superadmin: isSuperAdmin ? 1 : 0 };
        }
      } catch (error) {
        console.error("Error creating user_profile:", error);
        return c.json({
          success: false,
          error: "Failed to create user profile",
          message: error instanceof Error ? error.message : "Unknown error"
        }, 500);
      }
    }
    tenant.id = userProfile.id;
    tenant.clerk_user_id = clerkUserId;
    tenant.is_superadmin = userProfile.is_superadmin === 1;
    if (userProfile.is_superadmin !== 1) {
      if (tenant.subscriptionStatus === "expired" || tenant.subscriptionStatus === "canceled") {
        return c.json({
          success: false,
          error: "Subscription required",
          message: "Your subscription has expired. Please renew to continue."
        }, 402);
      }
    }
    c.set("tenant", tenant);
    c.set("clerkUserId", clerkUserId);
    c.set("userProfileId", userProfile.id);
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
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== void 0)
    );
    const columns = Object.keys(cleanData);
    const values = Object.values(cleanData);
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
    const TABLES_WITHOUT_UPDATED_AT = [
      "credit_payments",
      "sale_items",
      "purchase_order_items",
      "inventory_movements"
    ];
    if (!TABLES_WITHOUT_UPDATED_AT.includes(table) && !data.updated_at) {
      data.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== void 0)
    );
    const sets = Object.keys(cleanData).map((k) => `${k} = ?`).join(", ");
    const values = Object.values(cleanData);
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
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== void 0)
      );
      const columns = Object.keys(cleanData);
      const values = Object.values(cleanData);
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
  const randomPart = Math.random().toString(36).substring(2, 11);
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
    const updateData = { ...body };
    if (updateData.images && Array.isArray(updateData.images)) {
      updateData.images = JSON.stringify(updateData.images);
    }
    await tenantDB.update("products", productId, updateData);
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
      error: error.message || "Failed to update product"
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
    const salesCount = await c.env.DB.prepare("SELECT COUNT(*) as count FROM sale_items WHERE tenant_id = ? AND product_id = ?").bind(tenant.id, productId).first();
    if (salesCount && salesCount.count > 0) {
      return c.json({
        success: false,
        error: "No se puede eliminar un producto que tiene ventas registradas. En su lugar, puedes establecer su stock en 0."
      }, 400);
    }
    await c.env.DB.prepare("DELETE FROM inventory_movements WHERE tenant_id = ? AND product_id = ?").bind(tenant.id, productId).run();
    await c.env.DB.prepare("DELETE FROM cart_items WHERE tenant_id = ? AND product_id = ?").bind(tenant.id, productId).run();
    await c.env.DB.prepare("DELETE FROM purchase_order_items WHERE tenant_id = ? AND product_id = ?").bind(tenant.id, productId).run();
    await c.env.DB.prepare("DELETE FROM offers WHERE tenant_id = ? AND product_id = ?").bind(tenant.id, productId).run();
    await c.env.DB.prepare("DELETE FROM stock_alert_subscriptions WHERE product_id = ?").bind(productId).run();
    await tenantDB.delete("products", productId);
    return c.json({
      success: true,
      data: null,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to delete product"
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
app3.put("/:id", async (c) => {
  const tenant = c.get("tenant");
  const saleId = c.req.param("id");
  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const existingSale = await tenantDB.getById("sales", saleId);
    if (!existingSale) {
      return c.json({
        success: false,
        error: "Sale not found"
      }, 404);
    }
    const isWebOrder = existingSale.sale_number.startsWith("WEB-");
    const isConfirmingPayment = body.status === "completada" && existingSale.status === "pendiente";
    if (isWebOrder && isConfirmingPayment) {
      const items2 = await tenantDB.query("sale_items", "sale_id = ?", [saleId]);
      for (const item of items2) {
        const product = await tenantDB.getById("products", item.product_id);
        if (product) {
          const newStock = product.stock - item.quantity;
          if (newStock < 0) {
            return c.json({
              success: false,
              error: `No hay suficiente stock para el producto ${product.name}. Stock actual: ${product.stock}, requerido: ${item.quantity}`
            }, 400);
          }
          await tenantDB.update("products", item.product_id, {
            stock: newStock
          });
        }
      }
    }
    const updateData = {};
    if (body.status !== void 0) updateData.status = body.status;
    if (body.payment_status !== void 0) updateData.payment_status = body.payment_status;
    if (body.amount_paid !== void 0) updateData.amount_paid = body.amount_paid;
    if (body.amount_pending !== void 0) updateData.amount_pending = body.amount_pending;
    if (body.notes !== void 0) updateData.notes = body.notes;
    await tenantDB.update("sales", saleId, updateData);
    const updatedSale = await tenantDB.getById("sales", saleId);
    const items = await tenantDB.query("sale_items", "sale_id = ?", [saleId]);
    return c.json({
      success: true,
      data: { ...updatedSale, items },
      message: "Sale updated successfully"
    });
  } catch (error) {
    console.error("Error updating sale:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to update sale"
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
    const tenant = c.get("tenant");
    const result = await c.env.DB.prepare(
      "SELECT * FROM categories WHERE tenant_id = ? ORDER BY name"
    ).bind(tenant.id).all();
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
    const tenant = c.get("tenant");
    const body = await c.req.json();
    if (!body.name) {
      return c.json({
        success: false,
        error: "Missing required field: name"
      }, 400);
    }
    const categoryData = {
      id: generateId("cat"),
      tenant_id: tenant.id,
      name: body.name,
      description: body.description || null,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    await c.env.DB.prepare(
      "INSERT INTO categories (id, tenant_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
      categoryData.id,
      categoryData.tenant_id,
      categoryData.name,
      categoryData.description,
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
  const tenant = c.get("tenant");
  try {
    const body = await c.req.json();
    const existing = await c.env.DB.prepare(
      "SELECT * FROM categories WHERE id = ? AND tenant_id = ?"
    ).bind(categoryId, tenant.id).first();
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
    if (updates.length > 0) {
      updates.push("updated_at = ?");
      values.push((/* @__PURE__ */ new Date()).toISOString());
      values.push(categoryId);
      values.push(tenant.id);
      await c.env.DB.prepare(
        `UPDATE categories SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
      ).bind(...values).run();
    }
    const category = await c.env.DB.prepare(
      "SELECT * FROM categories WHERE id = ? AND tenant_id = ?"
    ).bind(categoryId, tenant.id).first();
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
  const tenant = c.get("tenant");
  try {
    const existing = await c.env.DB.prepare(
      "SELECT * FROM categories WHERE id = ? AND tenant_id = ?"
    ).bind(categoryId, tenant.id).first();
    if (!existing) {
      return c.json({
        success: false,
        error: "Category not found"
      }, 404);
    }
    await c.env.DB.prepare("DELETE FROM categories WHERE id = ? AND tenant_id = ?").bind(categoryId, tenant.id).run();
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
    return c.json({
      success: true,
      data: ordersWithItems
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
    const normalizedResult = {
      ...result,
      is_superadmin: !!result.is_superadmin,
      has_ai_addon: !!result.has_ai_addon,
      auto_reports_enabled: !!result.auto_reports_enabled,
      store_enabled: !!result.store_enabled,
      store_shipping_enabled: !!result.store_shipping_enabled,
      store_pickup_enabled: !!result.store_pickup_enabled,
      wompi_enabled: !!result.wompi_enabled
    };
    return c.json({
      success: true,
      data: normalizedResult
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
    const normalizedResults = (result.results || []).map((profile) => ({
      ...profile,
      is_superadmin: !!profile.is_superadmin,
      has_ai_addon: !!profile.has_ai_addon,
      auto_reports_enabled: !!profile.auto_reports_enabled
    }));
    return c.json({
      success: true,
      data: normalizedResults
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
    const isSuperAdmin = tenant.is_superadmin === true;
    if (currentProfile.clerk_user_id !== tenant.clerk_user_id && !isSuperAdmin) {
      return c.json({
        success: false,
        error: "Unauthorized - Solo puedes actualizar tu propio perfil o ser superadmin",
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
      "loyalty_tier",
      // Addon subscriptions
      "has_ai_addon",
      "has_store_addon",
      "has_email_addon",
      "ai_addon_expires_at",
      "store_addon_expires_at",
      "email_addon_expires_at",
      // Storefront configuration fields
      "store_slug",
      "store_name",
      "store_description",
      "store_logo_url",
      "store_banner_url",
      "store_primary_color",
      "store_secondary_color",
      "store_whatsapp",
      "store_facebook",
      "store_instagram",
      "store_address",
      "store_city",
      "store_phone",
      "store_email",
      "store_enabled",
      "store_terms",
      "store_shipping_enabled",
      "store_pickup_enabled",
      "store_min_order",
      "store_nequi_number",
      // Wompi payment configuration
      "wompi_public_key",
      "wompi_private_key",
      "wompi_enabled"
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
    const normalizedUpdated = {
      ...updated,
      is_superadmin: !!updated.is_superadmin,
      has_ai_addon: !!updated.has_ai_addon,
      auto_reports_enabled: !!updated.auto_reports_enabled,
      store_enabled: !!updated.store_enabled,
      store_shipping_enabled: !!updated.store_shipping_enabled,
      store_pickup_enabled: !!updated.store_pickup_enabled,
      wompi_enabled: !!updated.wompi_enabled
    };
    return c.json({
      success: true,
      data: normalizedUpdated,
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
app8.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const tenant = c.get("tenant");
    const requestingUser = await c.env.DB.prepare(
      "SELECT is_superadmin FROM user_profiles WHERE clerk_user_id = ?"
    ).bind(tenant.clerk_user_id).first();
    if (!requestingUser?.is_superadmin) {
      return c.json({
        success: false,
        error: "Unauthorized - Solo superadmins pueden eliminar usuarios",
        data: null
      }, 403);
    }
    const userToDelete = await c.env.DB.prepare(
      "SELECT * FROM user_profiles WHERE id = ?"
    ).bind(id).first();
    if (!userToDelete) {
      return c.json({
        success: false,
        error: "User profile not found",
        data: null
      }, 404);
    }
    if (userToDelete.clerk_user_id === tenant.clerk_user_id) {
      return c.json({
        success: false,
        error: "No puedes eliminar tu propia cuenta",
        data: null
      }, 400);
    }
    if (userToDelete.is_superadmin) {
      return c.json({
        success: false,
        error: "No se puede eliminar a otro superadmin",
        data: null
      }, 400);
    }
    const stats = await c.env.DB.batch([
      c.env.DB.prepare("SELECT COUNT(*) as count FROM products WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM sales WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM categories WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM suppliers WHERE tenant_id = ?").bind(id)
    ]);
    const deletionStats = {
      products: stats[0].results[0]?.count || 0,
      sales: stats[1].results[0]?.count || 0,
      customers: stats[2].results[0]?.count || 0,
      categories: stats[3].results[0]?.count || 0,
      suppliers: stats[4].results[0]?.count || 0
    };
    await c.env.DB.batch([
      // 1. Eliminar items de carritos, pagos, items de ventas, items de órdenes
      c.env.DB.prepare("DELETE FROM cart_items WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM credit_payments WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM sale_items WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM purchase_order_items WHERE tenant_id = ?").bind(id),
      // 2. Eliminar carritos, ventas, órdenes de compra
      c.env.DB.prepare("DELETE FROM shopping_carts WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM sales WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM purchase_orders WHERE tenant_id = ?").bind(id),
      // 3. Eliminar ofertas, movimientos de inventario
      c.env.DB.prepare("DELETE FROM offers WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM inventory_movements WHERE tenant_id = ?").bind(id),
      // 4. Eliminar productos
      c.env.DB.prepare("DELETE FROM products WHERE tenant_id = ?").bind(id),
      // 5. Eliminar clientes, categorías, proveedores
      c.env.DB.prepare("DELETE FROM customers WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM categories WHERE tenant_id = ?").bind(id),
      c.env.DB.prepare("DELETE FROM suppliers WHERE tenant_id = ?").bind(id)
    ]);
    await c.env.DB.prepare(
      "DELETE FROM user_profiles WHERE id = ?"
    ).bind(id).run();
    try {
      await c.env.DB.prepare(
        "DELETE FROM tenants WHERE clerk_user_id = ?"
      ).bind(userToDelete.clerk_user_id).run();
    } catch (error) {
      console.warn("Error deleting tenant (might not exist):", error);
    }
    return c.json({
      success: true,
      data: {
        deleted_user: {
          id: userToDelete.id,
          email: userToDelete.email,
          full_name: userToDelete.full_name
        },
        deleted_data: deletionStats
      },
      message: `Usuario ${userToDelete.email} eliminado correctamente junto con todos sus datos`
    });
  } catch (error) {
    console.error("Error deleting user profile:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to delete user profile",
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
    let customerReachedRewardThreshold = false;
    let customerNewPoints = 0;
    if (paymentStatus === "pagado" && sale.points_earned && sale.points_earned > 0) {
      if (customer) {
        const currentPoints = customer.loyalty_points || 0;
        const newPoints = currentPoints + sale.points_earned;
        await tenantDB.update("customers", customer_id, {
          loyalty_points: newPoints
        });
        customerNewPoints = newPoints;
        const REWARD_THRESHOLD = 100;
        if (currentPoints < REWARD_THRESHOLD && newPoints >= REWARD_THRESHOLD) {
          customerReachedRewardThreshold = true;
          console.log(`\u{1F389} Cliente ${customer_id} alcanz\xF3 ${REWARD_THRESHOLD} puntos y puede obtener descuento!`);
        }
        console.log(`Puntos asignados: ${sale.points_earned} puntos al cliente ${customer_id} por completar pago de venta ${sale_id}`);
      }
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
        },
        points_awarded: paymentStatus === "pagado" && sale.points_earned ? sale.points_earned : 0,
        customer_reached_reward_threshold: customerReachedRewardThreshold,
        customer_new_points: customerNewPoints
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

// src/routes/offers.ts
init_checked_fetch();
init_modules_watch_stub();
var app10 = new Hono2();
app10.get("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const offers = await tenantDB.getAll("offers");
    return c.json({
      success: true,
      data: offers
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    return c.json({
      success: false,
      error: "Failed to fetch offers"
    }, 500);
  }
});
app10.get("/active", async (c) => {
  const tenant = c.get("tenant");
  const now = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const result = await c.env.DB.prepare(
      `SELECT * FROM offers
       WHERE tenant_id = ?
         AND is_active = 1
         AND start_date <= ?
         AND end_date >= ?
       ORDER BY created_at DESC`
    ).bind(tenant.id, now, now).all();
    return c.json({
      success: true,
      data: result.results
    });
  } catch (error) {
    console.error("Error fetching active offers:", error);
    return c.json({
      success: false,
      error: "Failed to fetch active offers"
    }, 500);
  }
});
app10.get("/product/:productId", async (c) => {
  const tenant = c.get("tenant");
  const productId = c.req.param("productId");
  try {
    const result = await c.env.DB.prepare(
      `SELECT * FROM offers
       WHERE tenant_id = ? AND product_id = ?
       ORDER BY created_at DESC`
    ).bind(tenant.id, productId).all();
    return c.json({
      success: true,
      data: result.results
    });
  } catch (error) {
    console.error("Error fetching product offers:", error);
    return c.json({
      success: false,
      error: "Failed to fetch product offers"
    }, 500);
  }
});
app10.get("/:id", async (c) => {
  const tenant = c.get("tenant");
  const offerId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const offer = await tenantDB.getById("offers", offerId);
    if (!offer) {
      return c.json({
        success: false,
        error: "Offer not found"
      }, 404);
    }
    return c.json({
      success: true,
      data: offer
    });
  } catch (error) {
    console.error("Error fetching offer:", error);
    return c.json({
      success: false,
      error: "Failed to fetch offer"
    }, 500);
  }
});
app10.post("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const body = await c.req.json();
    const {
      product_id,
      discount_percentage,
      discount_amount,
      start_date,
      end_date,
      is_active = 1,
      reason
    } = body;
    if (!product_id || !discount_percentage || !start_date || !end_date) {
      return c.json({
        success: false,
        error: "Missing required fields: product_id, discount_percentage, start_date, end_date"
      }, 400);
    }
    const offerId = generateId("off");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const product = await tenantDB.getById("products", product_id);
    if (!product) {
      return c.json({
        success: false,
        error: "Product not found"
      }, 404);
    }
    const offer = {
      id: offerId,
      tenant_id: tenant.id,
      product_id,
      discount_percentage,
      discount_amount: discount_amount || 0,
      start_date,
      end_date,
      is_active: is_active ? 1 : 0,
      reason: reason || null,
      created_at: now,
      updated_at: now
    };
    await c.env.DB.prepare(
      `INSERT INTO offers (
        id, tenant_id, product_id, discount_percentage, discount_amount,
        start_date, end_date, is_active, reason, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      offer.id,
      offer.tenant_id,
      offer.product_id,
      offer.discount_percentage,
      offer.discount_amount,
      offer.start_date,
      offer.end_date,
      offer.is_active,
      offer.reason,
      offer.created_at,
      offer.updated_at
    ).run();
    return c.json({
      success: true,
      data: offer
    }, 201);
  } catch (error) {
    console.error("Error creating offer:", error);
    return c.json({
      success: false,
      error: "Failed to create offer"
    }, 500);
  }
});
app10.put("/:id", async (c) => {
  const tenant = c.get("tenant");
  const offerId = c.req.param("id");
  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const existingOffer = await tenantDB.getById("offers", offerId);
    if (!existingOffer) {
      return c.json({
        success: false,
        error: "Offer not found"
      }, 404);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updates = [];
    const values = [];
    if (body.product_id !== void 0) {
      updates.push("product_id = ?");
      values.push(body.product_id);
    }
    if (body.discount_percentage !== void 0) {
      updates.push("discount_percentage = ?");
      values.push(body.discount_percentage);
    }
    if (body.discount_amount !== void 0) {
      updates.push("discount_amount = ?");
      values.push(body.discount_amount);
    }
    if (body.start_date !== void 0) {
      updates.push("start_date = ?");
      values.push(body.start_date);
    }
    if (body.end_date !== void 0) {
      updates.push("end_date = ?");
      values.push(body.end_date);
    }
    if (body.is_active !== void 0) {
      updates.push("is_active = ?");
      values.push(body.is_active ? 1 : 0);
    }
    if (body.reason !== void 0) {
      updates.push("reason = ?");
      values.push(body.reason);
    }
    updates.push("updated_at = ?");
    values.push(now);
    values.push(offerId, tenant.id);
    await c.env.DB.prepare(
      `UPDATE offers SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`
    ).bind(...values).run();
    const updatedOffer = await tenantDB.getById("offers", offerId);
    return c.json({
      success: true,
      data: updatedOffer
    });
  } catch (error) {
    console.error("Error updating offer:", error);
    return c.json({
      success: false,
      error: "Failed to update offer"
    }, 500);
  }
});
app10.delete("/:id", async (c) => {
  const tenant = c.get("tenant");
  const offerId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const offer = await tenantDB.getById("offers", offerId);
    if (!offer) {
      return c.json({
        success: false,
        error: "Offer not found"
      }, 404);
    }
    await c.env.DB.prepare("DELETE FROM offers WHERE id = ? AND tenant_id = ?").bind(offerId, tenant.id).run();
    return c.json({
      success: true,
      message: "Offer deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return c.json({
      success: false,
      error: "Failed to delete offer"
    }, 500);
  }
});
var offers_default = app10;

// src/routes/payment-transactions.ts
init_checked_fetch();
init_modules_watch_stub();
var app11 = new Hono2();
app11.get("/", async (c) => {
  const tenant = c.get("tenant");
  if (!tenant.is_superadmin) {
    return c.json({
      success: false,
      error: "Unauthorized - Superadmin access required"
    }, 403);
  }
  try {
    const result = await c.env.DB.prepare(
      `SELECT * FROM payment_transactions ORDER BY created_at DESC`
    ).all();
    return c.json({
      success: true,
      data: result.results
    });
  } catch (error) {
    console.error("Error fetching payment transactions:", error);
    return c.json({
      success: false,
      error: "Failed to fetch payment transactions"
    }, 500);
  }
});
app11.get("/my", async (c) => {
  const tenant = c.get("tenant");
  try {
    const result = await c.env.DB.prepare(
      `SELECT * FROM payment_transactions
       WHERE user_profile_id = ?
       ORDER BY created_at DESC`
    ).bind(tenant.id).all();
    return c.json({
      success: true,
      data: result.results
    });
  } catch (error) {
    console.error("Error fetching my payment transactions:", error);
    return c.json({
      success: false,
      error: "Failed to fetch payment transactions"
    }, 500);
  }
});
app11.get("/user/:userId", async (c) => {
  const tenant = c.get("tenant");
  const userId = c.req.param("userId");
  if (!tenant.is_superadmin) {
    return c.json({
      success: false,
      error: "Unauthorized - Superadmin access required"
    }, 403);
  }
  try {
    const result = await c.env.DB.prepare(
      `SELECT * FROM payment_transactions
       WHERE user_profile_id = ?
       ORDER BY created_at DESC`
    ).bind(userId).all();
    return c.json({
      success: true,
      data: result.results
    });
  } catch (error) {
    console.error("Error fetching user payment transactions:", error);
    return c.json({
      success: false,
      error: "Failed to fetch payment transactions"
    }, 500);
  }
});
app11.get("/:id", async (c) => {
  const tenant = c.get("tenant");
  const transactionId = c.req.param("id");
  try {
    const result = await c.env.DB.prepare(
      `SELECT * FROM payment_transactions WHERE id = ?`
    ).bind(transactionId).first();
    if (!result) {
      return c.json({
        success: false,
        error: "Payment transaction not found"
      }, 404);
    }
    const transaction = result;
    if (transaction.user_profile_id !== tenant.id && !tenant.is_superadmin) {
      return c.json({
        success: false,
        error: "Unauthorized - You can only view your own transactions"
      }, 403);
    }
    return c.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error("Error fetching payment transaction:", error);
    return c.json({
      success: false,
      error: "Failed to fetch payment transaction"
    }, 500);
  }
});
app11.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      user_profile_id,
      wompi_transaction_id,
      amount,
      currency = "COP",
      status,
      payment_method_type,
      reference
    } = body;
    if (!user_profile_id || !wompi_transaction_id || !amount || !status) {
      return c.json({
        success: false,
        error: "Missing required fields: user_profile_id, wompi_transaction_id, amount, status"
      }, 400);
    }
    const userProfile = await c.env.DB.prepare(
      `SELECT id FROM user_profiles WHERE id = ?`
    ).bind(user_profile_id).first();
    if (!userProfile) {
      return c.json({
        success: false,
        error: "User profile not found"
      }, 404);
    }
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(
      `INSERT INTO payment_transactions (
        id, user_profile_id, wompi_transaction_id, amount, currency,
        status, payment_method_type, reference, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      transactionId,
      user_profile_id,
      wompi_transaction_id,
      amount,
      currency,
      status,
      payment_method_type || null,
      reference || null,
      now
    ).run();
    const transaction = {
      id: transactionId,
      user_profile_id,
      wompi_transaction_id,
      amount,
      currency,
      status,
      payment_method_type,
      reference,
      created_at: now
    };
    return c.json({
      success: true,
      data: transaction
    }, 201);
  } catch (error) {
    console.error("Error creating payment transaction:", error);
    return c.json({
      success: false,
      error: "Failed to create payment transaction"
    }, 500);
  }
});
app11.put("/:id", async (c) => {
  const tenant = c.get("tenant");
  const transactionId = c.req.param("id");
  if (!tenant.is_superadmin) {
    return c.json({
      success: false,
      error: "Unauthorized - Superadmin access required"
    }, 403);
  }
  try {
    const body = await c.req.json();
    const existingTransaction = await c.env.DB.prepare(
      `SELECT * FROM payment_transactions WHERE id = ?`
    ).bind(transactionId).first();
    if (!existingTransaction) {
      return c.json({
        success: false,
        error: "Payment transaction not found"
      }, 404);
    }
    if (body.status) {
      await c.env.DB.prepare(
        `UPDATE payment_transactions SET status = ? WHERE id = ?`
      ).bind(body.status, transactionId).run();
    }
    const updatedTransaction = await c.env.DB.prepare(
      `SELECT * FROM payment_transactions WHERE id = ?`
    ).bind(transactionId).first();
    return c.json({
      success: true,
      data: updatedTransaction
    });
  } catch (error) {
    console.error("Error updating payment transaction:", error);
    return c.json({
      success: false,
      error: "Failed to update payment transaction"
    }, 500);
  }
});
var payment_transactions_default = app11;

// src/routes/webhooks.ts
init_checked_fetch();
init_modules_watch_stub();
var app12 = new Hono2();
app12.get("/wompi/config", async (c) => {
  try {
    return c.json({
      success: true,
      data: {
        webhook_url: "https://tienda-pos-api.julian-mendieta24.workers.dev/api/webhooks/wompi",
        expected_secret: c.env.WOMPI_EVENTS_SECRET || "prod_events_QqwC3D3DQxyCyvjMo1O4VFRIT6DaJ2ZZ",
        wompi_public_key: c.env.WOMPI_PUBLIC_KEY ? "configurada" : "NO configurada",
        wompi_private_key: c.env.WOMPI_PRIVATE_KEY ? "configurada" : "NO configurada",
        instructions: "Configure este webhook URL en Wompi Dashboard: Settings > API Keys > Eventos"
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});
app12.post("/wompi", async (c) => {
  try {
    const webhookSecret = c.req.header("X-Webhook-Secret");
    const expectedSecret = c.env.WOMPI_EVENTS_SECRET || "prod_events_QqwC3D3DQxyCyvjMo1O4VFRIT6DaJ2ZZ";
    if (webhookSecret !== expectedSecret) {
      console.error("\u274C Invalid webhook secret");
      return c.json({
        success: false,
        error: "Invalid webhook secret"
      }, 401);
    }
    const event = await c.req.json();
    console.log("\u{1F4E8} Wompi webhook event received:", event.event);
    console.log("Transaction data:", event.data);
    try {
      console.log("\u{1F4E4} Forwarding event to Neurai.dev...");
      const neuraiResponse = await fetch("https://neurai.dev/api/payments/confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": expectedSecret
        },
        body: JSON.stringify(event)
      });
      if (neuraiResponse.ok) {
        console.log("\u2705 Event forwarded to Neurai.dev successfully");
      } else {
        console.warn(`\u26A0\uFE0F Failed to forward to Neurai.dev: ${neuraiResponse.status}`);
      }
    } catch (error) {
      console.error("\u274C Error forwarding to Neurai.dev:", error);
    }
    if (event.event === "transaction.updated") {
      const transaction = event.data.transaction;
      const { id, status, reference, amount_in_cents, payment_method_type, payment_link_id } = transaction;
      console.log(`\u{1F504} Processing transaction ${id} with status: ${status}`);
      console.log(`Reference: ${reference}, Payment Link ID: ${payment_link_id}`);
      if (payment_link_id) {
        console.log(`\u{1F4B3} Transaction from payment link: ${payment_link_id}`);
        const paymentLink = event.data.payment_link;
        const sku = paymentLink?.sku;
        if (!sku) {
          console.error("\u274C Payment link has no SKU");
          return c.json({
            success: false,
            error: "Payment link has no SKU"
          }, 400);
        }
        console.log(`\u{1F6D2} Processing web order with SKU: ${sku}`);
        const sale = await c.env.DB.prepare(
          `SELECT id, tenant_id, total, status, sale_number FROM sales WHERE id = ?`
        ).bind(sku).first();
        if (!sale) {
          console.error("\u274C Sale not found for SKU:", sku);
          return c.json({
            success: false,
            error: "Sale not found"
          }, 404);
        }
        console.log(`\u2705 Found sale: ${sale.id} (${sale.status})`);
        if (status === "APPROVED") {
          const now = (/* @__PURE__ */ new Date()).toISOString();
          await c.env.DB.prepare(
            `UPDATE sales
             SET status = 'completada',
                 payment_status = 'pagado',
                 amount_paid = ?,
                 amount_pending = 0,
                 notes = COALESCE(notes, '') || ?
             WHERE id = ? AND tenant_id = ?`
          ).bind(
            sale.total,
            `
Pago confirmado v\xEDa Wompi: ${id}
M\xE9todo: ${payment_method_type || "desconocido"}
Fecha: ${now}`,
            sale.id,
            sale.tenant_id
          ).run();
          console.log(`\u2705 Sale ${sale.id} marked as completed and paid`);
          const saleItems = await c.env.DB.prepare(
            `SELECT product_id, quantity FROM sale_items WHERE sale_id = ? AND tenant_id = ?`
          ).bind(sale.id, sale.tenant_id).all();
          for (const item of saleItems.results) {
            await c.env.DB.prepare(
              `UPDATE products SET stock = stock - ? WHERE id = ? AND tenant_id = ?`
            ).bind(item.quantity, item.product_id, sale.tenant_id).run();
          }
          console.log(`\u2705 Inventory updated for ${saleItems.results.length} products`);
          return c.json({
            success: true,
            message: "Web order completed and inventory updated",
            data: {
              saleId: sale.id,
              orderNumber: sale.sale_number,
              status: "completada"
            }
          });
        }
        if (status === "DECLINED" || status === "ERROR" || status === "VOIDED") {
          await c.env.DB.prepare(
            `UPDATE sales
             SET notes = COALESCE(notes, '') || ?
             WHERE id = ? AND tenant_id = ?`
          ).bind(
            `
Pago rechazado/error en Wompi: ${id}
Estado: ${status}
Fecha: ${(/* @__PURE__ */ new Date()).toISOString()}`,
            sale.id,
            sale.tenant_id
          ).run();
          console.log(`\u26A0\uFE0F Sale ${sale.id} payment declined/error`);
          return c.json({
            success: true,
            message: "Payment declined for web order",
            data: {
              saleId: sale.id,
              orderNumber: sale.sale_number,
              status: "pendiente"
            }
          });
        }
        console.log(`\u23F3 Web order ${sale.sale_number} status is ${status}, waiting for completion`);
        return c.json({
          success: true,
          message: "Transaction recorded, awaiting completion",
          data: {
            saleId: sale.id,
            orderNumber: sale.sale_number,
            transactionStatus: status
          }
        });
      }
      const referenceParts = reference.split("-");
      const transactionType = referenceParts[0];
      if (referenceParts.length < 2 || !["SUB", "SUBSCRIPTION", "ADDON"].includes(transactionType)) {
        console.error("\u274C Invalid reference format:", reference);
        return c.json({
          success: true,
          message: "Transaction received but not processed (unknown type)"
        });
      }
      let userId = "";
      if (transactionType === "SUB") {
        userId = referenceParts[1];
      } else if (transactionType === "SUBSCRIPTION" || transactionType === "ADDON") {
        userId = referenceParts[2];
      }
      const userProfileResult = await c.env.DB.prepare(
        `SELECT id, email, subscription_status, has_ai_addon, has_store_addon, has_email_addon FROM user_profiles WHERE id LIKE ?`
      ).bind(`${userId}%`).first();
      if (!userProfileResult) {
        console.error("\u274C User profile not found for reference:", reference);
        return c.json({
          success: false,
          error: "User profile not found"
        }, 404);
      }
      console.log(`\u2705 Found user profile: ${userProfileResult.id} (${userProfileResult.email})`);
      const existingTransaction = await c.env.DB.prepare(
        `SELECT id FROM payment_transactions WHERE wompi_transaction_id = ?`
      ).bind(id).first();
      if (!existingTransaction) {
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await c.env.DB.prepare(
          `INSERT INTO payment_transactions (
            id, user_profile_id, wompi_transaction_id, amount, currency,
            status, payment_method_type, reference, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          transactionId,
          userProfileResult.id,
          id,
          amount_in_cents / 100,
          "COP",
          status,
          payment_method_type || "unknown",
          reference,
          now
        ).run();
        console.log(`\u2705 Payment transaction created: ${transactionId}`);
      } else {
        await c.env.DB.prepare(
          `UPDATE payment_transactions SET status = ? WHERE wompi_transaction_id = ?`
        ).bind(status, id).run();
        console.log(`\u2705 Payment transaction updated: ${id}`);
      }
      if (status === "APPROVED") {
        const now = /* @__PURE__ */ new Date();
        const nextBillingDate = new Date(now);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        const amountCOP = amount_in_cents / 100;
        let planId = userProfileResult.subscription_status === "trial" ? null : "basic-monthly";
        let hasAIAddon = userProfileResult.has_ai_addon;
        let hasStoreAddon = userProfileResult.has_store_addon;
        let hasEmailAddon = userProfileResult.has_email_addon;
        let updateSubscriptionStatus = false;
        if (transactionType === "ADDON") {
          const addonId = referenceParts[1];
          if (addonId.includes("ai")) {
            hasAIAddon = 1;
            console.log("\u2705 Activating AI addon");
          } else if (addonId.includes("store")) {
            hasStoreAddon = 1;
            console.log("\u2705 Activating Store addon");
          } else if (addonId.includes("email")) {
            hasEmailAddon = 1;
            console.log("\u2705 Activating Email addon");
          }
        } else if (transactionType === "SUBSCRIPTION" || transactionType === "SUB") {
          updateSubscriptionStatus = true;
          if (amountCOP === 24900) {
            planId = "basic-monthly";
          } else if (amountCOP === 4900) {
            hasAIAddon = 1;
          } else if (amountCOP === 9900) {
            hasStoreAddon = 1;
          } else if (amountCOP === 29800) {
            planId = "basic-monthly";
            hasAIAddon = 1;
          } else if (amountCOP === 34800) {
            planId = "basic-monthly";
            hasStoreAddon = 1;
          }
        }
        const updates = [];
        const bindings = [];
        if (updateSubscriptionStatus) {
          updates.push("subscription_status = ?", "plan_id = ?", "trial_start_date = NULL", "trial_end_date = NULL");
          bindings.push("active", planId);
        }
        updates.push(
          "has_ai_addon = ?",
          "has_store_addon = ?",
          "has_email_addon = ?",
          "last_payment_date = ?",
          "next_billing_date = ?",
          "updated_at = ?"
        );
        bindings.push(
          hasAIAddon,
          hasStoreAddon,
          hasEmailAddon,
          now.toISOString(),
          nextBillingDate.toISOString(),
          now.toISOString(),
          userProfileResult.id
        );
        await c.env.DB.prepare(
          `UPDATE user_profiles SET ${updates.join(", ")} WHERE id = ?`
        ).bind(...bindings).run();
        console.log(`\u2705 ${transactionType === "ADDON" ? "Addon" : "Subscription"} activated for user: ${userProfileResult.id}`);
        console.log(`Plan: ${planId}, AI: ${hasAIAddon}, Store: ${hasStoreAddon}, Email: ${hasEmailAddon}`);
        return c.json({
          success: true,
          message: transactionType === "ADDON" ? "Addon activated successfully" : "Subscription activated successfully",
          data: {
            userId: userProfileResult.id,
            planId,
            hasAIAddon: hasAIAddon === 1,
            hasStoreAddon: hasStoreAddon === 1,
            hasEmailAddon: hasEmailAddon === 1
          }
        });
      }
      if (status === "DECLINED" || status === "ERROR" || status === "VOIDED") {
        await c.env.DB.prepare(
          `UPDATE user_profiles SET
            subscription_status = 'expired',
            updated_at = ?
          WHERE id = ?`
        ).bind((/* @__PURE__ */ new Date()).toISOString(), userProfileResult.id).run();
        console.log(`\u26A0\uFE0F  Subscription marked as expired for user: ${userProfileResult.id}`);
        return c.json({
          success: true,
          message: "Subscription marked as expired",
          data: {
            userId: userProfileResult.id,
            status: "expired"
          }
        });
      }
      console.log(`\u23F3 Transaction status is ${status}, waiting for completion`);
      return c.json({
        success: true,
        message: "Transaction recorded, awaiting completion",
        data: {
          userId: userProfileResult.id,
          transactionStatus: status
        }
      });
    }
    return c.json({
      success: true,
      message: "Event received but not processed"
    });
  } catch (error) {
    console.error("\u274C Error processing Wompi webhook:", error);
    return c.json({
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});
var webhooks_default = app12;

// src/routes/admin-stats.ts
init_checked_fetch();
init_modules_watch_stub();
var app13 = new Hono2();
app13.get("/stats", async (c) => {
  try {
    const tenant = c.get("tenant");
    const currentProfile = await c.env.DB.prepare(
      "SELECT * FROM user_profiles WHERE clerk_user_id = ?"
    ).bind(tenant.clerk_user_id).first();
    if (!currentProfile?.is_superadmin) {
      return c.json({
        success: false,
        error: "No tienes permisos para acceder a esta informaci\xF3n",
        data: null
      }, 403);
    }
    const allProfiles = await c.env.DB.prepare(
      "SELECT * FROM user_profiles WHERE is_superadmin = 0 OR is_superadmin IS NULL ORDER BY created_at DESC"
    ).all();
    const stores = allProfiles.results || [];
    const storeStats = await Promise.all(
      stores.map(async (store) => {
        try {
          console.log(`[ADMIN-STATS] Getting stats for store: ${store.id} (${store.email})`);
          const productsResult = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM products WHERE tenant_id = ?"
          ).bind(store.id).first();
          const productsCount = productsResult?.count || 0;
          console.log(`[ADMIN-STATS] Store ${store.email} has ${productsCount} products with tenant_id=${store.id}`);
          const salesResult = await c.env.DB.prepare(
            "SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM sales WHERE tenant_id = ? AND status = ?"
          ).bind(store.id, "completada").first();
          const salesCount = salesResult?.count || 0;
          const salesTotal = salesResult?.total || 0;
          const customersResult = await c.env.DB.prepare(
            "SELECT COUNT(*) as count FROM customers WHERE tenant_id = ?"
          ).bind(store.id).first();
          const customersCount = customersResult?.count || 0;
          const lastSaleResult = await c.env.DB.prepare(
            "SELECT created_at FROM sales WHERE tenant_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1"
          ).bind(store.id, "completada").first();
          const lastSaleDate = lastSaleResult?.created_at || null;
          return {
            storeId: store.id,
            storeName: store.full_name || store.email,
            storeEmail: store.email,
            subscriptionStatus: store.subscription_status,
            stats: {
              productsCount,
              salesCount,
              salesTotal,
              customersCount,
              lastSaleDate,
              isActive: salesCount > 0 || productsCount > 0
            }
          };
        } catch (error) {
          console.error(`Error getting stats for store ${store.id}:`, error);
          return {
            storeId: store.id,
            storeName: store.full_name || store.email,
            storeEmail: store.email,
            subscriptionStatus: store.subscription_status,
            stats: {
              productsCount: 0,
              salesCount: 0,
              salesTotal: 0,
              customersCount: 0,
              lastSaleDate: null,
              isActive: false
            }
          };
        }
      })
    );
    return c.json({
      success: true,
      data: storeStats
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to fetch admin stats",
      data: null
    }, 500);
  }
});
var admin_stats_default = app13;

// src/routes/storefront.ts
init_checked_fetch();
init_modules_watch_stub();
var app14 = new Hono2();
app14.get("/config/:slug", async (c) => {
  const slug = c.req.param("slug");
  try {
    const result = await c.env.DB.prepare(
      `SELECT
        id, store_slug, store_name, store_description,
        store_logo_url, store_banner_url,
        store_primary_color, store_secondary_color,
        store_whatsapp, store_facebook, store_instagram,
        store_address, store_city, store_phone, store_email,
        store_enabled, store_terms,
        store_shipping_enabled, store_pickup_enabled, store_min_order,
        store_nequi_number
      FROM user_profiles
      WHERE store_slug = ? AND store_enabled = 1`
    ).bind(slug).first();
    if (!result) {
      return c.json({
        success: false,
        error: "Store not found or disabled"
      }, 404);
    }
    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error fetching store config:", error);
    return c.json({
      success: false,
      error: "Failed to fetch store configuration"
    }, 500);
  }
});
app14.get("/products/:slug", async (c) => {
  const slug = c.req.param("slug");
  const category = c.req.query("category");
  try {
    const store = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE store_slug = ? AND store_enabled = 1"
    ).bind(slug).first();
    if (!store) {
      return c.json({
        success: false,
        error: "Store not found or disabled"
      }, 404);
    }
    let query = `
      SELECT
        p.id, p.name, p.description, p.sale_price, p.stock,
        p.images, p.category_id,
        c.name as category_name,
        o.discount_percentage, o.id as offer_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id AND p.tenant_id = c.tenant_id
      LEFT JOIN offers o ON p.id = o.product_id
        AND o.is_active = 1
        AND datetime(o.start_date) <= datetime('now')
        AND datetime(o.end_date) >= datetime('now')
      WHERE p.tenant_id = ? AND p.stock > 0
    `;
    const bindings = [store.id];
    if (category) {
      query += " AND p.category_id = ?";
      bindings.push(category);
    }
    query += " ORDER BY p.name ASC";
    const result = await c.env.DB.prepare(query).bind(...bindings).all();
    return c.json({
      success: true,
      data: result.results
    });
  } catch (error) {
    console.error("Error fetching store products:", error);
    return c.json({
      success: false,
      error: "Failed to fetch products"
    }, 500);
  }
});
app14.get("/product/:slug/:productId", async (c) => {
  const slug = c.req.param("slug");
  const productId = c.req.param("productId");
  try {
    const store = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE store_slug = ? AND store_enabled = 1"
    ).bind(slug).first();
    if (!store) {
      return c.json({
        success: false,
        error: "Store not found or disabled"
      }, 404);
    }
    const product = await c.env.DB.prepare(
      `SELECT
        p.*,
        c.name as category_name,
        o.discount_percentage, o.id as offer_id, o.reason as offer_reason
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id AND p.tenant_id = c.tenant_id
      LEFT JOIN offers o ON p.id = o.product_id
        AND o.is_active = 1
        AND datetime(o.start_date) <= datetime('now')
        AND datetime(o.end_date) >= datetime('now')
      WHERE p.id = ? AND p.tenant_id = ?`
    ).bind(productId, store.id).first();
    if (!product) {
      return c.json({
        success: false,
        error: "Product not found"
      }, 404);
    }
    return c.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return c.json({
      success: false,
      error: "Failed to fetch product"
    }, 500);
  }
});
app14.get("/categories/:slug", async (c) => {
  const slug = c.req.param("slug");
  try {
    const store = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE store_slug = ? AND store_enabled = 1"
    ).bind(slug).first();
    if (!store) {
      return c.json({
        success: false,
        error: "Store not found or disabled"
      }, 404);
    }
    const result = await c.env.DB.prepare(
      `SELECT
        c.id, c.name, c.description,
        COUNT(p.id) as product_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND c.tenant_id = p.tenant_id AND p.stock > 0
      WHERE c.tenant_id = ?
      GROUP BY c.id, c.name, c.description
      HAVING product_count > 0
      ORDER BY c.name ASC`
    ).bind(store.id).all();
    return c.json({
      success: true,
      data: result.results
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return c.json({
      success: false,
      error: "Failed to fetch categories"
    }, 500);
  }
});
app14.post("/orders/:slug", async (c) => {
  const slug = c.req.param("slug");
  try {
    const body = await c.req.json();
    if (!body.customer_name || !body.customer_phone || !body.items || body.items.length === 0 || !body.delivery_method) {
      return c.json({
        success: false,
        error: "Missing required fields: customer_name, customer_phone, items, delivery_method"
      }, 400);
    }
    const store = await c.env.DB.prepare(
      "SELECT id, store_name, store_whatsapp, wompi_enabled FROM user_profiles WHERE store_slug = ? AND store_enabled = 1"
    ).bind(slug).first();
    if (!store) {
      return c.json({
        success: false,
        error: "Store not found or disabled"
      }, 404);
    }
    const tenantDB = new TenantDB(c.env.DB, store.id);
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
    const saleCount = await tenantDB.count("sales");
    const orderNumber = `WEB-${dateStr}-${String(saleCount + 1).padStart(6, "0")}`;
    const subtotal = body.items.reduce((sum, item) => {
      return sum + item.unit_price * item.quantity;
    }, 0);
    const discount = body.items.reduce((sum, item) => {
      if (item.discount_percentage && item.discount_percentage > 0) {
        const itemTotal = item.unit_price * item.quantity;
        const discountAmount = itemTotal * (item.discount_percentage / 100);
        return sum + discountAmount;
      }
      return sum;
    }, 0);
    const shippingCost = body.shipping_cost ? parseFloat(body.shipping_cost) : 0;
    const total = subtotal - discount + shippingCost;
    const saleData = {
      id: generateId("sale"),
      sale_number: orderNumber,
      cashier_id: store.id,
      // El dueño de la tienda como "cajero"
      customer_id: null,
      // Sin customer_id porque no está registrado
      subtotal,
      tax: 0,
      discount,
      total,
      payment_method: "transferencia",
      // Pago por transferencia (Nequi, etc.)
      status: "pendiente",
      // Estado inicial del pedido
      points_earned: 0,
      notes: `Pedido web - Cliente: ${body.customer_name}
Tel\xE9fono: ${body.customer_phone}
${body.customer_email ? `Email: ${body.customer_email}
` : ""}Entrega: ${body.delivery_method === "pickup" ? "Recogida en tienda" : "Env\xEDo a domicilio"}
${body.delivery_address ? `Direcci\xF3n: ${body.delivery_address}
` : ""}${shippingCost > 0 ? `Costo de env\xEDo: $${shippingCost.toFixed(0)}
` : ""}${body.notes ? `Notas: ${body.notes}` : ""}`,
      payment_status: "pendiente",
      amount_paid: 0,
      amount_pending: total,
      due_date: null
    };
    await tenantDB.insert("sales", saleData);
    const itemsToInsert = body.items.map((item) => ({
      id: generateId("item"),
      sale_id: saleData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount_percentage ? item.unit_price * item.quantity * item.discount_percentage / 100 : 0,
      subtotal: item.unit_price * item.quantity - (item.discount_percentage ? item.unit_price * item.quantity * item.discount_percentage / 100 : 0)
    }));
    await tenantDB.batchInsert("sale_items", itemsToInsert);
    return c.json({
      success: true,
      data: {
        order_id: saleData.id,
        order_number: orderNumber,
        total,
        store_whatsapp: store.store_whatsapp,
        wompi_enabled: !!store.wompi_enabled
      },
      message: "Order created successfully"
    }, 201);
  } catch (error) {
    console.error("Error creating order:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to create order"
    }, 500);
  }
});
app14.get("/shipping-zones/:slug", async (c) => {
  const slug = c.req.param("slug");
  try {
    const store = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE store_slug = ? AND store_enabled = 1"
    ).bind(slug).first();
    if (!store) {
      return c.json({
        success: false,
        error: "Store not found or disabled"
      }, 404);
    }
    const result = await c.env.DB.prepare(
      `SELECT id, zone_name, shipping_cost
       FROM shipping_zones
       WHERE tenant_id = ? AND is_active = 1
       ORDER BY zone_name ASC`
    ).bind(store.id).all();
    return c.json({
      success: true,
      data: result.results
    });
  } catch (error) {
    console.error("Error fetching shipping zones:", error);
    return c.json({
      success: false,
      error: "Failed to fetch shipping zones"
    }, 500);
  }
});
app14.post("/wompi/create-payment-link/:slug", async (c) => {
  const slug = c.req.param("slug");
  try {
    const body = await c.req.json();
    const { order_id, order_number, amount_in_cents, customer_email, customer_name } = body;
    if (!order_id || !order_number || !amount_in_cents) {
      return c.json({
        success: false,
        error: "Missing required fields: order_id, order_number, amount_in_cents"
      }, 400);
    }
    const store = await c.env.DB.prepare(
      "SELECT id, wompi_public_key, wompi_private_key, wompi_enabled FROM user_profiles WHERE store_slug = ? AND store_enabled = 1"
    ).bind(slug).first();
    if (!store) {
      return c.json({
        success: false,
        error: "Store not found or disabled"
      }, 404);
    }
    if (!store.wompi_enabled) {
      return c.json({
        success: false,
        error: "Wompi payments not enabled for this store"
      }, 400);
    }
    if (!store.wompi_private_key) {
      return c.json({
        success: false,
        error: "Wompi credentials not configured"
      }, 400);
    }
    if (amount_in_cents < 2e5) {
      return c.json({
        success: false,
        error: "El monto m\xEDnimo para pagos con Wompi es de $2,000 COP"
      }, 400);
    }
    const redirectUrl = `https://posib.dev/store/${slug}/payment-confirmation`;
    const wompiResponse = await fetch("https://production.wompi.co/v1/payment_links", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${store.wompi_private_key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: `Pedido ${order_number}`,
        description: `Pago del pedido ${order_number}${customer_name ? ` - ${customer_name}` : ""}`,
        single_use: true,
        collect_shipping: false,
        currency: "COP",
        amount_in_cents,
        reference: order_number,
        // CLAVE: Usar order_number como referencia para identificar en webhook
        sku: order_id,
        redirect_url: redirectUrl
      })
    });
    if (!wompiResponse.ok) {
      const errorData = await wompiResponse.json().catch(() => ({}));
      console.error("Wompi API error:", errorData);
      return c.json({
        success: false,
        error: errorData.error?.reason || "Error al crear el link de pago en Wompi"
      }, 500);
    }
    const wompiData = await wompiResponse.json();
    const checkoutUrl = `https://checkout.wompi.co/l/${wompiData.data.id}`;
    await c.env.DB.prepare(
      `UPDATE sales
       SET notes = COALESCE(notes, '') || '
Wompi Payment Link ID: ' || ?
       WHERE id = ? AND tenant_id = ?`
    ).bind(wompiData.data.id, order_id, store.id).run();
    return c.json({
      success: true,
      data: {
        payment_link_id: wompiData.data.id,
        checkout_url: checkoutUrl,
        expires_at: wompiData.data.expires_at
      }
    });
  } catch (error) {
    console.error("Error creating Wompi payment link:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to create payment link"
    }, 500);
  }
});
app14.get("/:slug/order/:orderNumber/status", async (c) => {
  try {
    const orderNumber = c.req.param("orderNumber");
    const sale = await c.env.DB.prepare(
      `SELECT
        id, sale_number, total, status, payment_status,
        amount_paid, amount_pending, notes, created_at
       FROM sales
       WHERE sale_number = ?`
    ).bind(orderNumber).first();
    if (!sale) {
      return c.json({
        success: false,
        error: "Order not found"
      }, 404);
    }
    const wompiLinkMatch = sale.notes?.match(/Wompi Payment Link ID: (.+)/);
    const wompiLinkId = wompiLinkMatch ? wompiLinkMatch[1].trim() : null;
    return c.json({
      success: true,
      data: {
        order: {
          id: sale.id,
          sale_number: sale.sale_number,
          total: sale.total,
          status: sale.status,
          payment_status: sale.payment_status,
          amount_paid: sale.amount_paid,
          amount_pending: sale.amount_pending,
          created_at: sale.created_at
        },
        wompi_link_id: wompiLinkId,
        notes: sale.notes
      }
    });
  } catch (error) {
    console.error("Error checking order status:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to check order status"
    }, 500);
  }
});
var storefront_default = app14;

// src/routes/shipping-zones.ts
init_checked_fetch();
init_modules_watch_stub();
var app15 = new Hono2();
app15.get("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const zones = await tenantDB.getAll("shipping_zones");
    return c.json({
      success: true,
      data: zones
    });
  } catch (error) {
    console.error("Error fetching shipping zones:", error);
    return c.json({
      success: false,
      error: "Failed to fetch shipping zones"
    }, 500);
  }
});
app15.post("/", async (c) => {
  const tenant = c.get("tenant");
  try {
    const body = await c.req.json();
    if (!body.zone_name || typeof body.shipping_cost !== "number") {
      return c.json({
        success: false,
        error: "Missing required fields: zone_name, shipping_cost"
      }, 400);
    }
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const zoneData = {
      id: generateId("zone"),
      zone_name: body.zone_name.trim(),
      shipping_cost: body.shipping_cost,
      is_active: body.is_active !== void 0 ? body.is_active ? 1 : 0 : 1
    };
    await tenantDB.insert("shipping_zones", zoneData);
    const zone = await tenantDB.getById("shipping_zones", zoneData.id);
    return c.json({
      success: true,
      data: zone,
      message: "Shipping zone created successfully"
    }, 201);
  } catch (error) {
    console.error("Error creating shipping zone:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to create shipping zone"
    }, 500);
  }
});
app15.put("/:id", async (c) => {
  const tenant = c.get("tenant");
  const zoneId = c.req.param("id");
  try {
    const body = await c.req.json();
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const zone = await tenantDB.getById("shipping_zones", zoneId);
    if (!zone) {
      return c.json({
        success: false,
        error: "Shipping zone not found"
      }, 404);
    }
    const updateData = {};
    if (body.zone_name !== void 0) {
      updateData.zone_name = body.zone_name.trim();
    }
    if (body.shipping_cost !== void 0) {
      updateData.shipping_cost = body.shipping_cost;
    }
    if (body.is_active !== void 0) {
      updateData.is_active = body.is_active ? 1 : 0;
    }
    await tenantDB.update("shipping_zones", zoneId, updateData);
    const updatedZone = await tenantDB.getById("shipping_zones", zoneId);
    return c.json({
      success: true,
      data: updatedZone,
      message: "Shipping zone updated successfully"
    });
  } catch (error) {
    console.error("Error updating shipping zone:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to update shipping zone"
    }, 500);
  }
});
app15.delete("/:id", async (c) => {
  const tenant = c.get("tenant");
  const zoneId = c.req.param("id");
  try {
    const tenantDB = new TenantDB(c.env.DB, tenant.id);
    const zone = await tenantDB.getById("shipping_zones", zoneId);
    if (!zone) {
      return c.json({
        success: false,
        error: "Shipping zone not found"
      }, 404);
    }
    await tenantDB.delete("shipping_zones", zoneId);
    return c.json({
      success: true,
      message: "Shipping zone deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting shipping zone:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to delete shipping zone"
    }, 500);
  }
});
var shipping_zones_default = app15;

// src/routes/wompi.ts
init_checked_fetch();
init_modules_watch_stub();
var app16 = new Hono2();
app16.post("/create-payment-link", async (c) => {
  try {
    const tenant = c.get("tenant");
    const body = await c.req.json();
    const { order_id, order_number, amount_in_cents, customer_email, customer_name, customer_phone } = body;
    if (!order_id || !order_number || !amount_in_cents) {
      return c.json({
        success: false,
        error: "Missing required fields: order_id, order_number, amount_in_cents",
        data: null
      }, 400);
    }
    if (amount_in_cents < 2e5) {
      return c.json({
        success: false,
        error: "El monto m\xEDnimo para pagos con Wompi es de $2,000 COP",
        data: null
      }, 400);
    }
    const userProfile = await c.env.DB.prepare(
      "SELECT wompi_public_key, wompi_private_key, wompi_enabled FROM user_profiles WHERE id = ?"
    ).bind(tenant.id).first();
    if (!userProfile || !userProfile.wompi_enabled) {
      return c.json({
        success: false,
        error: "Wompi no est\xE1 activado para esta tienda",
        data: null
      }, 400);
    }
    if (!userProfile.wompi_private_key) {
      return c.json({
        success: false,
        error: "Credenciales de Wompi no configuradas",
        data: null
      }, 400);
    }
    const customerData = {};
    if (customer_phone) {
      customerData.phone_number = customer_phone.replace(/\s+/g, "");
      customerData.full_name = customer_name || "Cliente";
    }
    if (customer_email) {
      customerData.email = customer_email;
    }
    const wompiResponse = await fetch("https://production.wompi.co/v1/payment_links", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${userProfile.wompi_private_key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: `Pedido ${order_number}`,
        description: `Pago del pedido ${order_number}`,
        single_use: true,
        // Solo un pago por link
        collect_shipping: false,
        // Ya tenemos la info de envío
        currency: "COP",
        amount_in_cents,
        redirect_url: body.redirect_url || void 0,
        expires_at: body.expires_at || void 0,
        sku: order_id,
        // Usamos el order_id como SKU para rastreo
        customer_data: Object.keys(customerData).length > 0 ? customerData : void 0
        // Datos del cliente para Nequi
      })
    });
    if (!wompiResponse.ok) {
      const errorData = await wompiResponse.json().catch(() => ({}));
      console.error("Wompi API error:", errorData);
      return c.json({
        success: false,
        error: errorData.error?.reason || "Error al crear el link de pago en Wompi",
        data: null
      }, 500);
    }
    const wompiData = await wompiResponse.json();
    const checkoutUrl = `https://checkout.wompi.co/l/${wompiData.data.id}`;
    await c.env.DB.prepare(
      `UPDATE sales
       SET notes = COALESCE(notes, '') || '
Wompi Payment Link ID: ' || ?
       WHERE id = ? AND tenant_id = ?`
    ).bind(wompiData.data.id, order_id, tenant.id).run();
    return c.json({
      success: true,
      data: {
        payment_link_id: wompiData.data.id,
        checkout_url: checkoutUrl,
        expires_at: wompiData.data.expires_at
      },
      message: "Payment link created successfully"
    });
  } catch (error) {
    console.error("Error creating Wompi payment link:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to create payment link",
      data: null
    }, 500);
  }
});
app16.post("/webhook", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Wompi webhook received:", JSON.stringify(body, null, 2));
    const { event, data, signature } = body;
    if (event === "transaction.updated") {
      const transaction = data.transaction;
      if (transaction.status === "APPROVED") {
        const reference = transaction.reference;
        const sale = await c.env.DB.prepare(
          `SELECT * FROM sales WHERE notes LIKE ?`
        ).bind(`%${reference}%`).first();
        if (sale) {
          await c.env.DB.prepare(
            `UPDATE sales
             SET status = 'completada',
                 payment_status = 'pagado',
                 amount_paid = total,
                 amount_pending = 0,
                 updated_at = datetime('now')
             WHERE id = ?`
          ).bind(sale.id).run();
          console.log(`Order ${sale.id} marked as paid via Wompi webhook`);
        }
      }
    }
    return c.json({ received: true });
  } catch (error) {
    console.error("Error processing Wompi webhook:", error);
    return c.json({ received: true, error: error.message });
  }
});
var wompi_default = app16;

// src/routes/subscriptions.ts
init_checked_fetch();
init_modules_watch_stub();
var app17 = new Hono2();
var SUBSCRIPTION_PLANS = {
  "plan-basico": {
    name: "Plan B\xE1sico",
    price: 24900,
    // $24,900 COP
    amount_in_cents: 249e4,
    interval: "monthly"
  },
  "addon-ai-monthly": {
    name: "Addon: An\xE1lisis con IA",
    price: 4900,
    // $4,900 COP
    amount_in_cents: 49e4,
    interval: "monthly"
  },
  "addon-store-monthly": {
    name: "Addon: Tienda Online",
    price: 9900,
    // $9,900 COP
    amount_in_cents: 99e4,
    interval: "monthly"
  },
  "addon-email-monthly": {
    name: "Addon: Email Marketing",
    price: 4900,
    // $4,900 COP
    amount_in_cents: 49e4,
    interval: "monthly"
  }
};
app17.post("/create-payment-link", async (c) => {
  try {
    const tenant = c.get("tenant");
    const body = await c.req.json();
    const { planId } = body;
    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return c.json({
        success: false,
        error: "Invalid plan ID",
        data: null
      }, 400);
    }
    const plan = SUBSCRIPTION_PLANS[planId];
    if (plan.amount_in_cents < 1e6) {
      return c.json({
        success: false,
        error: "El monto m\xEDnimo es de $10,000 COP",
        data: null
      }, 400);
    }
    const adminWompiPrivateKey = c.env.ADMIN_WOMPI_PRIVATE_KEY;
    if (!adminWompiPrivateKey) {
      return c.json({
        success: false,
        error: "Wompi credentials not configured",
        data: null
      }, 500);
    }
    const userProfile = await c.env.DB.prepare(
      "SELECT email, full_name FROM user_profiles WHERE id = ?"
    ).bind(tenant.id).first();
    if (!userProfile) {
      return c.json({
        success: false,
        error: "User profile not found",
        data: null
      }, 404);
    }
    const redirectUrl = `https://posib.dev/dashboard/subscription/confirmation`;
    const wompiResponse = await fetch("https://production.wompi.co/v1/payment_links", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${adminWompiPrivateKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: `Suscripci\xF3n ${plan.name}`,
        description: `Suscripci\xF3n mensual - ${plan.name} para ${userProfile.email}`,
        single_use: true,
        collect_shipping: false,
        currency: "COP",
        amount_in_cents: plan.amount_in_cents,
        redirect_url: redirectUrl,
        sku: `subscription_${planId}_${tenant.id}`
        // Para identificar en webhook
      })
    });
    if (!wompiResponse.ok) {
      const errorData = await wompiResponse.json().catch(() => ({}));
      console.error("Wompi API error:", errorData);
      return c.json({
        success: false,
        error: errorData.error?.reason || "Error al crear el link de pago",
        data: null
      }, 500);
    }
    const wompiData = await wompiResponse.json();
    const checkoutUrl = `https://checkout.wompi.co/l/${wompiData.data.id}`;
    await c.env.DB.prepare(
      `UPDATE user_profiles
       SET updated_at = datetime('now')
       WHERE id = ?`
    ).bind(tenant.id).run();
    return c.json({
      success: true,
      data: {
        payment_link_id: wompiData.data.id,
        checkout_url: checkoutUrl,
        plan: plan.name,
        amount: plan.price
      },
      message: "Payment link created successfully"
    });
  } catch (error) {
    console.error("Error creating subscription payment link:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to create payment link",
      data: null
    }, 500);
  }
});
app17.post("/check-expiring", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const cronSecret = c.env.CRON_SECRET;
    if (!authHeader || !cronSecret || !authHeader.includes(cronSecret)) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }
    const now = /* @__PURE__ */ new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const expiringTrials = await c.env.DB.prepare(
      `SELECT id, email, full_name, trial_end_date, clerk_user_id
       FROM user_profiles
       WHERE subscription_status = 'trial'
         AND trial_end_date IS NOT NULL
         AND date(trial_end_date) = date(?, 'unixepoch')`
    ).bind(Math.floor(threeDaysFromNow.getTime() / 1e3)).all();
    const expiringSubscriptions = await c.env.DB.prepare(
      `SELECT id, email, full_name, next_billing_date, clerk_user_id
       FROM user_profiles
       WHERE subscription_status = 'active'
         AND next_billing_date IS NOT NULL
         AND date(next_billing_date) = date(?, 'unixepoch')`
    ).bind(Math.floor(threeDaysFromNow.getTime() / 1e3)).all();
    const notificationsToSend = [
      ...expiringTrials.results.map((user) => ({
        userId: user.clerk_user_id,
        email: user.email,
        type: "trial_expiring",
        daysLeft: 3
      })),
      ...expiringSubscriptions.results.map((user) => ({
        userId: user.clerk_user_id,
        email: user.email,
        type: "subscription_expiring",
        daysLeft: 3
      }))
    ];
    console.log(`Found ${notificationsToSend.length} users to notify`);
    for (const notification of notificationsToSend) {
      console.log(`Notification needed for ${notification.email}: ${notification.type}`);
    }
    return c.json({
      success: true,
      notificationsSent: notificationsToSend.length,
      expiringTrials: expiringTrials.results.length,
      expiringSubscriptions: expiringSubscriptions.results.length
    });
  } catch (error) {
    console.error("Error checking expiring subscriptions:", error);
    return c.json({
      success: false,
      error: error.message || "Failed to check expiring subscriptions"
    }, 500);
  }
});
app17.post("/webhook", async (c) => {
  try {
    const body = await c.req.json();
    console.log("Subscription webhook received:", JSON.stringify(body, null, 2));
    const { event, data } = body;
    if (event === "transaction.updated") {
      const transaction = data.transaction;
      const { id, status, reference, amount_in_cents, payment_method_type } = transaction;
      console.log(`\u{1F4E8} Processing transaction ${id} with status: ${status}`);
      const sku = reference;
      const match2 = sku.match(/subscription_([^_]+)_(.+)/);
      if (!match2) {
        console.error("\u274C Invalid SKU format:", sku);
        return c.json({ received: true, error: "Invalid SKU format" });
      }
      const planId = match2[1];
      const tenantId = match2[2];
      console.log(`\u{1F4E6} Plan: ${planId}, Tenant: ${tenantId}`);
      const existingTransaction = await c.env.DB.prepare(
        `SELECT id FROM payment_transactions WHERE wompi_transaction_id = ?`
      ).bind(id).first();
      if (!existingTransaction) {
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const now = (/* @__PURE__ */ new Date()).toISOString();
        await c.env.DB.prepare(
          `INSERT INTO payment_transactions (
            id, user_profile_id, wompi_transaction_id, amount, currency,
            status, payment_method_type, reference, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          transactionId,
          tenantId,
          id,
          amount_in_cents / 100,
          "COP",
          status,
          payment_method_type || "unknown",
          reference,
          now
        ).run();
        console.log(`\u2705 Payment transaction created: ${transactionId}`);
      } else {
        await c.env.DB.prepare(
          `UPDATE payment_transactions SET status = ? WHERE wompi_transaction_id = ?`
        ).bind(status, id).run();
        console.log(`\u2705 Payment transaction updated: ${id}`);
      }
      if (status === "APPROVED") {
        const now = /* @__PURE__ */ new Date();
        const nextBillingDate = new Date(now);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        let hasAIAddon = 0;
        let hasStoreAddon = 0;
        let hasEmailAddon = 0;
        if (planId === "addon-ai-monthly") {
          hasAIAddon = 1;
        } else if (planId === "addon-store-monthly") {
          hasStoreAddon = 1;
        } else if (planId === "addon-email-monthly") {
          hasEmailAddon = 1;
        }
        if (planId === "plan-basico") {
          await c.env.DB.prepare(
            `UPDATE user_profiles
             SET subscription_status = 'active',
                 plan_id = 'basic-monthly',
                 trial_start_date = NULL,
                 trial_end_date = NULL,
                 last_payment_date = ?,
                 next_billing_date = ?,
                 subscription_id = ?,
                 updated_at = ?
             WHERE id = ?`
          ).bind(
            now.toISOString(),
            nextBillingDate.toISOString(),
            id,
            now.toISOString(),
            tenantId
          ).run();
          console.log(`\u2705 Subscription activated for tenant ${tenantId}`);
        } else {
          await c.env.DB.prepare(
            `UPDATE user_profiles
             SET has_ai_addon = ?,
                 has_store_addon = ?,
                 has_email_addon = ?,
                 last_payment_date = ?,
                 next_billing_date = ?,
                 updated_at = ?
             WHERE id = ?`
          ).bind(
            hasAIAddon,
            hasStoreAddon,
            hasEmailAddon,
            now.toISOString(),
            nextBillingDate.toISOString(),
            now.toISOString(),
            tenantId
          ).run();
          console.log(`\u2705 Addon ${planId} activated for tenant ${tenantId}`);
        }
      }
      if (status === "DECLINED" || status === "ERROR") {
        console.log(`\u26A0\uFE0F Payment ${status} for tenant ${tenantId}`);
      }
    }
    return c.json({ received: true });
  } catch (error) {
    console.error("Error processing subscription webhook:", error);
    return c.json({ received: true, error: error.message });
  }
});
var subscriptions_default = app17;

// src/routes/email.ts
init_checked_fetch();
init_modules_watch_stub();

// src/utils/email.ts
init_checked_fetch();
init_modules_watch_stub();
async function sendEmail(options, resendApiKey) {
  try {
    if (!resendApiKey) {
      return {
        success: false,
        error: "RESEND_API_KEY not configured"
      };
    }
    const emailPayload = {
      from: `${options.fromName} <${options.from}>`,
      to: options.toName ? [`${options.toName} <${options.to}>`] : [options.to],
      subject: options.subject,
      html: options.html,
      ...options.text && { text: options.text },
      ...options.replyTo && { reply_to: options.replyTo }
    };
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(emailPayload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend error:", errorText);
      return {
        success: false,
        error: `Resend API error: ${response.status} - ${errorText}`
      };
    }
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
__name(sendEmail, "sendEmail");
async function logEmail(db, userProfileId, emailType, recipientEmail, subject, status, errorMessage, metadata) {
  const id = crypto.randomUUID();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(
    `INSERT INTO email_logs (
        id, user_profile_id, email_type, recipient_email, subject,
        status, error_message, sent_at, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    userProfileId,
    emailType,
    recipientEmail,
    subject,
    status,
    errorMessage || null,
    status === "sent" ? now : null,
    metadata ? JSON.stringify(metadata) : null,
    now
  ).run();
}
__name(logEmail, "logEmail");

// src/utils/email-templates.ts
init_checked_fetch();
init_modules_watch_stub();
function baseTemplate(content, primaryColor = "#2563eb") {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tienda POS</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background-color: ${primaryColor};
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 40px 30px;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: ${primaryColor};
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .product-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
      display: flex;
      align-items: center;
    }
    .product-image {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 6px;
      margin-right: 15px;
    }
    .stats-box {
      background-color: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .stat-item:last-child {
      border-bottom: none;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 30px 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">
      <p>Este es un email automatizado de <strong>Tienda POS</strong></p>
      <p>Si no deseas recibir estos emails, puedes desactivarlos en la configuraci\xF3n de tu cuenta.</p>
      <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
        Powered by <a href="https://posib.dev" style="color: ${primaryColor};">Tienda POS</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
__name(baseTemplate, "baseTemplate");
function subscriptionReminderTemplate(data) {
  const content = `
    <div class="header">
      <h1>\u23F0 Tu suscripci\xF3n est\xE1 por vencer</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">Hola <strong>${data.user_name}</strong>,</p>

      <p style="font-size: 16px; color: #374151; line-height: 1.6;">
        Queremos recordarte que tu suscripci\xF3n a <strong>Tienda POS</strong> vence en
        <strong style="color: #dc2626;">${data.days_left} ${data.days_left === 1 ? "d\xEDa" : "d\xEDas"}</strong>.
      </p>

      <div class="stats-box">
        <div class="stat-item">
          <span>Plan</span>
          <strong>Plan B\xE1sico</strong>
        </div>
        <div class="stat-item">
          <span>Pr\xF3ximo cargo</span>
          <strong>$${data.plan_price.toLocaleString("es-CO")} COP</strong>
        </div>
        <div class="stat-item">
          <span>Fecha de renovaci\xF3n</span>
          <strong>${new Date(data.next_billing_date).toLocaleDateString("es-CO")}</strong>
        </div>
      </div>

      <p style="font-size: 16px; color: #374151;">
        Para continuar disfrutando de todas las funciones de tu sistema POS,
        aseg\xFArate de renovar tu suscripci\xF3n antes de la fecha de vencimiento.
      </p>

      <div style="text-align: center;">
        <a href="${data.payment_link}" class="button">Renovar Suscripci\xF3n</a>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        \xBFTienes alguna pregunta? Cont\xE1ctanos respondiendo a este email.
      </p>
    </div>
  `;
  return baseTemplate(content);
}
__name(subscriptionReminderTemplate, "subscriptionReminderTemplate");
function dailyReportTemplate(data) {
  const topProductsHtml = data.top_products.map((p) => `
    <div class="stat-item">
      <span>${p.name}</span>
      <strong>${p.quantity} unid. - $${p.revenue.toLocaleString("es-CO")}</strong>
    </div>
  `).join("");
  const lowStockHtml = data.low_stock_products.length > 0 ? `
    <h3 style="color: #dc2626; margin-top: 30px;">\u26A0\uFE0F Productos con bajo stock</h3>
    <div class="stats-box">
      ${data.low_stock_products.map((p) => `
        <div class="stat-item">
          <span>${p.name}</span>
          <strong style="color: #dc2626;">${p.current_stock} / ${p.min_stock}</strong>
        </div>
      `).join("")}
    </div>
  ` : "";
  const content = `
    <div class="header">
      <h1>\u{1F4CA} Reporte Diario - ${data.store_name}</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">
        Resumen de ventas del <strong>${new Date(data.date).toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  })}</strong>
      </p>

      <div class="stats-box">
        <div class="stat-item">
          <span>Total de ventas</span>
          <strong style="font-size: 20px; color: #2563eb;">${data.total_sales}</strong>
        </div>
        <div class="stat-item">
          <span>Ingresos totales</span>
          <strong style="font-size: 20px; color: #059669;">$${data.total_revenue.toLocaleString("es-CO")} COP</strong>
        </div>
      </div>

      ${data.top_products.length > 0 ? `
        <h3 style="color: #374151; margin-top: 30px;">\u{1F3C6} Productos m\xE1s vendidos</h3>
        <div class="stats-box">
          ${topProductsHtml}
        </div>
      ` : ""}

      ${lowStockHtml}

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        Inicia sesi\xF3n en tu panel de control para ver el an\xE1lisis completo.
      </p>

      <div style="text-align: center;">
        <a href="https://posib.dev/dashboard/analytics" class="button">Ver Dashboard</a>
      </div>
    </div>
  `;
  return baseTemplate(content);
}
__name(dailyReportTemplate, "dailyReportTemplate");
function stockAlertTemplate(data) {
  const content = `
    <div class="header">
      <h1>\u2728 ${data.product_name} est\xE1 disponible!</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">
        Buenas noticias! El producto que esperabas ya est\xE1 disponible en <strong>${data.store_name}</strong>.
      </p>

      ${data.product_image ? `
        <div style="text-align: center; margin: 30px 0;">
          <img src="${data.product_image}" alt="${data.product_name}" style="max-width: 300px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        </div>
      ` : ""}

      <p style="font-size: 18px; font-weight: 600; color: #374151; text-align: center;">
        ${data.product_name}
      </p>

      <p style="font-size: 16px; color: #6b7280; text-align: center;">
        \xA1Aprovecha ahora antes de que se agote nuevamente!
      </p>

      <div style="text-align: center;">
        <a href="${data.product_url}" class="button">Ver Producto</a>
      </div>
    </div>
  `;
  return baseTemplate(content, "#059669");
}
__name(stockAlertTemplate, "stockAlertTemplate");
function abandonedCartTemplate(data, emailNumber) {
  const messages = {
    1: {
      title: "\u{1F6D2} \xA1Olvidaste algo en tu carrito!",
      message: "Parece que dejaste algunos productos en tu carrito. \xBFNecesitas ayuda para completar tu compra?",
      discount: 0
    },
    2: {
      title: "\u23F0 Tu carrito te est\xE1 esperando",
      message: "Tus productos favoritos siguen esper\xE1ndote. \xA1Completa tu compra ahora y obt\xE9n un descuento especial!",
      discount: data.discount_percentage || 10
    },
    3: {
      title: "\u{1F381} \xDAltima oportunidad - Descuento especial",
      message: "Esta es tu \xFAltima oportunidad para aprovechar estos productos. \xA1Te ofrecemos un descuento exclusivo!",
      discount: data.discount_percentage || 15
    }
  };
  const msg = messages[emailNumber];
  const itemsHtml = data.cart_items.map((item) => `
    <div class="product-item">
      ${item.image ? `<img src="${item.image}" alt="${item.product_name}" class="product-image">` : ""}
      <div style="flex: 1;">
        <p style="margin: 0; font-weight: 600; color: #374151;">${item.product_name}</p>
        <p style="margin: 5px 0 0 0; color: #6b7280;">
          Cantidad: ${item.quantity} \xD7 $${item.price.toLocaleString("es-CO")}
        </p>
      </div>
      <div style="font-weight: 600; color: #2563eb;">
        $${(item.quantity * item.price).toLocaleString("es-CO")}
      </div>
    </div>
  `).join("");
  const discountHtml = msg.discount > 0 ? `
    <div style="background-color: #fef3c7; border: 2px dashed #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">C\xD3DIGO DE DESCUENTO</p>
      <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; color: #92400e; letter-spacing: 2px;">
        ${data.discount_code || `CART${msg.discount}`}
      </p>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #92400e;">
        ${msg.discount}% de descuento en tu compra
      </p>
    </div>
  ` : "";
  const content = `
    <div class="header">
      <h1>${msg.title}</h1>
    </div>
    <div class="content">
      <p style="font-size: 16px; color: #374151;">
        Hola <strong>${data.customer_name || "Cliente"}</strong>,
      </p>

      <p style="font-size: 16px; color: #374151; line-height: 1.6;">
        ${msg.message}
      </p>

      <h3 style="color: #374151; margin-top: 30px;">Productos en tu carrito:</h3>
      ${itemsHtml}

      <div class="stats-box" style="margin-top: 20px;">
        <div class="stat-item">
          <span style="font-size: 18px;">Total del carrito</span>
          <strong style="font-size: 22px; color: #2563eb;">
            $${data.cart_total.toLocaleString("es-CO")} COP
          </strong>
        </div>
      </div>

      ${discountHtml}

      <div style="text-align: center; margin-top: 30px;">
        <a href="${data.cart_url}" class="button">Completar mi compra</a>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px; text-align: center;">
        \xBFTienes alguna pregunta? Estamos aqu\xED para ayudarte.
      </p>
    </div>
  `;
  return baseTemplate(content, "#8b5cf6");
}
__name(abandonedCartTemplate, "abandonedCartTemplate");

// src/routes/email.ts
var app18 = new Hono2();
app18.post("/subscription-reminders", async (c) => {
  const db = c.env.DB;
  try {
    const users = await db.prepare(
      `SELECT id, clerk_user_id, email, full_name, subscription_status,
                trial_end_date, next_billing_date
         FROM user_profiles
         WHERE subscription_status IN ('trial', 'active')
           AND (
             (subscription_status = 'trial' AND julianday(trial_end_date) - julianday('now') <= 7)
             OR (subscription_status = 'active' AND julianday(next_billing_date) - julianday('now') <= 7)
           )`
    ).all();
    let emailsSent = 0;
    let emailsFailed = 0;
    for (const user of users.results) {
      const prefs = await db.prepare("SELECT * FROM email_preferences WHERE user_profile_id = ?").bind(user.id).first();
      if (prefs && !prefs.subscription_reminders_enabled) {
        continue;
      }
      const expirationDate = user.subscription_status === "trial" ? user.trial_end_date : user.next_billing_date;
      const daysLeft = Math.ceil(
        (new Date(expirationDate).getTime() - Date.now()) / (1e3 * 60 * 60 * 24)
      );
      const emailData = {
        user_name: user.full_name || user.email.split("@")[0],
        days_left: daysLeft,
        next_billing_date: expirationDate,
        plan_price: 24900,
        payment_link: `https://posib.dev/dashboard/subscription`
      };
      const html = subscriptionReminderTemplate(emailData);
      const result = await sendEmail({
        to: user.email,
        toName: user.full_name,
        from: "noreply@posib.dev",
        fromName: "Tienda POS",
        subject: `\u23F0 Tu suscripci\xF3n vence en ${daysLeft} ${daysLeft === 1 ? "d\xEDa" : "d\xEDas"}`,
        html
      }, c.env.RESEND_API_KEY);
      if (result.success) {
        emailsSent++;
        await logEmail(
          db,
          user.id,
          "subscription_reminder",
          user.email,
          `Recordatorio de suscripci\xF3n - ${daysLeft} d\xEDas`,
          "sent",
          void 0,
          { days_left: daysLeft }
        );
      } else {
        emailsFailed++;
        await logEmail(
          db,
          user.id,
          "subscription_reminder",
          user.email,
          `Recordatorio de suscripci\xF3n - ${daysLeft} d\xEDas`,
          "failed",
          result.error
        );
      }
    }
    return c.json({
      success: true,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      total_users: users.results.length
    });
  } catch (error) {
    console.error("Error sending subscription reminders:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});
app18.post("/daily-reports", async (c) => {
  const db = c.env.DB;
  try {
    const now = /* @__PURE__ */ new Date();
    const colombiaTime = new Date(now.getTime() - 5 * 60 * 60 * 1e3);
    const currentHour = colombiaTime.getUTCHours();
    const currentMinute = colombiaTime.getUTCMinutes();
    const currentTime = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
    console.log("Daily reports check - Colombia time:", currentTime);
    const targetHour = `${currentHour.toString().padStart(2, "0")}`;
    const prefs = await db.prepare(
      `SELECT ep.*, up.email, up.full_name, up.store_name
         FROM email_preferences ep
         JOIN user_profiles up ON ep.user_profile_id = up.id
         WHERE ep.daily_reports_enabled = 1
           AND substr(ep.daily_reports_time, 1, 2) = ?`
    ).bind(targetHour).all();
    console.log(`Found ${prefs.results.length} users with daily reports enabled for hour ${targetHour}`);
    let emailsSent = 0;
    let emailsFailed = 0;
    for (const pref of prefs.results) {
      const yesterday = /* @__PURE__ */ new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const salesData = await db.prepare(
        `SELECT COUNT(*) as total_sales, SUM(total) as total_revenue
           FROM sales
           WHERE tenant_id = ?
             AND DATE(created_at) = ?
             AND status = 'completada'`
      ).bind(pref.user_profile_id, yesterdayStr).first();
      const topProducts = await db.prepare(
        `SELECT p.name, SUM(si.quantity) as quantity, SUM(si.subtotal) as revenue
           FROM sale_items si
           JOIN sales s ON si.sale_id = s.id
           JOIN products p ON si.product_id = p.id
           WHERE s.tenant_id = ?
             AND DATE(s.created_at) = ?
             AND s.status = 'completada'
           GROUP BY p.id, p.name
           ORDER BY revenue DESC
           LIMIT 5`
      ).bind(pref.user_profile_id, yesterdayStr).all();
      const lowStock = await db.prepare(
        `SELECT name, stock as current_stock, min_stock
           FROM products
           WHERE tenant_id = ?
             AND stock <= min_stock
           ORDER BY (stock - min_stock) ASC
           LIMIT 5`
      ).bind(pref.user_profile_id).all();
      const emailData = {
        store_name: pref.store_name || "Tu Tienda",
        date: yesterdayStr,
        total_sales: salesData?.total_sales || 0,
        total_revenue: salesData?.total_revenue || 0,
        top_products: topProducts.results || [],
        low_stock_products: lowStock.results || []
      };
      const html = dailyReportTemplate(emailData);
      const result = await sendEmail({
        to: pref.email,
        toName: pref.full_name,
        from: pref.from_email || "noreply@posib.dev",
        fromName: pref.from_name || "Tienda POS",
        subject: `\u{1F4CA} Reporte Diario - ${emailData.store_name} - ${new Date(
          yesterdayStr
        ).toLocaleDateString("es-CO")}`,
        html
      }, c.env.RESEND_API_KEY);
      if (result.success) {
        emailsSent++;
        console.log(`\u2713 Daily report sent to ${pref.email}`);
        await logEmail(
          db,
          pref.user_profile_id,
          "daily_report",
          pref.email,
          "Reporte diario",
          "sent",
          void 0,
          { date: yesterdayStr, total_sales: emailData.total_sales }
        );
      } else {
        emailsFailed++;
        console.error(`\u2717 Failed to send daily report to ${pref.email}:`, result.error);
        await logEmail(
          db,
          pref.user_profile_id,
          "daily_report",
          pref.email,
          "Reporte diario",
          "failed",
          result.error
        );
      }
    }
    const response = {
      success: true,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      total_prefs: prefs.results.length
    };
    console.log("Daily reports result:", response);
    return c.json(response);
  } catch (error) {
    console.error("Error sending daily reports:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});
app18.post("/stock-alerts", async (c) => {
  const db = c.env.DB;
  try {
    const subscriptions = await db.prepare(
      `SELECT sa.*, p.name as product_name, p.stock, p.image_url, up.store_slug, up.store_name
         FROM stock_alert_subscriptions sa
         JOIN products p ON sa.product_id = p.id
         JOIN user_profiles up ON sa.user_profile_id = up.id
         WHERE sa.notified = 0
           AND p.stock > 0`
    ).all();
    let emailsSent = 0;
    let emailsFailed = 0;
    for (const sub of subscriptions.results) {
      const prefs = await db.prepare("SELECT * FROM email_preferences WHERE user_profile_id = ?").bind(sub.user_profile_id).first();
      if (prefs && !prefs.stock_alerts_enabled) {
        continue;
      }
      const productUrl = `https://posib.dev/store/${sub.store_slug}/product/${sub.product_id}`;
      const emailData = {
        product_name: sub.product_name,
        product_image: sub.image_url,
        product_url: productUrl,
        store_name: sub.store_name || "Nuestra tienda"
      };
      const html = stockAlertTemplate(emailData);
      const result = await sendEmail({
        to: sub.customer_email,
        toName: sub.customer_name,
        from: prefs?.from_email || "noreply@posib.dev",
        fromName: prefs?.from_name || sub.store_name || "Tienda POS",
        subject: `\u2728 ${sub.product_name} est\xE1 disponible!`,
        html
      }, c.env.RESEND_API_KEY);
      if (result.success) {
        emailsSent++;
        await db.prepare(
          "UPDATE stock_alert_subscriptions SET notified = 1, notified_at = ? WHERE id = ?"
        ).bind((/* @__PURE__ */ new Date()).toISOString(), sub.id).run();
        await logEmail(
          db,
          sub.user_profile_id,
          "stock_alert",
          sub.customer_email,
          `Producto disponible: ${sub.product_name}`,
          "sent",
          void 0,
          { product_id: sub.product_id, product_name: sub.product_name }
        );
      } else {
        emailsFailed++;
        await logEmail(
          db,
          sub.user_profile_id,
          "stock_alert",
          sub.customer_email,
          `Producto disponible: ${sub.product_name}`,
          "failed",
          result.error
        );
      }
    }
    return c.json({
      success: true,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      total_subscriptions: subscriptions.results.length
    });
  } catch (error) {
    console.error("Error sending stock alerts:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});
app18.post("/abandoned-carts", async (c) => {
  const db = c.env.DB;
  try {
    const now = /* @__PURE__ */ new Date();
    let emailsSent = 0;
    let emailsFailed = 0;
    const carts = await db.prepare(
      `SELECT ac.*, up.store_slug, up.store_name
         FROM abandoned_carts ac
         JOIN user_profiles up ON ac.user_profile_id = up.id
         WHERE ac.recovered = 0`
    ).all();
    for (const cart of carts.results) {
      const prefs = await db.prepare("SELECT * FROM email_preferences WHERE user_profile_id = ?").bind(cart.user_profile_id).first();
      if (prefs && !prefs.abandoned_cart_emails_enabled) {
        continue;
      }
      const abandonedAt = new Date(cart.abandoned_at);
      const hoursSinceAbandoned = (now.getTime() - abandonedAt.getTime()) / (1e3 * 60 * 60);
      let emailNumber = null;
      if (hoursSinceAbandoned >= 1 && hoursSinceAbandoned < 2 && !cart.first_email_sent) {
        emailNumber = 1;
      } else if (hoursSinceAbandoned >= 24 && hoursSinceAbandoned < 25 && !cart.second_email_sent) {
        emailNumber = 2;
      } else if (hoursSinceAbandoned >= 72 && hoursSinceAbandoned < 73 && !cart.third_email_sent) {
        emailNumber = 3;
      }
      if (!emailNumber) continue;
      const items = await db.prepare(
        `SELECT p.name as product_name, ci.quantity, p.sale_price as price, p.image_url as image
           FROM cart_items ci
           JOIN products p ON ci.product_id = p.id
           WHERE ci.cart_id = ?`
      ).bind(cart.cart_id).all();
      const cartUrl = `https://posib.dev/store/${cart.store_slug}/cart`;
      const emailData = {
        customer_name: cart.customer_name || "Cliente",
        cart_items: items.results,
        cart_total: cart.total_amount,
        discount_code: emailNumber === 2 ? "CART10" : emailNumber === 3 ? "CART15" : void 0,
        discount_percentage: emailNumber === 2 ? 10 : emailNumber === 3 ? 15 : void 0,
        cart_url: cartUrl,
        store_name: cart.store_name || "Nuestra tienda"
      };
      const html = abandonedCartTemplate(emailData, emailNumber);
      const result = await sendEmail({
        to: cart.customer_email,
        toName: cart.customer_name,
        from: prefs?.from_email || "noreply@posib.dev",
        fromName: prefs?.from_name || cart.store_name || "Tienda POS",
        subject: emailNumber === 1 ? "\u{1F6D2} \xA1Olvidaste algo en tu carrito!" : emailNumber === 2 ? "\u23F0 Tu carrito te est\xE1 esperando + 10% descuento" : "\u{1F381} \xDAltima oportunidad - 15% descuento en tu carrito",
        html
      }, c.env.RESEND_API_KEY);
      if (result.success) {
        emailsSent++;
        const field = emailNumber === 1 ? "first_email_sent" : emailNumber === 2 ? "second_email_sent" : "third_email_sent";
        await db.prepare(`UPDATE abandoned_carts SET ${field} = 1 WHERE id = ?`).bind(cart.id).run();
        await logEmail(
          db,
          cart.user_profile_id,
          "cart_abandoned",
          cart.customer_email,
          `Carrito abandonado - Email ${emailNumber}`,
          "sent",
          void 0,
          {
            cart_id: cart.cart_id,
            email_number: emailNumber,
            total: cart.total_amount
          }
        );
      } else {
        emailsFailed++;
        await logEmail(
          db,
          cart.user_profile_id,
          "cart_abandoned",
          cart.customer_email,
          `Carrito abandonado - Email ${emailNumber}`,
          "failed",
          result.error
        );
      }
    }
    return c.json({
      success: true,
      emails_sent: emailsSent,
      emails_failed: emailsFailed,
      total_carts: carts.results.length
    });
  } catch (error) {
    console.error("Error sending abandoned cart emails:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});
app18.get("/preferences", async (c) => {
  const db = c.env.DB;
  const userProfileId = c.get("userProfileId");
  try {
    let prefs = await db.prepare("SELECT * FROM email_preferences WHERE user_profile_id = ?").bind(userProfileId).first();
    if (!prefs) {
      const id = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO email_preferences (
            id, user_profile_id, daily_reports_enabled, daily_reports_time,
            subscription_reminders_enabled, stock_alerts_enabled, abandoned_cart_emails_enabled
          ) VALUES (?, ?, 1, '20:00', 1, 1, 1)`
      ).bind(id, userProfileId).run();
      prefs = await db.prepare("SELECT * FROM email_preferences WHERE id = ?").bind(id).first();
    }
    return c.json({ success: true, data: prefs });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});
app18.put("/preferences", async (c) => {
  const db = c.env.DB;
  const userProfileId = c.get("userProfileId");
  const body = await c.req.json();
  try {
    await db.prepare(
      `UPDATE email_preferences SET
          daily_reports_enabled = ?,
          daily_reports_time = ?,
          subscription_reminders_enabled = ?,
          stock_alerts_enabled = ?,
          abandoned_cart_emails_enabled = ?,
          from_name = ?,
          from_email = ?
        WHERE user_profile_id = ?`
    ).bind(
      body.daily_reports_enabled ? 1 : 0,
      body.daily_reports_time || "20:00",
      body.subscription_reminders_enabled ? 1 : 0,
      body.stock_alerts_enabled ? 1 : 0,
      body.abandoned_cart_emails_enabled ? 1 : 0,
      body.from_name || null,
      body.from_email || null,
      userProfileId
    ).run();
    return c.json({ success: true, message: "Preferencias actualizadas" });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});
app18.get("/logs", async (c) => {
  const db = c.env.DB;
  const userProfileId = c.get("userProfileId");
  const limit = c.req.query("limit") || "50";
  try {
    const logs = await db.prepare(
      `SELECT * FROM email_logs
         WHERE user_profile_id = ?
         ORDER BY created_at DESC
         LIMIT ?`
    ).bind(userProfileId, parseInt(limit)).all();
    return c.json({ success: true, data: logs.results });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});
app18.post("/test", async (c) => {
  const db = c.env.DB;
  const userProfileId = c.get("userProfileId");
  try {
    const user = await db.prepare("SELECT * FROM user_profiles WHERE id = ?").bind(userProfileId).first();
    if (!user) {
      return c.json({ success: false, error: "Usuario no encontrado" }, 404);
    }
    const userData = user;
    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .success { color: #10b981; font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>\xA1Email de Prueba!</h1>
            </div>
            <div class="content">
              <p class="success">\u2705</p>
              <h2>\xA1Hola ${userData.full_name || "Usuario"}!</h2>
              <p>Este es un email de prueba para confirmar que tu configuraci\xF3n de emails est\xE1 funcionando correctamente.</p>
              <p><strong>Tu sistema de emails autom\xE1ticos est\xE1 activo y listo para usar:</strong></p>
              <ul>
                <li>\u{1F4CA} Reportes diarios de ventas</li>
                <li>\u23F0 Recordatorios de suscripci\xF3n</li>
                <li>\u{1F4E6} Alertas de stock</li>
                <li>\u{1F6D2} Recuperaci\xF3n de carritos abandonados</li>
              </ul>
              <p>Si recibiste este email, significa que todo est\xE1 funcionando perfectamente.</p>
              <p>\xA1Saludos!<br>Tu Tienda POS</p>
            </div>
          </div>
        </body>
      </html>
    `;
    const result = await sendEmail({
      to: userData.email,
      toName: userData.full_name,
      from: "noreply@posib.dev",
      fromName: "Tienda POS - Prueba",
      subject: "\u2705 Email de Prueba - Tienda POS",
      html: testHtml
    }, c.env.RESEND_API_KEY);
    if (result.success) {
      await logEmail(
        db,
        userProfileId,
        "general",
        userData.email,
        "Email de prueba",
        "sent"
      );
      return c.json({
        success: true,
        message: `Email de prueba enviado a ${userData.email}`
      });
    } else {
      await logEmail(
        db,
        userProfileId,
        "general",
        userData.email,
        "Email de prueba",
        "failed",
        result.error
      );
      return c.json({
        success: false,
        error: result.error
      }, 500);
    }
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});
app18.get("/stats", async (c) => {
  const db = c.env.DB;
  const userProfileId = c.get("userProfileId");
  try {
    const totalSent = await db.prepare(
      "SELECT COUNT(*) as count FROM email_logs WHERE user_profile_id = ? AND status = ?"
    ).bind(userProfileId, "sent").first();
    const totalFailed = await db.prepare(
      "SELECT COUNT(*) as count FROM email_logs WHERE user_profile_id = ? AND status = ?"
    ).bind(userProfileId, "failed").first();
    const firstDayOfMonth = /* @__PURE__ */ new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const thisMonth = await db.prepare(
      `SELECT COUNT(*) as count FROM email_logs
         WHERE user_profile_id = ?
         AND status = 'sent'
         AND created_at >= ?`
    ).bind(userProfileId, firstDayOfMonth.toISOString()).first();
    const byType = await db.prepare(
      `SELECT email_type as type, COUNT(*) as count
         FROM email_logs
         WHERE user_profile_id = ? AND status = 'sent'
         GROUP BY email_type
         ORDER BY count DESC`
    ).bind(userProfileId).all();
    const sent = totalSent?.count || 0;
    const failed = totalFailed?.count || 0;
    const total = sent + failed;
    const successRate = total > 0 ? sent / total * 100 : 0;
    return c.json({
      success: true,
      data: {
        total_sent: sent,
        total_failed: failed,
        total_this_month: thisMonth?.count || 0,
        success_rate: successRate,
        by_type: byType.results
      }
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});
app18.post("/campaign", async (c) => {
  const db = c.env.DB;
  const userProfileId = c.get("userProfileId");
  const body = await c.req.json();
  try {
    const { name, subject, message, segment } = body;
    let query = "SELECT email, name FROM customers WHERE tenant_id = ?";
    const params = [userProfileId];
    switch (segment) {
      case "active":
        query += " AND last_purchase_date >= date('now', '-30 days')";
        break;
      case "inactive":
        query += " AND last_purchase_date < date('now', '-30 days')";
        break;
      case "vip":
        query += " AND total_spent > 500000";
        break;
      case "new":
        query += " AND created_at >= date('now', '-30 days')";
        break;
    }
    const recipients = await db.prepare(query).bind(...params).all();
    let emailsSent = 0;
    let emailsFailed = 0;
    const prefs = await db.prepare("SELECT * FROM email_preferences WHERE user_profile_id = ?").bind(userProfileId).first();
    for (const recipient of recipients.results) {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${subject}</h1>
              </div>
              <div class="content">
                <p>Hola ${recipient.name || "Cliente"},</p>
                ${message.split("\n").map((line) => `<p>${line}</p>`).join("")}
              </div>
            </div>
          </body>
        </html>
      `;
      const result = await sendEmail(
        {
          to: recipient.email,
          toName: recipient.name,
          from: prefs?.from_email || "noreply@posib.dev",
          fromName: prefs?.from_name || "Tu Tienda",
          subject,
          html
        },
        c.env.RESEND_API_KEY
      );
      if (result.success) {
        emailsSent++;
        await logEmail(
          db,
          userProfileId,
          "new_product_campaign",
          recipient.email,
          subject,
          "sent",
          void 0,
          { campaign_name: name }
        );
      } else {
        emailsFailed++;
        await logEmail(
          db,
          userProfileId,
          "new_product_campaign",
          recipient.email,
          subject,
          "failed",
          result.error,
          { campaign_name: name }
        );
      }
    }
    return c.json({
      success: true,
      recipients_count: recipients.results.length,
      emails_sent: emailsSent,
      emails_failed: emailsFailed
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      500
    );
  }
});
var email_default = app18;

// src/routes/stats.ts
init_checked_fetch();
init_modules_watch_stub();
var app19 = new Hono2();
app19.get("/active-stores", async (c) => {
  try {
    const db = c.env.DB;
    const result = await db.prepare(
      `SELECT COUNT(*) as count
         FROM user_profiles
         WHERE subscription_status IN ('active', 'trial')
         AND deleted_at IS NULL`
    ).first();
    const count = result?.count || 1;
    return c.json({
      success: true,
      count,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Error getting active stores count:", error);
    return c.json({
      success: true,
      count: 1,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
});
var stats_default = app19;

// src/routes/loyalty-settings.ts
init_checked_fetch();
init_modules_watch_stub();
var app20 = new Hono2();
app20.get("/", async (c) => {
  try {
    const clerkUserId = c.req.query("clerk_user_id");
    if (!clerkUserId) {
      return c.json({ error: "clerk_user_id es requerido" }, 400);
    }
    const userProfile = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE clerk_user_id = ?"
    ).bind(clerkUserId).first();
    if (!userProfile) {
      return c.json({ error: "Usuario no encontrado" }, 404);
    }
    const settings = await c.env.DB.prepare(
      "SELECT * FROM loyalty_settings WHERE user_profile_id = ?"
    ).bind(userProfile.id).first();
    if (!settings) {
      return c.json({ error: "Configuraci\xF3n no encontrada" }, 404);
    }
    const tiersData = JSON.parse(settings.tiers);
    const response = {
      id: settings.id,
      user_profile_id: settings.user_profile_id,
      enabled: settings.enabled === 1,
      tiers: tiersData.map((tier) => ({
        ...tier,
        max_amount: tier.max_amount === 999999999 ? Infinity : tier.max_amount
      })),
      created_at: settings.created_at,
      updated_at: settings.updated_at
    };
    return c.json(response);
  } catch (error) {
    console.error("Error getting loyalty settings:", error);
    return c.json({ error: error.message || "Error interno del servidor" }, 500);
  }
});
app20.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { clerk_user_id, enabled, tiers } = body;
    if (!clerk_user_id) {
      return c.json({ error: "clerk_user_id es requerido" }, 400);
    }
    if (typeof enabled !== "boolean") {
      return c.json({ error: "enabled debe ser boolean" }, 400);
    }
    if (!Array.isArray(tiers) || tiers.length === 0) {
      return c.json({ error: "tiers debe ser un array con al menos un elemento" }, 400);
    }
    const userProfile = await c.env.DB.prepare(
      "SELECT id FROM user_profiles WHERE clerk_user_id = ?"
    ).bind(clerk_user_id).first();
    if (!userProfile) {
      return c.json({ error: "Usuario no encontrado" }, 404);
    }
    const tiersForDb = tiers.map((tier) => ({
      ...tier,
      max_amount: tier.max_amount === Infinity ? 999999999 : tier.max_amount
    }));
    const tiersJson = JSON.stringify(tiersForDb);
    const existingSettings = await c.env.DB.prepare(
      "SELECT id FROM loyalty_settings WHERE user_profile_id = ?"
    ).bind(userProfile.id).first();
    if (existingSettings) {
      await c.env.DB.prepare(
        `UPDATE loyalty_settings
         SET enabled = ?, tiers = ?, updated_at = datetime('now')
         WHERE user_profile_id = ?`
      ).bind(enabled ? 1 : 0, tiersJson, userProfile.id).run();
      const updated = await c.env.DB.prepare(
        "SELECT * FROM loyalty_settings WHERE user_profile_id = ?"
      ).bind(userProfile.id).first();
      const response = {
        id: updated.id,
        user_profile_id: updated.user_profile_id,
        enabled: updated.enabled === 1,
        tiers: JSON.parse(updated.tiers).map((tier) => ({
          ...tier,
          max_amount: tier.max_amount === 999999999 ? Infinity : tier.max_amount
        })),
        created_at: updated.created_at,
        updated_at: updated.updated_at
      };
      return c.json(response);
    } else {
      const id = crypto.randomUUID();
      await c.env.DB.prepare(
        `INSERT INTO loyalty_settings (id, user_profile_id, enabled, tiers, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(id, userProfile.id, enabled ? 1 : 0, tiersJson).run();
      const created = await c.env.DB.prepare(
        "SELECT * FROM loyalty_settings WHERE id = ?"
      ).bind(id).first();
      const response = {
        id: created.id,
        user_profile_id: created.user_profile_id,
        enabled: created.enabled === 1,
        tiers: JSON.parse(created.tiers).map((tier) => ({
          ...tier,
          max_amount: tier.max_amount === 999999999 ? Infinity : tier.max_amount
        })),
        created_at: created.created_at,
        updated_at: created.updated_at
      };
      return c.json(response, 201);
    }
  } catch (error) {
    console.error("Error saving loyalty settings:", error);
    return c.json({ error: error.message || "Error interno del servidor" }, 500);
  }
});
var loyalty_settings_default = app20;

// src/routes/team-invitations.ts
init_checked_fetch();
init_modules_watch_stub();
var app21 = new Hono2();
app21.post("/", async (c) => {
  const tenant = c.get("tenant");
  const userProfileId = c.get("userProfileId");
  try {
    const body = await c.req.json();
    const { email, full_name, role, permissions, token } = body;
    if (!email || !role || !token) {
      return c.json({
        success: false,
        error: "Email, rol y token son requeridos"
      }, 400);
    }
    const existing = await c.env.DB.prepare("SELECT id FROM team_members WHERE tenant_id = ? AND email = ? AND owner_id = ?").bind(tenant.id, email, userProfileId).first();
    if (existing) {
      return c.json({
        success: false,
        error: "Ya existe una invitaci\xF3n para este email"
      }, 400);
    }
    const expiresAt = /* @__PURE__ */ new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const id = generateId("inv");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await c.env.DB.prepare(`
        INSERT INTO team_members (
          id, tenant_id, owner_id, email, full_name, role, permissions,
          status, invitation_status, invitation_token, invitation_sent_at,
          invitation_expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
      id,
      tenant.id,
      userProfileId,
      email,
      full_name || null,
      role,
      JSON.stringify(permissions || []),
      "inactive",
      // El usuario estará inactivo hasta que acepte la invitación
      "pending",
      token,
      now,
      expiresAt.toISOString(),
      now,
      now
    ).run();
    const member = await c.env.DB.prepare("SELECT * FROM team_members WHERE id = ?").bind(id).first();
    return c.json({
      success: true,
      data: member,
      message: "Invitaci\xF3n creada exitosamente"
    });
  } catch (error) {
    console.error("Error creando invitaci\xF3n:", error);
    return c.json({
      success: false,
      error: error.message || "Error al crear la invitaci\xF3n"
    }, 500);
  }
});
app21.get("/", async (c) => {
  const tenant = c.get("tenant");
  const userProfileId = c.get("userProfileId");
  try {
    const members = await c.env.DB.prepare("SELECT * FROM team_members WHERE tenant_id = ? AND owner_id = ? ORDER BY created_at DESC").bind(tenant.id, userProfileId).all();
    return c.json({
      success: true,
      data: members.results || []
    });
  } catch (error) {
    console.error("Error obteniendo invitaciones:", error);
    return c.json({
      success: false,
      error: error.message || "Error al obtener invitaciones"
    }, 500);
  }
});
app21.get("/:id", async (c) => {
  const tenant = c.get("tenant");
  const userProfileId = c.get("userProfileId");
  const memberId = c.req.param("id");
  try {
    const member = await c.env.DB.prepare("SELECT * FROM team_members WHERE id = ? AND tenant_id = ? AND owner_id = ?").bind(memberId, tenant.id, userProfileId).first();
    if (!member) {
      return c.json({
        success: false,
        error: "Invitaci\xF3n no encontrada"
      }, 404);
    }
    return c.json({
      success: true,
      data: member
    });
  } catch (error) {
    console.error("Error obteniendo invitaci\xF3n:", error);
    return c.json({
      success: false,
      error: error.message || "Error al obtener invitaci\xF3n"
    }, 500);
  }
});
app21.put("/:id", async (c) => {
  const tenant = c.get("tenant");
  const userProfileId = c.get("userProfileId");
  const memberId = c.req.param("id");
  try {
    const body = await c.req.json();
    const { role, permissions, status, full_name, phone } = body;
    const existing = await c.env.DB.prepare("SELECT id FROM team_members WHERE id = ? AND tenant_id = ? AND owner_id = ?").bind(memberId, tenant.id, userProfileId).first();
    if (!existing) {
      return c.json({
        success: false,
        error: "Miembro no encontrado"
      }, 404);
    }
    const updates = [];
    const values = [];
    if (role) {
      updates.push("role = ?");
      values.push(role);
    }
    if (permissions) {
      updates.push("permissions = ?");
      values.push(JSON.stringify(permissions));
    }
    if (status) {
      updates.push("status = ?");
      values.push(status);
    }
    if (full_name !== void 0) {
      updates.push("full_name = ?");
      values.push(full_name);
    }
    if (phone !== void 0) {
      updates.push("phone = ?");
      values.push(phone);
    }
    updates.push("updated_at = ?");
    values.push((/* @__PURE__ */ new Date()).toISOString());
    values.push(memberId, tenant.id, userProfileId);
    await c.env.DB.prepare(`
        UPDATE team_members
        SET ${updates.join(", ")}
        WHERE id = ? AND tenant_id = ? AND owner_id = ?
      `).bind(...values).run();
    const member = await c.env.DB.prepare("SELECT * FROM team_members WHERE id = ?").bind(memberId).first();
    return c.json({
      success: true,
      data: member,
      message: "Miembro actualizado exitosamente"
    });
  } catch (error) {
    console.error("Error actualizando miembro:", error);
    return c.json({
      success: false,
      error: error.message || "Error al actualizar miembro"
    }, 500);
  }
});
app21.delete("/:id", async (c) => {
  const tenant = c.get("tenant");
  const userProfileId = c.get("userProfileId");
  const memberId = c.req.param("id");
  try {
    const existing = await c.env.DB.prepare("SELECT id FROM team_members WHERE id = ? AND tenant_id = ? AND owner_id = ?").bind(memberId, tenant.id, userProfileId).first();
    if (!existing) {
      return c.json({
        success: false,
        error: "Miembro no encontrado"
      }, 404);
    }
    await c.env.DB.prepare("DELETE FROM team_members WHERE id = ? AND tenant_id = ? AND owner_id = ?").bind(memberId, tenant.id, userProfileId).run();
    return c.json({
      success: true,
      message: "Miembro eliminado exitosamente"
    });
  } catch (error) {
    console.error("Error eliminando miembro:", error);
    return c.json({
      success: false,
      error: error.message || "Error al eliminar miembro"
    }, 500);
  }
});
var team_invitations_default = app21;

// src/index.ts
var app22 = new Hono2();
app22.use("/*", cors({
  origin: /* @__PURE__ */ __name((origin) => {
    if (origin?.startsWith("http://localhost:")) return origin;
    if (origin?.endsWith(".vercel.app")) return origin;
    if (origin === "https://posib.dev") return origin;
    return "http://localhost:3000";
  }, "origin"),
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowHeaders: ["Content-Type", "Authorization"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
  credentials: true
}));
app22.get("/health", (c) => {
  return c.json({
    success: true,
    message: "Tienda POS API is running",
    environment: c.env.ENVIRONMENT || "unknown",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app22.get("/", (c) => {
  return c.json({
    success: true,
    message: "Tienda POS Multi-Tenant API",
    version: "1.0.0",
    docs: "/docs"
  });
});
app22.route("/api/webhooks", webhooks_default);
app22.post("/api/wompi/webhook", wompi_default);
app22.post("/api/subscriptions/webhook", subscriptions_default);
app22.route("/api/storefront", storefront_default);
app22.route("/stats", stats_default);
var emailCronHandler = /* @__PURE__ */ __name(async (c) => {
  const path = c.req.path.replace("/api/email", "");
  const newReq = new Request(c.req.url.replace(c.req.path, path), {
    method: c.req.method,
    headers: c.req.headers,
    body: c.req.body
  });
  return email_default.fetch(newReq, c.env, c.executionCtx);
}, "emailCronHandler");
app22.post("/api/email/daily-reports", emailCronHandler);
app22.post("/api/email/subscription-reminders", emailCronHandler);
app22.post("/api/email/stock-alerts", emailCronHandler);
app22.post("/api/email/abandoned-carts", emailCronHandler);
app22.use("/api/*", authMiddleware);
app22.route("/api/wompi", wompi_default);
app22.route("/api/subscriptions", subscriptions_default);
app22.route("/api/products", products_default);
app22.route("/api/customers", customers_default);
app22.route("/api/sales", sales_default);
app22.route("/api/categories", categories_default);
app22.route("/api/suppliers", suppliers_default);
app22.route("/api/purchase-orders", purchase_orders_default);
app22.route("/api/debtors", debtors_default);
app22.route("/api/user-profiles", user_profiles_default);
app22.route("/api/credit-payments", credit_payments_default);
app22.route("/api/offers", offers_default);
app22.route("/api/payment-transactions", payment_transactions_default);
app22.route("/api/shipping-zones", shipping_zones_default);
app22.route("/api/admin", admin_stats_default);
app22.route("/api/email", email_default);
app22.route("/loyalty-settings", loyalty_settings_default);
app22.route("/api/team-invitations", team_invitations_default);
app22.notFound((c) => {
  return c.json({
    success: false,
    error: "Not Found",
    message: "The requested endpoint does not exist"
  }, 404);
});
app22.onError((err, c) => {
  console.error("Global error handler:", err);
  return c.json({
    success: false,
    error: "Internal Server Error",
    message: c.env.ENVIRONMENT === "development" ? err.message : "An error occurred"
  }, 500);
});
async function scheduled(event, env, ctx) {
  console.log("Cron trigger fired:", event.cron);
  const makeRequest = /* @__PURE__ */ __name(async (path) => {
    try {
      const request = new Request(`https://internal/${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const response = await app22.fetch(request, env, ctx);
      return await response.json();
    } catch (error) {
      console.error(`Error in ${path}:`, error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }, "makeRequest");
  const hour = (/* @__PURE__ */ new Date()).getUTCHours();
  if (hour === 9) {
    console.log("Running subscription reminders...");
    const result = await makeRequest("api/email/subscription-reminders");
    console.log("Subscription reminders result:", result);
  }
  console.log("Running daily reports check...");
  const reportsResult = await makeRequest("api/email/daily-reports");
  console.log("Daily reports result:", reportsResult);
  if (hour % 2 === 0) {
    console.log("Running stock alerts...");
    const stockResult = await makeRequest("api/email/stock-alerts");
    console.log("Stock alerts result:", stockResult);
  }
  console.log("Running abandoned carts check...");
  const cartsResult = await makeRequest("api/email/abandoned-carts");
  console.log("Abandoned carts result:", cartsResult);
  console.log("Cron jobs completed");
}
__name(scheduled, "scheduled");
var src_default = {
  fetch: app22.fetch,
  scheduled
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
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

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
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

// .wrangler/tmp/bundle-ikGurw/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
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

// .wrangler/tmp/bundle-ikGurw/middleware-loader.entry.ts
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
