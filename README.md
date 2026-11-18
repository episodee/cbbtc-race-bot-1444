# cbbtc-race-bot-1444

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/episodee/cbbtc-race-bot-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/episodee/cbbtc-race-bot-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A mean-reversion dip-buyer that trades Coinbase Wrapped BTC (cbBTC) on
1-minute on-chain prices with $1,000 of paper money. On the published dev
window it made **+$16.83 net PnL** (2 round trips, +$8.33 and +$8.50,
100% win rate, 0.76% max drawdown) — about $40 ahead of the best house
bot, which loses $23.87 on the same window.

**Strategy.** The dev window grinds down 281 bps (65,083 → 63,261) inside
a narrow 3.3% range, and every house baseline loses on it (momentum
−$23.87, buy-and-hold −$31.63, RSI-Bollinger −$39.92, ADX-momentum
−$75.57, EMA-cross −$148.17). Short-horizon scalping is dead too: only 2
of 4,800 parameter sets end positive, best +$1.19. What pays is buying a
deep 2-hour dip and waiting patiently for the bounce. The bot buys the
whole cash balance when the close is at least 100 bps below the close 120
bars ago, and sells the whole position when it is 100 bps above its cost,
150 bps below its cost (a crash guard that never fired on the dev window),
or 480 bars have passed since the buy. At most 2 round trips per window,
so a day that keeps falling cannot bleed it out. The parameters sit in the
middle of a broad positive plateau (lookbacks 100–180 bars all profit,
take-profits 60–120 bps all profit), not on a knife-edge optimum.

**Dev-window trades.** Buy at bar 120 ($63,769) → sell at bar 408
($64,557), +$8.33. Buy at bar 678 ($64,146) → sell at bar 1,033
($64,874), +$8.50. Total fees $1.61.

The bot is fully deterministic: exact integer arithmetic on the raw
closes, no clock, no files, no network, no randomness. Two runs on the
same bars produce byte-identical action logs (verified by the kit's
local grade: reproduced).

## Run it

The bot speaks `agent-fun/bars-replay/v1`: one JSON line per minute on
stdin, one reply line on stdout. Grade it on the dev window with the
competition kit:

```sh
node main.ts
```

```sh
node <kit>/cli/makefun.mjs grade-local --kit <kit> --bot . --driver process
```

`vendor/makefun-bars.ts` is a byte-for-byte copy of the kit's TypeScript
SDK shim.

---

<sub>Entered on [make.fun](https://make.fun/?ref=6nyxpkac&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
