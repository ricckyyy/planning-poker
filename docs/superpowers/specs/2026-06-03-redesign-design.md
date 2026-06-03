# Planning Poker UI Redesign — Design Spec

**Date:** 2026-06-03  
**Status:** Approved  
**Scope:** Frontend visual redesign only (no backend changes)

---

## Context

The current UI uses raw inline CSS objects throughout all React components. The aesthetic is flat, utilitarian, and inconsistent — essentially unstyled Material Design colors from 2015. The goal is to replace it with a modern dark theme using Tailwind CSS + shadcn/ui that makes the app feel polished and fun to use as a team.

---

## Tech Stack Changes

| Before | After |
|--------|-------|
| Inline CSS objects | Tailwind CSS v4 utility classes |
| No component library | shadcn/ui (Button, Dialog) |
| No design system | Consistent token-based palette |

**Installation:**
- `tailwindcss` + `@tailwindcss/vite` (Tailwind v4, Vite plugin)
- `shadcn/ui` init with dark theme base
- `Inter` font via Google Fonts (added to `index.html`)

---

## Color System

| Token | Value | Usage |
|-------|-------|-------|
| Background | `slate-950` `#0f172a` | Page background |
| Surface | `slate-800` `#1e293b` | Cards, panels |
| Border | `slate-700` `#334155` | Dividers, card borders |
| Primary gradient | `indigo-500` → `violet-500` | Selected cards, CTA button |
| Text primary | `slate-50` `#f8fafc` | Headings, main content |
| Text secondary | `slate-400` `#94a3b8` | Labels, subtext |
| Voted indicator | `green-400` + glow | Member voted state |
| Error/disconnected | `red-400` | Connection status |

---

## Typography

- **Font:** Inter (Google Fonts, weights 400/500/700)
- **Room name:** `text-2xl font-bold text-slate-50`
- **Room URL:** `font-mono text-sm text-slate-400`
- **Card numbers:** `text-2xl font-bold text-white` (voting cards), `text-3xl font-bold` (member reveal)
- **Member names:** `text-xs text-slate-400`
- **Button text:** `text-sm font-medium`

---

## Components

### Layout (Room.tsx)

- Page background: `bg-slate-950 min-h-screen`
- Content wrapper: `max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8`
- Header bar: flex row, room name left, connection badge + copy URL button right

### Header Bar

- **Connection badge:** small dot (`w-2 h-2 rounded-full`) — `bg-green-400 animate-pulse` when connected, `bg-red-400` when disconnected — followed by "Connected" / "Disconnected" label
- **Copy URL button:** `shadcn/ui Button` variant ghost, copies room URL to clipboard, shows "Copied!" feedback for 2s

### Voting Cards (CardDeck.tsx)

- Grid layout: `flex flex-wrap gap-3 justify-center`
- Card size: `w-[72px] h-[96px]`
- Base style: `rounded-xl bg-slate-800 border border-slate-600 cursor-pointer select-none flex items-center justify-center transition-all duration-150`
- **Hover:** `hover:-translate-y-1 hover:shadow-[0_0_12px_rgba(99,102,241,0.5)]`
- **Selected:** `bg-gradient-to-br from-indigo-500 to-violet-500 border-indigo-400 shadow-[0_0_16px_rgba(99,102,241,0.7)] scale-105`
- Card label: `text-2xl font-bold text-white`

### Member Cards (MemberList.tsx)

- Layout: `flex flex-wrap gap-4 justify-center`
- Card size: `w-20 h-24 rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all duration-300`
- **Not voted:** `bg-slate-800 border-slate-600`
- **Voted (hidden):** `bg-slate-800 border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]` — shows `✓` icon in green
- **Revealed:** card flip animation reveals the number (`text-3xl font-bold text-white`), card background changes to `bg-gradient-to-br from-indigo-500/20 to-violet-500/20`
- Member name: `text-xs text-slate-400 mt-1`

### Reveal Button (RevealButton.tsx)

- Size: `w-48 h-12`
- **Active (all voted):** `bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:shadow-[0_0_28px_rgba(99,102,241,0.7)]`
- **Inactive:** `bg-slate-700 text-slate-400 cursor-not-allowed opacity-60`
- Shape: `rounded-xl font-medium transition-all duration-200`

### Reset Button (ResetButton.tsx)

- Size: `w-48 h-12`
- Style: `rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors duration-200 font-medium`

### Name Modal (NameModal.tsx)

- Overlay: `fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center`
- Card: `bg-slate-800 border border-slate-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl`
- Title: `text-xl font-bold text-slate-50 mb-6`
- Input: `shadcn/ui Input` with dark styling — `bg-slate-900 border-slate-600 text-slate-50`
- Submit button: `shadcn/ui Button` with indigo gradient

---

## Animations

### Card Hover & Selection
```css
/* Via Tailwind */
transition-all duration-150
hover:-translate-y-1
hover:shadow-[0_0_12px_rgba(99,102,241,0.5)]
```
Selection triggers `scale-105` briefly via a short CSS keyframe (`@keyframes pop`).

### Member Vote Feedback
When a member votes, their card transitions from no-vote to voted state with a `transition-all duration-300` fade — green glow ring appears smoothly.

### Card Flip (Reveal)
CSS 3D flip using `perspective` + `rotateY(180deg)`:
- Front face: `✓` or blank
- Back face: the vote number
- Duration: 400ms ease-in-out
- All member cards flip simultaneously on reveal

### Reset Pop-in
On reset, member cards animate in with a staggered `scale-0 → scale-100` using inline `animation-delay` per card index (0ms, 50ms, 100ms...).

### Connection Pulse
`animate-pulse` on the green dot when connected.

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/index.html` | Add Inter font link, add `class="dark"` to `<html>` |
| `frontend/vite.config.ts` | Add `@tailwindcss/vite` plugin |
| `frontend/src/main.tsx` or `index.css` | Tailwind `@import "tailwindcss"` directive, base dark styles |
| `frontend/src/pages/Room.tsx` | Replace inline styles with Tailwind classes, add header bar |
| `frontend/src/components/CardDeck.tsx` | Tailwind card styles + hover/selected animations |
| `frontend/src/components/MemberList.tsx` | Tailwind card styles + voted glow + flip animation |
| `frontend/src/components/NameModal.tsx` | shadcn/ui Dialog or custom modal with dark styles |
| `frontend/src/components/RevealButton.tsx` | Gradient button with glow |
| `frontend/src/components/ResetButton.tsx` | Outline button |
| `frontend/package.json` | Add tailwindcss, @tailwindcss/vite, shadcn/ui deps |

---

## Out of Scope

- No backend changes
- No routing changes
- No new features (dark/light mode toggle, responsive mobile layout) — keep it simple
- No removal of existing component structure; style only

---

## Verification

1. `npm run dev` in `frontend/` — app loads with dark background
2. Create a room → NameModal appears with dark card and blurred backdrop
3. Vote on a card → selected card shows indigo gradient + glow, hover shows lift
4. Second user votes → their member card shows green glow ring
5. All users voted → Reveal button activates with gradient
6. Click Reveal → all member cards flip simultaneously revealing numbers
7. Click Reset → cards pop in with stagger animation
8. Connection status dot pulses green, turns red if disconnected
