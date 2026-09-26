#!/usr/bin/env node
/**
 * Self-check for preset/agent.cordis.yml — does not need dsh installed.
 *
 * Uses the js-yaml shipped inside a local dsh install when one is reachable, so the
 * composition is parsed with the same dialect the loader uses (`!!js` tags included).
 * Falls back to reporting that js-yaml is unavailable rather than failing the build.
 *
 * Asserts the things that make this preset what it is:
 *   rows      every row `standard` supplies is still there (the derivation dropped nothing);
 *   persona   dsh >= 0.1.5 `prefix`/`suffix` schema, the bridge present, and no group dsh
 *             could not interpolate;
 *   patches   the preset-local skill root and the subagent child-persona patch are in the
 *             artifact, and the fork row deliberately keeps the parent persona;
 *   skill     the bundled skill and its reference text exist on disk.
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

const personaMustContain = [
  'Claude Fable 5.1',
  '运行环境适配（DeepSeek Harness）',
  '{{model}}',
]

const artifactMustContain = [
  'customSkillDirs',
  "new URL('skills/', baseUrl)",
  'persona: "You are a subagent launched by a DeepSeek Harness session on the Claude Fable 5.1',
]

const bundledSkillFiles = [
  'preset/skills/claude-fable-5-1-provenance/SKILL.md',
  'preset/skills/claude-fable-5-1-provenance/reference/Claude-Fable-5.1.md',
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

const prefix = persona.config.prefix
const leftover = prefix.replace(/\{\{(?:model|cwd)\}\}/g, '')
if (leftover.includes('{{')) throw new Error('persona prefix contains a {{...}} variable group')
for (const needle of personaMustContain) {
  if (!prefix.includes(needle)) throw new Error('persona prefix is missing: ' + needle)
}
for (const needle of artifactMustContain) {
  if (!text.includes(needle)) throw new Error('composition is missing a built-in patch: ' + needle)
}
for (const relative of bundledSkillFiles) {
  if (!existsSync(join(root, relative))) throw new Error('bundled skill file is missing: ' + relative)
}

// The fork row keeps the parent persona on purpose: inheriting history and staying
// eligible for KV-cache reuse both depend on parent and child sharing one prefix.
if (/tool-subagent-fork[\s\S]{0,400}?\n\s+persona:/.test(text)) {
  throw new Error('tool-subagent-fork must keep the parent persona')
}

console.log('OK — %d rows: %s', rows.length, ids.join(', '))
console.log('   persona.prefix: %d chars | suffix: %s',
  prefix.length, JSON.stringify(persona.config.suffix))
const childPersona = text.match(/persona: "(You are a subagent launched[^"]*)"/)?.[1]
console.log('   spawn child persona: %d chars | fork: inherits the parent persona', childPersona?.length ?? 0)
console.log('   bundled skill: %d file(s)', bundledSkillFiles.length)
