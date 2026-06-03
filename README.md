# MDK Tech Academy

A premium, AI-driven educational platform prototype with a six-node Mastery Tree, Cognitive Credits, an animated Mastery Globe, a dual-pane academic workspace, and a hidden admin override route.

## Run locally

```bash
npm install
npm run dev
```

## Build and host the static webpage

```bash
npm run build
npm run host
```

The hosted preview runs at `http://localhost:4173/` and on the machine's network interface. The app is also ready for GitHub Pages through `.github/workflows/deploy.yml`; push to `main` or run the workflow manually after enabling GitHub Pages for Actions in the repository settings.

## AI endpoints

Set these optional environment variables to connect real LLM services:

- `VITE_MDK_LLM_GENERATE_URL` — POST endpoint that returns `{ "nodes": [...] }` or a node array.
- `VITE_MDK_LLM_EVALUATE_URL` — POST endpoint that returns `{ "passed": boolean, "efficiencyScore": number, "feedback": string }`.

If endpoints are unavailable, the client uses deterministic local fallbacks so the webpage remains testable.

## Hidden admin

Open `/mdk-admin-core` to save local override JSON for curriculum nodes. Overrides are stored in localStorage and are useful for deterministic demos.
