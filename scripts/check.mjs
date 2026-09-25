#!/usr/bin/env node
/**
 * Self-check for preset/agent.cordis.yml — does not need dsh installed.
 *
 * Uses the js-yaml shipped inside a local dsh install when one is reachable, so the
 * composition is parsed with the same dialect the loader uses (`!!js` tags included).
 * Falls back to reporting that js-yaml is unavailable rather than failing the build.
 *
 * Run:  node scripts/check.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = join(root, 'preset/agent.cordis.yml')
const text = readFileSync(file, 'utf8')

const requiredRows = [
  'persona', 'agent-instructions', 'tool-fs', 'tool-fs-search', 'tool-jobs',
  'skill-filesystem', 'tool-skill', 'tool-goal', 'planning', 'compaction',
  'delegation', 'tool-ask-user', 'tool-todo', 'tool-web',
]

let yaml
const candidates = [
  join(root, 'node_modules/js-yaml'),
  'C:/Users/hongx/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/js-yaml',
]
const require = createRequire(pathToFileURL(join(root, 'scripts/check.mjs')).href)
for (const candidate of candidates) {
  try { yaml = require(candidate); break } catch { /* next */ }
}
if (!yaml && existsSync(join(root, 'package.json'))) {
  try { yaml = require('js-yaml') } catch { /* ignore */ }
}
if (!yaml) {
  console.log('[skip] js-yaml not reachable from this checkout; textual checks only')
  console.log('rows found:', (text.match(/^- id: /gm) || []).length)
  process.exit(0)
}

const jsTag = new yaml.Type('tag:yaml.org,2002:js', {
  kind: 'scalar', resolve: () => true, construct: (data) => ({ __jsExpr: data }),
})
const schema = yaml.DEFAULT_SCHEMA.extend([jsTag])
const rows = yaml.load(text, { schema })

if (!Array.isArray(rows)) throw new Error('composition is not a top-level list of plugin rows')

const ids = rows.map((row) => row.id)
const missing = requiredRows.filter((id) => !ids.includes(id))
if (missing.length) throw new Error('missing rows: ' + missing.join(', '))

const persona = rows.find((row) => row.id === 'persona')
if (!persona?.config?.prefix) throw new Error('persona row has no config.prefix (dsh >= 0.1.5 schema)')
if (/\{\{/.test(persona.config.prefix)) throw new Error('persona prefix contains a {{...}} variable group')

console.log('OK — %d rows: %s', rows.length, ids.join(', '))
console.log('   persona.prefix: %d chars | suffix: %s', persona.config.prefix.length, JSON.stringify(persona.config.suffix))
