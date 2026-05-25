/**
 * Formatting for club goal progress snapshots (overview, spotlight, list).
 */

export const formatClubGoalQuantity = (n) => {
  if (n == null || Number.isNaN(Number(n))) {
    return '—';
  }
  const x = Number(n);
  if (Number.isInteger(x) || Math.abs(x - Math.round(x)) < 0.05) {
    return String(Math.round(x));
  }
  return x.toFixed(1).replace(/\.0$/, '');
};

/**
 * @param {object} snap - aggregate from club goal progress / overview snapshot
 * @param {object} opts
 * @param {string} [opts.unit] - club goal unit (e.g. hours)
 * @param {number} [opts.memberGoalCount] - member count (for "· N members" when includeMembersInLine)
 * @param {boolean} [opts.includeMembersInLine] - false for table rows that have a separate Members column
 * @returns {{ line: string, usePercentInCopy: boolean }}
 */
export const getClubGoalSnapshotSummary = (snap, opts = {}) => {
  const { unit, memberGoalCount = 0, includeMembersInLine = true } = opts;
  const u = (unit ?? '').trim();
  const members = typeof memberGoalCount === 'number' ? memberGoalCount : snap?.totalMembers ?? 0;

  if (snap?.label === 'remaining_budget') {
    const a = formatClubGoalQuantity(snap.actual);
    const t = formatClubGoalQuantity(snap.target);
    const suffix = u ? ` ${u}` : '';
    let line = `${a} / ${t}${suffix} logged vs cap`;
    if (includeMembersInLine) {
      line += ` · ${members} members`;
    }
    return {
      line,
      usePercentInCopy: false,
    };
  }

  const pct =
    snap && typeof snap.percent === 'number' ? Math.min(100, Math.max(0, snap.percent)) : 0;
  let line = `${Math.round(pct)}%`;
  if (includeMembersInLine) {
    line += ` · ${members} members`;
  }
  return {
    line,
    usePercentInCopy: true,
  };
};

/** Dashboard / modal layout keys (auto-picked from type + direction). */
export const CLUB_GOAL_LAYOUT = {
  REMAINING_BUDGET: 'remaining_budget',
  SHARED_TOTAL: 'shared_total',
  HABIT: 'habit',
  ONE_TIME: 'one_time',
  MILESTONE: 'milestone',
  GENERIC: 'generic',
};

/**
 * Pick rich card layout from club goal type and progress direction (not displayStyle).
 * @param {object} clubGoal
 * @returns {string} CLUB_GOAL_LAYOUT value
 */
export const resolveClubGoalLayout = (clubGoal) => {
  const type = clubGoal?.type;
  const direction =
    clubGoal?.progressDirection ?? clubGoal?.progress_direction ?? 'increase';

  if (type === 'metric') {
    if (direction === 'stay_under' || direction === 'decrease') {
      return CLUB_GOAL_LAYOUT.REMAINING_BUDGET;
    }
    if (direction === 'increase') {
      return CLUB_GOAL_LAYOUT.SHARED_TOTAL;
    }
  }
  if (type === 'habit' && clubGoal?.cadence) {
    return CLUB_GOAL_LAYOUT.HABIT;
  }
  if (type === 'one_time') {
    return CLUB_GOAL_LAYOUT.ONE_TIME;
  }
  if (type === 'milestone') {
    return CLUB_GOAL_LAYOUT.MILESTONE;
  }
  return CLUB_GOAL_LAYOUT.GENERIC;
};

/**
 * Progress cell for club goals table.
 */
export const getClubGoalTableProgressCopy = (snap, clubGoal) => {
  if (!snap?.label) return '—';
  const unit = (clubGoal?.unit ?? '').trim();
  const unitSuffix = unit ? ` ${unit}` : '';
  const actual = formatClubGoalQuantity(snap.actual);
  const target = formatClubGoalQuantity(snap.target);

  switch (snap.label) {
    case 'remaining_budget':
      return `${actual} / ${target}${unitSuffix} logged vs cap`;
    case 'sum_quantity':
      return `${actual} / ${target}${unitSuffix}`;
    case 'members_completed_period':
      return `${actual} of ${target} members on track`;
    case 'members_completed':
      return `${actual} of ${target} completed`;
    case 'milestones_done':
      return `${actual} / ${target} milestones`;
    default:
      return getClubGoalSnapshotSummary(snap, {
        unit,
        memberGoalCount: clubGoal?.memberGoalCount,
        includeMembersInLine: false,
      }).line;
  }
};

