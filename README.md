# Claude Fable 5.1 · DeepSeek Harness Agent Preset

把 **Claude Fable 5.1 系统提示词**（`prompt/Claude-Fable-5.1.md`，约 275 KB / 2186 行）
作为人格层，接到 **DeepSeek Harness (dsh)** 的 agent 预设上。装好后在 dsh 里选
「Claude Fable 5.1」即可得到一个带完整编码工具链、但身份 / 语气 / 判断准则按
Claude Fable 5.1 原文运行的 agent。

> 一句话：**工具用 dsh standard 的，人格用 Claude 的。**

---

## 特性

- **人格逐字内联**：提示词全文进 `dsh-persona` 的 `prefix` 段（order 0），不截断、不改写。
- **工具面保持完整**：预设由 dsh 官方 `standard` 预设整目录派生，文件读写 / 检索 /
  pwsh / 后台任务 / Skills / 计划 / 目标 / 子代理 / 工作流 / web 工具全部保留。
- **一段运行环境适配**：`prompt/harness-bridge.md` 把原文里提到的产品侧工具
  （`memory_read`、`conversation_search`、`search_mcp_registry`、`window.storage`、
  `end_conversation` …）收敛到本 harness 真实存在的工具，避免模型调用不存在的工具。
- **可重建**：`scripts/build.mjs` 从 `base/` + `prompt/` 重新生成 composition，
  dsh 升级后一条命令即可跟上新 schema。
- **已挂载校验**：composition 通过 `agentPresets.standingKeyFor()` 真实挂载，
  18 个 row 全部激活、无 process-global 服务泄漏。

---

## 目录结构

```
.
├── package.json              # 同时是一个 dsh bundle 插件（dsh.bundle.patch）
├── cordis.patch.yml          # bundle patch：insert 一行 host 插件
├── lib/
│   └── index.js              # host 插件：把 preset/ 同步进 $DSH_HOME/.agent-presets/
├── preset/
│   ├── agent.cordis.yml      # 可直接安装的 composition（含内联人格，约 300 KB）
│   └── preset.yml            # 显示名与描述
├── base/
│   └── standard.agent.cordis.yml   # 派生的上游基线（dsh 0.1.5-rc.3 的 standard 预设）
├── prompt/
│   ├── Claude-Fable-5.1.md   # 人格源文本（逐字）
│   └── harness-bridge.md     # 追加的运行环境适配段
├── scripts/
│   ├── build.mjs             # 由 base/ + prompt/ 生成 preset/agent.cordis.yml
│   ├── check.mjs             # 生成物自检（YAML 可解析、row 完整、无 {{ }} 变量组）
│   ├── ci-check.sh           # 本地 CI：构建可复现校验 + 自检
│   ├── install.ps1           # Windows 安装（方式 B）
│   └── install.sh            # macOS / Linux 安装（方式 B）
├── docs/
│   └── notes.md              # 原理、schema 迁移坑、升级维护说明
├── NOTICE.md                 # 提示词文本的来源与归属
└── LICENSE                   # MIT（仅覆盖脚本与配置）
```

---

## 安装

预设按 id 决定目录名，dsh 只会从 `${DSH_HOME:-~/.dsh}/.agent-presets/<id>/` 读取本地预设。

### 方式 A：通过 dsh 安装（推荐，一条命令，自带更新）

本仓库同时是一个 **dsh bundle 插件**（`package.json` 里声明 `dsh.bundle.patch`，
`cordis.patch.yml` 里 insert 一行 host 插件）。装上之后它会在每次启动时把仓库里
`preset/` 的两个文件同步进预设目录，因此不需要手动复制：

```bash
dsh plugin --profile web add github:ZH1110/claude-fable-5-1-dsh-preset
# 然后重启 dsh web（bundle 层在下次启动时加载）
```

- 安装/升级：`dsh plugin --profile web add|update dsh-preset-claude-fable-5-1`
- 卸载：`dsh plugin --profile web remove dsh-preset-claude-fable-5-1`
  （已落盘的预设目录会保留，需要时自己删 `<DSH_HOME>/.agent-presets/claude-fable-5-1/`）
- 该插件**零依赖**（只用 node 内置模块）、**幂等**（逐文件比字节，内容一样就不写）、
  **不会因为失败而拖垮启动**（出错只打日志）。它会覆盖同名的本地改动：
  仓库版本为准。
- 若 pnpm 提示需要 `allowBuilds`，那只会出现在带 `prepare`/`postinstall` 的包上，
  本包没有安装脚本，正常情况不需要授权。

### 方式 B：克隆后运行安装脚本

```powershell
git clone https://github.com/ZH1110/claude-fable-5-1-dsh-preset.git
cd claude-fable-5-1-dsh-preset
pwsh -File scripts/install.ps1        # Windows
```

```bash
git clone https://github.com/ZH1110/claude-fable-5-1-dsh-preset.git
cd claude-fable-5-1-dsh-preset
bash scripts/install.sh               # macOS / Linux
```

### 方式 C：手动复制

把 `preset/` 里的两个文件复制到 `%DSH_HOME%\.agent-presets\claude-fable-5-1\`
（或 `~/.dsh/.agent-presets/claude-fable-5-1/`）：

```
.agent-presets/claude-fable-5-1/agent.cordis.yml
.agent-presets/claude-fable-5-1/preset.yml
```

### 零拷贝（进阶）

`dsh-agent-presets` 的 row 支持 `roots` 配置（扫描顺序里靠前的 root 优先），
所以也可以把克隆下来的仓库直接挂成一个预设 root——把 `preset/` 重排成
`presets/claude-fable-5-1/agent.cordis.yml`，再在 profile 的 `cordis.patch.yml`
或宿主配置里给 `agent-presets` row 加：

```yaml
- id: agent-presets
  config:
    roots:
      - path: ~/src/claude-fable-5-1-dsh-preset/presets
        trust: user
