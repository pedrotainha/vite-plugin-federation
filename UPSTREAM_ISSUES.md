# Upstream Issues & PRs — @originjs/vite-plugin-federation

Two issues to report upstream with corresponding PRs.

---

## Issue 1 — `flattenModule` breaks React 19 hooks dispatcher (live bindings lost)

**Title:** `flattenModule` uses `Object.assign` snapshot — breaks mutable internal state (React 19 hooks dispatcher)

### Description

`flattenModule` in `federation_fn_import.js` uses `Object.assign({}, module.default, module)` to merge a shared module's default export with its named exports. This creates a **shallow snapshot** at load time.

React 19 stores its hooks dispatcher in a mutable property:

```text
React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE.H
```

This property is `null` at module load time and only set during render. The `Object.assign` snapshot captures `null` permanently, so any component using React hooks via the shared module gets:

```text
TypeError: Cannot read properties of null (reading 'useMemoCache')
```

or similar errors for any hook (`useState`, `useEffect`, etc.) when running with React Compiler (`babel-plugin-react-compiler`).

### Reproduction

- Host app shares `react` and `react-dom`
- Remote app uses `babel-plugin-react-compiler` (which emits `useMemoCache` calls)
- Remote loads in host → crash because hooks dispatcher is `null` in the snapshot

### Expected behavior

Shared modules should preserve live bindings to mutable internal state.

### Suggested fix

Replace `Object.assign` with a `Proxy` that delegates property access to the original module object at access time (not load time). This preserves live mutable state.

```javascript
// Before (snapshot — breaks live state)
module = Object.assign({}, module.default, module)

// After (proxy — preserves live bindings)
const originalModule = module
module = new Proxy(module.default, {
  get(target, prop) {
    if (prop !== 'default' && prop in originalModule) return originalModule[prop]
    return target[prop]
  },
  has(target, prop) {
    return prop in originalModule || prop in target
  },
  ownKeys(target) {
    const keys = new Set([...Reflect.ownKeys(target), ...Reflect.ownKeys(originalModule)])
    keys.delete('default')
    return [...keys]
  }
})
```

> **Note:** The `originalModule` reference is critical — without it, `prop in module` after reassignment triggers the Proxy's own `has` trap recursively (stack overflow).

### Environment

- vite-plugin-federation: 1.4.1
- React: 19.x
- babel-plugin-react-compiler: latest
- Vite: 7.x

---

## Issue 2 — `compiler-runtime` chunk bypasses `importShared`, gets isolated React instance

**Title:** `react/compiler-runtime` chunk imports React directly instead of through `importShared` — broken hooks in remote builds

### Description

When a remote app uses React Compiler (`babel-plugin-react-compiler`), Rollup bundles `react/compiler-runtime` as a separate chunk. This chunk imports React via a direct static import:

```javascript
import{r as R}from"./index-XYZ.js";  // direct React import
```

The plugin's AST transform in `remote-production.ts` converts `import ... from 'react'` → `importShared('react')`, but it only matches **exact** module names (line 326-327):

```typescript
parsedOptions.prodShared.some(
  (sharedInfo) => sharedInfo[0] === moduleName  // exact match only
)
```

`react/compiler-runtime` is a **sub-export** of `react` — it doesn't match `'react'` exactly, so it's never transformed. The result: the compiler-runtime chunk gets its own React instance (from the bundled `./index-XYZ.js`), separate from the host's shared React.

At render time, the shared React has its hooks dispatcher initialized (`__CLIENT_INTERNALS...H`), but the compiler-runtime's isolated copy has `H = null` → crash:

```text
TypeError: Cannot read properties of null (reading 'useMemoCache')
```

### Impact

This only affects **remote builds** (apps with `exposes`). The host owns the React instance directly, so its compiler-runtime works fine.

### Reproduction

- Host shares `react` via federation
- Remote uses `babel-plugin-react-compiler`
- Build remote → `compiler-runtime-*.js` chunk has `import{r}from"./index-*.js"` (direct import, not `importShared`)
- Load remote in host → `useMemoCache` crashes

### Suggested fix

In the `generateBundle` hook of `remote-production.ts`, detect `compiler-runtime` chunks and rewrite them to obtain React through `importShared("react")` via the `__federation_fn_import` chunk:

```javascript
// Before (direct import — isolated React)
import{r as R}from"./index-XYZ.js";
var r=R().__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
export function c(n){return r.H.useMemoCache(n)}

// After (shared React via importShared)
import{importShared as __s}from"./__federation_fn_import-XYZ.js";
var __react=await __s("react");
var __internals=__react.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
var __obj={c:function(n){return __internals.H.useMemoCache(n)}};
export{__obj as c};
```

The patch should only apply to remote builds (`builderInfo.isRemote`), since the host doesn't need it.

### Environment

- vite-plugin-federation: 1.4.1
- React: 19.x
- babel-plugin-react-compiler: latest
- Vite: 7.x

---

## PR structure

| PR | Fixes | Files changed |
|----|-------|---------------|
| PR 1 | Issue 1 | `packages/lib/src/prod/federation_fn_import.js` |
| PR 2 | Issue 2 | `packages/lib/src/prod/remote-production.ts` |
