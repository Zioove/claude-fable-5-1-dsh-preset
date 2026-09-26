#!/usr/bin/env node
/**
 * Rebuild preset/agent.cordis.yml from base/ + prompt/.
 *
 *   base/standard.agent.cordis.yml   upstream dsh `standard` composition (the baseline)
 *   prompt/Claude-Fable-5.1.md       persona text, inlined verbatim
 *   prompt/harness-bridge.md         run-environment adaptation appended after it
 *
 * Two things happen here: the persona row is rewritten in the dsh >= 0.1.5 schema
 * (`prefix` / `suffix`, not a single `text`), and the baseline rows this preset has to
 * change are patched (PATCHES below).
 *
 * Zero dependencies. Run:  node scripts/build.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '')

const base = read('base/standard.agent.cordis.yml')
const persona = read('prompt/Claude-Fable-5.1.md')
const bridge = read('prompt/harness-bridge.md')

/** Registered prompt variables this persona may reference. dsh renders strictly. */
const ALLOWED_VARIABLES = new Set(['model', 'cwd'])

const combined = persona + '\n\n' + bridge

// ── row patches over the baseline ───────────────────────────────────────────
// Every patch states which upstream fact it overrides and why. `find` must appear
// exactly once in the baseline, so a dsh upgrade that rewrites the row fails this
// build loudly instead of silently dropping the patch.
const CHILD_PERSONA =
  'You are a subagent launched by a DeepSeek Harness session on the Claude Fable 5.1 ' +
  'preset. You were given one task: complete it and report back. Read what the task needs, ' +
  'run what it needs, and stop there — do not start adjacent work, do not ask the user ' +
  'anything, and do not delegate further. Answer in the language of the task: lead with the ' +
  'outcome, then the evidence (paths, commands, outputs, hashes) and anything the caller ' +
  'still has to verify.'

const PATCHES = [
  {
    label: 'preset-local skill root',
    why: 'skills/ travels with the preset, per the shipped `cordis` preset pattern',
    find: [
      '- id: skill-filesystem',
      "  name: '@deepseek-ai/dsh-skill-filesystem'",
      '',
    ].join('\n'),
    replace: [
      '# The provenance skill travels with THIS preset rather than living in the user skill',
      '# root: it documents where this persona came from and how to rebuild it, and a preset',
      '# is the unit that gets copied and installed. `baseUrl` is the preset\'s own',
      '# directory, so the root resolves wherever the preset lands.',
      '- id: skill-filesystem',
      "  name: '@deepseek-ai/dsh-skill-filesystem'",
      '  config:',
      '    customSkillDirs:',
      "      - !!js \"process.getBuiltinModule('node:url').fileURLToPath(new URL('skills/', baseUrl))\"",
      '',
    ].join('\n'),
  },
  {
    label: 'slim persona for spawned subagents',
    why: 'a fresh child does not need the 275 KB persona; fork keeps it for KV reuse',
    find: [
      '        provider: spawn',
      '        toolName: subagent',
      '        modelSelectionSettings: true',
      '        backgroundMode: continuable',
      '',
    ].join('\n'),
    replace: [
      '        provider: spawn',
      '        toolName: subagent',
      '        modelSelectionSettings: true',
      '        backgroundMode: continuable',
      '        # A spawned child starts with no inherited history, so it does not need the',
      '        # ~70k-token persona (and paying that per child buys nothing). Requires the',
      '        # provider\'s `persona` capability; mount validation fails loudly without it.',
      '        # Delete this line to give spawned children the full persona again.',
      '        # `subagent_fork` deliberately keeps the parent persona: its whole point is',
      '        # inheriting the parent history and staying eligible for KV-cache reuse.',
      '        persona: "' + CHILD_PERSONA + '"',
      '',
    ].join('\n'),
  },
]

function patch(text, { label, why, find, replace }) {
  const first = text.indexOf(find)
  if (first < 0) throw new Error(`patch "${label}": anchor not found in the baseline`)
  if (text.indexOf(find, first + 1) >= 0) throw new Error(`patch "${label}": anchor is ambiguous`)
  console.log(`  patch ${label.padEnd(34)} ${why}`)
  return text.slice(0, first) + replace + text.slice(first + find.length)
}

// ── guards ──────────────────────────────────────────────────────────────────
// Strict prompt interpolation: every complete {{...}} group must resolve against a
// registered variable at render time, or the whole turn fails.
for (const group of combined.match(/\{\{[^{}]*\}\}/g) ?? []) {
  const variable = group.slice(2, -2)
  if (!ALLOWED_VARIABLES.has(variable)) {
    throw new Error(`persona references an unregistered prompt variable: ${group}`)
  }
}
const withoutVariables = combined.replace(/\{\{(?:model|cwd)\}\}/g, '')
if (withoutVariables.includes('{{')) {
  throw new Error('persona contains an unbalanced or malformed double-brace group')
}
// Single-brace groups are ordinary text to dsh (only `{{...}}` interpolates), and the
// Claude prompt legitimately carries them inside JSON/code examples — report, never fail.
const single = withoutVariables.match(/\{(?!\{)[a-zA-Z_][a-zA-Z0-9_]*\}/g) ?? []
if (single.length > 0) {
  console.log('  note: %d single-brace group(s) in the source text (inert to dsh), e.g. %s',
    single.length, [...new Set(single)].slice(0, 4).join(', '))
}

// ── persona row ─────────────────────────────────────────────────────────────
const indent = (text) => text.split('\n').map((line) => (line === '' ? '' : '      ' + line)).join('\n')

const row = [
  '# ── persona ── Claude Fable 5.1 ─────────────────────────────────────────',
  '# `prefix` 内联 Claude-Fable-5.1.md 全文（约 275 KB），作为 order 0 的',
  '# deployment:persona-prefix 段；`suffix` 保留 standard 的工作目录尾段',
  '# （order 10200）。注意 dsh 0.1.5 起 dsh-persona 的字段是 prefix/suffix，',
  '# 不再是单个 text —— 升级后旧写法会以「$.prefix missing required value」',
  '# 挂载失败，作为默认预设时会让新建对话直接报错。',
  '#',
  '# 顺序是 identity-first：persona 在 0，各工具 row 自己的指导在 100–199，',
  '# 工作目录尾段在 10200。',
  '- id: persona',
  "  name: '@deepseek-ai/dsh-persona'",
  '  config:',
  '    suffix: Your working directory is {{cwd}}.',
  '    prefix: |-',
  indent(combined),
].join('\n') + '\n'

const start = base.indexOf('- id: persona')
const end = base.indexOf('- id: agent-instructions')
if (start < 0 || end <= start) throw new Error('base composition: persona / agent-instructions markers not found')

let out = base.slice(0, start) + row + '\n' + base.slice(end)
for (const p of PATCHES) out = patch(out, p)

writeFileSync(join(root, 'preset/agent.cordis.yml'), out, 'utf8')

console.log('preset/agent.cordis.yml written')
console.log('  persona prefix : %d chars', combined.length)
console.log('  child persona  : %d chars', CHILD_PERSONA.length)
console.log('  composition    : %d chars', out.length)
