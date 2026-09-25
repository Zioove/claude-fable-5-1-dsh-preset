# NOTICE

## Scope of the MIT license

The MIT license in `LICENSE` covers the **scripts, composition, configuration, and
documentation** authored in this repository:

- `scripts/*`
- `preset/*` (the `agent.cordis.yml` composition and `preset.yml` metadata)
- `base/*` (the upstream dsh `standard` preset composition, copied from the
  `@deepseek-ai/dsh` package for reference; it is DeepSeek Harness configuration, not
  an original work of this repository)
- `docs/*`, `README.md`, `NOTICE.md`

## Excluded from the MIT license

`prompt/Claude-Fable-5.1.md` is the system prompt text of **Claude Fable 5.1**, a
product of Anthropic PBC. That text is included here **verbatim, for technical
research and personal experimentation only**, and remains the property of Anthropic.
It is not covered by this repository's MIT license, and no license — express or
implied — is granted over it by this repository.

`prompt/harness-bridge.md` is an original addition authored in this repository and is
covered by the MIT license.

## No affiliation

This project is not affiliated with, endorsed by, or sponsored by Anthropic PBC or
DeepSeek. Product names, model names, and trademarks are the property of their
respective owners. The preset does not change any model routing or vendor behavior; it
only supplies prompt sections to a DeepSeek Harness agent composition.

## Removal requests

If you are a rights holder and want the prompt text removed from this repository,
open an issue and it will be removed promptly.
