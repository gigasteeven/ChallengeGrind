# ChallengeGrind — Project Context for AI Assistants

> **Purpose:** Cached context document for handing off to future AI models (ChatGPT, Claude, etc.) so they can continue development without re-exploring the codebase from scratch.

---

## 1. Project Overview

ChallengeGrind is a **Geometry Dash challenge list website** (similar to demonlist/gdemonlist). It displays a ranked list of GD levels, their records, and a leaderboard of players — all built with **Vue 3** (Options API, no SFCs) and served as a **static site on GitHub Pages**.

- **No build step** — no Vite/Webpack/Babel. Plain ES module `<script type="module">`.
- **No bundler** — each `.js` file is a separate ES module loaded via `import`.
- **Vue 3.2.31** + **Vue Router 4.0.14** loaded from CDN (`unpkg.com`).
- **Font:** Lexend Deca (Google Fonts, loaded in `index.html`).
- **Theme:** Dark mode only (dark bg `#0f0f11`, card bg `#1b1b1e`, primary accent `#ff6b00` orange).
- **No package.json** — no npm/node tooling.

---

## 2. File Structure

```
/
├── index.html                     # App entry (Vue mounted on #app, hash router)
├── list_icon.png                  # Favicon
├── .nojekyll                      # GitHub Pages: disable Jekyll processing
│
├── data/                          # All JSON data (static, no API)
│   ├── _list.json                 # Array of level filename stems (strings)
│   ├── _editors.json              # Array of {role, name, link}
│   ├── _hardest.json              # (exists, not currently loaded by code)
│   ├── _user_countries.json       # Object {"nickname": "iso_country_code"} — FLAG FEATURE
│   └── {LevelName}.json           # Per-level data (18 levels)
│
├── js/
│   ├── main.js                    # Vue app init, reactive store, router mount
│   ├── routes.js                  # Route table: "/" → List, "/leaderboard" → Leaderboard
│   ├── content.js                 # Data fetchers (fetchList, fetchEditors, fetchLeaderboard, fetchUserCountries)
│   ├── score.js                   # Score calculation formula
│   ├── util.js                    # Helpers: embed(), getYoutubeIdFromUrl(), localize(), shuffle()
│   ├── pages/
│   │   ├── List.js                 # List page (levels list + level detail + rules sidebar)
│   │   ├── Leaderboard.js          # Leaderboard page (player list + player detail)
│   │   └── Roulette.js             # (exists, NOT registered in routes)
│   └── components/
│       ├── Spinner.js              # Simple loading spinner
│       ├── Btn.js                  # Generic button
│       └── List/
│           └── LevelAuthors.js     # Level author/verifier display component
│
├── css/
│   ├── reset.css                   # Minimal CSS reset
│   ├── typography.css              # Type scale classes
│   ├── main.css                    # Global styles, header, nav, mobile tabs, responsive
│   ├── pages/
│   │   ├── list.css                # List page styles + rules component + record flags
│   │   └── leaderboard.css         # Leaderboard styles + flag glass effect
│   └── components/
│       ├── nav.css
│       ├── btn.css
│       └── tabs.css
│
└── assets/                         # Static SVG icons (no build processing)
    ├── discord.svg
    ├── telegram.svg
    ├── phone-landscape.svg / phone-landscape-dark.svg
    ├── crown.svg / crown-dark.svg
    ├── user-gear.svg / user-gear-dark.svg
    ├── user-shield.svg / user-shield-dark.svg
    ├── user-lock.svg / user-lock-dark.svg
    ├── code.svg / code-dark.svg
    ├── leaderboard.svg
    ├── top.svg
    ├── dark.svg / light.svg
    └── ... (all served as /assets/filename.svg)
```

---

## 3. Architecture Details

### 3.1 Data Loading (`js/content.js`)

All data fetched from **local static JSON files** relative to site root. Base path: `./data`.

**Module-level caches** (in-memory, not persistent):
```js
let cachedList = null;
let cachedLeaderboard = null;
let cachedEditors = null;
let cachedUserCountries = null;
```

**Exported functions:**

| Function | Fetches | Returns |
|---|---|---|
| `fetchList(forceRefresh)` | `_list.json` + each `{name}.json` | `[[level, err], ...]` tuple array |
| `fetchEditors(forceRefresh)` | `_editors.json` | `[{role, name, link}, ...]` or `null` |
| `fetchLeaderboard(forceRefresh)` | derived from `fetchList()` | `[players[], errs[]]` tuple |
| `fetchUserCountries(forceRefresh)` | `_user_countries.json` | `{"nick": "code"}` or `null` |
| `clearCache()` | — | nulls all caches |

