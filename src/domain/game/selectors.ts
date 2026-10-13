// Pure derivations from the event log. No React, no aliases: runs in the browser and in node (scripts/state-checks.mjs).
// Mastery here is a small stand-in for the server model (BE-21): +0.25 right, -0.15 typical mistake, -0.10 other mistake.
import { CHALLENGES, SKILLS, WELCOME_CARD, WORLDS, WORLD_IDS, skillById, type Lang } from './catalog.ts';
import type { GameEvent } from './events.ts';
import type { CardView, ChallengeView, WorldId } from './types.ts';
import { passes, READY_AHEAD } from './rules.ts';

const DAY = 86_400_000;
const MASTERED = 0.75;
const iso = (t: number) => new Date(t).toISOString();
/**
 * Local calendar date of a timestamp as YYYY-MM-DD, using the device time zone. Daily rules (streak, goal,
 * quest) compare these keys, so a day ends at local midnight.
 */
export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

type Answer = Extract<GameEvent, { k: 'answer' }>;
type Start = Extract<GameEvent, { k: 'start' }>;
type Finish = Extract<GameEvent, { k: 'finish' }>;

const answers = (ev: GameEvent[]) => ev.filter((e): e is Answer => e.k === 'answer');
const finishes = (ev: GameEvent[]) => ev.filter((e): e is Finish => e.k === 'finish' && e.done);

// ───────── mastery and journey ─────────
export function masteryOf(events: GameEvent[], world: WorldId, skill: string, now: number) {
  let m = 0;
  let peak = 0;
  let attempts = 0;
  let correct = 0;
  let last = 0;
  const days = new Set<string>();
  for (const a of answers(events)) {
    if (a.world !== world || a.skill !== skill) continue;
    attempts++;
    last = a.t;
    if (a.outcome === 'correct') {
      m = Math.min(1, m + 0.25);
      correct++;
      days.add(dayKey(a.t));
    } else m = Math.max(0, m - (a.outcome === 'erreur_typique' ? 0.15 : 0.1));
    peak = Math.max(peak, m);
  }
  const idle = last ? Math.max(0, (now - last) / DAY - 3) : 0;
  return { m: Math.max(0, m - 0.05 * idle), peak, attempts, correct, last, days };
}

/** A step is completed once a finished chapter on it reached the pass threshold (70 percent by default). */
export function completedSkills(events: GameEvent[], world: WorldId): Set<string> {
  const done = new Set<string>();
  for (const s of sessionsOf(events)) {
    if (s.world !== world || s.status !== 'completed') continue;
    const right = s._answers.filter((a) => a.outcome === 'correct').length;
    if (passes(right, s._answers.length)) done.add(s._skill);
  }
  return done;
}

/**
 * Builds the map for one world, one node per skill. A skill is completed after a finished chapter that passes
 * the threshold; the first (completed + READY_AHEAD) skills are open and the rest locked. A completed skill is
 * mastered, or needs_review when not played for over 7 days.
 */
export function journeyNodes(events: GameEvent[], world: WorldId, now: number, lang: Lang) {
  const completed = completedSkills(events, world);
  // Two steps are always ready beyond the completed ones; finishing a step opens the next
  const open = completed.size + READY_AHEAD;
  return SKILLS.map((s, i) => {
    const me = masteryOf(events, world, s.id, now);
    let state: 'locked' | 'available' | 'in_progress' | 'mastered' | 'needs_review';
    if (completed.has(s.id)) state = (now - me.last) / DAY > 7 ? 'needs_review' : 'mastered';
    else if (i >= open) state = 'locked';
    else state = me.attempts > 0 ? 'in_progress' : 'available';
    return {
      skill_id: s.id,
      label: s.label[lang],
      state,
      position: { row: i, col: s.col },
      level: state === 'mastered' ? Math.min(5, me.days.size) : 0,
      next_review_at: state === 'needs_review' ? iso(now) : null,
    };
  });
}

/**
 * Picks the skill to play next from journey nodes: first needs_review, then in_progress, then available, falling
 * back to the last node.
 */