const clampPercent = (n) => {
  if (n == null || Number.isNaN(Number(n))) return 0;
  return Math.min(100, Math.max(0, Number(n)));
};

/**
 * Dashboard club-goal card: bar value, copy, and optional MUI progress color.
 * @param {object} clubGoal - club goal row from overview
 * @param {object} snapshot - aggregate snapshot
 * @returns {{ barValue: number, headline: string, subline: string, barColor: 'primary'|'success'|'warning' }}
 */
export const getClubGoalDashboardProgress = (clubGoal, snapshot) => {
  const snap = snapshot || {};
  const unit = (clubGoal?.unit || '').trim();
  const unitSuffix = unit ? ` ${unit}` : '';
  const members = snap.totalMembers ?? clubGoal?.memberGoalCount ?? 0;
  const actual = Number(snap.actual);
  const target = Number(snap.target);
  const pct = clampPercent(snap.percent);

  const overBudget =
    snap.label === 'remaining_budget' &&
    !Number.isNaN(actual) &&
    !Number.isNaN(target) &&
    target > 0 &&
    actual > target;

  switch (snap.label) {
    case 'remaining_budget': {
      const rem = Math.max(0, target - actual);
      return {
        barValue: pct,
        headline: `${formatClubGoalQuantity(actual)} / ${formatClubGoalQuantity(target)}${unitSuffix}`,
        subline: `${formatClubGoalQuantity(rem)}${unitSuffix} left in club budget · ${members} members`,
        barColor: overBudget ? 'warning' : 'primary',
      };
    }
    case 'sum_quantity':
      return {
        barValue: pct,
        headline: `${formatClubGoalQuantity(actual)} / ${formatClubGoalQuantity(target)}${unitSuffix}`,
        subline: `Club total this period · ${members} members`,
        barColor: 'primary',
      };
    case 'members_completed_period':
      return {
        barValue: pct,
        headline: `${formatClubGoalQuantity(actual)} / ${formatClubGoalQuantity(target)} members`,
        subline: 'Completed this reporting period',
        barColor: 'success',
      };
    case 'members_completed':
      return {
        barValue: pct,
        headline: `${formatClubGoalQuantity(actual)} / ${formatClubGoalQuantity(target)} members`,
        subline: 'Marked complete',
        barColor: 'success',
      };
    case 'milestones_done':
      return {
        barValue: pct,
        headline: `${formatClubGoalQuantity(actual)} / ${formatClubGoalQuantity(target)} milestones`,
        subline: 'Done across the club',
        barColor: 'primary',
      };
    default:
      return {
        barValue: pct,
        headline: `${Math.round(pct)}%`,
        subline: `${members} members`,
        barColor: 'primary',
      };
  }
};

export const PERIOD_LABELS = {
  day: 'today',
  week: 'this week',
  month: 'this month',
  quarter: 'this quarter',
};

export const PERIOD_OVERLINES = {
  day: 'Today',
  week: 'This week',
  month: 'This month',
  quarter: 'This quarter',
};

export const getReportingPeriodKey = (clubGoal) =>
  clubGoal?.reportingPeriod || clubGoal?.cadence || 'day';

export const getPeriodOverline = (clubGoal) => {
  const key = getReportingPeriodKey(clubGoal);
  return PERIOD_OVERLINES[key] || 'Reporting period';
};

export const getPeriodLabel = (clubGoal) =>
  PERIOD_LABELS[getReportingPeriodKey(clubGoal)] || 'this period';

/**
 * One-line headline when dashboard club card is collapsed.
 */