**Pattern to add a new data fetcher:** declare `let cachedX = null;`, add a `fetchX()` mirroring `fetchEditors()`, add `cachedX = null;` to `clearCache()`.

### 3.2 Level JSON Shape

```json
{
  "id": 141236697,
  "name": "Level Name",
  "author": "BuilderName",
  "creators": [],
  "verifier": "VerifierName",
  "verification": "https://youtube.com/...",
  "percentToQualify": 100,
  "password": "Not Copyable",
  "records": [
    {
      "user": "PlayerName",
      "link": "https://youtube.com/...",
      "percent": 100,
      "hz": 360,
      "mobile": true          // optional
    }
  ]
}
```

- `verification` can be a YouTube URL (embedded as iframe) or a Telegram link (`t.me/...`) (shown as clickable placeholder).
- `records` are sorted by `percent` descending in `fetchList()`.
- `user` is matched **case-insensitively** when building the leaderboard.

### 3.3 Leaderboard Player Object Shape (built by `fetchLeaderboard()`)

```json
{
  "user": "PlayerName",
  "total": 1234,
  "verified": [{"rank": 1, "level": "...", "score": 500, "link": "..."}],
  "completed": [{"rank": 1, "level": "...", "score": 500, "link": "..."}],
  "progressed": [{"rank": 1, "level": "...", "percent": 50, "score": 200, "link": "..."}]
}
```

- `total` = sum of all scores (verified + completed + progressed).
- `verified` is currently **commented out** in the scoring code (lines 102-118 of `content.js`).
- `score()` formula: `500 / rank^0.8 * progressMultiplier`, minus 33% for non-100% completions.
- Players sorted by `total` descending.

### 3.4 Store (`js/main.js`)

```js
export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    toggleDark() { ... }
});
```

- Only holds dark mode state. Accessible in any component via `import { store } from '../main.js'`.
- `store.dark` is used for dark/light SVG variants (e.g., `phone-landscape-dark.svg`).

### 3.5 Routing (`js/routes.js`)

- `"/"` → `List.js`
- `"/leaderboard"` → `Leaderboard.js`
- Hash-based history (`createWebHashHistory`)
- `Roulette.js` exists but is **NOT registered** in routes.

---

## 4. Page: List (`js/pages/List.js`)

### 4.1 Layout (3-column on desktop, single-column on mobile)

```
Desktop:
┌──────────┬───────────────────┬──────────┐
│ .list-   │ .level-container  │ .meta-   │
│ container│                   │ container│
│          │                   │          │
│ #1 Level │ Video / Plachka  │ Rules    │
│ #2 Level │ Points / ID      │ (tabs)   │
│ ...      │ Records           │          │
│          │                   │          │
└──────────┴───────────────────┴──────────┘
  320px       flex: 1             320px
```

### 4.2 Mobile Views

Three views toggled via `mobileView` state:
- `'list'` — shows `.list-container` only (list of levels + 📋 Правила button)
- `'level'` — shows `.level-container` only (level detail + Back button)
- `'rules'` — shows `.meta-container` only (rules tabs + Back button)

CSS classes on `.page-list`:
- `.mobile-list-view` — hides level + meta containers
- `.mobile-level-view` — hides list + meta containers
- `.mobile-rules-view` — hides list + level containers

`isMobile = window.innerWidth <= 768` (set on mount, updated on resize).

### 4.3 Component Data

```js
list: [],           // [[level, err], ...] from fetchList
editors: [],        // from fetchEditors
loading: true,
selected: 0,        // currently selected level index
errors: [],
mobileView: 'list', // 'list' | 'level' | 'rules'
isMobile: false,
savedScrollPosition: 0,
activeElements: new Set(),
activeRuleTab: 'general', // 'general' | 'submit' | 'record'
countryMap: {},     // lowercased {"nick": "country_code"}
```

### 4.4 Computed

- `level` → `this.list[this.selected][0]` (current level object)
- `video` → YouTube embed URL from `level.verification` (or empty for Telegram links)
- `currentRankDisplay` → `#N` or `Legacy` (if rank > 150)
- `currentRankLegacy` → boolean

### 4.5 Key Methods

- `selectLevel(i)` — selects level, switches to 'level' view on mobile, saves scroll
- `goBackToList()` — returns to list view on mobile, restores scroll
- `showRules()` — switches to 'rules' view on mobile
- `getPoints()` — calculates score for current rank/level
- `isTelegramLink(url)` — checks if URL is Telegram
- `copyId(id)` — copies level ID to clipboard with visual feedback
- `countryCode(user)` — case-insensitive lookup in `countryMap`
- `flagStyle(user)` — returns `{ '--flag-url': 'url(...)' }` or `{}`
- Touch handlers: `onTouchStart/End/Cancel`, `onContextMenu`, `resetAllHighlights`
- `handleResize()` — updates `isMobile`, adjusts `mobileView`

