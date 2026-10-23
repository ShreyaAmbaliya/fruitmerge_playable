# Fruit Pop Fusion

A cute, satisfying fruit-merging physics puzzle for the browser. Drop matching fruits into a glass jar, merge them into bigger ones, and try to create the **Mega Melon** without overflowing the danger line.

Play locally or publish for free on **GitHub Pages** — perfect to share with YouTube viewers via a description link.

## Play

| Action | Desktop | Mobile |
|--------|---------|--------|
| Aim | Move mouse | Drag horizontally |
| Drop | Click or **Space** | Tap canvas or **Drop** button |
| Pause | **Esc** or ⏸ | ⏸ button |
| Mute | 🔊 button | 🔊 button |

**Goal:** Merge same fruits to evolve through 8 tiers (Cherry → Berry → Blue Pop → Citrus → Crisp → Peachy → Spike → Mega Melon). Two Mega Melons pop for a huge bonus. Don’t let settled fruits stay above the red danger line!

## Tech

- HTML5 Canvas + CSS
- [Vite](https://vitejs.dev/) for build & GitHub Pages
- [Matter.js](https://brm.io/matter-js/) for 2D physics
- Web Audio API for SFX (no external audio files)
- LocalStorage for best score

No backend, accounts, or paid APIs.

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build    # production build → dist/
npm run preview  # preview the production build
```

## Publish on GitHub Pages

### 1. Create a repository

1. Create a new public repo on GitHub (e.g. `fruit-pop-fusion`).
2. From this project folder:

```bash
git init
git add .
git commit -m "Initial commit: Fruit Pop Fusion MVP"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git
git push -u origin main
```

### 2. Enable GitHub Pages (Actions)

1. Open the repo on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**.
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually under the **Actions** tab).
4. When the workflow finishes, your game URL will be:

```text
https://<YOUR_USERNAME>.github.io/<YOUR_REPO>/
```

The included workflow (`.github/workflows/deploy.yml`) builds with a relative asset base (`./`) so the game works under a repository subpath.

### 3. Optional: custom base path

If you ever need an absolute base:

```bash
VITE_BASE_PATH=/fruit-pop-fusion/ npm run build
```

## YouTube sharing

1. Publish the game on GitHub Pages (steps above).
2. Put the public URL in your video description and/or a pinned comment.
3. Viewers open the link in a browser — they land on the start screen and can play immediately.

GitHub Pages hosts the game as a normal website; it does **not** embed inside the YouTube player.

## Project structure

```text
index.html
src/
  main.js      # entry
  game.js      # game loop, input, merge logic
  physics.js   # Matter.js world & collisions
  fruit.js     # fruit data + Canvas artwork
  effects.js   # particles, popups, shake
  audio.js     # Web Audio SFX
  ui.js        # HUD & overlays
  style.css
public/
  favicon.svg
.github/workflows/deploy.yml
vite.config.js
```

## License

MIT — feel free to remix for your own channels and demos.
