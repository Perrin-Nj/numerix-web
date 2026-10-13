// Pure checks of the local game state selectors (node, no browser). One line per check.
import * as S from '../src/domain/game/selectors.ts';
import { setCardThresholdPct } from '../src/domain/game/rules.ts';

const DAY = 86_400_000;
const T0 = new Date('2026-10-13T10:00:00').getTime();
let fails = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${cond ? '' : ` ${extra}`}`);
  if (!cond) fails++;
};

const start = (t, sid, world, skill, mode = 'chapter') => ({ t, k: 'start', sid, world, skill, mode });
const ans = (t, sid, world, skill, outcome, i) => ({ t, k: 'answer', sid, world, skill, outcome, i });
const fin = (t, sid, done = true, title) => ({ t, k: 'finish', sid, done, title });
const chapter = (t, sid, world, skill, outcomes, done = true) => [
  start(t, sid, world, skill),
  ...outcomes.map((o, i) => ans(t + 1000 * (i + 1), sid, world, skill, o, i)),
  fin(t + 4000, sid, done, 'Titre'),
];
const SK = ['ARI-OPE-A02a', 'ARI-OPE-A03a', 'ARI-OPE-A05', 'ARI-OPE-A06a', 'ARI-SOP-A03a', 'ARI-OPE-A07a', 'ARI-SEN-A01c'];
const card = (id, t = T0) => ({ id, world: 'nature', title: 'A', earnedAt: new Date(t).toISOString(), source: 'chapter' });

// Journey starts honest
let ev = [];
let nodes = S.journeyNodes(ev, 'nature', T0, 'fr');
ok('new child: two steps ready, the rest locked', nodes[0].state === 'available' && nodes[1].state === 'available' && nodes.slice(2).every((n) => n.state === 'locked'));
ok('current skill is the first one', S.currentSkill(nodes) === SK[0]);

// A perfect chapter masters the node and unlocks the next, only in that world
ev = chapter(T0, 's1', 'nature', SK[0], ['correct', 'correct', 'correct']);
nodes = S.journeyNodes(ev, 'nature', T0 + 60_000, 'fr');
ok('3 correct answers master the node', nodes[0].state === 'mastered' && nodes[0].level === 1);
ok('finishing a step opens one more (always two ready ahead)', nodes[1].state === 'available' && nodes[2].state === 'available' && nodes[3].state === 'locked');
ok('other worlds are untouched', S.journeyNodes(ev, 'espace', T0, 'fr')[0].state === 'available');
ok('current skill moves on', S.currentSkill(nodes) === SK[1]);

// A chapter completes only at the pass threshold (70 percent): 2 of 3 is not enough, 3 of 3 is
ev = chapter(T0, 's70', 'nature', SK[0], ['correct', 'correct', 'erreur_typique']);
nodes = S.journeyNodes(ev, 'nature', T0 + 10_000, 'fr');
ok('2 of 3 right does not complete the step at 70 percent', nodes[0].state === 'in_progress' && nodes[2].state === 'locked');
setCardThresholdPct(66);
nodes = S.journeyNodes(ev, 'nature', T0 + 10_000, 'fr');
ok('with the threshold at 66 percent 2 of 3 completes it', nodes[0].state === 'mastered' && nodes[2].state === 'available');
setCardThresholdPct(70);

// Mistakes matter
ev = chapter(T0, 's2', 'nature', SK[0], ['erreur_typique', 'erreur_aleatoire', 'correct']);
nodes = S.journeyNodes(ev, 'nature', T0 + 10_000, 'fr');
ok('mixed answers leave the node in progress', nodes[0].state === 'in_progress');
const stuck = S.progress(ev, T0 + 10_000, 'fr').misconceptions;
ok('typical error becomes a stuck point', stuck.length === 1 && stuck[0].code === 'retenue_oubliee');

// Forgetting
ev = chapter(T0, 's3', 'nature', SK[0], ['correct', 'correct', 'correct']);
ok('mastered node needs review after 10 days', S.journeyNodes(ev, 'nature', T0 + 10 * DAY, 'fr')[0].state === 'needs_review');
ok('review is due in the reviews list', S.reviewsDue(ev, T0 + 10 * DAY, 'fr').length === 1);

// Streak, goal, growth
ev = [...chapter(T0 - 2 * DAY, 'a', 'nature', SK[0], ['correct']), ...chapter(T0 - DAY, 'b', 'espace', SK[0], ['correct']), ...chapter(T0, 'c', 'sport', SK[0], ['correct'])];
let e = S.engagement(ev, T0 + 60_000, 1);
ok('3 days in a row make a streak of 3', e.streak.current_days === 3 && e.streak.longest_days === 3);
ok('daily goal counts today only', e.daily_goal.done_chapters === 1 && e.daily_goal.target_chapters === 1);
e = S.engagement(ev, T0 + 3 * DAY, 1);
ok('a fully missed day resets the streak quietly', e.streak.current_days === 0 && e.streak.longest_days === 3);
const g = S.growth(ev, T0 + 60_000);
ok('growth counts chapters this week', g.current.chapters_completed === 3 && g.previous.chapters_completed === 0);
ok('exited chapters do not count as finished', S.engagement(chapter(T0, 'x', 'nature', SK[0], ['correct'], false), T0 + 1000).daily_goal.done_chapters === 0);

// Sessions, summary, exit
ev = [...chapter(T0, 'ok1', 'nature', SK[0], ['correct', 'erreur_typique', 'correct']), ...chapter(T0 + DAY / 2, 'out1', 'cuisine', SK[2], ['correct'], false)];
const list = S.sessionList(ev, 'kid1');
ok('sessions are newest first, marked completed or abandoned', list[0].status === 'abandoned' && list[1].status === 'completed');
const sum = S.sessionSummary(ev, 'ok1', 'en', 'kid1');
ok('summary counts right answers and shows the stuck point', sum.skills[0].correct === 2 && sum.skills[0].attempts === 3 && sum.stuck_points.length === 1);
ok('exited session recap says so', S.sessionSummary(ev, 'out1', 'en').story_recap.includes('left before the end'));

// Cards and gift
ev = [{ t: T0, k: 'card', card: card('c1') }, { t: T0 + 1, k: 'card', card: card('c1') }];
ok('cards are unique by id', S.cards(ev).length === 1 && S.collection(ev)[0].image_url === '');
ok('gift is claimed once', S.giftClaimed([]) === false && S.giftClaimed([{ t: 1, k: 'gift' }]) === true);

// Challenges
let ch = S.challengeViews([], 'fr');
ok('7 challenges, all available at first', ch.length === 7 && ch.every((c) => c.status === 'available'));
ev = [{ t: T0 - 1, k: 'accept', id: 'first_steps' }, { t: T0 - 1, k: 'accept', id: 'sharp_three' }, ...chapter(T0, 'z', 'nature', SK[0], ['correct', 'correct', 'correct'])];
ch = S.challengeViews(ev, 'fr');
const byId = Object.fromEntries(ch.map((c) => [c.id, c]));
ok('a finished chapter completes "first steps"', byId.first_steps.status === 'done' && byId.first_steps.progress === 1);
ok('3 right in a row completes "hat trick"', byId.sharp_three.status === 'done');
ok('challenges not accepted do not progress', byId.story_marathon.progress === 0 && byId.story_marathon.status === 'available');
const owed = S.challengeRewards(ev, T0 + 5, 'fr');
ok('each completed challenge owes one card', owed.length === 2 && owed.every((c) => c.id.startsWith('ch-')));
ok('rewards are idempotent once the cards exist', S.challengeRewards([...ev, ...owed.map((c) => ({ t: T0 + 6, k: 'card', card: c }))], T0 + 7, 'fr').length === 0);
ok('progress before acceptance is ignored', S.challengeViews([...chapter(T0 - DAY, 'old', 'nature', SK[0], ['correct']), { t: T0, k: 'accept', id: 'first_steps' }], 'fr').find((c) => c.id === 'first_steps').progress === 0);

// Likes feed the feed challenge, and unliking takes it back
ev = [{ t: 1, k: 'accept', id: 'feed_fan' }, ...[1, 2, 3, 4, 5].map((n) => ({ t: 1 + n, k: 'react', item: `feed-${n}`, liked: true, saved: false })), { t: 20, k: 'react', item: 'feed-1', liked: false, saved: false }];
ok('unliking removes progress', S.challengeViews(ev, 'en').find((c) => c.id === 'feed_fan').progress === 4);

// Home and weekly report come from the same log
ev = chapter(T0, 'h1', 'sport', SK[0], ['correct', 'correct', 'correct']);
const h = S.home(ev, T0 + 60_000, 'fr');
ok('home suggests the last played world and its next skill', h.suggested.world === 'sport' && h.suggested.skill_id === SK[1]);
ok('home lists 8 worlds and the streak', h.worlds.length === 8 && h.engagement.streak.current_days === 1);
const wk = S.weeklyReport(ev, 'kid1', T0 + 60_000, 'fr');
ok('weekly report reflects the play', wk.sessions === 1 && wk.days_played === 1 && wk.skills_practised[0] === SK[0]);

console.log(fails ? `\n${fails} FAILED` : '\nall state checks pass');
process.exit(fails ? 1 : 0);
