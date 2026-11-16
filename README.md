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

## Repeatable item groups

`ModuleField.itemFields` accepts fields and `{ group, fields }` objects, using
the same expandable groups as the module sidebar. For example:

```ts
itemFields: [
  { name: 'heading', label: 'Heading', type: 'SINGLE_LINE' },
  { group: 'Heading settings', fields: [
    { name: 'heading_color', label: 'Color', type: 'SINGLE_SELECT', defaultValue: 'none',
      options: [{ name: 'none', label: 'None' }, { name: 'primary', label: 'Primary' }] },
  ] },
]
```

Groups are presentation metadata. `resolveFieldValues` keeps each item's values
flat, applies defaults and visibility rules, and resolves property selectors
independently for each item. Group titles do not become stored value keys.

## Related

- [`@caraer/cms-tokens`](https://github.com/Caraer-HQ/caraer-cms-tokens) — design token contract
- [`caraer-web`](https://github.com/Caraer-HQ/caraer-web) — the company website runtime
- [`caraer-cli`](https://github.com/Caraer-HQ/caraer-cli) — scaffolds modules that import this package
# Browser tracking policy

`@caraer/cms-runtime/tracking` exports the framework-independent active-time clock
and pending-snapshot coalescer used by CMS v1 and v2. Hidden time is excluded;
unchanged or consent-disabled measurements do not emit heartbeats. Only cumulative
engagement snapshots within one visitor/session/page and between business actions
can merge. Adapters own consent, identity, transport and framework lifecycle.
