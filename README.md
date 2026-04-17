# Compound Interest & Dividend Growth Calculator

A standalone, front‑end–only calculator that helps you project how your investments might grow over time, focusing on:

- **Compound interest** – understand how regular contributions and a fixed annual return grow your portfolio.
- **Dividend investing** – model how both stock price appreciation and dividend growth affect your future income.

This project is built as a single static page (no backend, no build step required) and is designed to be accessible, responsive, and easy to host on any static site provider.


## Live demo

> _Add your deployment URL here once you publish the app (e.g. GitHub Pages, Vercel, Netlify)._ 


## Features

### Compound interest calculator

- Initial lump‑sum investment and monthly contributions.
- Custom annual interest rate and compounding frequency (annual, semi‑annual, quarterly, monthly, daily).
- Optional inflation rate to estimate the **real** (inflation‑adjusted) future value.
- Year‑by‑year breakdown table showing deposited amount, interest earned, and balance.
- Multiple chart views (bar, stacked bar, line) with full keyboard‑accessible tab controls.

### Dividend growth calculator

- Initial investment and ongoing monthly contributions into a dividend‑paying stock or ETF.
- Current dividend yield, annual dividend growth rate, and expected stock price growth.
- Optional dividend reinvestment (**DRIP**) toggle.
- Outputs:
  - Final portfolio value.
  - Dividends received in the last year.
  - Total dividends received over the entire period.
  - Yield on cost in the final year.
- Year‑by‑year breakdown table and dividend/portfolio growth chart.

> **Important:** All calculations are simplified projections using constant rates. They are for educational purposes only and are **not** financial advice.


## Tech stack

- **HTML/CSS/JavaScript only** – no framework or build tooling required.
- **Chart.js 4** – for visualizing balances, contributions, interest, and dividend income.
- **Custom design system** – color tokens, typography scale, spacing system, and light/dark themes.
- **Accessibility‑first** – semantic HTML, ARIA tab patterns for chart view switching, focus styles, and screen‑reader live regions for KPI updates.


## Getting started

You only need a static file server; any of the options below work.

### 1. Clone the repo

```bash
git clone https://github.com/Matheus-C-Martins/compound-interest-calculator.git
cd compound-interest-calculator
```

### 2. Open directly in the browser

You can simply open `index.html` in your browser, but using a local server is recommended so that paths and caching behave like production.

### 3. Run a simple local server

Pick any of the following options:

**Python (3.x)**

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

**Node (using `serve`)**

```bash
npm install -g serve
serve .
# default: http://localhost:3000
```

**VS Code Live Server extension**

1. Install the _Live Server_ extension.
2. Right‑click `index.html` → **Open with Live Server**.


## Project structure

The app is intentionally small and flat:

```text
.
├── .github/           # GitHub workflows and project meta
├── index.html         # Main HTML entry point
├── styles.css         # Design tokens, layout, and component styles
├── app.js             # All calculator, chart, and accessibility logic
└── favicon.svg        # App icon
```


## Development notes

- All logic lives in `app.js` and is wrapped in an IIFE to avoid leaking globals.
- The UI has two top‑level modes:
  - `Compound` – compound interest calculator.
  - `Dividends` – dividend growth calculator.
- Chart view tabs (Balance / Stacked / Cumulative) use a WAI‑ARIA‑compliant tab pattern:
  - `role="tablist"`, `role="tab"`, `role="tabpanel"`.
  - `aria-selected`, `aria-controls`, and `tabindex` are managed by JavaScript.
  - Arrow keys, Home, and End move focus between tabs.
- KPI figures are announced to screen readers via a polite `aria-live` region.


## Roadmap / ideas

Some potential next steps for this project:

- Add a set of preset scenarios ("Conservative", "Balanced", "Aggressive").
- Allow exporting scenarios (e.g. JSON or CSV of the yearly breakdown).
- Add basic unit tests for the core calculators (`computeCompoundSchedule`, `computeDividendSchedule`).
- Provide more advanced visualizations (e.g. stacking multiple scenarios on the same chart).

If you have ideas or requests, feel free to open an issue or pull request.


## Contributing

Contributions are welcome! A simple workflow that works well for small changes:

1. Fork the repository.
2. Create a feature branch from `main`: `git checkout -b feat/my-improvement`.
3. Make your changes (ideally with small, focused commits).
4. Open a Pull Request describing the change and any UI/UX impact.

Please keep the UI accessible, responsive, and in line with the existing design system.


## License

This project is licensed under the [MIT License](LICENSE).