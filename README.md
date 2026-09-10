# @caraer/cms-runtime

Caraer CMS v2 module contract and platform components.

App modules import types (`ModuleManifest`, `ModuleProps`) and platform Astro components (`CaraerRichText`, `CaraerForm`, …) from this package. The company website (`caraer-web`) provides the runtime implementation.

## Install

```bash
npm install @caraer/cms-runtime @caraer/cms-tokens
```

## Usage

```astro
---
import CaraerRichText from '@caraer/cms-runtime/CaraerRichText.astro';
import type { ModuleManifest, ModuleProps } from '@caraer/cms-runtime';
---
```

## Related

- [`@caraer/cms-tokens`](https://github.com/Caraer-HQ/caraer-cms-tokens) — design token contract
- [`caraer-web`](https://github.com/Caraer-HQ/caraer-web) — the company website runtime
- [`caraer-cli`](https://github.com/Caraer-HQ/caraer-cli) — scaffolds modules that import this package