### 4.6 Rules Sidebar (`.meta-container`)

Three tabs controlled by `activeRuleTab`:
1. **general** — "Общие правила" (4 rules + callout "Все наказания индивидуальны!")
2. **submit** — "Как предложить уровень?" (intro + 8 level rules + P.S. note)
3. **record** — "Как отправить рекорд?" (intro with @mirpack19/@shadowstrafe + 2 record rules)

Tab bar: `.rules-tabs` > `.rules-tab` buttons with `active` class.
Panel: `.rules-panel` with `v-show`.
Styled: orange gradient active tab, `::marker` in primary color, callout with left border, P.S. note box.

---

## 5. Page: Leaderboard (`js/pages/Leaderboard.js`)

### 5.1 Layout (2-column on desktop)

```
Desktop:
┌──────────────┬──────────────────────┐
│ .board-      │ .player-container    │
│ container    │                      │
│              │ .player-profile-box  │
│ #1 Player    │ #N Name  XXX points  │
│ #2 Player    │                      │
│ ...          │ .hardest-badge       │
│              │ .player-completed-box│
│              │ Completed (N)         │
└──────────────┴──────────────────────┘
   24rem             flex: 1
```

### 5.2 Mobile Views

Two views:
- `'list'` — shows `.board-container` only
- `'player'` — shows `.player-container` only (with Back button)

CSS: `.mobile-list-view` hides player, `.mobile-player-view` hides board.

### 5.3 Component Data

```js
leaderboard: [],     // [player, ...] from fetchLeaderboard
loading: true,
selected: 0,
err: [],
mobileView: 'list',
isMobile: false,
savedScrollPosition: 0,
countryMap: {},       // lowercased {"nick": "country_code"}
```

### 5.4 Computed

- `entry` → `this.leaderboard[this.selected]` (current player object)

### 5.5 Key Methods

- `selectPlayer(i)` — selects player, mobile view switch
- `goBackToList()` — returns to list on mobile
- `getRankClass(i)` — 'gold' / 'silver' / 'bronze' / ''
- `cleanLevelName(name)` — trims whitespace
- `getHardestLevel(player)` — finds lowest-rank completed level
- `countryCode(user)` — case-insensitive country lookup
- `flagStyle(user)` — returns CSS custom property object or `{}`
- Touch handlers, pointer handlers, `handleResize()`

---

## 6. Country Flags Feature

### 6.1 Data File: `data/_user_countries.json`

Simple object mapping nicknames to ISO 3166-1 alpha-2 country codes (lowercase):
```json
{
    "mirpack19": "kz",
    "shadowstrafe": "us"
}
```

Add new entries as `"exact_nickname": "two_letter_code"`. Lookup is **case-insensitive** (both keys and values are lowercased when building `countryMap`).

### 6.2 How It Works

1. `fetchUserCountries()` loads the JSON file (cached like other data).
2. On mount, both `List.js` and `Leaderboard.js` build a `countryMap` (lowercased keys) from the raw data.
3. `countryCode(user)` → looks up `user.toLowerCase()` in `countryMap`, returns code or `null`.
4. `flagStyle(user)` → if code exists, returns `{ '--flag-url': "url('https://flagcdn.com/{code}.svg')" }`. Otherwise `{}` (no visual change).
5. Templates bind `:class="{ 'has-flag': countryCode(user) }"` + `:style="flagStyle(user)"` on the target elements.

### 6.3 Flag Locations (3 places)

| Location | Element | CSS Class | File |
|---|---|---|---|
| Leaderboard left list | player row | `.board-row.has-flag::before` | `leaderboard.css` |
| Leaderboard right detail | profile box | `.player-profile-box.has-flag::before` | `leaderboard.css` |
| List page records | record row | `.record-item.has-flag::before` | `list.css` |

### 6.4 Glass Effect CSS Pattern

```css
.target-element {
    position: relative;
    overflow: hidden;  /* clips flag to border-radius */
}

.target-element.has-flag::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: var(--flag-url, none);
    background-size: cover;
    background-position: center;
    opacity: 0.4;                    /* semi-transparent */
    filter: blur(2px) saturate(1.05); /* glass shader */
    pointer-events: none;
    z-index: 0;
}

.target-element.has-flag > * {
    position: relative;
    z-index: 1;                    /* text above flag */
}

.target-element.has-flag .user-name-class {
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.65); /* legibility */
}
```

