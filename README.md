# ColorBox - Générateur de Coloriages par la Voix 🎨

Une PWA qui reproduit le concept de la StickerBox : génération de coloriages pour enfants via commande vocale.

## Fonctionnalités

- **Push-to-talk** : Maintiens le bouton et décris ton dessin
- **Reconnaissance vocale** : Utilise l'API Web Speech (native au navigateur)
- **Génération d'images** : Via Perchance API (gratuit, sans clé)
- **Filtre kid-friendly** : Bloque les contenus inappropriés
- **Historique** : Sauvegarde les 20 derniers dessins
- **Partage/Impression** : Via Web Share API ou impression directe

## Installation sur Android

Pour que le microphone fonctionne, le site doit être sécurisé (HTTPS) ou être considéré comme "localhost".

### Option 1 : Test local via USB (Recommandé)
Cette méthode permet d'utiliser le micro sans déployer le site.

1.  Sur ton PC : Lance le serveur (`python3 -m http.server 8000`).
2.  Connecte ton téléphone au PC via USB.
3.  Active le **Débogage USB** sur le téléphone (dans les Options développeur).
4.  Sur Chrome PC : Ouvre `chrome://inspect/#devices`.
5.  Coche "Port forwarding" et clique sur "Configure...".
6.  Ajoute : Port `8000`, IP `localhost:8000`.
7.  Sur Chrome Android : Ouvre `http://localhost:8000`.
    *   Le site croira qu'il est sur le téléphone, et le micro fonctionnera !

### Option 2 : Déploiement (Le plus simple pour usage réel)
Pour une installation permanente sans câbles.

1.  **GitHub Pages** :
    *   Push le dossier sur GitHub.
    *   Settings > Pages > Deploy from branch.
2.  **Vercel / Netlify** :
    *   Glisse le dossier sur leur interface d'upload.

### Installation PWA
Une fois l'app ouverte dans Chrome Android :
1.  Un bandeau "Ajouter à l'écran d'accueil" peut apparaître.
2.  Sinon : Menu (⋮) > "Ajouter à l'écran d'accueil" ou "Installer l'application".
3.  L'app apparaîtra avec son icône dans tes applications.

## Utilisation

1. Appuie et maintiens le gros bouton 🎤
2. Décris ton dessin ("un chat astronaute", "un dinosaure qui fait du vélo")
3. Relâche le bouton
4. Attends la génération (~10-30 secondes)
5. Partage ou imprime via le bouton 📤

## API d'images alternatives

Si Perchance ne fonctionne pas bien, voici des alternatives :

### Pollinations AI (gratuit, sans clé)
```javascript
const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`;
```

### Modifiction dans index.html

Remplace la fonction `generateImage()` :

```javascript
async function generateImage(prompt) {
    const coloringPrompt = `coloring book page, ${prompt}, black and white line art, simple clean lines, cute kawaii style for children, no shading, white background`;
    const encodedPrompt = encodeURIComponent(coloringPrompt);
    
    // Pollinations AI (alternative)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true`;
    
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Image generation failed');
    
    const blob = await response.blob();
    return await blobToDataUrl(blob);
}
```

## Impression Brother iPrint&Scan

L'app utilise le Web Share API qui permet de partager l'image vers n'importe quelle app Android, y compris Brother iPrint&Scan.

Si le partage direct ne fonctionne pas :
1. Le bouton 📤 ouvre aussi la fenêtre d'impression
2. Tu peux sélectionner l'imprimante Brother via le service d'impression Android

## Structure des fichiers

```
stickerbox/
├── index.html      # App principale (HTML + CSS + JS)
├── manifest.json   # Config PWA
├── sw.js           # Service Worker (cache offline)
├── icon-192.png    # Icône PWA
└── icon-512.png    # Icône PWA grande
```

## Personnalisation

### Modifier le filtre de mots

Dans `index.html`, trouve `blockedWords` et ajoute/retire des mots.

### Modifier le style des dessins

Modifie le prompt dans `generateImage()` :
- `cute kawaii style` → `cartoon style` ou `disney style`
- Ajoute `for toddlers` pour des dessins plus simples

## Dépannage

**"La reconnaissance vocale n'est pas supportée"**
→ Utilise Chrome ou Edge (Firefox ne supporte pas toujours Web Speech)

**Images qui ne se génèrent pas**
→ Vérifie ta connexion internet
→ Essaie l'API Pollinations comme alternative

**Le micro ne fonctionne pas**
→ Vérifie les permissions du navigateur (🔒 dans la barre d'adresse)
→ L'app doit être servie en HTTPS (ou localhost)

## Licence

MIT - Fais-en ce que tu veux ! 🎉
