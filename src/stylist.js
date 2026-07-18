import { MERCH } from "./data.js";

// The stylist fills a fit the way a human would: one top, one bottom, one pair
// of shoes first, then a layer and up to two accessories — never more than
// MAX_OUTFIT pieces total. Pieces the wearer already picked are kept and the
// remaining slots are completed around them.
export const MAX_OUTFIT = 6;

const SLOT_PLAN = [
  { part: "tops", max: 1 },
  { part: "bottoms", max: 1 },
  { part: "shoes", max: 1 },
  { part: "layers", max: 1 },
  { part: "accessories", max: 2 },
];

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Prefer pieces that read as one deliberate look: same division as the anchor
// scores highest, then divisions sharing the anchor's accent family, then a
// similar price tier so a $30 cap isn't styled against a $900 parka.
function scoreCandidate(item, anchor) {
  if (!anchor) return 1;
  let score = 1;
  if (item.divisionId === anchor.divisionId) score += 4;
  if (item.division.accent === anchor.division.accent) score += 2;
  const priceGap = Math.abs((item.product.price || 0) - (anchor.product.price || 0));
  if (priceGap <= 40) score += 2;
  else if (priceGap <= 90) score += 1;
  return score;
}

function drawWeighted(candidates, anchor) {
  const scored = candidates.map((item) => ({ item, score: scoreCandidate(item, anchor) }));
  const best = Math.max(...scored.map((entry) => entry.score));
  // Keep a little serendipity: draw from every piece within one point of the
  // best match instead of always returning the single top score.
  return pickRandom(scored.filter((entry) => entry.score >= best - 1)).item;
}

/**
 * Build a complete outfit of up to MAX_OUTFIT pieces.
 *
 * @param {object} options
 * @param {Array} options.current   Already-selected pieces to keep and build around.
 * @param {"mix"|"division"} options.strategy
 *   "division" pulls every new piece from one division (an anchor division —
 *   the first kept piece's, or a random one); "mix" curates across the whole
 *   closet, weighted toward pieces that match the anchor's division, accent,
 *   and price tier.
 */
export function pairOutfit({ current = [], strategy = "mix" } = {}) {
  const outfit = current.slice(0, MAX_OUTFIT);
  const used = new Set(outfit.map((item) => item.index));
  const anchor = outfit[0] || pickRandom(MERCH);
  const anchorDivision = anchor.divisionId;

  for (const slot of SLOT_PLAN) {
    let wanted = slot.max - outfit.filter((item) => item.part === slot.part).length;
    while (wanted > 0 && outfit.length < MAX_OUTFIT) {
      const open = MERCH.filter((item) => item.part === slot.part && !used.has(item.index));
      if (!open.length) break;
      const inDivision = open.filter((item) => item.divisionId === anchorDivision);
      const pool = strategy === "division" && inDivision.length ? inDivision : open;
      const pick = strategy === "division" && inDivision.length ? pickRandom(pool) : drawWeighted(pool, anchor);
      outfit.push(pick);
      used.add(pick.index);
      wanted -= 1;
    }
  }
  return outfit;
}

export function outfitTotal(outfit) {
  return outfit.reduce((total, item) => total + (item.product.price || 0), 0);
}