```

`path` 支持 `~`，相对路径按进程 cwd 解析，所以请用绝对路径或 `~`。
这样 `git pull` 就等于升级预设，代价是要手改配置。

---

## 验证与重建

```bash
node scripts/build.mjs        # 由 base/ + prompt/ 重建 preset/agent.cordis.yml
node scripts/check.mjs        # 自检：YAML 可解析、row 完整、persona 无 {{ }} 变量组
node scripts/check-plugin.mjs # bundle 插件自检：DSH_HOME 解析、安装、幂等
bash scripts/ci-check.sh      # 以上三步 + 构建可复现校验（本地 CI）
```

`preset/agent.cordis.yml` 是**生成物**：改人格文本或同步 `base/` 之后必须重跑
`build.mjs` 并提交结果，否则 CI 会在 `git diff --exit-code` 上失败。

---

## 使用

1. 重开或刷新 dsh Web GUI，在会话的预设选择器里选 **Claude Fable 5.1**。
2. 想让它成为新会话的默认预设，在 `settings.yaml` 里写：

   ```yaml
   agent-presets:
     default: claude-fable-5-1
   ```

   （该值每次解析时读取，改完不需要重启 dsh。也可直接在 GUI 的预设选择器里切换。）

---

## 原理

dsh 的系统提示是**按段拼装**的，`dsh-persona` 这个 row 提供两个段：

| 段 | order | 本预设内容 |
|---|---|---|
| `deployment:persona-prefix` | 0 | Claude Fable 5.1 全文 + 运行环境适配段 |
| `deployment:persona-suffix` | 10200 | `Your working directory is {{cwd}}.` |

harness 的固定身份段（-100）与工具使用指引段（100–199）依然由 `standard` 提供，
因此这个预设是「dsh 的骨架 + Claude 的人格」，而不是把 dsh 的提示整段替换掉。
若想让人格文本成为**唯一**系统提示（会一并去掉 harness 身份与工具指引），在
`preset/agent.cordis.yml` 的 persona row 里加 `complete: true`。

composition 里三条 `isolate` realm 规则（`planning` / `compaction` / `delegation`）
是 dsh 对「预设自有服务」的硬要求，本仓库原样保留，未做改动。

---

## 成本提示

人格段常驻系统提示，约 **275 K 字符 ≈ 7 万 token**，每次请求都会带上。
上下文窗口足够（模型配置 1,000,000）时无碍，但会显著抬高单价成本。想瘦身：
编辑 `prompt/Claude-Fable-5.1.md` 只保留需要的章节，再 `node scripts/build.mjs`。

---

## 升级维护（重要）

dsh 会改 row 的 config schema。本仓库踩过的坑：

- **dsh ≤ 0.1.4**：`dsh-persona` 的字段是 `text: <string>`。
- **dsh 0.1.5-rc.3 起**：字段改为 `prefix`（必填）与 `suffix`；旧写法会以
  `invalid config: $.prefix missing required value` **挂载失败**。
  如果这个预设同时是默认预设，症状就是**新建对话直接失败、磁盘上不产生 session 目录**。

升级 dsh 后请重新同步基线并重建：

```bash
# 1) 用新版 shipped standard 替换 base/
cp "$DSH_INSTALL/node_modules/@deepseek-ai/dsh-agent-presets/presets/standard/agent.cordis.yml" \
   base/standard.agent.cordis.yml
# 2) 重建 + 自检
node scripts/build.mjs
node scripts/check.mjs
# 3) 安装/更新，并在 GUI 里新建一次会话确认
dsh plugin --profile web update dsh-preset-claude-fable-5-1   # 方式 A（bundle）
#   或 bash scripts/install.sh / pwsh -File scripts/install.ps1 -Force
```

shipped 预设目录位置与预设 id 也会随版本变化（例如 0.1.5 起目录移到
`node_modules/@deepseek-ai/dsh-agent-presets/presets/`，预设 `code` 更名为 `ptc`）。

用 bundle 安装（方式 A）时，`dsh plugin ... update` 会把新版 `preset/` 同步进预设目录，
不需要再手动复制——插件逐文件比对内容，只有真的变了才写。

---

## 已知限制

- 原文提到的产品侧能力（记忆文件系统、历史对话检索、MCP 连接器目录、Artifacts 存储、
  Imagine、`end_conversation`）在 dsh 中不存在，已由适配段明确排除；需要跨会话记忆时
  使用本机记忆服务（OpenViking）的工具。
- 原文写的是 Anthropic 产品体系，本预设只把它当人格与行为准则使用，不改变模型路由、
  也不代表 Anthropic 或 DeepSeek 的任何官方立场。
- 人格文本一旦改动，系统提示前缀即变化，会重建 KV cache。

---

## 许可与归属

- 本仓库的**脚本、配置、文档**：MIT，见 `LICENSE`。
- **`prompt/Claude-Fable-5.1.md`**：内容来自 Anthropic 的 Claude 产品（Claude Fable 5.1
  系统提示词），版权归 Anthropic 所有，仅作技术研究与个人使用收录，不在 MIT 授权范围内。
  详见 `NOTICE.md`。
