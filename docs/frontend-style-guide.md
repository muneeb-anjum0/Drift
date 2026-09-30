# DriftLedger UI Redesign

This app now uses a minimal warm-light SaaS interface with bottom Dock navigation instead of the previous sidebar.

## Theme Palette

The global palette lives in `client/src/index.css` as CSS variables:

- Background: `#f3f0e7`
- Soft background: `#f8f6ef`
- Surface: `#fffdf8`
- Muted surface: `#ece6d8`
- Border: `#d6cdbb`
- Text: `#111111`
- Muted text: `#59564e`
- Primary action: black background with white text
- Accent: muted khaki tones only

Avoid reintroducing dark page backgrounds, neon green accents, heavy glows, glassmorphism, or high-radius cards.

## Shape System

The radius scale is also defined in `client/src/index.css`:

- `--radius-xs: 4px`
- `--radius-sm: 6px`
- `--radius-md: 8px`
- `--radius-lg: 10px`
- `--radius-xl: 12px`
- `--radius-card: 10px`
- `--radius-control: 8px`
- `--radius-modal: 12px`

Cards should stay around 8-12px. Buttons, inputs, tabs, and Dock items should stay around 6-10px. Pill badges may remain fully rounded when they are small status indicators.

## Dock Navigation

The Dock component lives at:

- `client/src/components/navigation/Dock.tsx`
- `client/src/components/navigation/Dock.css`

The app shell wires it in `client/src/components/layout/AppLayout.tsx`.

Current Dock items:

- Dashboard: `/dashboard`
- Workspaces: `/workspaces`
- Projects: `/projects`
- Settings: `/settings`
- Logout: signs out the current user

To change routes, update `NAV_ITEMS` in `client/src/utils/constants.ts`. To change icons or include special actions, update the `dockItems` mapping in `AppLayout.tsx`.

## Dock Sizing

The app uses restrained Dock sizing to prevent overflow:

```tsx
<Dock
  items={dockItems}
  panelHeight={58}
  baseItemSize={42}
  magnification={54}
  distance={130}
/>
```

The wrapper `.app-dock-shell` is fixed bottom-center with:

- `width: min(calc(100vw - 2rem), 520px)`
- `pointer-events: none` on the shell
- `pointer-events: auto` on the Dock panel
- horizontal overflow allowed inside the panel on narrow screens

Main content uses `.app-main` with bottom padding so the Dock does not cover page controls.

## Accessibility

Dock items are semantic buttons with `aria-label` values and visible focus rings. Labels appear on hover/focus for pointer and keyboard users. Global reduced-motion CSS shortens transitions for users who prefer reduced motion.

Buttons, inputs, cards, modals, selects, and empty states were moved onto shared warm-light primitives. Keep new component work aligned with those common primitives before adding page-specific styles.
