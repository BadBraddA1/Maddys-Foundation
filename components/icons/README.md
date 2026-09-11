# BraddCorp animated icons

Lucide shapes + Motion hover animations (from [Lucide Animated](https://lucide-animated.com/), MIT). No attribution footer.

## Install on another site

1. `pnpm add motion`
2. Copy this folder to `components/icons/`
3. Import: `import { BellIcon } from "@/components/icons"`
4. Optional: copy `lib/icon-kit.ts` for the usage catalog

Gallery (unlisted, internal): https://braddcorp.com/icons — not linked in site nav.

## Add an icon

```bash
pnpm dlx shadcn@latest add --yes "https://lucide-animated.com/r/<name>.json"
mv components/ui/<name>.tsx components/icons/
```

Then export it from `index.ts` and add a row in `lib/icon-kit.ts`.
