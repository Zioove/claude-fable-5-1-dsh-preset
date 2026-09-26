---
name: claude-fable-5-1-provenance
description: 这个预设的人格从哪来、怎么组装、怎么重建与裁剪，以及被适配段刻意排除掉的 Anthropic 产品侧能力清单；并附带 Claude Fable 5.1 系统提示词的逐字原文（reference/），用于对照、引用，或在裁剪人格后按需取回章节。当用户问起这个预设的人格来源、要改/瘦身人格、要核对原文，或遇到挂载失败需要按 dsh schema 重建时加载。
whenToUse: 用户问这个预设的人格来源或为什么某段不在提示里；要裁剪 / 替换 / 更新人格；要引用 Claude Fable 5.1 原文；或预设挂载失败需要重建时。
---

# Claude Fable 5.1 预设：来源与维护

## 人格是怎么装进去的

`preset/agent.cordis.yml` 里一个 `dsh-persona` row 贡献两个提示词段：

| 段 | order | 内容 |
|---|---|---|
| `deployment:persona-prefix` | 0 | Claude Fable 5.1 系统提示词全文 + 运行环境适配段 |
| `deployment:persona-suffix` | 10200 | `Your working directory is {{cwd}}.` |

顺序是 **identity-first**：harness 身份段（−1000，本例中是 −100）在最前，人格在 0，各工具 row
自己的指导在 100–199，工作目录尾段在 10200。也就是说：**dsh 的工具指导排人格之后**，工具冲突时
以 harness 的工具说明为准。

逐字原文在 `reference/Claude-Fable-5.1.md`（275,723 字节，与仓库 `prompt/Claude-Fable-5.1.md`
同一份）。人格被裁剪后，需要哪一段就从这里取。

## 适配段排除了什么

`prompt/harness-bridge.md` 追加在人格之后，明确声明原文提到的**产品侧工具在本环境不存在**，
不要调用也不要承诺：`memory_read`/`memory_write`/`memory_str_replace`/`memory_append`/
`memory_list`/`memory_delete`、`conversation_search`/`recent_chats`/`read_conversation`、
`search_mcp_registry`/`suggest_connectors`/`navigate`、`search_plugins`/`suggest_plugin_install`/
`search_skills`/`suggest_skills`、`window.storage`、`imagine`、`end_conversation`、
`ask_user_input_v0`。

跨会话记忆改用本机记忆服务（OpenViking，见 `openviking-memory` skill），不要自建 memory 文件体系。

## 重建与裁剪

```bash
node scripts/build.mjs     # prompt/ + base/ → preset/agent.cordis.yml，逐字节可复现
node scripts/check.mjs     # row 集合、persona schema、必须内容与禁止内容
node scripts/check-plugin.mjs   # bundle 插件自检：DSH_HOME 解析、安装、幂等
bash scripts/ci-check.sh   # 以上 + git diff --exit-code 的构建漂移检查
```

**裁剪人格**：编辑 `prompt/Claude-Fable-5.1.md` 只留需要的章节 → `node scripts/build.mjs` →
按安装方式生效（bundle：`dsh plugin --profile web update dsh-preset-claude-fable-5-1`；
脚本：`bash scripts/install.sh` / `pwsh -File scripts/install.ps1 -Force`）。
裁掉的章节随时能从 `reference/` 取回。

## dsh 升级后的坑

`dsh-persona` 的 config schema 变过一次：**≤ 0.1.4** 是 `text: <string>`，**0.1.5 起**是
`prefix`（必填）+ `suffix`。旧写法会以 `invalid config: $.prefix missing required value`
**挂载失败**——如果它同时是默认预设，症状就是**新建对话直接失败、磁盘上不生成 session 目录**。

升级 dsh 后按 `docs/notes.md` 的步骤重新同步 `base/` 并重建。另外 `build.mjs` 里的两个
`PATCHES` 锚点如果在新版 `standard` 里找不到（或找到多处），构建会**报错退出**——这是故意的，
避免静默丢掉「preset 自带 skill root」和「spawn 子代理瘦身」两处改动。

## 归属

`reference/Claude-Fable-5.1.md` 是 Anthropic Claude 产品的系统提示词文本，版权归 Anthropic，
按技术研究与个人使用收录，**不在**本仓库 MIT 授权范围内（见 `NOTICE.md`）。它不改变模型路由，
也不代表 Anthropic 或 DeepSeek 的任何官方立场。
