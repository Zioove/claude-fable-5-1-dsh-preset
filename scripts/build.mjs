#!/usr/bin/env node
/**
 * Rebuild preset/agent.cordis.yml from base/ + prompt/.
 *
 *   base/standard.agent.cordis.yml   upstream dsh `standard` composition (the baseline)
 *   prompt/Claude-Fable-5.1.md       persona text, inlined verbatim
 *   prompt/harness-bridge.md         run-environment adaptation appended after it
 *
 * The persona row is rewritten in the dsh >= 0.1.5 schema:
 *   config:
 *     suffix: Your working directory is {{cwd}}.
 *     prefix: |-
 *       <persona>
 *
 * Zero dependencies. Run:  node scripts/build.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')

const base = read('base/standard.agent.cordis.yml')
const persona = read('prompt/Claude-Fable-5.1.md').replace(/\n+$/, '')
const bridge = read('prompt/harness-bridge.md').replace(/\n+$/, '')

// Strict prompt interpolation: every complete {{...}} group must resolve against a
// registered variable. The source text contains none, so guard the invariant loudly.
const combined = persona + '\n\n' + bridge
const braces = combined.match(/\{\{/g)
if (braces) throw new Error(`persona contains ${braces.length} '{{' group(s); resolve or escape them first`)

const indent = (text) => text.split('\n').map((line) => (line === '' ? '' : '      ' + line)).join('\n')

const row = [
  '# ── persona ── Claude Fable 5.1 ─────────────────────────────────────────',
  '# `prefix` 内联 Claude-Fable-5.1.md 全文（约 275 KB），作为 order 0 的',
  '# deployment:persona-prefix 段；`suffix` 保留 standard 的工作目录尾段',
  '# （order 10200）。注意 dsh 0.1.5 起 dsh-persona 的字段是 prefix/suffix，',
  '# 不再是单个 text —— 升级后旧写法会以「$.prefix missing required value」',
  '# 挂载失败，作为默认预设时会让新建对话直接报错。',
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

const out = base.slice(0, start) + row + '\n' + base.slice(end)
writeFileSync(join(root, 'preset/agent.cordis.yml'), out, 'utf8')

console.log('preset/agent.cordis.yml written')
console.log('  persona prefix : %d chars', combined.length)
console.log('  composition    : %d chars', out.length)