Special case: `.board-row.active.has-flag::before { opacity: 0.15; }` — keeps orange gradient dominant when row is selected.

### 6.5 Flags Source

Flags are loaded from **flagcdn.com** (external CDN, no local files):
- URL pattern: `https://flagcdn.com/{code}.svg`
- Standard ISO 3166-1 alpha-2 codes in lowercase (e.g., `ru`, `us`, `kz`, `de`, `ua`).

---

## 7. CSS Design System

### 7.1 CSS Variables (`css/main.css`)

```css
:root {
    --color-background: #1b1b1e;
    --color-on-background: #ffffff;
    --color-background-hover: #26262a;
    --color-primary: #ff6b00;
    --color-on-primary: #ffffff;
    --color-error: #de0000;
    --color-on-error: #ffffff;
    --gradient-primary: linear-gradient(135deg, #ff8c00 0%, #ff5100 100%);
}
```

### 7.2 Responsive Breakpoints

Two breakpoints used consistently across all CSS files:
- **768px** — tablet/mobile threshold (matches JS `isMobile` check)
- **480px** — small phone

### 7.3 Key Patterns

- **Hover handling:** Uses `@media (hover: hover)` and `@media (hover: none)` media queries to differentiate desktop hover from mobile tap.
- **Touch safety:** `!important` on `-webkit-tap-highlight-color: transparent`, `user-select: none`, `outline: none`.
- **Scrollbar hidden:** Both `*::-webkit-scrollbar { width: 0; }` and `* { scrollbar-width: none; }`.
- **Mobile active state:** `.btn-active` class added on touchstart/pointerdown, removed on touchend/pointerup. Styled with `!important` overrides.
- **Assets:** Referenced as `/assets/filename.svg`. Dark variants: `filename-dark.svg`.

### 7.4 Level Page Specific Classes

| Class | Purpose |
|---|---|
| `.page-list` | Root flex container |
| `.list-container` | Left sidebar (320px) — level list |
| `.level-container` | Center — level detail |
| `.meta-container` | Right sidebar (320px) — rules |
| `.level-row` | Individual level in the list |
| `.record-item` | Individual record in level detail |
| `.rules-tabs` / `.rules-tab` | Rules tab bar |
| `.rules-panel` | Rules content panel |
| `.mobile-rules-btn` | "📋 Правила" button (mobile only) |

### 7.5 Leaderboard Specific Classes

| Class | Purpose |
|---|---|
| `.page-leaderboard-container` | Root grid container (24rem 1fr) |
| `.board-container` | Left panel — player list |
| `.board-row` | Individual player row |
| `.player-container` | Right panel — player detail |
| `.player-profile-box` | Big profile frame (rank + name + points) |
| `.hardest-badge` | 🔥 hardest level badge |
| `.player-completed-box` | Completed levels table |

---

## 8. Important Conventions

1. **No TypeScript** — all vanilla JS ES modules.
2. **Vue Options API** — `export default { data, computed, methods, mounted, beforeUnmount, template }`.
3. **Templates as template literals** in `.js` files (not `.vue` SFCs).
4. **Inline styles for dynamic values** — e.g., `:style="flagStyle(user)"` sets CSS custom properties.
5. **`localStorage`** used for: `dark` mode preference.
6. **Console logs** present throughout with emoji prefixes (📦 cache, 🔄 fetch, 🗑️ clear).
7. **Level names** can contain tabs — always cleaned with `.replace(/\t/g, ' ').trim()`.
8. **Player matching** is case-insensitive — always use `.toLowerCase()` for lookups.
9. **Error handling** — fetchers return `null` on failure; pages show error messages in UI.
10. **No tests** — no test framework configured.

---

## 9. External Dependencies (CDN)

| Library | Version | Source |
|---|---|---|
| Vue 3 | 3.2.31 | `unpkg.com/vue@3.2.31/dist/vue.global.js` |
| Vue Router | 4.0.14 | `unpkg.com/vue-router@4.0.14/dist/vue-router.global.prod.js` |
| Lexend Deca | — | Google Fonts (loaded in `index.html`) |
| Flag SVGs | — | `flagcdn.com/{code}.svg` (per-user country flag images) |

---

## 10. Deployment

- **GitHub Pages** (`.nojekyll` present to disable Jekyll).
- **Static site** — just push files; GitHub Pages serves them.
- All paths are **relative** (`./data/...`) so they work on any GitHub Pages URL.
- SVG assets referenced with absolute `/assets/` prefix.
