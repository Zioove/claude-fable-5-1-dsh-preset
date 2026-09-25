# 原理与维护说明

## 1. dsh 的系统提示是分段拼装的

`dsh` 的系统提示不是一整块字符串，而是 `dsh-system-prompt` 注册表按 `order` 拼装：

| 段 | order | 来源 |
|---|---|---|
| `harness:identity` | -100 | host composition（固定开场白） |
| `deployment:persona-prefix` | 0 | **本预设：Claude Fable 5.1 全文** |
| 工具使用指引 | 100–199 | 各工具 row |
| `deployment:persona-suffix` | 10200 | **本预设：`Your working directory is {{cwd}}.`** |

`dsh-persona` 是唯一允许预设覆盖人格的 row；它必须在 agent scope 内挂载
（预设就是这么挂的），否则会和注册表自己的 `deployment:persona` 注册冲突。

`complete: true` 会让该段成为**唯一**系统提示段（harness 身份、运行时上下文、
工具指引全部消失）。本预设默认不加，保留 dsh 的骨架。

## 2. 字段随版本变化（踩坑记录）

| dsh 版本 | `dsh-persona` 的 config |
|---|---|
| ≤ 0.1.4 | `text: <string>`（必填），`complete`，`includeRuntimeContext` |
| ≥ 0.1.5 | `prefix: <string>`（必填），`suffix: <string>`（默认 `''`），`complete`，`includeRuntimeContext` |

写错字段的后果不是「人格不生效」，而是**整个预设挂载失败**：

```
preset "claude-fable-5-1" failed to mount: failed to apply loader entry
persona (@deepseek-ai/dsh-persona): invalid config:
  - $.prefix missing required value (at prefix)
```

如果这个预设同时是默认预设（`settings.yaml` → `agent-presets.default`），症状就是
**新建对话直接失败，且磁盘上不产生任何 session 目录**（会话在做挂载的那一步就被回滚了）。

排查手法（不用翻日志）：对目标 preset 调一次真实挂载校验即可拿到同样的报错，
`agentPresets.standingKeyFor(id)` 走的正是新建会话的那条挂载路径，只是不启动 agent。
在 dsh 里可以用一个临时 Cordis Host 插件把 `ctx.agentPresets` 暴露成工具来做这件事。

## 3. 为什么 base/ 要跟着 dsh 升级

`base/standard.agent.cordis.yml` 是官方 `standard` 预设的整份拷贝。预设里绝大多数 row
都不是「随便调用的插件」，而是有严格 plane/realm 规则的组合：

- 只提供/消费宿主服务、自己不 provide 的 row（`tool-fs`、`tool-bash`、`tool-jobs`、
  `tool-goal`、`tool-web` …）必须**留在 realm 之外**，否则解析不到宿主注册表；
- 自己 provide 服务的 row 必须包在带 `isolate` 的 group 里，否则会注册进进程全局 realm，
  第二个会话挂载同一个预设时冲突，`dsh-agent-presets` 会直接拒绝挂载。

官方升级会增删 row、调整 config 字段（例：0.1.5 新增 `command-goal`、`present`；
预设目录迁到 `node_modules/@deepseek-ai/dsh-agent-presets/presets/`；预设 id `code` 更名 `ptc`）。
所以升级 dsh 后重跑：

```bash
cp "<dsh>/node_modules/@deepseek-ai/dsh-agent-presets/presets/standard/agent.cordis.yml" base/
node scripts/build.mjs && node scripts/check.mjs
```

## 4. 人格文本的两个硬约束

1. **严格变量插值**：段文本里每一个完整的 `{{...}}` 组都必须在渲染时解析成已注册变量
   （shipped 只注册 `{{model}}` / `{{cwd}}`）。出现未知组会**渲染失败**，等于该会话每个
   请求都失败。`scripts/build.mjs` 因此在生成前直接对 `{{` 报错。
2. **KV cache**：人格段在请求前缀里，文本一改就重建前缀缓存；不要频繁微调措辞。

## 5. 成本

275 K 字符 ≈ 7 万 token，常驻每次请求。1M 上下文窗口下可用，但单价成本明显上升。
削减方式：编辑 `prompt/Claude-Fable-5.1.md`（例如只保留语气 / 拒绝处理 / 知识截止几节）
后重建；或把全文改用 skill 目录按需加载，人格段只留短身份。

## 6. 验证清单

安装后：

- [ ] GUI 预设选择器里出现 **Claude Fable 5.1**
- [ ] 新建一次会话，工具列表与 `standard` 一致
- [ ] 首轮回复语气符合人格段
- [ ] 若设为默认预设，确认新建对话不再失败
