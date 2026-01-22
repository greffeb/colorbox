# ColorBox

A Progressive Web App (PWA) that generates kid-friendly coloring pages from voice input using AI. Built with vanilla JavaScript and the FLUX-1 model.

## Features

- **Voice-driven interface**: Push-to-talk with Web Speech API (French)
- **AI image generation**: Cloudflare Worker + FLUX-1 Schnell model
- **Smart prompt enrichment**: Llama 3.1 8B refines user input
- **Kid-friendly filtering**: Content safety layer blocks inappropriate requests
- **PWA capabilities**: Install on Android, works offline (app shell only)
- **Zero-build architecture**: Single HTML file, no npm, no bundlers

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (~1162 lines, single file)
- **Speech Recognition**: Web Speech API (browser-native, fr-FR)
- **Image Generation**: FLUX-1 Schnell via Cloudflare Workers AI
- **Prompt Enhancement**: Llama 3.1 8B (Cloudflare Workers AI)
- **Translation**: MyMemory API (French → English)
- **Storage**: localStorage (last 20 drawings, base64 encoded)
- **PWA**: Service Worker for offline app shell

## Quick Start

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/greffeb/colorbox.git
cd colorbox
```

2. Start a local server (required for microphone access and PWA features):
```bash
python3 -m http.server 8080
```

3. Open http://localhost:8080 in Chrome or Edge

> **Note**: HTTPS or localhost is required for microphone access, PWA installation, and Service Worker registration.

### Deployment

The app has no build step - deploy the files as-is to any static host:

- **GitHub Pages**: Push repo → Settings > Pages
- **Netlify**: Drag & drop folder to [Netlify Drop](https://app.netlify.com/drop)
- **Vercel**: `npx vercel`

### Cloudflare Worker Deployment

The image generation API (`worker.js`) must be deployed separately to Cloudflare Workers:

1. Install Wrangler CLI: `npm install -g wrangler`
2. Authenticate: `wrangler login`
3. Deploy: `wrangler deploy worker.js`
4. Update `WORKER_URL` in `index.html` with your Worker URL

> Requires Cloudflare Workers AI access and appropriate API keys configured in Worker environment.

## Architecture

### Application Flow

1. User holds button → Web Speech API transcribes (French)
2. Content filter checks for inappropriate words
3. French prompt → English (MyMemory API)
4. English prompt → Enriched prompt (Llama 3.1 8B)
5. Enriched prompt → Coloring page image (FLUX-1 Schnell)
6. Image saved to localStorage as base64 data URL
7. User can share (Web Share API) or print

### State Machine

The app uses 5 UI states:
- `idle`: Initial state, awaiting user input
- `recording`: Microphone active, transcribing
- `generating`: API requests in progress
- `result`: Image displayed
- `error`: Generation failed, retry available

### Content Safety

Single-layer filtering with 27 blocked French terms:
- Categories: nudity, violence, drugs, weapons, horror
- Checked before API calls
- Triggers friendly error message if detected

### Service Worker Strategy

- **Cached**: `index.html`, `manifest.json`, icons
- **Not cached**: Generated images (too large)

## Development Guidelines

### Making Changes to index.html

1. Make your code changes
2. Increment `CACHE_NAME` in `sw.js` (e.g., v15 → v16)
3. Update version indicator in `index.html` (`.version-indicator` div)
4. Test locally with `python3 -m http.server 8080`
5. Deploy both files together

> Without incrementing the cache version, PWA users will continue seeing the old version.

### Modifying the Image Generation

Edit `generateImage()` in [index.html:820-841](index.html#L820-L841):
- Adjust `coloringPrompt` template for style changes
- Modify `negativePrompt` to exclude unwanted elements
- Change `steps` parameter (default: 6) for quality/speed tradeoff

### Adjusting Content Filter

Add/remove words in `blockedWords` array ([index.html:718-725](index.html#L718-L725)).

### Changing History Limit

Default: 20 items. Modify in `saveToHistory()` around [line 1098](index.html#L1098):
```javascript
if (state.history.length > 20) {  // Change limit here
```

## Browser Compatibility

| Feature | Chrome/Edge | Firefox | Safari iOS |
|---------|-------------|---------|------------|
| Web Speech API | ✅ Full | ⚠️ Inconsistent | ❌ No support |
| PWA Installation | ✅ Full | ⚠️ Limited | ⚠️ Manual only |
| Service Worker | ✅ | ✅ | ✅ |
| Web Share API | ✅ (Android) | ❌ | ✅ (iOS) |

**Recommended**: Chrome on Android for full feature support.

## File Structure

```
colorbox/
├── index.html          # Complete application (HTML + CSS + JS)
├── manifest.json       # PWA configuration
├── sw.js              # Service Worker (cache management)
├── worker.js          # Cloudflare Worker source (deployed separately)
├── icon-192.png       # PWA icon
├── icon-512.png       # PWA icon (high-res)
├── README.md          # This file (developer documentation)
├── CLAUDE.md          # Detailed guide for Claude Code
└── .gitignore         # Git exclusions
```

## API Dependencies

### Required External Services

1. **Cloudflare Workers AI**
   - FLUX-1 Schnell model for image generation
   - Llama 3.1 8B for prompt enrichment
   - Requires Worker deployment with AI binding

2. **MyMemory Translation API**
   - Free tier (no API key required)
   - Used for French → English translation
   - Endpoint: `https://api.mymemory.translated.net/get`

### API Characteristics

**Image Generation**:
- Model: FLUX-1 Schnell
- Steps: 6 (optimized for speed)
- Output: PNG blob (512x512px)
- Prompt template: Optimized for coloring book style

**Prompt Enrichment**:
- Model: Llama 3.1 8B
- Rules: No color words, no textures, max 1 sentence
- Language: English output only

## Testing

When making changes, verify:
- [ ] Voice recording works in Chrome/Edge
- [ ] Push-to-talk submits transcript on button release
- [ ] Content filter blocks test inappropriate words
- [ ] Images generate successfully
- [ ] Images save to localStorage
- [ ] History modal displays recent items
- [ ] Share/print functionality works
- [ ] PWA installs on Android device
- [ ] Service Worker updates correctly (increment CACHE_NAME!)
- [ ] Offline: App shell loads but shows network error for generation

## Known Limitations

1. **Voice recognition**: French only (`fr-FR`), Chrome/Edge required
2. **Browser support**: Best experience on Chrome Android
3. **Offline generation**: Not possible (requires API calls)
4. **Storage limits**: localStorage quota (~5-10MB), stores ~20-50 images
5. **API dependency**: Requires deployed Cloudflare Worker with AI access

## License

MIT License - See LICENSE file for details.

## Contributing

See [CLAUDE.md](CLAUDE.md) for detailed technical documentation and development guidelines.