export const getClubGoalCollapsedHeadline = (clubGoal, snapshot) => {
  const snap = snapshot || {};
  const layout = resolveClubGoalLayout(clubGoal);
  const periodLabel = getPeriodLabel(clubGoal);
  const unit = (clubGoal?.unit ?? '').trim();
  const unitShort = formatClubGoalUnitShort(unit);
  const unitSuffix = unit ? ` ${unit}` : '';
  const actual = formatClubGoalQuantity(snap.actual);
  const target = formatClubGoalQuantity(snap.target);

  if (layout === CLUB_GOAL_LAYOUT.REMAINING_BUDGET) {
    const rem = Math.max(0, Number(snap.target) - Number(snap.actual));
    return `${formatClubGoalQuantity(rem)}${unitShort} left ${periodLabel}`;
  }
  if (layout === CLUB_GOAL_LAYOUT.SHARED_TOTAL) {
    return `${actual} / ${target}${unitSuffix} ${periodLabel}`;
  }
  if (layout === CLUB_GOAL_LAYOUT.HABIT) {
    return `${actual} of ${target} members on track ${periodLabel}`;
  }
  if (layout === CLUB_GOAL_LAYOUT.ONE_TIME) {
    return `${actual} of ${target} completed`;
  }
  if (layout === CLUB_GOAL_LAYOUT.MILESTONE) {
    return `${actual} / ${target} milestones done`;
  }
  return `${Math.round(snap.percent ?? 0)}%`;
};

/**
 * Headlines for shared-total (metric increase) dashboard card.
 */
export const getSharedTotalHeadlines = (clubGoal, snapshot, opts = {}) => {
  const snap = snapshot || {};
  const unit = (clubGoal?.unit ?? '').trim();
  const unitShort = formatClubGoalUnitShort(unit);
  const unitSuffix = unit ? ` ${unit}` : '';
  const actual = Number(snap.actual) || 0;
  const target = Number(snap.target) || 0;
  const periodLabel = getPeriodLabel(clubGoal);
  const isIndividual =
    (clubGoal?.contributionMode ?? clubGoal?.contribution_mode) ===
    'individual_target';
  const userTodayActual = Number(opts.userTodayActual) || 0;
  const storedTarget = Number(snap.storedTarget ?? clubGoal?.targetQuantity) || 0;
  const showDailyContext = clubGoal?.cadence === 'day' && storedTarget > 0;

  return {
    periodOverline: getPeriodOverline(clubGoal),
    primaryLine: `${formatClubGoalQuantity(actual)} / ${formatClubGoalQuantity(target)}${unitSuffix} ${periodLabel}`,
    secondaryLine: isIndividual
      ? 'Club total toward combined member targets'
      : 'Club total this reporting period',
    showDailyContext,
    remainingTodayLine: showDailyContext
      ? `${formatClubGoalQuantity(Math.max(0, storedTarget - userTodayActual))}${unitShort} left today`
      : null,
    youLoggedLine:
      userTodayActual > 0
        ? `You logged ${formatClubGoalQuantity(userTodayActual)}${unitShort} today`
        : "You haven't logged today",
    unitSuffix,
    actual,
    target,
  };
};

/**
 * Headlines for habit club goals.
 */
export const getHabitClubHeadlines = (clubGoal, snapshot, opts = {}) => {
  const snap = snapshot || {};
  const periodLabel = getPeriodLabel(clubGoal);
  const measure = clubGoal?.measure === 'count' ? 'check-ins' : 'logged';
  const personalActual = Number(opts.personalActual) || 0;
  const personalTarget = Number(opts.personalTarget) || 0;

  return {
    periodOverline: getPeriodOverline(clubGoal),
    primaryLine: `${formatClubGoalQuantity(snap.actual)} / ${formatClubGoalQuantity(snap.target)} members on track ${periodLabel}`,
    secondaryLine: 'Members who met their personal target this period',
    personalLine:
      personalTarget > 0
        ? `You: ${formatClubGoalQuantity(personalActual)} / ${formatClubGoalQuantity(personalTarget)} ${measure}`
        : null,
  };
};

/**
 * Headlines for one-time club goals.
 */
