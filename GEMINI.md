# GEMINI.md

## Project Overview

**ColorBox** is a Progressive Web App (PWA) designed to generate black-and-white coloring pages for children from voice or text prompts. The application is built with vanilla HTML, CSS, and JavaScript, with all core logic contained within the `index.html` file. It is designed to be simple, self-contained, and easily deployable.

**Core Technologies:**
*   **Frontend:** HTML5, CSS3, Vanilla JavaScript
*   **Voice Recognition:** Web Speech API (`SpeechRecognition`) for voice input.
*   **Image Generation:** Uses `image.pollinations.ai` to generate images from user prompts.
*   **Offline Capability:** Implemented as a PWA with a service worker (`sw.js`) for offline caching of application assets.
*   **State Management:** A simple state object in JavaScript manages the application's UI and data, with generated images stored in the browser's `localStorage`.

## Building and Running

This project does not require a build step. It can be run by serving the files from a local web server.

**To run the project locally:**

1.  Navigate to the project directory in your terminal.
2.  Start a simple HTTP server. If you have Python 3, you can use:
    ```bash
    python3 -m http.server
    ```
3.  Open your web browser and go to `http://localhost:8000` (or the port specified by your server).

**To install as a PWA:**

1.  Access the running application in a compatible browser (like Chrome on Android or desktop).
2.  Open the browser's menu and select "Install App" or "Add to Home Screen".

## Development Conventions

*   **Single-File Architecture:** All HTML, CSS, and JavaScript code is located in the `index.html` file. This makes the project easy to understand and modify, but could be challenging to maintain for larger applications.
*   **Vanilla JavaScript:** The project uses plain JavaScript without any external libraries or frameworks.
*   **State Management:** A global `state` object is used to track the application's current image, prompt, and history. The history is persisted to `localStorage`.
*   **UI States:** The UI is managed by showing and hiding different `<div>` elements that represent the application's state (e.g., `state-idle`, `state-recording`, `state-generating`, `state-result`, `state-error`).
*   **Kid-Friendly Filter:** A `blockedWords` array and a `sanitizePrompt` function are used to filter and modify user input to ensure it is appropriate for children.
*   **PWA:** The application uses a `manifest.json` file and a service worker (`sw.js`) to provide PWA functionality, including offline access and the ability to be "installed" on a device.
