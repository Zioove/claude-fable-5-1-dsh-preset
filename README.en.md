# Claude Fable 5.1 · DeepSeek Harness Agent Preset

[中文说明](README.md) | **English**

A **DeepSeek Harness (dsh)** agent preset whose persona layer is the verbatim
**Claude Fable 5.1 system prompt** (`prompt/Claude-Fable-5.1.md`, ~275 KB / 2186
lines). Install it and pick “Claude Fable 5.1” in dsh to get an agent with the full
dsh coding toolchain but the identity, tone, and judgement of the Claude Fable 5.1
prompt text.

> In one line: **dsh's tools, Claude's persona.**

---

## Features

- **The persona is inlined verbatim** — the whole prompt goes into the `prefix`
  section of the `dsh-persona` row (order 0). Nothing is truncated or rewritten.
- **The tool surface stays complete** — the preset derives from dsh's shipped
  `standard` preset as a whole directory, so file read/write, search, pwsh, background
  jobs, Skills, plan mode, goals, subagents, workflows, and the web tools are all kept.
- **One run-environment adaptation section** — `prompt/harness-bridge.md` maps the
  product-side tools the original text mentions (`memory_read`, `conversation_search`,
  `search_mcp_registry`, `window.storage`, `end_conversation`, …) onto tools that
  actually exist in this harness, so the model does not call tools that are not there.
- **Rebuildable** — `scripts/build.mjs` regenerates the composition from `base/` +
  `prompt/`, so a dsh upgrade is one command away from the new schema.
- **Mount-verified** — the composition passes a real mount through
  `agentPresets.standingKeyFor()`: all 18 rows activate, with no process-global
  service leakage.

---

## Repository layout

```
.
├── package.json              # also a dsh bundle plugin (dsh.bundle.patch)
├── cordis.patch.yml          # bundle patch: inserts one host row
├── lib/
│   └── index.js              # host row: syncs preset/ into $DSH_HOME/.agent-presets/
├── preset/
│   ├── agent.cordis.yml      # ready-to-install composition (inlines the persona, ~300 KB)
│   └── preset.yml            # display name and description
├── base/
│   └── standard.agent.cordis.yml   # upstream baseline (dsh 0.1.5-rc.3 `standard`)
├── prompt/
│   ├── Claude-Fable-5.1.md   # persona source text (verbatim)
│   └── harness-bridge.md     # appended run-environment adaptation
├── scripts/
│   ├── build.mjs             # base/ + prompt/ → preset/agent.cordis.yml
│   ├── check.mjs             # artifact self-check (YAML parses, rows complete, no {{ }} groups)
│   ├── check-plugin.mjs      # bundle-plugin self-check (DSH_HOME resolution, install, idempotency)
│   ├── ci-check.sh           # local CI: reproducible build check + self-check
│   ├── install.ps1           # Windows installer (method B)
│   └── install.sh            # macOS / Linux installer (method B)
├── docs/
│   └── notes.md              # how it works, schema-migration gotchas, upgrade notes
├── NOTICE.md                 # provenance and ownership of the prompt text
├── README.md                 # 中文说明
└── LICENSE                   # MIT (scripts and configuration only)
```

---

## Install

A preset's directory name is its id; dsh only reads local presets from
`${DSH_HOME:-~/.dsh}/.agent-presets/<id>/`.

### Method A — through dsh (recommended: one command, self-updating)

This repository is also a **dsh bundle plugin** (`dsh.bundle.patch` is declared in
`package.json`, and `cordis.patch.yml` inserts one host row). Once installed it syncs
the two files in `preset/` into the preset directory on every boot, so no manual copy
is involved:

```bash
dsh plugin --profile web add github:Zioove/claude-fable-5-1-dsh-preset
# then restart dsh web (bundle layers load on the next start)
```

- install / upgrade: `dsh plugin --profile web add|update dsh-preset-claude-fable-5-1`
- uninstall: `dsh plugin --profile web remove dsh-preset-claude-fable-5-1`
  (the synced preset directory is left behind; delete
  `<DSH_HOME>/.agent-presets/claude-fable-5-1/` yourself if you want it gone)
- The plugin has **zero dependencies** (Node built-ins only), is **idempotent**
  (per-file byte comparison — nothing is written when content matches), and **never
  takes the boot down** (failures are logged only). It treats this repository as the
  source of truth and will overwrite same-named local edits.
- If pnpm asks for an `allowBuilds` grant, that only happens for packages with
  `prepare`/`postinstall` scripts; this package has none, so no grant is normally
  needed.

### Method B — clone and run the installer

```powershell
git clone https://github.com/Zioove/claude-fable-5-1-dsh-preset.git
cd claude-fable-5-1-dsh-preset
pwsh -File scripts/install.ps1        # Windows
```

```bash
git clone https://github.com/Zioove/claude-fable-5-1-dsh-preset.git
cd claude-fable-5-1-dsh-preset
bash scripts/install.sh               # macOS / Linux
```

### Method C — copy the files by hand