export const getOneTimeClubHeadlines = (clubGoal, snapshot) => {
  const snap = snapshot || {};
  const dueRaw = clubGoal?.dueAt ?? clubGoal?.due_at;
  let dueLine = null;
  if (dueRaw) {
    try {
      dueLine = `Due ${new Date(dueRaw).toLocaleDateString()}`;
    } catch {
      dueLine = null;
    }
  }

  return {
    periodOverline: 'Club goal',
    primaryLine: `${formatClubGoalQuantity(snap.actual)} / ${formatClubGoalQuantity(snap.target)} completed`,
    secondaryLine: dueLine || 'Mark complete when finished',
    dueLine,
  };
};

/**
 * Headlines for milestone club goals.
 */
export const getMilestoneClubHeadlines = (clubGoal, snapshot) => {
  const snap = snapshot || {};
  const periodLabel = getPeriodLabel(clubGoal);

  return {
    periodOverline: getPeriodOverline(clubGoal),
    primaryLine: `${formatClubGoalQuantity(snap.actual)} / ${formatClubGoalQuantity(snap.target)} milestones done`,
    secondaryLine: `Across all members ${periodLabel}`,
  };
};

/** Distinct bar colors per member (stable by user id, not contribution size). */
const CLUB_MEMBER_SEGMENT_COLORS = [
  '#8B6914',
  '#5C7A5A',
  '#6B5B95',
  '#C17C5C',
  '#4A7C8C',
  '#9B6B6B',
  '#7A6B4F',
  '#5A6B8C',
  '#8C6B5A',
  '#4F7A6B',
  '#6B4F7A',
  '#7A8C4F',
  '#B7472A',
  '#3B7A57',
  '#8E4585',
  '#D4A017',
  '#264653',
  '#A0522D',
  '#5D8A66',
  '#8E5572',
  '#2A6F97',
  '#C7522A',
  '#4F5D2F',
  '#7D5BA6',
];

/**
 * Stable segment color for a club member (same user → same color across views).
 * @param {string} userId
 * @returns {string}
 */
export const getClubMemberSegmentColor = (userId) => {
  const id = String(userId || '');
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % CLUB_MEMBER_SEGMENT_COLORS.length;
  return CLUB_MEMBER_SEGMENT_COLORS[index];
};

/**
 * Build segment bar data from member breakdown rows.
 *
 * Each member keeps a stable hash-based base color, but if two adjacent
 * segments end up with the same color, the second one is shifted to the
 * nearest unused palette entry so colors never touch.
 */
export const buildMemberContributionSegments = (
  members,
  { totalMax, includeZero = false } = {},
) => {
  const max = Math.max(
    Number(totalMax) || 0,
    ...members.map((m) => Number(m.actual) || 0),
    0.001,
  );
  const ordered = members
    .filter((m) => includeZero || (Number(m.actual) || 0) > 0)
    .map((m) => {
      const value = Number(m.actual) || 0;
      return {
        userId: m.userId,
        name: m.user?.displayName || 'Member',
        user: m.user || { uid: m.userId, displayName: m.user?.displayName },
        value,
        fill: getClubMemberSegmentColor(m.userId),
        widthPct: (value / max) * 100,
      };
    })
    .sort((a, b) => b.value - a.value);

  const usedFills = new Set();
  for (let i = 0; i < ordered.length; i += 1) {
    const prevFill = i > 0 ? ordered[i - 1].fill : null;
    if (ordered[i].fill !== prevFill && !usedFills.has(ordered[i].fill)) {
      usedFills.add(ordered[i].fill);
      continue;
    }
    const baseIndex = CLUB_MEMBER_SEGMENT_COLORS.indexOf(ordered[i].fill);
    for (let step = 1; step <= CLUB_MEMBER_SEGMENT_COLORS.length; step += 1) {
      const candidate =
        CLUB_MEMBER_SEGMENT_COLORS[
          (baseIndex + step) % CLUB_MEMBER_SEGMENT_COLORS.length
        ];
      if (candidate !== prevFill && !usedFills.has(candidate)) {
        ordered[i].fill = candidate;
        break;
      }
    }
    usedFills.add(ordered[i].fill);
  }

  return ordered;
};

