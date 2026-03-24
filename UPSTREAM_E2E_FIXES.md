# Upstream Issue & PR — E2E Test Fixes

---

## Issue — E2E tests fail on Node 22+: deprecated import assertions, port conflicts, missing dependencies

**Title:** E2E tests broken on Node 22+: `import assert` syntax, EADDRINUSE port collisions, missing `html-webpack-plugin`

### Description

Running `test:e2e-serve` on Node 22+ results in 5 out of 12 test suites failing. The failures are caused by three independent issues in the examples and test infrastructure:

#### 1. Deprecated `import ... assert { type: 'json' }` syntax (3 suites)

Several rollup-based examples use the deprecated [Import Assertions](https://github.com/tc39/proposal-import-assertions) syntax:

```javascript
import pkg from './package.json' assert { type: 'json' }
```

Node 22+ removed support for `assert` in favor of the [Import Attributes](https://github.com/tc39/proposal-import-attributes) syntax (`with` keyword). This causes:

```text
SyntaxError: Unexpected identifier 'assert'
```

**Affected files (6):**
- `packages/examples/simple-react-systemjs/host-systemjs/rollup.config.mjs`
- `packages/examples/simple-react-systemjs/remote-systemjs/rollup.config.mjs`
- `packages/examples/basic-host-remote/rollup-host/rollup.config.mjs`
- `packages/examples/simple-react-webpack/host/rollup.config.mjs`
- `packages/examples/simple-react-esm/host-esm/rollup.config.mjs`
- `packages/examples/simple-react-esm/remote-esm/rollup.config.mjs`

**Fix:** Replace `assert` with `with`:
```javascript
import pkg from './package.json' with { type: 'json' }
```

#### 2. Port collisions between sequential E2E tests (4 suites)

All examples hardcode the same ports (5000/5001). Tests run sequentially via `threads: false`, but `kill-port` in `afterAll` doesn't always free the port before the next test starts, causing:

```text
Error: listen EADDRINUSE: address already in use 0.0.0.0:5000
```

**Affected examples:**
- `webpack-host` → assigned ports 5010/5011
- `simple-react-systemjs` → assigned ports 5020/5021
- `basic-host-remote` → assigned ports 5030/5031
- `simple-react-webpack` → assigned ports 5040/5041

**Fix:** Assign unique port ranges to examples that conflict, and add a `portMap` lookup in both `vitestSetup-serve.ts` and `vitestSetup-dev.ts`.

#### 3. Server readiness race condition (1 suite)

`vue3-advanced-demo` times out (60s) because `pnpm run serve` is spawned without `await` and `page.goto()` is called before the Vite preview server is listening.

**Fix:** Add a `waitForServer()` helper that polls the URL until it responds, called between build completion and `page.goto()`. Increase `beforeAll` timeout from 60s to 120s.

#### 4. Missing `html-webpack-plugin` dependency (1 suite)

`simple-react-webpack/remote/webpack.config.js` requires `html-webpack-plugin` but it's not listed in `devDependencies`.

**Fix:** Add `"html-webpack-plugin": "^5.5.0"` to `packages/examples/simple-react-webpack/remote/package.json`.

### Before / After

| Metric | Before | After |
|--------|--------|-------|
| Test suites passed | 6/12 | 11/12 |
| Test suites failed | 5/12 | 0/12 |
| Test suites skipped | 1/12 | 1/12 |

(`vue2-demo` remains skipped — pre-existing, unrelated)

### Environment

- Node: 22+ (tested on 24.14.0)
- vite-plugin-federation: 1.4.1 (main branch)

---

## PR — Fix E2E test failures: import attributes, port conflicts, server readiness

**Title:** fix: resolve E2E test failures on Node 22+ (import attributes, port conflicts, server readiness)

### Summary

- Replace deprecated `import ... assert` with `import ... with` in 6 rollup config files across examples
- Assign unique port ranges to 4 examples (`webpack-host`: 5010-5011, `simple-react-systemjs`: 5020-5021, `basic-host-remote`: 5030-5031, `simple-react-webpack`: 5040-5041) to prevent `EADDRINUSE` when tests run sequentially
- Add `waitForServer()` poll in `vitestSetup-serve.ts` and `vitestSetup-dev.ts` to avoid race condition between server startup and `page.goto()`
- Increase `beforeAll` hook timeout from 60s to 120s to accommodate slow builds + server readiness wait
- Add missing `html-webpack-plugin` dependency to `simple-react-webpack/remote`

### Test plan

- [x] `pnpm test:e2e-serve` — 11 passed, 0 failed, 1 skipped (was 6 passed, 5 failed)
- [x] `pnpm test:unit` — 46 passed (no regressions)
- [ ] CI pipeline on Node 18/20 (should also pass since `with` is supported from Node 18.20+)

### Files changed (25)

**Import assertions → attributes (6 files):**
- `packages/examples/simple-react-systemjs/host-systemjs/rollup.config.mjs`
- `packages/examples/simple-react-systemjs/remote-systemjs/rollup.config.mjs`
- `packages/examples/basic-host-remote/rollup-host/rollup.config.mjs`
- `packages/examples/simple-react-webpack/host/rollup.config.mjs`
- `packages/examples/simple-react-esm/host-esm/rollup.config.mjs`
- `packages/examples/simple-react-esm/remote-esm/rollup.config.mjs`

**Port reassignment (16 files):**
- `packages/examples/webpack-host/{package.json, host/package.json, remote/package.json, host/webpack.config.js, README.md}`
- `packages/examples/simple-react-systemjs/{package.json, host-systemjs/package.json, remote-systemjs/package.json, host-systemjs/rollup.config.mjs, README.md}`
- `packages/examples/basic-host-remote/{package.json, rollup-host/package.json, rollup-remote/package.json, rollup-host/rollup.config.mjs, README.md}`
- `packages/examples/simple-react-webpack/{package.json, host/package.json, remote/package.json, host/rollup.config.mjs, remote/webpack.config.js, host/index.js}`

**Server readiness + timeout (2 files):**
- `packages/examples/vitestSetup-serve.ts`
- `packages/examples/vitestSetup-dev.ts`

**Missing dependency (1 file + lockfile):**
- `packages/examples/simple-react-webpack/remote/package.json`
- `pnpm-lock.yaml`
