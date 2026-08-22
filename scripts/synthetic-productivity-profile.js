'use strict';

const NEAR_ZERO_SHARE = 5;
const GROWTH_SHARE_CUTOFF = 58;
const TIER_BOUNDARIES = Object.freeze([30, 60, 70, 80, 93, 136]);

function stableTerminalHash(terminal, salt = '') {
  let hash = 2166136261;
  const input = `${salt}${String(terminal)}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function targetEvolutionForTerminal(terminal) {
  const cohort = stableTerminalHash(terminal) % 100;
  const magnitude = (stableTerminalHash(terminal, 'magnitude:') % 10001) / 10000;
  if (cohort < NEAR_ZERO_SHARE) {
    const raw = (magnitude * 0.016) - 0.008;
    return {
      band: 'near-zero',
      target: Math.abs(raw) < 0.001 ? (raw < 0 ? -0.001 : 0.001) : raw
    };
  }
  if (cohort < GROWTH_SHARE_CUTOFF) {
    return { band: 'growth', target: 0.025 + (magnitude * 0.225) };
  }
  return { band: 'decline', target: -(0.025 + (magnitude * 0.175)) };
}

function comparisonProductivityFor(terminal, currentProductivity) {
  if (!Number.isFinite(currentProductivity) || currentProductivity <= 0) {
    throw new Error(`Current Productivity must be finite and positive for ${terminal}.`);
  }
  const profile = targetEvolutionForTerminal(terminal);
  let comparisonProductivity = Math.max(
    1,
    Math.round(currentProductivity / (1 + profile.target))
  );

  if (profile.band === 'growth' && comparisonProductivity >= currentProductivity) {
    comparisonProductivity = Math.max(1, currentProductivity - 1);
  } else if (profile.band === 'decline' && comparisonProductivity <= currentProductivity) {
    comparisonProductivity = currentProductivity + 1;
  }

  if (TIER_BOUNDARIES.includes(comparisonProductivity)) {
    comparisonProductivity += profile.target >= 0 ? -1 : 1;
  }

  return Object.freeze({
    ...profile,
    comparisonProductivity,
    actualEvolution: (currentProductivity - comparisonProductivity) / comparisonProductivity
  });
}

function productivityTierFor(productivity) {
  if (!Number.isFinite(productivity) || productivity <= 0) return null;
  if (TIER_BOUNDARIES.includes(productivity)) {
    throw new Error(`Synthetic Comparison Productivity must not equal a shared tier boundary: ${productivity}.`);
  }
  if (productivity < 30) return '0~30K';
  if (productivity < 60) return '30~60K';
  if (productivity < 70) return '60~70K';
  if (productivity < 80) return '70~80K';
  if (productivity < 93) return '80~93K';
  if (productivity < 136) return '93~136K';
  return '>136K';
}

module.exports = Object.freeze({
  TIER_BOUNDARIES,
  stableTerminalHash,
  targetEvolutionForTerminal,
  comparisonProductivityFor,
  productivityTierFor
});