/**
 * Avatar row status for habit / one-time layouts.
 */
export const getMemberAvatarStatus = (member, clubGoal) => {
  if (clubGoal?.type === 'one_time') {
    return member.completed ? 'completed' : 'pending';
  }
  if (clubGoal?.type === 'habit') {
    if (member.periodCompleted) return 'on_track';
    if ((Number(member.actual) || 0) > 0) return 'in_progress';
    return 'pending';
  }
  return 'pending';
};

/** Compact unit suffix for headlines (e.g. "h" for hours). */
export const formatClubGoalUnitShort = (unit) => {
  const u = (unit || '').trim().toLowerCase();
  if (!u) return '';
  if (u === 'hours' || u === 'hour' || u === 'hrs' || u === 'hr') return 'h';
  if (u.length <= 3) return u;
  return ` ${u}`;
};

/**
 * @deprecated Use getClubMemberSegmentColor for bar segments.
 */
export const getMemberSeverityColor = ({ actual, fairShare }) => {
  const a = Number(actual) || 0;
  const f = Number(fairShare) || 0;
  if (f <= 0) return 'success';
  if (a > f * 1.5) return 'error';
  if (a > f) return 'warning';
  return 'success';
};

/**
 * Headlines for remaining-budget dashboard card.
 * @param {object} clubGoal
 * @param {object} snapshot
 * @param {{ userTodayActual?: number }} [opts]
 */
export const getRemainingBudgetHeadlines = (clubGoal, snapshot, opts = {}) => {
  const snap = snapshot || {};
  const unit = (clubGoal?.unit || '').trim();
  const unitShort = formatClubGoalUnitShort(unit);
  const unitSuffix = unit ? ` ${unit}` : '';
  const actual = Number(snap.actual) || 0;
  const target = Number(snap.target) || 0;
  const remainingPeriod = Math.max(0, target - actual);
  const periodKey = getReportingPeriodKey(clubGoal);
  const periodLabel = PERIOD_LABELS[periodKey] || 'this period';

  const storedTarget = Number(snap.storedTarget ?? clubGoal?.targetQuantity) || 0;
  const userTodayActual = Number(opts.userTodayActual) || 0;
  const remainingToday = Math.max(0, storedTarget - userTodayActual);

  const showDailyContext = clubGoal?.cadence === 'day' && storedTarget > 0;
  const youLoggedLine =
    userTodayActual > 0
      ? `You logged ${formatClubGoalQuantity(userTodayActual)}${unitShort} today`
      : "You haven't logged today";

  return {
    remainingPeriodLine: `${formatClubGoalQuantity(remainingPeriod)}${unitShort} left ${periodLabel}`,
    usedOverTotalLine: `${formatClubGoalQuantity(actual)} / ${formatClubGoalQuantity(target)}${unitSuffix} used`,
    periodOverline:
      periodKey === 'day'
        ? 'Today'
        : periodKey === 'week'
          ? 'This week'
          : periodKey === 'month'
            ? 'This month'
            : periodKey === 'quarter'
              ? 'This quarter'
              : 'Reporting period',
    remainingTodayLine: showDailyContext
      ? `${formatClubGoalQuantity(remainingToday)}${unitShort} left today`
      : null,
    youLoggedLine: showDailyContext ? youLoggedLine : null,
    showDailyContext,
    remainingPeriod,
    remainingToday,
    actual,
    target,
    storedTarget,
    periodLabel,
    unitShort,
    unitSuffix,
  };
};

/** Club metric where members are compared to a fair share of the period cap. */
export const isClubGoalBudgetSharing = (clubGoal) => {
  const direction =
    clubGoal?.progressDirection ?? clubGoal?.progress_direction;
  return (
    clubGoal?.type === 'metric' &&
    (direction === 'stay_under' || direction === 'decrease')
  );
};

/**
 * Period total for one member (matches club header / bar segments).
 * @param {object} member
 * @param {object} clubGoal
 * @returns {string}
 */