Copy the two files from `preset/` into `%DSH_HOME%\.agent-presets\claude-fable-5-1\`
(or `~/.dsh/.agent-presets/claude-fable-5-1/`):

```
.agent-presets/claude-fable-5-1/agent.cordis.yml
.agent-presets/claude-fable-5-1/preset.yml
```

### Zero-copy (advanced)

The `dsh-agent-presets` row accepts a `roots` configuration (earlier roots in the scan
order win), so a clone of this repository can itself be mounted as a preset root:
rearrange `preset/` into `presets/claude-fable-5-1/agent.cordis.yml`, then add this to
the profile's `cordis.patch.yml` or the host configuration:

```yaml
- id: agent-presets
  config:
    roots:
      - path: ~/src/claude-fable-5-1-dsh-preset/presets
        trust: user
```

`path` supports `~`; relative paths resolve against the process cwd, so use an absolute
path or `~`. With this in place `git pull` becomes the upgrade, at the cost of editing
configuration by hand.

---

## Verify and rebuild

```bash
node scripts/build.mjs        # rebuild preset/agent.cordis.yml from base/ + prompt/
node scripts/check.mjs        # self-check: YAML parses, rows complete, no {{ }} groups in the persona
node scripts/check-plugin.mjs # bundle-plugin self-check: DSH_HOME resolution, install, idempotency
bash scripts/ci-check.sh      # all of the above plus the reproducible-build check (local CI)
```

`preset/agent.cordis.yml` is a **generated artifact**: after editing the persona text or
re-syncing `base/`, you must re-run `build.mjs` and commit the result, or CI fails on
`git diff --exit-code`.

---

## Usage

1. Reopen or reload the dsh Web GUI and pick **Claude Fable 5.1** in the session's preset
   picker.
2. To make it the default for new sessions, write this in `settings.yaml`:

   ```yaml
   agent-presets:
     default: claude-fable-5-1
   ```

   (The value is read on every resolution, so no dsh restart is needed. You can also just
   switch in the GUI's preset picker.)

---

## How it works

dsh assembles its system prompt from **ordered sections**; the `dsh-persona` row
supplies two of them:

| section | order | content in this preset |
|---|---|---|
| `deployment:persona-prefix` | 0 | the full Claude Fable 5.1 prompt + the run-environment adaptation |
| `deployment:persona-suffix` | 10200 | `Your working directory is {{cwd}}.` |

The harness's fixed identity section (-100) and its tool-usage guidance (100–199) still
come from `standard`, so this preset is “dsh's skeleton with Claude's persona” rather
than a wholesale replacement of the dsh prompt. If you want the persona text to be the
**only** system prompt (which also drops the harness identity and tool guidance), add
`complete: true` to the persona row in `preset/agent.cordis.yml`.

The three `isolate` realm rules in the composition (`planning` / `compaction` /
`delegation`) are a hard requirement dsh places on services a preset owns; they are
kept exactly as upstream.

---

## Cost note

The persona section is resident in the system prompt: roughly **275 K characters ≈ 70k
tokens**, sent on every request. That is fine while the context window is large enough
(the model is configured for 1,000,000), but it clearly raises per-request cost. To
slim it down, edit `prompt/Claude-Fable-5.1.md` down to the sections you need and re-run
`node scripts/build.mjs`.

---

## Upgrade and maintenance (important)

dsh changes row config schemas. Gotchas this repository has hit:

- **dsh ≤ 0.1.4**: the `dsh-persona` fields were `text: <string>`.
- **Since dsh 0.1.5-rc.3**: the fields are `prefix` (required) and `suffix`; the old
  form **fails to mount** with `invalid config: $.prefix missing required value`. If
  that preset is also the default, the symptom is that **starting a new conversation
  fails outright and no session directory is created on disk**.

After upgrading dsh, re-sync the baseline and rebuild:

```bash
# 1) replace base/ with the new shipped standard
cp "$DSH_INSTALL/node_modules/@deepseek-ai/dsh-agent-presets/presets/standard/agent.cordis.yml" \
   base/standard.agent.cordis.yml
# 2) rebuild + self-check
node scripts/build.mjs
node scripts/check.mjs
# 3) install/update, then start one session in the GUI to confirm
dsh plugin --profile web update dsh-preset-claude-fable-5-1   # method A (bundle)
#   or: bash scripts/install.sh / pwsh -File scripts/install.ps1 -Force
```

The shipped preset directory and the preset ids also move between versions (for example,
as of 0.1.5 the directory moved to
`node_modules/@deepseek-ai/dsh-agent-presets/presets/`, and the `code` preset was renamed
to `ptc`).

With the bundle install (method A), `dsh plugin … update` re-syncs `preset/` into the
preset directory, so there is nothing to copy by hand — the plugin compares file content
per file and only writes when something actually changed.

---

## Known limitations

- Product-side capabilities mentioned in the original text (the memory filesystem,
  conversation history search, the MCP connector registry, Artifacts storage, Imagine,
  `end_conversation`) do not exist in dsh and are explicitly excluded by the adaptation
  section; for cross-session memory, use this machine's memory service (OpenViking) tools.
- The original text is written against Anthropic's product surface. This preset uses it
  only as persona and behavioural guidance; it does not change model routing and does not
  represent any official position of Anthropic or DeepSeek.
- Any edit to the persona text changes the system-prompt prefix and therefore rebuilds
  the KV cache.

---

## License and attribution

- **Scripts, configuration, and documentation** in this repository: MIT, see `LICENSE`.
- **`prompt/Claude-Fable-5.1.md`**: content from Anthropic's Claude product (the Claude
  Fable 5.1 system prompt). Copyright Anthropic; included for technical research and
  personal use only, and not covered by the MIT license. See `NOTICE.md`.
