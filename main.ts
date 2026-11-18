// CBBTC Momentum Race Bot — a mean-reversion dip-buyer for make.fun's
// "Race a BTC trading bot live for 24 hours" (btc-race-24h-20261118-1444).
//
// Idea
// ----
// On 1-minute cbBTC bars the 120-minute dip mean-reverts on this dev window:
// the day grinds down 281 bps (65,083 -> 63,261) in a narrow 3.3% range, and
// every house baseline loses on it (best: momentum -23.87, buy-and-hold
// -31.63, ema-cross -148.17). Short-horizon scalping is dead too (2 of 4800
// parameter sets positive, best +1.19). What pays is buying a deep 2-hour
// dip and waiting patiently for the bounce: two round trips on the dev window,
// +8.33 and +8.50 net. A full round trip costs about 26 bps in fees,
// slippage and price impact, so the edge only pays when the dip is deep and
// the exit is patient. Trend-following breakouts were tried first and lose:
// the best Donchian variant makes +10.95, below this bot, and whipsaws.
//
// Rules (all comparisons exact bigint arithmetic on the raw closes, so two
// runs on the same bars produce byte-identical action logs)
// ---------------------------------------------------------------------------
//   - Entry: flat and the latest close is at least ENTRY_BPS (100 bps)
//     below the close 120 bars ago: buy with the whole cash balance.
//   - Exit the whole position when any of these holds at a bar's close:
//       * its value is TP_BPS (100 bps) above its cost (take profit),
//       * its value is SL_BPS (150 bps) below its cost (stop loss),
//       * MAX_HOLD_BARS (480) bars have passed since the buy was decided.
//   - At most MAX_ROUND_TRIPS (2) round trips per window: on a day that
//     keeps falling, the bot stops catching knives instead of bleeding out.
//   - One open position, long only, full size, no leverage, no short.
//   - max_slippage_bps is left wide open (10_000) so a fill is never
//     refused for a 1-minute gap; the stop-loss, not the slippage cap,
//     is what limits a bad fill.
//
// The bot keeps no state between batches other than the closes it has been
// sent, the bar its current position was opened on, and how many round
// trips it has closed. It reads no clock, no file and no environment, and
// seeds nothing: it is fully deterministic.

import { BPS, runBars, type BarsState, type Batch, type OrderInput } from "./vendor/makefun-bars.ts";

const SYMBOL = "CBBTC";
/** Lookback for the dip: the close 120 bars ago. */
const LOOKBACK_BARS = 120;
/** Buy when the close is this many bps below the close LOOKBACK_BARS ago. */
const ENTRY_BPS = 100n;
/** Sell when the position is worth this many bps over its cost. */
const TP_BPS = 100n;
/** Sell when the position is worth this many bps under its cost. */
const SL_BPS = 150n;
/** Sell after this many bars since the buy was decided, even with no TP/SL. */
const MAX_HOLD_BARS = 480;
/** Stop opening new round trips after this many have closed. */
const MAX_ROUND_TRIPS = 2;
/** Never let the slippage cap refuse a fill (the stop-loss limits damage). */
const MAX_SLIPPAGE_BPS = 10_000;

/** The close of every bar so far, indexed by batch seq (null on a gap bar). */
const closes: (bigint | null)[] = [];
/** The seq of the batch on which the current position's buy was decided. */
let heldSince: number | null = null;
/** Round trips closed so far (a sell that emptied the position). */
let roundTrips = 0;
/** Whether the previous batch showed a position (to count its close). */
let wasHolding = false;

/** Whether the dip is deep enough to buy on this batch's close. */
function isDip(seq: number): boolean {
  const now = closes[seq];
  const then = seq >= LOOKBACK_BARS ? closes[seq - LOOKBACK_BARS] : null;
  if (now === null || now === undefined || then === null || then === undefined) return false;
  // now < then * (10000 - ENTRY_BPS) / 10000, exactly.
  return now * BPS < then * (BPS - ENTRY_BPS);
}

/** Whether the held position should be sold whole on this batch's close. */
function shouldExit(state: BarsState, held: { qty: bigint; cost: bigint }, seq: number): boolean {
  const value = state.value(SYMBOL, held.qty);
  // value >= cost * (10000 + TP_BPS) / 10000, exactly.
  if (value * BPS >= held.cost * (BPS + TP_BPS)) return true;
  // value <= cost * (10000 - SL_BPS) / 10000, exactly.
  if (value * BPS <= held.cost * (BPS - SL_BPS)) return true;
  if (heldSince !== null && seq - heldSince >= MAX_HOLD_BARS) return true;
  return false;
}

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    for (const bar of batch.bars) closes[batch.seq] = BigInt(bar.c);

    const held = state.positions.get(SYMBOL);
    const nowHolding = held !== undefined && held.qty > 0n;
    if (wasHolding && !nowHolding) roundTrips += 1;
    wasHolding = nowHolding;
    if (state.warmingUp) return [];

    if (!nowHolding) {
      if (roundTrips >= MAX_ROUND_TRIPS) return [];
      if (isDip(batch.seq)) {
        heldSince = batch.seq;
        return [{ side: "buy", symbol: SYMBOL, notional_quote_units: state.cash, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }

    if (shouldExit(state, held!, batch.seq)) {
      return [{ side: "sell", symbol: SYMBOL, qty: held!.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