export const getClubMemberPeriodContributionLine = (member, clubGoal) => {
  const unit = (clubGoal?.unit || '').trim();
  const unitSuffix = unit ? ` ${unit}` : '';
  const periodLabel = PERIOD_LABELS[getReportingPeriodKey(clubGoal)] || 'this period';
  const actual = formatClubGoalQuantity(member.actual);

  if (clubGoal?.type === 'milestone') {
    const done = member.milestonesCompleted ?? member.actual ?? 0;
    const total = member.milestonesTotal ?? member.target ?? 0;
    return `${formatClubGoalQuantity(done)} / ${formatClubGoalQuantity(total)} milestones ${periodLabel}`;
  }
  if (clubGoal?.type === 'one_time') {
    return member.completed ? 'Completed' : 'Not completed';
  }
  if (clubGoal?.type === 'habit') {
    const measure = clubGoal?.measure === 'count' ? 'check-ins' : unitSuffix || 'logged';
    return `${actual} ${measure.trim()} ${periodLabel}`;
  }
  return `${actual}${unitSuffix} ${periodLabel}`;
};

/**
 * Over / on / under vs fair share of the club period cap (stay-under metrics).
 * @param {object} member
 * @param {number} fairSharePeriod
 * @param {object} clubGoal
 * @returns {{ label: string, chipColor: 'default'|'success'|'error' }|null}
 */
export const getClubMemberBudgetStatus = (member, fairSharePeriod, clubGoal) => {
  if (!isClubGoalBudgetSharing(clubGoal)) {
    return null;
  }
  const actual = Number(member.actual) || 0;
  const fair = Number(fairSharePeriod) || 0;
  if (fair <= 0) {
    return null;
  }
  const tolerance = Math.max(fair * 0.02, 0.05);
  if (actual > fair + tolerance) {
    return { label: 'Over budget', chipColor: 'error' };
  }
  if (actual < fair - tolerance) {
    return { label: 'Under budget', chipColor: 'success' };
  }
  return { label: 'On budget', chipColor: 'default' };
};

/** @deprecated Use getClubMemberPeriodContributionLine */
export const getClubMemberContributionLine = getClubMemberPeriodContributionLine;

/** @deprecated Use resolveClubGoalLayout === CLUB_GOAL_LAYOUT.REMAINING_BUDGET */
export const isRemainingBudgetClubGoal = (clubGoalOrGoal) =>
  resolveClubGoalLayout(clubGoalOrGoal) === CLUB_GOAL_LAYOUT.REMAINING_BUDGET;

const getPeriodElapsedFraction = (periodKey) => {
  const now = new Date();
  if (periodKey === 'day') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return (now - start) / (end - start);
  }
  if (periodKey === 'week') {
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return (now - start) / (end - start);
  }
  if (periodKey === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return (now - start) / (end - start);
  }
  if (periodKey === 'quarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), qMonth, 1);
    const end = new Date(now.getFullYear(), qMonth + 3, 1);
    return (now - start) / (end - start);
  }
  return 0.5;
};

/**
 * One contextual insight line for the remaining-budget card.
 */
export const getRemainingBudgetInsight = ({ snapshot, breakdown, clubGoal }) => {
  const snap = snapshot || {};
  const actual = Number(snap.actual) || 0;
  const target = Number(snap.target) || 0;
  if (target > 0 && actual > target) {
    const overPct = Math.round(((actual - target) / target) * 100);
    return `Trending ${overPct}% over budget`;
  }

  const elapsed = getPeriodElapsedFraction(getReportingPeriodKey(clubGoal));
  if (target > 0 && elapsed > 0.05) {
    const expectedUsed = target * elapsed;
    if (actual > expectedUsed * 1.1) {
      const paceOver = Math.round(((actual / expectedUsed) - 1) * 100);
      return `Trending ${paceOver}% over budget`;
    }
  }

  const logged = breakdown?.todayMembersLogged ?? 0;
  if (logged > 0) {
    return `${logged} member${logged === 1 ? '' : 's'} logged today`;
  }

  return 'On pace to finish under budget';
};
