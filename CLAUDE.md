# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ColorBox is a Progressive Web App (PWA) that generates kid-friendly coloring pages from voice or text input. It's inspired by the StickerBox hardware device, but implemented as a web application for Android/web.

**Key concept**: Children press-and-hold a button, describe what they want to color (e.g., "un chat astronaute"), and receive a black-and-white coloring page they can print or share.

## Architecture

### Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework, no build step)
- **Speech Recognition**: Web Speech API (browser-native, French language)
- **Image Generation**: Cloudflare Worker with FLUX-1 Schnell model (`colorbox-image-api.greffe-b.workers.dev`)
- **Translation**: MyMemory API (French → English for image prompts)
- **Prompt Enhancement**: Llama 3.1 8B on Cloudflare Worker (`/enrich` endpoint)
- **Storage**: localStorage for history (last 20 drawings)
- **PWA**: Service Worker + manifest.json for offline capability

### File Structure
```
colorbox/
├── index.html          # Complete app: HTML + CSS + JS (~1162 lines, single file)
├── manifest.json       # PWA configuration
├── sw.js              # Service Worker (caches static assets only)
├── worker.js          # Cloudflare Worker source (for image generation API)
├── icon-192.png       # PWA icon
├── icon-512.png       # PWA icon (high-res)
├── README.md          # Developer documentation (English)
├── CLAUDE.md          # This file - Claude Code guide
└── .gitignore         # Git exclusions
```

**Critical**: All application logic lives in `index.html` - there are no separate JS/CSS files. The `worker.js` is deployed separately to Cloudflare Workers.

## Development Commands

### Running Locally
```bash
# Start local server (required for PWA features and microphone access)
python3 -m http.server 8080

# Access at http://localhost:8080
```

**Important**: HTTPS or localhost is required for:
- Microphone access (Web Speech API)
- PWA installation
- Service Worker registration

### Testing PWA Installation (Android)
1. Deploy to any HTTPS host (Netlify Drop, GitHub Pages, Vercel)
2. Open in Chrome Android
3. Menu (⋮) → "Ajouter à l'écran d'accueil"

### Deployment
```bash
# Netlify Drop: https://app.netlify.com/drop (drag & drop folder)
# GitHub Pages: Push repo → Settings > Pages
# Vercel: npx vercel
```

No build step required - deploy the files as-is.

## Application States

The app uses a state machine with 5 distinct UI states:

| State | Trigger | Display |
|-------|---------|---------|
| `idle` | Initial / after error | 🎨 icon + instructions |
| `recording` | Button held down | Animated 🎤 + transcript preview |
| `generating` | Voice/text submitted | User's text + loading spinner |
| `result` | Image loaded | Generated image + caption |
| `error` | Generation failed | Error message + retry button |

**State transitions** are managed via `setState(stateName)` which toggles `.active` class on state containers.

## Core Functionality

### Voice Recognition Flow
1. User holds push-to-talk button → `startRecording()`
2. Web Speech API (`recognition.start()`) listens in French (`fr-FR`) with `continuous: true`
3. Interim transcripts accumulate in `pendingTranscript` and display in real-time
4. User releases button → `stopRecording()` submits `pendingTranscript`
5. Content filter applied → `isKidFriendly()` checks for blocked words
6. If safe → `generateImage()` translates to English and generates image

### Content Filtering (Kid-Friendly)
Single-layer approach:
- **Blocked words**: Hard block on explicit/violent/inappropriate terms (index.html:718-725)
- Categories: nudity, violence, drugs, weapons, horror

If blocked content detected → show toast "Hmm, essaie un autre dessin ! 🙈" and return to idle.

### Image Generation
The image generation pipeline has multiple stages (index.html:815-876):

1. **Translation**: French prompt → English via MyMemory API (`translateToEnglish()`)
2. **Enrichment**: LLM enhances the prompt via `/enrich` endpoint (`enrichPrompt()`)
3. **Generation**: FLUX-1 model via Cloudflare Worker

```javascript
// Worker URL
const WORKER_URL = 'https://colorbox-image-api.greffe-b.workers.dev/';

// FLUX-1 coloring book prompt template
const coloringPrompt = `
A high-quality children's coloring book illustration:
${enrichedPrompt}
Clean, bold black outlines only.
Solid white background behind all elements.
No color, no grayscale, no gradients, no shading, no textures, no shadows.
...
`;

// Includes negative prompt for better results
const negativePrompt = `color, grayscale, gray, gradient, shading, shadow...`;
```

**API characteristics**:
- Cloudflare Worker proxies to FLUX-1 model
- POST request with JSON body (`prompt`, `negative_prompt`, `steps`)
- Returns image blob directly
- 6 inference steps for speed

**Critical implementation detail**: Images are returned as blobs, converted to base64 data URLs, then stored in localStorage. This allows offline viewing and Web Share API compatibility.

