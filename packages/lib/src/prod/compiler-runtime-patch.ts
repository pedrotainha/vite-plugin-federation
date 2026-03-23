/**
 * Rewrites the compiler-runtime portion of a chunk to obtain React through
 * importShared("react") instead of a direct bundled import.
 *
 * This handles two cases:
 * 1. Dedicated compiler-runtime chunk (remotes) — small file, can be fully replaced
 * 2. Mixed chunk containing compiler-runtime + other modules (hosts with manualChunks)
 *    — only the __CLIENT_INTERNALS access is patched, other exports are preserved
 */
export function patchCompilerRuntime(
  code: string,
  federationImportFile: string,
  runtimeFile: string,
  importSharedName: string
): string {
  if (
    !code.includes('useMemoCache') ||
    !code.includes(
      '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE'
    )
  ) {
    return code
  }

  const relPath = computeRelativePath(runtimeFile, federationImportFile)

  // Check if this is a dedicated compiler-runtime chunk (only has useMemoCache export)
  // or a mixed chunk (has other exports like React CJS wrapper)
  const exportCount = (code.match(/export\s*\{/g) || []).length
  const hasOtherExports =
    code.includes('requireReact') || code.includes('getDefaultExportFromCjs')

  if (!hasOtherExports && exportCount <= 1) {
    // Dedicated chunk — full replacement (original behaviour for remotes)
    return [
      `import{${importSharedName} as __s}from"${relPath}";`,
      `var __react=await __s("react");`,
      `var __internals=__react.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;`,
      `var __obj={c:function(n){return __internals.H.useMemoCache(n)}};`,
      `export{__obj as c};`
    ].join('')
  }

  // Mixed chunk — surgical patch: replace the function that reads __CLIENT_INTERNALS
  // from a local React with one that reads from shared React.
  //
  // Pattern we're looking for (minified):
  //   var X = R().__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  //   return Y.c = function(n) { return X.H.useMemoCache(n) }
  //
  // We prepend the importShared call and replace the __CLIENT_INTERNALS access.
  const internalsPattern =
    /(\w+)\s*=\s*(\w+)\(\)\.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE/
  const match = internalsPattern.exec(code)

  if (!match) {
    return code
  }

  const internalsVar = match[1]
  const preamble = `import{${importSharedName} as __s}from"${relPath}";var __react=await __s("react");`

  // Replace the local React __CLIENT_INTERNALS access with shared React
  const patched = code.replace(
    internalsPattern,
    `${internalsVar}=__react.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE`
  )

  return preamble + patched
}

/**
 * Finds the exported name for importShared in the federation import chunk.
 * Handles both unminified (`export{... as importShared}`) and minified forms.
 */
export function findImportSharedExportName(code: string): string | null {
  // Unminified: export{... as importShared ...}
  const unminifiedExport = /export\s*\{[^}]*\bas\s+importShared\b[^}]*\}/
  if (unminifiedExport.test(code)) {
    return 'importShared'
  }

  // Minified: find the async function that accesses moduleCache/Promise,
  // then look up its export alias.
  const asyncFnRe = /async\s+function\s+(\w+)\s*\(\s*(\w+)/g
  let fnMatch: RegExpExecArray | null

  while ((fnMatch = asyncFnRe.exec(code)) !== null) {
    const window = code.substring(
      fnMatch.index,
      Math.min(fnMatch.index + 300, code.length)
    )
    if (window.includes('moduleCache') || window.includes('Promise')) {
      const internalName = fnMatch[1]!

      const exportRe = new RegExp(
        `export\\s*\\{[^}]*\\b${internalName}\\s+as\\s+(\\w+)`
      )
      const exportMatch = exportRe.exec(code)
      if (exportMatch) {
        return exportMatch[1]!
      }

      const directExportRe = new RegExp(
        `export\\s*\\{[^}]*\\b${internalName}\\b`
      )
      if (directExportRe.test(code)) {
        return internalName
      }
    }
  }

  return null
}

/**
 * Computes the relative import path between two bundle file names.
 */
export function computeRelativePath(from: string, to: string): string {
  const fromParts = from.split('/')
  const toParts = to.split('/')

  fromParts.pop()

  let common = 0
  while (
    common < fromParts.length &&
    common < toParts.length &&
    fromParts[common] === toParts[common]
  ) {
    common++
  }

  const ups = fromParts.length - common
  const remaining = toParts.slice(common)
  const prefix = ups > 0 ? '../'.repeat(ups) : './'

  return prefix + remaining.join('/')
}