export function currentSkill(nodes: ReturnType<typeof journeyNodes>) {
  const pick = (st: string) => nodes.find((n) => n.state === st);
  return (pick('needs_review') ?? pick('in_progress') ?? pick('available') ?? nodes[nodes.length - 1]).skill_id;
}

/** Journey response for a world: its nodes plus the id of the skill to play next. */
export function journey(events: GameEvent[], world: WorldId, now: number, lang: Lang) {
  const nodes = journeyNodes(events, world, now, lang);
  return { world, nodes, current_skill_id: currentSkill(nodes) };
}

/** Minutes played today (from sessions started today) and the last time the child played, for reminders. */
export function playToday(events: GameEvent[], now: number) {
  const today = dayKey(now);
  let minutes = 0;
  let last = 0;
  for (const s of sessionsOf(events)) {
    last = Math.max(last, s._end);
    if (dayKey(s._start) === today) minutes += Math.max(1, Math.round((s._end - s._start) / 60_000));
  }
  return { minutes, lastPlayedAt: last ? iso(last) : null };
}

// ───────── sessions ─────────
export function sessionsOf(events: GameEvent[], childId = 'local') {
  const map = new Map<string, { start: Start; answers: Answer[]; finish?: Finish }>();
  for (const e of events) {
    if (e.k === 'start') map.set(e.sid, { start: e, answers: [] });
    else if (e.k === 'answer') map.get(e.sid)?.answers.push(e);
    else if (e.k === 'finish') {
      const s = map.get(e.sid);
      if (s) s.finish = e;
    }
  }
  return [...map.values()]
    .map((s) => ({
      id: s.start.sid,
      child_id: childId,
      world: s.start.world,
      kind: s.start.mode === 'daily_quest' ? ('daily_quest' as const) : s.start.mode === 'onboarding' ? ('onboarding' as const) : ('chapter' as const),
      status: s.finish ? (s.finish.done ? ('completed' as const) : ('abandoned' as const)) : ('active' as const),
      chapter_length: 3,
      beats_answered: s.answers.length,
      current_beat: null,
      story_title: s.finish?.title ?? null,
      started_at: iso(s.start.t),
      ended_at: s.finish ? iso(s.finish.t) : null,
      _skill: s.start.skill,
      _answers: s.answers,
      _start: s.start.t,
      _end: s.finish?.t ?? s.answers[s.answers.length - 1]?.t ?? s.start.t,
    }))
    .sort((a, b) => b._start - a._start);
}

const strip = <T extends { _skill: string; _answers: Answer[]; _start: number; _end: number }>(s: T) => {
  const { _skill, _answers, _start, _end, ...rest } = s;
  void _skill; void _answers; void _start; void _end;
  return rest;
};

/** All sessions in the log for a child, newest first, without the internal fields used by other selectors. */
export const sessionList = (events: GameEvent[], childId?: string) => sessionsOf(events, childId).map(strip);

/**
 * Groups typical-error answers (outcome erreur_typique) by the skill's known misconception, listing the affected
 * skills and the description in the given language. Other wrong answers are ignored.
 */
export function misconceptionsOf(list: Answer[], lang: Lang) {
  const by = new Map<string, { code: string; description: string; skill_ids: Set<string> }>();
  for (const a of list) {
    if (a.outcome !== 'erreur_typique') continue;
    const sk = skillById(a.skill);
    if (!sk) continue;
    const cur = by.get(sk.misconception.code) ?? { code: sk.misconception.code, description: sk.misconception.description[lang], skill_ids: new Set<string>() };
    cur.skill_ids.add(a.skill);
    by.set(sk.misconception.code, cur);
  }
  return [...by.values()].map((m) => ({ code: m.code, description: m.description, skill_ids: [...m.skill_ids] }));
}

/**
 * Recap of one session by id, or null if unknown. Includes duration (at least 30 s), a localized recap sentence,
 * the skill with its attempts and correct count, whether it is new or consolidation, and the stuck points.
 */
