# Token Launch Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)

An offline-first research dashboard for discovering protocols that may not yet have a liquid governance token. It separates source facts from heuristics, labels uncertainty, and gives a cautious protocol-usage checklist.

## Status

This repository contains the radar engine and offline dashboard. The official bounty sealed snapshot and vendor/makefun-board.ts must be supplied from the competition kit before a scored board can be generated. Do not replace that sealed input with invented data.

## Requirements

- Node.js 22.18 or later
- Chrome, Chromium, Firefox or Safari

## Build

From the repository root:

```sh
node main.ts
```

The build expects the official kit snapshot at data/defillama-protocols.json and writes board.json. The script intentionally refuses to fabricate a snapshot if that file is missing.

## Dashboard

Open dashboard/index.html directly in a browser. It reads a local board.json when served from a local static server. For strict offline use, it includes an empty state until a generated board is placed next to it.

## Methodology

- A missing ticker and missing CoinGecko/CoinMarketCap identifiers are only a **lead**, never proof that a protocol has no token.
- Wrapped, staked and receipt-style products are excluded from the candidate list.
- FDV scenarios are transparent TVL multiples, not predictions.
- Farming steps are generic, safety-first usage suggestions; no airdrop or reward is promised.
- Every lead requires manual verification against official protocol sources and token markets.

## License

MIT
