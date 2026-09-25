# Claude Fable 5.1 · DeepSeek Harness Agent Preset

[中文说明](README.md) | English

A **DeepSeek Harness (dsh)** agent preset whose persona layer is the verbatim
**Claude Fable 5.1 system prompt** (~275 KB). Tools come from dsh's shipped
`standard` preset; identity, tone, and judgement come from the Claude prompt.

## What it is

`dsh` assembles its system prompt from ordered sections. This preset ships a
`dsh-persona` row that registers:

| section | order | content |
|---|---|---|
| `deployment:persona-prefix` | 0 | the full Claude Fable 5.1 prompt + a short run-environment adaptation |
| `deployment:persona-suffix` | 10200 | `Your working directory is {{cwd}}.` |

Everything else (file / shell / search tools, skills, plan mode, goals, subagents,
workflows, web tools, and the `isolate` realms a preset must declare) is inherited
unchanged from the upstream `standard` composition.

## Install

```bash
git clone https://github.com/<you>/claude-fable-5-1-dsh-preset.git
cd claude-fable-5-1-dsh-preset
bash scripts/install.sh          # macOS / Linux
pwsh -File scripts/install.ps1   # Windows
```

Then pick **Claude Fable 5.1** in the preset picker, or make it the default:

```yaml
# $DSH_HOME/settings.yaml
agent-presets:
  default: claude-fable-5-1
```

## Layout

```
preset/     ready-to-install composition + metadata
base/       upstream dsh `standard` composition this preset derives from
prompt/     persona source text + run-environment adaptation
scripts/    build / check / install
docs/       how dsh prompt assembly works, schema-migration gotchas
```

## Rebuild after a dsh upgrade

```bash
cp "<dsh>/node_modules/@deepseek-ai/dsh-agent-presets/presets/standard/agent.cordis.yml" base/
node scripts/build.mjs
node scripts/check.mjs
```

`dsh-persona` changed config schema in dsh 0.1.5 (`text` → `prefix` + `suffix`).
A preset written for the old schema fails to mount with
`invalid config: $.prefix missing required value`; while it is the default preset,
**every attempt to start a new conversation fails**. See `docs/notes.md`.

## Cost

The persona costs roughly 70k tokens on every request. Edit
`prompt/Claude-Fable-5.1.md`, then rebuild, to trim it.

## License

Scripts, composition, and docs: MIT (`LICENSE`).
`prompt/Claude-Fable-5.1.md` is Anthropic's Claude product text, included verbatim
for technical research, and is **not** covered by that license — see `NOTICE.md`.