export function sessionSummary(events: GameEvent[], sid: string, lang: Lang, childId?: string) {
  const full = sessionsOf(events, childId).find((s) => s.id === sid);
  if (!full) return null;
  const skill = skillById(full._skill);
  const correct = full._answers.filter((a) => a.outcome === 'correct').length;
  const firstTime = !events.some((e) => e.k === 'answer' && e.world === full.world && e.skill === full._skill && e.t < full._start);
  const worldName = WORLDS[full.world].name[lang];
  const recap =
    lang === 'fr'
      ? `${correct} bonne${correct > 1 ? 's' : ''} réponse${correct > 1 ? 's' : ''} sur ${full._answers.length} dans le monde ${worldName}${full.status === 'abandoned' ? ' (chapitre quitté avant la fin)' : ''}.`
      : `${correct} right answer${correct === 1 ? '' : 's'} out of ${full._answers.length} in the ${worldName} world${full.status === 'abandoned' ? ' (chapter left before the end)' : ''}.`;
  return {
    session: strip(full),
    duration_seconds: Math.max(30, Math.round((full._end - full._start) / 1000)),
    story_recap: recap,
    skills: [
      {
        skill_id: full._skill,
        label: skill?.label[lang] ?? full._skill,
        reason: firstTime ? ('nouvelle' as const) : ('consolidation' as const),
        attempts: full._answers.length,
        correct,
      },
    ],
    stuck_points: misconceptionsOf(full._answers, lang),
  };
}

// ───────── progress, growth, engagement ─────────
export function progress(events: GameEvent[], now: number, lang: Lang) {
  const skills = SKILLS.map((s) => {
    let best = { m: 0, peak: 0, attempts: 0, correct: 0, last: 0, days: new Set<string>() };
    let attempts = 0;
    for (const w of WORLD_IDS) {
      const me = masteryOf(events, w, s.id, now);
      attempts += me.attempts;
      if (me.m > best.m || me.last > best.last) best = { ...me, m: Math.max(best.m, me.m), last: Math.max(best.last, me.last) };
    }
    const state = best.m >= MASTERED ? 'mastered' : best.peak >= MASTERED ? 'needs_review' : attempts > 0 ? 'in_progress' : 'available';
    return {
      skill_id: s.id,
      mastery: Math.round(best.m * 100) / 100,
      state: state as 'mastered' | 'needs_review' | 'in_progress' | 'available',
      attempts,
      last_practiced_at: best.last ? iso(best.last) : null,
      next_review_at: state === 'needs_review' ? iso(now) : null,
    };
  });
  return { skills, misconceptions: misconceptionsOf(answers(events).filter((a) => now - a.t < 30 * DAY), lang) };
}

/**
 * Compares the last windowDays (default 7) with the window before: chapters finished, skills that crossed the
 * mastered level of 0.75 inside the window, and minutes played (each session counts 1 to 20 minutes, sessions
 * without answers are skipped).
 */
export function growth(events: GameEvent[], now: number, windowDays = 7) {
  const span = windowDays * DAY;
  const period = (from: number, to: number) => {
    const inside = (t: number) => t >= from && t < to;
    const chapters = finishes(events).filter((f) => inside(f.t)).length;
    let skillsMastered = 0;
    for (const w of WORLD_IDS) {
      for (const s of SKILLS) {
        let m = 0;
        for (const a of answers(events)) {
          if (a.world !== w || a.skill !== s.id) continue;
          const before = m;
          m = a.outcome === 'correct' ? Math.min(1, m + 0.25) : Math.max(0, m - (a.outcome === 'erreur_typique' ? 0.15 : 0.1));
          if (before < MASTERED && m >= MASTERED && inside(a.t)) skillsMastered++;
        }
      }
    }
    let minutes = 0;
    for (const s of sessionsOf(events)) {
      if (!inside(s._start) || s._answers.length === 0) continue;
      minutes += Math.max(1, Math.min(20, Math.round((s._end - s._start) / 60000)));
    }
    return { chapters_completed: chapters, skills_mastered: skillsMastered, minutes_played: minutes };
  };
  return { window_days: windowDays, current: period(now - span, now + 1), previous: period(now - 2 * span, now - span) };
}

