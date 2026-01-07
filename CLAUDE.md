# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ColorBox is a Progressive Web App (PWA) that generates kid-friendly coloring pages from voice or text input. It's inspired by the StickerBox hardware device, but implemented as a web application for Android/web.

**Key concept**: Children press-and-hold a button, describe what they want to color (e.g., "un chat astronaute"), and receive a black-and-white coloring page they can print or share.

## Architecture

### Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework, no build step)
- **Speech Recognition**: Web Speech API (browser-native, French language)
- **Image Generation**: Pollinations AI (free, no API key required)
- **Storage**: localStorage for history (last 20 drawings)
- **PWA**: Service Worker + manifest.json for offline capability

### File Structure
```
/
├── index.html          # Complete app: HTML + CSS + JS (841 lines, single file)
├── manifest.json       # PWA configuration
├── sw.js              # Service Worker (caches static assets only)
├── icon-192.png       # PWA icon
├── icon-512.png       # PWA icon
└── README.md          # User documentation (French)
```

**Critical**: All application logic lives in `index.html` - there are no separate JS/CSS files.

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
2. Web Speech API (`recognition.start()`) listens in French (`fr-FR`)
3. Interim transcripts shown in real-time
4. On final transcript → `handleVoiceInput(transcript)`
5. Content filter applied → `isKidFriendly()` + `sanitizePrompt()`
6. If safe → generate image

### Content Filtering (Kid-Friendly)
Two-layer approach:
1. **Blocked words**: Hard block on explicit/violent/inappropriate terms (index.html:527-535)
2. **Sanitization**: Replace borderline words (e.g., "zombie" → "fantôme rigolo") (index.html:547-559)

If blocked content detected → show toast "Hmm, essaie un autre dessin ! 🙈" and return to idle.

### Image Generation
```javascript
// Prompt engineering (index.html:563)
const coloringPrompt = `coloring book page, ${userPrompt}, black and white line art,
  simple clean lines, cute kawaii style for children, no shading, white background, easy to color`;

// API call (Pollinations AI)
const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${Date.now()}`;
```

**API characteristics**:
- Free, no authentication
- CORS-friendly
- Variable response time (10-60 seconds)
- Non-deterministic quality
- Seed parameter ensures different results for same prompt

**Critical implementation detail**: Images are fetched as blobs, converted to base64 data URLs, then stored in localStorage. This avoids CORS issues with the Web Share API and allows offline viewing.

### History Management
- Max 20 items stored in `localStorage.colorbox_history`
- Each item: `{id, image (base64), prompt, date}`
- Clicking history item restores it to result view
- Images stored as data URLs to enable offline access

### Share/Print Flow
1. Share button calls `shareImage()`
2. Attempts Web Share API (Android native share sheet)
3. Falls back to `printImage()` if share unavailable
4. Print creates temporary window with just the image + auto-print script

**Technical note on `printImage()`**: Uses string concatenation `'<scr' + 'ipt>'` to prevent the HTML parser from interpreting the closing script tag (index.html ~750).

## Service Worker Strategy

**Caches**: Static assets only (`index.html`, `manifest.json`, icons)
**Does NOT cache**: Generated images (too large, would fill cache)
**Offline behavior**: App shell loads, but image generation requires network

### ⚠️ CRITICAL: Cache Version Management

**ALWAYS increment the `CACHE_NAME` version in `sw.js` when making ANY changes to:**
- `index.html` (HTML/CSS/JavaScript)
- `manifest.json`
- Icons or other static assets

**Current version format**: `colorbox-vX` (e.g., `colorbox-v8`)

**Why this is critical**:
- PWA users (especially on mobile) will continue seeing the old cached version
- The Service Worker won't update cached files unless `CACHE_NAME` changes
- Users may need to force refresh or reinstall the PWA otherwise

**Example**:
```javascript
// Before making changes
const CACHE_NAME = 'colorbox-v8';

// After making ANY modification to index.html or other assets
const CACHE_NAME = 'colorbox-v9';  // ← ALWAYS increment!
```

**Deployment workflow**:
1. Make your code changes to `index.html` or other files
2. Increment `CACHE_NAME` in `sw.js` (v7 → v8, v8 → v9, etc.)
3. Commit both changes together
4. Deploy to production

This ensures mobile users automatically receive the updated version when they next open the app.

## Modifying the Application

### Changing Image Generation API
Replace `generateImage()` function (index.html:562-581). Alternative APIs:
- Perchance: `https://image.perchance.org/api/generate`
- Stable Horde: Community API with queuing

### Adjusting Prompt Style
Edit the prompt template (index.html:563):
- Change `cute kawaii style` → `cartoon style` or `disney style`
- Add `for toddlers` for simpler drawings
- Modify `black and white line art` constraints

### Updating Content Filter
- Add blocked words to `blockedWords` array (index.html:527-535)
- Add sanitization rules to `replacements` object (index.html:549-554)

### Changing History Limit
Modify the slice limit in `saveToHistory()` (index.html:674):
```javascript
if (state.history.length > 20) {  // Change 20 to desired limit
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
- To change language:
  1. Update `recognition.lang` (index.html:495)
  2. Update all UI strings in HTML
  3. Update `blockedWords` for target language

## Important Constraints

1. **No npm/build tools**: This is intentional to keep deployment simple. Don't introduce dependencies.
2. **Single file architecture**: Keep all logic in `index.html` unless there's a compelling reason to split.
3. **Mobile-first**: All touch interactions use `touchstart`/`touchend`, not just `click`.
4. **Offline-capable shell**: Service Worker must cache app shell, but not user-generated content.
5. **Kid-safe by design**: Content filter is the primary safety mechanism - don't bypass it.

## Testing Checklist

When making changes, verify:
- [ ] Voice recording works (requires HTTPS/localhost)
- [ ] Text input alternative still functional
- [ ] Content filter blocks inappropriate words
- [ ] Images save to history (check localStorage)
- [ ] Share/print works on Android
- [ ] PWA installs correctly
- [ ] Offline: app loads but shows appropriate error for generation
- [ ] Service Worker updates on deployment (bump `CACHE_NAME` in sw.js)