### History Management
- Max 20 items stored in `localStorage.colorbox_history`
- Each item: `{id, image (base64), prompt, date}`
- History modal displays last 6 items in a grid
- Clicking history item restores it to result view
- Images stored as data URLs to enable offline access
- Storage quota error handling: reduces to 10 items if quota exceeded

### Share/Print Flow
1. Export button (renamed from "share" to avoid AdBlock) calls `shareImage()`
2. Attempts Web Share API (Android native share sheet)
3. Falls back to `printImage()` if share unavailable
4. Print creates temporary window with just the image + auto-print script

**Technical note on `printImage()`**: Uses string concatenation `'<scr' + 'ipt>'` to prevent the HTML parser from interpreting the closing script tag (index.html:1184-1189).

**Note**: The share button uses class `export-btn` instead of `share-btn` to avoid being blocked by ad blockers.

## Service Worker Strategy

**Caches**: Static assets only (`index.html`, `manifest.json`, icons)
**Does NOT cache**: Generated images (too large, would fill cache)
**Offline behavior**: App shell loads, but image generation requires network

### ⚠️ CRITICAL: Cache Version Management

**ALWAYS increment the `CACHE_NAME` version in `sw.js` when making ANY changes to:**
- `index.html` (HTML/CSS/JavaScript)
- `manifest.json`
- Icons or other static assets

**Current version format**: `vX` (currently `v15`)

**Why this is critical**:
- PWA users (especially on mobile) will continue seeing the old cached version
- The Service Worker won't update cached files unless `CACHE_NAME` changes
- Users may need to force refresh or reinstall the PWA otherwise

**Example**:
```javascript
// Before making changes
const CACHE_NAME = 'v15';

// After making ANY modification to index.html or other assets
const CACHE_NAME = 'v16';  // ← ALWAYS increment!
```

**Deployment workflow**:
1. Make your code changes to `index.html` or other files
2. Increment `CACHE_NAME` in `sw.js` (v15 → v16, v16 → v17, etc.)
3. Update the `.version-indicator` text in `index.html` to match (e.g., `<div class="version-indicator">v16</div>`)
4. Commit all changes together
5. Deploy to production

This ensures mobile users automatically receive the updated version when they next open the app.

## Modifying the Application

### Changing Image Generation API
The image generation uses a Cloudflare Worker (`worker.js`). To modify:
1. Edit `worker.js` to change the model or API
2. Deploy to Cloudflare Workers
3. Update `WORKER_URL` in `index.html` (line 738)

### Adjusting Prompt Style
Edit the prompt templates in `generateImage()` (index.html:820-841):
- Modify `coloringPrompt` for different styles
- Adjust `negativePrompt` to exclude unwanted elements
- Change `steps` parameter (currently 6) for quality vs speed tradeoff

### Updating Content Filter
- Add blocked words to `blockedWords` array (index.html:718-725)

### Changing History Limit
Modify the slice limit in `saveToHistory()` (index.html:1098-1099):
```javascript
if (state.history.length > 20) {  // Change 20 to desired limit
```

### Modifying History Modal Display
The modal shows only 6 recent items. Change in `renderHistoryGrid()` (index.html:1208):
```javascript
const recentHistory = state.history.slice(0, 6);  // Change 6 to show more/fewer
```

## Browser Compatibility Notes

**Web Speech API**:
- ✅ Chrome/Edge (Android & Desktop)
- ❌ Firefox (inconsistent support)
- ❌ Safari iOS (no support)

**PWA Installation**:
- ✅ Chrome Android (full support)
- ⚠️ Safari iOS (limited, requires manual "Add to Home Screen")

## Language & Localization

**Current language**: French (fr-FR)
- All UI text is in French
- Voice recognition set to `fr-FR`
- French prompts are automatically translated to English before image generation
- To change language:
  1. Update `recognition.lang` (index.html:655)
  2. Update all UI strings in HTML
  3. Update `blockedWords` for target language
  4. Modify `translateToEnglish()` if not using French as source

## Important Constraints

1. **No npm/build tools**: This is intentional to keep deployment simple. Don't introduce dependencies.
2. **Single file architecture**: Keep all logic in `index.html` unless there's a compelling reason to split.
3. **Mobile-first**: All touch interactions use `touchstart`/`touchend`, not just `click`.
4. **Offline-capable shell**: Service Worker must cache app shell, but not user-generated content.
5. **Kid-safe by design**: Content filter is the primary safety mechanism - don't bypass it.
6. **Cloudflare Worker dependency**: Image generation requires the deployed worker at `colorbox-image-api.greffe-b.workers.dev`.

## Testing Checklist

When making changes, verify:
- [ ] Voice recording works (requires HTTPS/localhost)
- [ ] Push-to-talk: transcript submits on button release
- [ ] Content filter blocks inappropriate words
- [ ] Images save to history (check localStorage)
- [ ] History modal shows recent drawings
- [ ] Share/print works on Android
- [ ] PWA installs correctly
- [ ] Offline: app loads but shows appropriate error for generation
- [ ] Service Worker updates on deployment (bump `CACHE_NAME` in sw.js)