/**
 * Streak and daily goal. The current streak counts consecutive local days with a finished chapter ending today
 * or yesterday; the daily goal compares chapters finished today with goalTarget.
 */
export function engagement(events: GameEvent[], now: number, goalTarget = 1) {
  const days = [...new Set(finishes(events).map((f) => dayKey(f.t)))].sort();
  const set = new Set(days);
  let current = 0;
  let cursor = now;
  if (!set.has(dayKey(cursor))) cursor -= DAY;
  while (set.has(dayKey(cursor))) {
    current++;
    cursor -= DAY;
  }
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of days) {
    const t = new Date(`${d}T12:00:00`).getTime();
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }
  const today = dayKey(now);
  return {
    streak: { current_days: current, longest_days: Math.max(longest, current), last_active_date: days.length ? days[days.length - 1] : null },
    daily_goal: { target_chapters: goalTarget, done_chapters: finishes(events).filter((f) => dayKey(f.t) === today).length },
  };
}

// ───────── cards, gift ─────────
export function cards(events: GameEvent[]): CardView[] {
  const seen = new Map<string, CardView>();
  for (const e of events) if (e.k === 'card' && !seen.has(e.card.id)) seen.set(e.card.id, e.card);
  return [...seen.values()].sort((a, b) => b.earnedAt.localeCompare(a.earnedAt));
}

/**
 * Converts a locally earned card to the server's StoryCard shape, with empty image and session id since none
 * exist locally.
 */
export const toStoryCard = (c: CardView) => ({ id: c.id, world: c.world, title: c.title, image_url: '', session_id: '', earned_at: c.earnedAt });
/** The child's cards in server StoryCard shape, newest first. */
export const collection = (events: GameEvent[]) => cards(events).map(toStoryCard);
/** True once the welcome gift event is in the log. */
export const giftClaimed = (events: GameEvent[]) => events.some((e) => e.k === 'gift');
/** True once the guided-tour event is in the log, so the tour is shown only once. */
export const tourDone = (events: GameEvent[]) => events.some((e) => e.k === 'tour');
/** Builds the welcome card, titled in the given language, with earnedAt set to now and source 'welcome'. */
export const welcomeCard = (now: number, lang: Lang): CardView => ({ id: WELCOME_CARD.id, world: WELCOME_CARD.world, title: WELCOME_CARD.title[lang], earnedAt: iso(now), source: 'welcome' });

// ───────── challenges ─────────
function metricValue(events: GameEvent[], metric: string, since: number) {
  const after = events.filter((e) => e.t >= since);
  switch (metric) {
    case 'chapters_done':
      return finishes(after).length;
    case 'correct_streak': {
      let best = 0;
      let run = 0;
      for (const a of answers(after)) {
        run = a.outcome === 'correct' ? run + 1 : 0;
        best = Math.max(best, run);
      }
      return best;
    }
    case 'worlds_played':
      return new Set(after.filter((e): e is Start => e.k === 'start').map((s) => s.world)).size;
    case 'likes': {
      const liked = new Set<string>();
      for (const e of after) {
        if (e.k !== 'react') continue;
        if (e.liked) liked.add(e.item);
        else liked.delete(e.item);
      }
      return liked.size;
    }
    case 'puzzles_correct':
      return after.filter((e) => e.k === 'puzzle' && e.outcome === 'correct').length;
    case 'days_played':
      return new Set(finishes(after).map((f) => dayKey(f.t))).size;
    default:
      return 0;
  }
}

const ORDER: Record<ChallengeView['status'], number> = { active: 0, available: 1, done: 2 };

/**
 * Every challenge with status: available (not accepted), active (accepted, target not reached) or done. Progress
 * counts events since acceptance, capped at the target. Sorted active, available, done.
 */
