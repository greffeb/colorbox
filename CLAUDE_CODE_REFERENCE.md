# ColorBox - Documentation de référence pour Claude Code

## Vue d'ensemble du projet

ColorBox est une PWA qui reproduit le concept de la [StickerBox](https://stickerbox.com/products/stickerbox) : génération de coloriages pour enfants via commande vocale ou saisie texte.

### Concept original (StickerBox hardware)
- Boîtier physique avec bouton push-to-talk
- Écran affichant le texte dicté
- Imprimante thermique pour imprimer le dessin
- IA générative créant des coloriages noir et blanc

### Notre implémentation (PWA Android/Web)
- Application web progressive installable
- Reconnaissance vocale via Web Speech API
- Saisie texte en alternative
- Génération d'images via Pollinations AI (gratuit)
- Export vers imprimante Android ou app Brother iPrint&Scan

---

## Architecture technique

### Stack
- **Frontend** : HTML/CSS/JS vanilla (single file)
- **Speech-to-text** : Web Speech API native
- **Génération d'images** : Pollinations AI (https://image.pollinations.ai)
- **PWA** : Service Worker + manifest.json
- **Stockage** : localStorage pour l'historique

### Structure des fichiers
```
colorbox/
├── index.html      # App complète (HTML + CSS + JS inline)
├── manifest.json   # Configuration PWA
├── sw.js           # Service Worker (cache offline)
├── icon-192.png    # Icône PWA
├── icon-512.png    # Icône PWA grande
└── README.md       # Instructions utilisateur
```

---

## Fonctionnalités actuelles (v1)

### ✅ Implémenté
1. **Interface utilisateur**
   - Header avec boutons historique (📚) et partage (📤)
   - Zone d'affichage centrale avec 5 états (idle, recording, generating, result, error)
   - Champ de saisie texte
   - Bouton push-to-talk

2. **Reconnaissance vocale**
   - Web Speech API en français (fr-FR)
   - Mode push-to-talk (maintenir appuyé)

3. **Génération d'images**
   - API Pollinations AI
   - Prompt engineeré pour style coloriage enfant
   - Filtre kid-friendly (mots bloqués)

4. **Historique**
   - Sauvegarde des 20 derniers dessins en localStorage
   - Panel latéral avec grille de miniatures

5. **Partage/Impression**
   - Web Share API (Android)
   - Fallback vers window.print()

### 🚧 À améliorer / implémenter
- [ ] Tests sur Android réel
- [ ] Amélioration du prompt pour meilleurs résultats coloriages
- [ ] Gestion des timeouts API (actuellement ~30s max)
- [ ] Mode hors-ligne avec message approprié
- [ ] Feedback sonore/vibration
- [ ] Option de taille d'image
- [ ] Bouton de suppression dans l'historique

---

## API de génération d'images

### Pollinations AI (actuel)
```
URL: https://image.pollinations.ai/prompt/{PROMPT}?width=512&height=512&nologo=true&seed={TIMESTAMP}
```

**Avantages** : Gratuit, pas de clé API, CORS friendly
**Inconvénients** : Temps de génération variable (10-60s), qualité variable

### Prompt engineering actuel
```javascript
const coloringPrompt = `coloring book page, ${userPrompt}, black and white line art, simple clean lines, cute kawaii style for children, no shading, white background, easy to color`;
```

### Alternatives envisageables
- **Perchance** : `https://image.perchance.org/api/generate?prompt=...`
  - Nécessite negative_prompt pour éviter NSFW
- **Stable Horde** : API communautaire gratuite, file d'attente

---

## Filtre de contenu kid-friendly

### Mots bloqués (liste actuelle)
```javascript
const blockedWords = [
    'nu', 'nue', 'nus', 'nues', 'sexy', 'sex', 'sexe', 'porn', 'porno',
    'bite', 'queue', 'nichon', 'cul', 'fesse', 'sein', 'poitrine',
    'violence', 'violent', 'sang', 'mort', 'tuer', 'meurtre', 'cadavre',
    'drogue', 'alcool', 'cigarette', 'fumer', 'boire',
    'arme', 'fusil', 'pistolet', 'couteau', 'épée', 'guerre',
    'horreur', 'terrifiant', 'cauchemar', 'monstre effrayant',
    'diable', 'démon', 'enfer', 'satan'
];
```

### Sanitization
```javascript
const replacements = {
    'zombie': 'fantôme rigolo',
    'squelette': 'fantôme',
    'vampire': 'chauve-souris mignonne',
    'loup-garou': 'loup',
};
```

---

## États de l'application

| État | Affichage | Déclencheur |
|------|-----------|-------------|
| `idle` | Icône 🎨 + instruction | Initial, après erreur |
| `recording` | Micro animé 🎤 | Bouton maintenu appuyé |
| `generating` | Texte + spinner | Après transcription/saisie |
| `result` | Image + légende | Image chargée |
| `error` | Message + bouton retry | Échec génération |

---

## Tests et déploiement

### Test local
```bash
cd colorbox
python3 -m http.server 8080
# Ouvrir http://localhost:8080
```

### Déploiement recommandé
1. **Netlify Drop** : https://app.netlify.com/drop (glisser-déposer)
2. **GitHub Pages** : Push + Settings > Pages
3. **Vercel** : `npx vercel`

### Installation PWA sur Android
1. Ouvrir l'URL dans Chrome
2. Menu (⋮) > "Ajouter à l'écran d'accueil"

---

## Points d'attention pour le développement

### CORS et images externes
- Les images Pollinations sont servies avec les bons headers CORS
- Le fetch + blob + dataURL fonctionne correctement en PWA
- Les artifacts Claude ne supportent PAS les images externes (sandbox)

### Échappement du `</script>` dans printImage()
Le code utilise une concaténation pour éviter que le parser HTML interprète `</script>` :
```javascript
'<scr' + 'ipt>window.onload=function(){window.print();}<\/scr' + 'ipt>'
```

### Service Worker
- Cache les assets statiques uniquement
- Ne cache PAS les images générées (trop volumineuses)
- Les images sont stockées en base64 dans localStorage

---

## Commandes utiles

```bash
# Serveur de dev local
python3 -m http.server 8080

# Créer une archive
zip -r colorbox.zip index.html manifest.json sw.js icon-*.png README.md

# Générer des icônes (nécessite Pillow)
python3 -c "from PIL import Image, ImageDraw; ..."
```

---

## Ressources

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Pollinations AI](https://pollinations.ai/)
- [PWA Guide](https://web.dev/progressive-web-apps/)
- [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API)

---

## Historique des versions

### v1.0 (actuelle)
- Interface de base fonctionnelle
- Reconnaissance vocale + saisie texte
- Génération via Pollinations AI
- Historique local
- Partage/impression
