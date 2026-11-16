#!/usr/bin/env node
/**
 * Token Launch Radar — deterministic research pipeline.
 * Node.js >=22.18. Writes an offline board from a frozen DeFiLlama protocol snapshot.
 * Never treats missing data as proof that a protocol has no token.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Protocol = {
  name: string; slug: string; symbol?: string; gecko_id?: string | null;
  cmcId?: string | number | null; category?: string; chains?: string[];
  tvl?: number; change_1d?: number; change_7d?: number; mcap?: number | null;
  url?: string; twitter?: string; listedAt?: number;
};
type Candidate = {
  rank: number; name: string; slug: string; category: string; chains: string[];
  tvl_usd: number; market_cap_usd: number | null; token_symbol: string | null;
  token_status: "no_token_signal" | "needs_manual_review" | "excluded";
  estimated_fdv_usd: { low: number; base: number; high: number } | null;
  confidence: "low" | "medium" | "high"; score: number;
  rationale: string[]; farming_plan: string[]; risks: string[];
  sources: string[]; source_updated_at: string;
};
const ROOT = resolve(process.env.RADAR_ROOT || ".");
const INPUT = resolve(ROOT, process.env.RADAR_SNAPSHOT || "data/defillama-protocols.json");
const OUTPUT = resolve(ROOT, "board.json");
const EXCLUDED = /wrapped|staked|liquid staking|restaking receipt|vault share|bridge wrapper|receipt token/i;
const USD = (n: number) => Math.round(n);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const round = (n: number) => Math.round(n / 100000) * 100000;

function estimate(p: Protocol) {
  const tvl = Math.max(0, Number(p.tvl || 0));
  if (!tvl) return null;
  // Broad scenario ranges, explicitly heuristic and not a price target.
  const low = round(clamp(tvl * 0.08, 1_000_000, 50_000_000));
  const base = round(clamp(tvl * 0.25, low, 500_000_000));
  const high = round(clamp(tvl * 0.60, base, 2_000_000_000));
  return { low, base, high };
}
function score(p: Protocol) {
  const tvl = Math.max(0, Number(p.tvl || 0));
  const growth = clamp(Number(p.change_7d || 0), -50, 100);
  const chainCount = new Set(p.chains || []).size;
  const scale = Math.log10(Math.max(1, tvl)) * 5;
  return Math.round(clamp(scale + growth * 0.18 + Math.min(chainCount, 8) * 1.5, 0, 100) * 10) / 10;
}
function farming(p: Protocol): string[] {
  const chain = (p.chains || [])[0] || "supported chain";
  return [
    "Use only the protocol's official website and verify the domain from its official social channels.",
    "Connect a wallet with a small test balance; never share a seed phrase or approve unlimited allowances.",
    "Complete a genuine core action (deposit, lend, trade, provide liquidity or use the app) only after reviewing fees and smart-contract risk.",
    `If supported, test a second distinct feature on ${chain}; avoid wash activity and unnecessary transaction volume.`,
    "Keep transaction hashes and revisit official announcements for any points, quests or eligibility rules. No airdrop is guaranteed."
  ];
}
function classify(p: Protocol): Candidate["token_status"] {
  if (EXCLUDED.test(p.name) || EXCLUDED.test(p.category || "")) return "excluded";
  const hasTicker = Boolean(p.symbol && p.symbol.trim() && !["-", "N/A", "NONE"].includes(p.symbol.trim().toUpperCase()));
  const hasListing = Boolean(p.gecko_id || p.cmcId);
  return (!hasTicker && !hasListing) ? "no_token_signal" : "needs_manual_review";
}
async function loadSnapshot(): Promise<Protocol[]> {
  const raw = await readFile(INPUT, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Snapshot must be a JSON array from the Make.fun kit.");
  return parsed as Protocol[];
}
export async function buildBoard(snapshot?: Protocol[]) {
  const protocols = snapshot || await loadSnapshot();
  const now = new Date().toISOString();
  const rows: Candidate[] = protocols.map(p => {
    const status = classify(p);
    const tvl = Math.max(0, Number(p.tvl || 0));
    const reasons = [
      status === "no_token_signal" ? "No ticker, CoinGecko id or CoinMarketCap id in the source snapshot; this is a lead, not proof." : "Token/listing indicators exist; manual verification required.",
      `Reported TVL: $${USD(tvl).toLocaleString("en-US")}.`,
      `7-day TVL change: ${Number(p.change_7d || 0).toFixed(2)}%.`
    ];
    return {
      rank: 0, name: p.name, slug: p.slug, category: p.category || "Uncategorized",
      chains: p.chains || [], tvl_usd: USD(tvl), market_cap_usd: p.mcap ?? null,
      token_symbol: p.symbol || null, token_status: status,
      estimated_fdv_usd: status === "no_token_signal" ? estimate(p) : null,
      confidence: tvl >= 100_000_000 ? "medium" : "low",
      score: score(p), rationale: reasons, farming_plan: farming(p),
      risks: ["Token status must be independently verified; source metadata can be incomplete.",
        "FDV scenarios are heuristic estimates, not forecasts or investment advice.",
        "Airdrops, points and rewards are unconfirmed unless the protocol announces them."],
      sources: ["https://api.llama.fi/protocols", p.url || ""].filter(Boolean),
      source_updated_at: now
    } satisfies Candidate;
  }).filter(x => x.token_status !== "excluded")
    .sort((a, b) => (b.score - a.score) || (b.tvl_usd - a.tvl_usd));
  rows.forEach((r, i) => r.rank = i + 1);
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify({ generated_at: now, source: "Make.fun sealed snapshot supplied at data/defillama-protocols.json", methodology: "Conservative metadata screen; all no-token leads require manual verification.", count: rows.length, board: rows }, null, 2) + "\n");
  return rows;
}
async function main() {
  const rows = await buildBoard();
  console.log(`Wrote ${rows.length} protocol records to ${OUTPUT}`);
  console.log(`No-token leads: ${rows.filter(r => r.token_status === "no_token_signal").length}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
}
