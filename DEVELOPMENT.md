# Development Website

This repository is the long-term development source for the Retail Performance Dashboard.

- Development website: <https://retail-performance-dashboard.vercel.app>
- Hosting: Vercel
- Source repository: <https://github.com/ellaaaa2023-sys/retail-performance-dashboard> (private)

## Data boundary

- Use only `sample_data/Mock_Counter_PnL.xlsx` or other fully synthetic data.
- Never upload, commit, screenshot or paste real company P&L into the development website, GitHub, Vercel, Codex or any external service.
- The `.gitignore` blocks spreadsheet files by default and permits only the named mock workbook.

## Local development with Hot Reload

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Changes to HTML, CSS and JavaScript reload automatically.

The application remains plain HTML/CSS/JavaScript. Vite is a development convenience rather than a runtime dependency.

## Continuous deployment

The `main` branch is the production branch for the development website:

```text
local edit → git commit → git push origin main → Vercel automatic deployment
```

Feature branches may receive separate Vercel preview deployments when Git integration is enabled.

Vercel Git integration is enabled for this repository. A push to `main` updates the fixed Development Website URL automatically after the deployment reaches `Ready`.

## Safe update checklist

1. Use mock data only.
2. Run `npm run check`.
3. Review `git status` and confirm no unexpected workbook, ZIP or local settings are staged.
4. Commit and push to `main`.
5. Verify the fixed Development Website URL after Vercel finishes deploying.
