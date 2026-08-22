(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RetailStorePortfolio = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PERFORMANCE_STATES = Object.freeze({
    HEALTHY_GROWTH: 'healthy-growth',
    HIGH_RETURN_DECLINE: 'high-return-decline',
    GROWTH_LOW_RETURN: 'growth-low-return',
    PRIORITY_REVIEW: 'priority-review'
  });

  const PERFORMANCE_STATE_ORDER = Object.freeze([
    PERFORMANCE_STATES.HEALTHY_GROWTH,
    PERFORMANCE_STATES.HIGH_RETURN_DECLINE,
    PERFORMANCE_STATES.GROWTH_LOW_RETURN,
    PERFORMANCE_STATES.PRIORITY_REVIEW
  ]);

  function median(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((left, right) => left - right);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function exactTerminalPairs(currentStores, comparisonStores) {
    const comparisonByTerminal = new Map(
      comparisonStores
        .filter(store => store && store.terminal != null)
        .map(store => [String(store.terminal), store])
    );
    return currentStores.map(currentStore => {
      const terminal = currentStore && currentStore.terminal != null
        ? String(currentStore.terminal)
        : null;
      const comparisonStore = terminal == null ? null : comparisonByTerminal.get(terminal) || null;
      return {
        currentStore,
        comparisonStore,
        comparisonStatus: comparisonStore ? 'matched' : 'new-store'
      };
    });
  }

  function productivityEvolution(currentProductivity, comparisonProductivity, comparisonStatus) {
    if (comparisonStatus === 'new-store') {
      return { value: null, status: 'unavailable', reason: 'new-store' };
    }
    if (!Number.isFinite(currentProductivity)) {
      return { value: null, status: 'unavailable', reason: 'missing-current' };
    }
    if (!Number.isFinite(comparisonProductivity)) {
      return { value: null, status: 'unavailable', reason: 'missing-comparison' };
    }
    if (comparisonProductivity === 0) {
      return { value: null, status: 'unavailable', reason: 'zero-comparison-base' };
    }
    if (comparisonProductivity < 0) {
      return { value: null, status: 'unavailable', reason: 'invalid-comparison-base' };
    }
    return {
      value: (currentProductivity - comparisonProductivity) / comparisonProductivity,
      status: 'available',
      reason: null
    };
  }

  function performanceEligibility(record) {
    if (!record || record.comparisonStatus === 'new-store') {
      return { eligible: false, reason: 'new-store' };
    }
    if (!Number.isFinite(record.currentProductivity)) {
      return { eligible: false, reason: 'missing-current-productivity' };
    }
    if (!record.productivityEvolution || record.productivityEvolution.status !== 'available') {
      return {
        eligible: false,
        reason: record.productivityEvolution && record.productivityEvolution.reason
          ? record.productivityEvolution.reason
          : 'missing-productivity-evolution'
      };
    }
    if (!Number.isFinite(record.currentCustomerContributionPct)) {
      return { eligible: false, reason: 'missing-current-cc' };
    }
    return { eligible: true, reason: null };
  }

  function classifyPerformance(record) {
    if (!record || !Number.isFinite(record.currentCustomerContributionPct)
      || !Number.isFinite(record.productivityEvolPct)) return null;
    const highReturn = record.currentCustomerContributionPct >= 0;
    const growth = record.productivityEvolPct >= 0;
    if (highReturn && growth) return PERFORMANCE_STATES.HEALTHY_GROWTH;
    if (highReturn) return PERFORMANCE_STATES.HIGH_RETURN_DECLINE;
    if (growth) return PERFORMANCE_STATES.GROWTH_LOW_RETURN;
    return PERFORMANCE_STATES.PRIORITY_REVIEW;
  }

  function scaleBubbleSize(value, minimumValue, maximumValue, minimumSize = 10, maximumSize = 38) {
    if (![value, minimumValue, maximumValue, minimumSize, maximumSize].every(Number.isFinite)) return minimumSize;
    if (maximumSize <= minimumSize) return minimumSize;
    if (maximumValue <= minimumValue) return (minimumSize + maximumSize) / 2;
    const safeMinimum = Math.max(0, minimumValue);
    const safeMaximum = Math.max(safeMinimum, maximumValue);
    const clipped = Math.min(safeMaximum, Math.max(safeMinimum, value));
    const normalized = (Math.sqrt(clipped) - Math.sqrt(safeMinimum))
      / (Math.sqrt(safeMaximum) - Math.sqrt(safeMinimum));
    return minimumSize + normalized * (maximumSize - minimumSize);
  }

  function deterministicJitter(key, maximumOffset = 0.18) {
    const text = String(key == null ? '' : key);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    const unit = (hash >>> 0) / 4294967295;
    return (unit * 2 - 1) * maximumOffset;
  }

  function countReasons(records) {
    return records.reduce((counts, record) => {
      const reason = record.exclusionReason || 'unknown';
      counts[reason] = (counts[reason] || 0) + 1;
      return counts;
    }, {});
  }

  function buildPerformanceDataset(records) {
    const evaluated = records.map(record => {
      const eligibility = performanceEligibility(record);
      return { ...record, performanceEligibility: eligibility };
    });
    const eligibleRecords = evaluated.filter(record => record.performanceEligibility.eligible);
    const excluded = evaluated
      .filter(record => !record.performanceEligibility.eligible)
      .map(record => ({ ...record, exclusionReason: record.performanceEligibility.reason }));
    const medianCustomerContributionPct = median(
      eligibleRecords.map(record => record.currentCustomerContributionPct)
    );
    const eligible = eligibleRecords.map(record => ({
      ...record,
      businessState: classifyPerformance(record)
    }));
    const stateSummary = PERFORMANCE_STATE_ORDER.map(state => {
      const count = eligible.filter(record => record.businessState === state).length;
      return {
        state,
        count,
        share: eligible.length ? count / eligible.length : 0
      };
    });
    return {
      eligible,
      excluded,
      counts: {
        total: evaluated.length,
        eligible: eligible.length,
        excluded: excluded.length,
        excludedByReason: countReasons(excluded)
      },
      medianCustomerContributionPct,
      stateSummary
    };
  }

  function distributionStatistics(values) {
    const sorted = values.filter(Number.isFinite).slice().sort((left, right) => left - right);
    if (!sorted.length) {
      return { count: 0, median: null, q1: null, q3: null, iqr: null };
    }
    if (sorted.length === 1) {
      return { count: 1, median: sorted[0], q1: sorted[0], q3: sorted[0], iqr: 0 };
    }
    const midpoint = Math.floor(sorted.length / 2);
    const lower = sorted.slice(0, midpoint);
    const upper = sorted.length % 2 ? sorted.slice(midpoint + 1) : sorted.slice(midpoint);
    const q1 = median(lower);
    const q3 = median(upper);
    return {
      count: sorted.length,
      median: median(sorted),
      q1,
      q3,
      iqr: q3 - q1
    };
  }

  function adjacentIqrOverlaps(groups) {
    return groups.slice(0, -1).map((lowerGroup, index) => {
      const higherGroup = groups[index + 1];
      const overlapStart = Math.max(lowerGroup.q1, higherGroup.q1);
      const overlapEnd = Math.min(lowerGroup.q3, higherGroup.q3);
      const overlaps = Number.isFinite(overlapStart)
        && Number.isFinite(overlapEnd)
        && overlapStart <= overlapEnd;
      return {
        lowerHeadcount: lowerGroup.daHeadcount,
        higherHeadcount: higherGroup.daHeadcount,
        overlaps,
        overlapStart: overlaps ? overlapStart : null,
        overlapEnd: overlaps ? overlapEnd : null,
        overlapWidth: overlaps ? overlapEnd - overlapStart : 0
      };
    });
  }

  function buildHeadcountDistribution(records) {
    const groups = new Map();
    const recordsByGroup = new Map();
    const excluded = [];
    records.forEach(record => {
      if (!Number.isFinite(record.currentDAHeadcount)) {
        excluded.push({ ...record, exclusionReason: 'missing-da-headcount' });
        return;
      }
      if (!Number.isFinite(record.currentProductivity)) {
        excluded.push({ ...record, exclusionReason: 'missing-current-productivity' });
        return;
      }
      if (!groups.has(record.currentDAHeadcount)) groups.set(record.currentDAHeadcount, []);
      if (!recordsByGroup.has(record.currentDAHeadcount)) recordsByGroup.set(record.currentDAHeadcount, []);
      groups.get(record.currentDAHeadcount).push(record.currentProductivity);
      recordsByGroup.get(record.currentDAHeadcount).push(record);
    });
    const distributions = Array.from(groups.entries())
      .sort(([left], [right]) => left - right)
      .map(([daHeadcount, productivities]) => ({
        daHeadcount,
        ...distributionStatistics(productivities)
      }));
    const adjacentOverlaps = adjacentIqrOverlaps(distributions);
    const reviewOpportunities = adjacentOverlaps.flatMap(overlap => {
      if (!overlap.overlaps) return [];
      const lowerGroup = distributions.find(group => group.daHeadcount === overlap.lowerHeadcount);
      return (recordsByGroup.get(overlap.higherHeadcount) || [])
        .filter(record => record.currentProductivity >= lowerGroup.q1 && record.currentProductivity <= lowerGroup.q3)
        .map(record => ({
          terminal: record.terminal,
          higherHeadcount: overlap.higherHeadcount,
          lowerHeadcount: overlap.lowerHeadcount,
          lowerIqrStart: lowerGroup.q1,
          lowerIqrEnd: lowerGroup.q3
        }));
    });
    return {
      groups: distributions,
      adjacentOverlaps,
      reviewOpportunities,
      excluded,
      counts: {
        total: records.length,
        eligible: records.length - excluded.length,
        excluded: excluded.length,
        excludedByReason: countReasons(excluded)
      }
    };
  }

  return Object.freeze({
    PERFORMANCE_STATES,
    PERFORMANCE_STATE_ORDER,
    median,
    exactTerminalPairs,
    productivityEvolution,
    performanceEligibility,
    classifyPerformance,
    scaleBubbleSize,
    deterministicJitter,
    buildPerformanceDataset,
    distributionStatistics,
    adjacentIqrOverlaps,
    buildHeadcountDistribution
  });
}));
