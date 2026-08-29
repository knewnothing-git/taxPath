# TaxPath

TaxPath is a Vite + React prototype for helping people understand tax documents, surface potential checks, and review filing readiness using synthetic demo data.

## Run locally

```bash
npm ci
npm run dev
```

## Verify a production build

```bash
npm run test
npm run build
```

## Deploy on Vercel

1. Create a new Git repository and push this project to its `main` branch.
2. In Vercel, choose **Add New → Project** and import that repository.
3. Vercel will use the included Vite configuration: `npm run build` and the `dist` output directory.
4. Select **Deploy**.

`vercel.json` also keeps client-side paths served by the single-page app.

## Repository hygiene

The included `.gitignore` excludes generated files, Vercel’s local metadata, dependency folders, logs, and local environment files. Do not commit credentials or real taxpayer information.
