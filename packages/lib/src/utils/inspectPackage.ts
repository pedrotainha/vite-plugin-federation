import { fileURLToPath, URL } from 'url'
import { readdirSync, existsSync, readFileSync } from 'fs'
import Os from 'os'
import { satisfy } from './semver/satisfy'
import { Deps } from 'types'
import { join } from 'path'

const isWindows = () => {
  return Os.platform() === 'win32'
}

type PkgDeps = {
  [s: string]: string
}

const findPath = (
  folder: string,
  packageName: string,
  version: string,
  withPnpm = false
) => {
  const list = readdirSync(folder, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  const wordStartPack = withPnpm
    ? packageName.replace('/', '+') + '@' + version
    : packageName.split('/')[0]

  const item = list.find((pack) => pack.startsWith(wordStartPack))

  if (item) {
    return withPnpm
      ? `${folder}/${item}/node_modules/${packageName}`
      : `${folder}/${packageName}`
  }

  return null
}

const getPathRecursive = (
  node_folder: string,
  packageName: string,
  version: string
) => {
  let path: string | null = null

  if (existsSync(node_folder)) {
    path = findPath(node_folder, packageName, version)
  }

  if (!path && existsSync(`${node_folder}/.pnpm`)) {
    return findPath(`${node_folder}/.pnpm`, packageName, version, true)
  }

  return path
}

const getModulePath = (packageName: string, version: string) => {
  let node_folder = 'node_modules'
  const iteratelevels = 5
  let path: string | null = null

  for (let index = 0; index < iteratelevels; index++) {
    if (!path) {
      path = getPathRecursive(node_folder, packageName, version)
      node_folder = `../${node_folder}`
    }
  }

  if (!path) {
    throw new Error(
      `path not found within ${iteratelevels} folder levels for ${packageName}@${version}`
    )
  }
  return path
}

const mergeDeps = (dependencies: Deps, newDep: Deps) => {
  for (const prop in newDep) {
    if (!dependencies[prop]) {
      dependencies[prop] = newDep[prop]
    } else if (dependencies[prop].version !== newDep[prop].version) {
      if (
        satisfy(dependencies[prop].version, `^${newDep[prop].version}`) ||
        satisfy(newDep[prop].version, `^${dependencies[prop].version}`)
      ) {
        // eslint-disable-next-line no-console
        console.warn(
          `Versions mismatch but satisfies ${prop}, make sure the host is loading the higher one`
        )
        // eslint-disable-next-line no-console
        console.log(newDep[prop], dependencies[prop])
      } else {
        // eslint-disable-next-line no-console
        console.warn(newDep[prop], dependencies[prop])
        throw new Error(`Breaking changes found for ${prop}`)
      }
    }
  }
  return dependencies
}

const filterScope = (scope: string, deps: PkgDeps = {}) =>
  Object.keys(deps)
    .filter((key) => key.startsWith(`@${scope}`))
    .reduce((obj, key) => {
      obj[key] = deps[key]
      return obj
    }, {} as PkgDeps)

export const inspectPackage = async (
  url: string,
  importUrl: string,
  scope?: string,
  peer = false
): Promise<Deps> => {
  let sharedDeps: Deps = {}
  const file = `${isWindows() ? ' file:///' : ''}${fileURLToPath(
    new URL(url, importUrl)
  )}`

  const pack = JSON.parse(readFileSync(file, 'utf-8')) // (await import(file, { assert: { type: 'json' } })).default;
  const pkgDeps: PkgDeps = peer ? pack.peerDependencies : pack.dependencies

  //Add to shared dependencies
  for (const property in pkgDeps) {
    //Share JSX (only this way we can have a proper unique loading of the react lib)
    const version = pkgDeps[property].replace('^', '')

    if (property === 'react') {
      const jsxPath =
        process.env.NODE_ENV === 'production'
          ? './cjs/react-jsx-runtime.production.min.js'
          : './cjs/react-jsx-runtime.development.js'

      const packagePath = join(getModulePath(property, version), jsxPath)

      sharedDeps['react/jsx-runtime'] = {
        version: version,
        packagePath
      }
    }

    sharedDeps[property] = {
      version,
      requiredVersion:
        scope && !property.startsWith(`@${scope}`) ? version : undefined,
      packagePath: peer
        ? fileURLToPath(new URL(getModulePath(property, version), importUrl))
        : undefined
    }
  }

  //identify only Scoped Packages
  const scopeDeps = scope ? filterScope(scope, pkgDeps) : {}

  for (const scopeDepsPropriety in scopeDeps) {
    const version = scopeDeps[scopeDepsPropriety].replace('^', '')

    const moduleFolder = getModulePath(scopeDepsPropriety, version)

    const newDeps = await inspectPackage(
      moduleFolder + '/package.json',
      importUrl,
      scope,
      true
    )

    sharedDeps = mergeDeps(sharedDeps, newDeps)
  }

  return sharedDeps
}
