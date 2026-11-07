# NZ 2026 Coalition Simulator

Drag parties into coalitions and see how many seats each bloc holds, split by electorate and list seats.

Data is from the [Electoral Commission preliminary count](https://electionresults.govt.nz/ge2026/), hard-coded in
`data.json` (the results site blocks scripted fetches). Update that file when the official count is published.

Plain HTML/CSS/JS, no build step. Deployed to GitHub Pages by the workflow in `.github/workflows/pages.yml`.

Run locally with any static server, e.g. `python3 -m http.server`.

## Licence

MIT, see `LICENSE`.
