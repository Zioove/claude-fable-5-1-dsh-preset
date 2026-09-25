/**
 * Host half of the `dsh-preset-claude-fable-5-1` bundle.
 *
 * It provisions one agent preset and nothing else: on boot it copies the
 * `preset/` directory shipped inside this package into
 * `${DSH_HOME:-~/.dsh}/.agent-presets/claude-fable-5-1/`, which is the roster's
 * user root. That is the whole dsh-side install — no manual file copy, and an
 * upgrade is `dsh plugin --profile <name> update dsh-preset-claude-fable-5-1`.
 *
 * Design notes:
 * - No services, no client half, no timers, no listeners: nothing to dispose, so
 *   `apply` has no reversible side effect to register.
 * - No dependencies at all (node builtins only), so the package installs cleanly
 *   into any profile without pnpm resolution games.
 * - The write is idempotent: each file is compared byte-for-byte with the bundled
 *   copy and only rewritten when it differs, so an unchanged installation is not
 *   touched and the user's file timestamps stay put.
 * - Failures are logged, never thrown: a read-only home must not break the boot
 *   of the whole profile.
 * @module dsh-preset-claude-fable-5-1
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Cordis plugin name for the inserted row. */
export const name = 'claude-fable-5-1-preset'
/** No service dependencies: this row only provisions files. */
export const inject = []
/** The preset id, which is also its directory name under the preset root. */
export const PRESET_ID = 'claude-fable-5-1'
/** Files copied from this package's `preset/` into the installed preset directory. */
const PRESET_FILES = ['agent.cordis.yml', 'preset.yml']
/** Bookkeeping file written next to the installed preset. */
const STAMP_FILE = '.installed-by.json'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * The preset directory this bundle maintains.
 * @param env - environment to read `DSH_HOME` from; defaults to `process.env`.
 * @returns the absolute path of the installed preset directory.
 */
export function presetDirectory(env = process.env) {
  const configured = typeof env?.DSH_HOME === 'string' ? env.DSH_HOME.trim() : ''
  const home = configured === '' ? join(homedir(), '.dsh') : configured
  return join(home, '.agent-presets', PRESET_ID)
}

/** Read a file, or undefined when it does not exist (or is unreadable). */
async function contentOf(path) {
  try {
    return await readFile(path)
  } catch {
    return undefined
  }
}

/**
 * Copy this package's bundled preset into the roster's user root, writing only
 * the files whose content differs from what is installed.
 * @param options - test seams: `env` for `DSH_HOME`, `logger` for the progress line.
 * @returns the target directory and the names of the files written.
 */
export async function syncPreset({ env = process.env, logger = console } = {}) {
  const target = presetDirectory(env)
  const written = []

  await mkdir(target, { recursive: true })

  for (const file of PRESET_FILES) {
    const source = join(packageRoot, 'preset', file)
    const bundled = await contentOf(source)
    if (bundled === undefined) throw new Error(`bundled preset file is missing: ${source}`)
    const installed = await contentOf(join(target, file))
    if (installed !== undefined && installed.equals(bundled)) continue
    await writeFile(join(target, file), bundled)
    written.push(file)
  }

  const manifest = await contentOf(join(packageRoot, 'package.json'))
  let version = 'unknown'
  try {
    version = JSON.parse(manifest.toString()).version ?? version
  } catch {
    // an unreadable manifest only costs the version in the stamp
  }
  const stamp = JSON.stringify(
    { preset: PRESET_ID, installedBy: '@dsh-preset-claude-fable-5-1', package: 'dsh-preset-claude-fable-5-1', version },
    null,
    2,
  ) + '\n'
  if ((await contentOf(join(target, STAMP_FILE)))?.toString() !== stamp) {
    await writeFile(join(target, STAMP_FILE), stamp)
    written.push(STAMP_FILE)
  }

  if (written.length > 0) logger?.log?.(`[${name}] installed preset ${PRESET_ID} -> ${target} (${written.join(', ')})`)
  return { target, written }
}

/**
 * Mount the row: provision the preset once per process.
 * @param _ctx - the row's context; unused, this plugin registers nothing.
 * @param config - optional `{ sync: false }` to skip provisioning.
 */
export function apply(_ctx, config) {
  if (config?.sync === false) return
  syncPreset().catch((error) => {
    console.error(`[${name}] could not install the preset: ${error?.message ?? error}`)
  })
}