export function challengeViews(events: GameEvent[], lang: Lang): ChallengeView[] {
  return CHALLENGES.map((c): ChallengeView => {
    const accepted = events.find((e) => e.k === 'accept' && e.id === c.id);
    const progress = accepted ? Math.min(c.target, metricValue(events, c.metric, accepted.t)) : 0;
    const status: ChallengeView['status'] = !accepted ? 'available' : progress >= c.target ? 'done' : 'active';
    return { id: c.id, title: c.title[lang], description: c.description[lang], target: c.target, progress, status, rewardLabel: c.reward[lang], emoji: c.emoji };
  }).sort((x, y) => ORDER[x.status] - ORDER[y.status]);
}

/** Cards owed for completed challenges that have none yet. Idempotent: the card id is `ch-<challenge>`. */
export function challengeRewards(events: GameEvent[], now: number, lang: Lang): CardView[] {
  const have = new Set(cards(events).map((c) => c.id));
  return challengeViews(events, lang)
    .filter((v) => v.status === 'done' && !have.has(`ch-${v.id}`))
    .map((v) => {
      const def = CHALLENGES.find((c) => c.id === v.id)!;
      return { id: `ch-${v.id}`, world: def.world, title: def.cardTitle[lang], earnedAt: iso(now), source: 'challenge' as const };
    });
}

/** Number of challenges not yet done (active or available), for badges. */
export const activeChallengeCount = (events: GameEvent[], lang: Lang) => challengeViews(events, lang).filter((v) => v.status !== 'done').length;

// ───────── home and reports ─────────
export function worldList(lang: Lang) {
  return WORLD_IDS.map((id) => ({
    id,
    name: WORLDS[id].name[lang],
    tagline: WORLDS[id].name[lang],
    image_url: '',
    accent_color: WORLDS[id].accent,
    hook: WORLDS[id].hook[lang],
    skill_count: SKILLS.length,
  }));
}

/**
 * Everything the home screen shows: the suggested next skill (in the world of the last started session, nature
 * by default), today's quest, worlds, the 4 latest cards, engagement and growth. The quest targets skills
 * needing review, else the current skill, and is completed by a finished daily-quest session today.
 */
export function home(events: GameEvent[], now: number, lang: Lang, goalTarget = 1) {
  const lastStart = [...events].reverse().find((e): e is Start => e.k === 'start');
  const world: WorldId = lastStart?.world ?? 'nature';
  const j = journey(events, world, now, lang);
  const needs = j.nodes.filter((n) => n.state === 'needs_review').map((n) => n.skill_id);
  const questDone = sessionsOf(events).some((s) => s.kind === 'daily_quest' && s.status === 'completed' && dayKey(s._start) === dayKey(now));
  return {
    suggested: { world, skill_id: j.current_skill_id, label: skillById(j.current_skill_id)?.label[lang] ?? '', open_session: null },
    quest: { available: true, completed: questDone, skill_ids: needs.length ? needs : [j.current_skill_id] },
    worlds: worldList(lang),
    recent_cards: collection(events).slice(0, 4),
    engagement: engagement(events, now, goalTarget),
    growth: growth(events, now),
  };
}

/**
 * Parent report over the last 7 days: sessions, distinct days played, skills practised, stuck points and growth.
 * week_start is the Monday of the current week.
 */
export function weeklyReport(events: GameEvent[], childId: string, now: number, lang: Lang) {
  const from = now - 7 * DAY;
  const recent = sessionsOf(events, childId).filter((s) => s._start >= from);
  const monday = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return {
    child_id: childId,
    week_start: dayKey(monday.getTime()),
    sessions: recent.length,
    days_played: new Set(recent.map((s) => dayKey(s._start))).size,
    skills_practised: [...new Set(recent.map((s) => s._skill))],
    stuck_points: misconceptionsOf(recent.flatMap((s) => s._answers), lang),
    growth: growth(events, now),
  };
}

/** Skills in needs_review across all worlds, each due now. Feeds reminders and the review count. */
export const reviewsDue = (events: GameEvent[], now: number, lang: Lang) =>
  WORLD_IDS.flatMap((w) => journeyNodes(events, w, now, lang).filter((n) => n.state === 'needs_review').map((n) => ({ skill_id: n.skill_id, label: n.label, due_at: iso(now) })));
