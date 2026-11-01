# bumpist-design

Design tokens and a React design system: **6 themes × light/dark × 2 profiles** (consumer, workspace), built on nine design principles that every theme keeps. Part of the Bumpist Suite, usable on its own.

> **Status: v0 (phase 0).** Contracts C1 (theme) and C2 (catalog) and the first theme draft (`paper`) are here. Token build, components and Storybook arrive in phase 1.

## Principles every theme keeps

No pure white backgrounds or pure black text · regions separated by space and type, not borders or shadows · corners are 12px or 16px · generous spacing · mobile-first single column (consumer) or desktop-first workspace · no traffic-light colors: states use the brand palette, always with text and an icon.

## Contracts

| Contract | File | Schema |
| --- | --- | --- |
| C1 Theme | `packages/tokens/src/themes/*.tokens.json` | [`schemas/theme/v0.json`](https://parksubeom.github.io/bumpist-design/schemas/theme/v0.json) |
| C2 Catalog | `catalog.json` (phase 1) | [`schemas/catalog/v0.json`](https://parksubeom.github.io/bumpist-design/schemas/catalog/v0.json) |

[한국어 README](./README.ko.md) · MIT
