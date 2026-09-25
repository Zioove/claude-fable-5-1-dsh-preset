#!/usr/bin/env node
/**
 * Check the bundle half (lib/index.js) without installing it into a profile.
 *
 * Runs the real sync against a throwaway DSH_HOME in the OS temp directory and
 * asserts the three properties the bundle relies on:
 *   1. the target directory is derived from $DSH_HOME;
 *   2. a first pass installs the bundled composition and metadata;
 *   3. a second pass writes nothing (idempotent), and the installed bytes equal
 *      the bundled bytes.
 *
 * Run:  node scripts/check-plugin.mjs
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mod = await import(pathToFileURL(join(root, 'lib/index.js')).href)
const quiet = { log() {} }

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(mod.name === 'claude-fable-5-1-preset', 'plugin name changed — the bundle patch row must match it')
assert(mod.PRESET_ID === 'claude-fable-5-1', 'preset id must stay claude-fable-5-1 (it is the directory name)')
assert(Array.isArray(mod.inject) && mod.inject.length === 0, 'the bundle row must declare no service dependencies')

const sandbox = await mkdtemp(join(tmpdir(), 'dsh-preset-check-'))
try {
  const env = { DSH_HOME: sandbox }
  const target = mod.presetDirectory(env)
  assert(target.startsWith(sandbox), `presetDirectory ignored DSH_HOME: ${target}`)

  const first = await mod.syncPreset({ env, logger: quiet })
  for (const file of ['agent.cordis.yml', 'preset.yml', '.installed-by.json']) {
    assert(first.written.includes(file), `first sync did not write ${file}`)
  }

  const second = await mod.syncPreset({ env, logger: quiet })
  assert(second.written.length === 0, `second sync was not idempotent: ${second.written.join(', ')}`)

  for (const file of ['agent.cordis.yml', 'preset.yml']) {
    const installed = await readFile(join(target, file))
    const bundled = await readFile(join(root, 'preset', file))
    assert(installed.equals(bundled), `${file} differs from the bundled copy after sync`)
  }

  console.log('OK — bundle sync honours DSH_HOME, installs both preset files, and is idempotent')
  console.log('   target: %s', target)
} finally {
  await rm(sandbox, { recursive: true, force: true })
}
