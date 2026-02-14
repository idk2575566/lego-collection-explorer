# LEGO Collection Explorer

A React + Vite proof-of-concept that visualizes Grant's Brickset collection with theme analytics, responsive cards, and a mobile-friendly detail drawer. Data is generated from the `Brickset-mySets-owned.csv` export at build time.

## Scripts

- `npm run dev` – local dev server
- `npm run build:data` – regenerate `public/sets.json` from the CSV
- `npm run build` – regenerate data, run type-checking, and produce a production bundle in `dist/`
- `npm run preview` – preview the production build locally

## Deploying to GitHub Pages

The repo uses a `gh-pages` branch with the compiled `dist` output. To redeploy:

```bash
npm run build
npx gh-pages -d dist
```

(or use the `deploy` script we add later.)

### Add to Home Screen

Once deployed, open the site in Safari, tap the share icon, then choose “Add to Home Screen” to get an app-like experience on iOS.
