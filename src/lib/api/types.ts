import type { components } from './schema';

type S = components['schemas'];

export type WorldId = S['WorldId'];
export type SkillId = S['SkillId'];
export type AnswerValue = S['AnswerValue'];
export type NodeState = S['NodeState'];
export type Outcome = S['Outcome'];
export type Reward = S['Reward'];
export type Child = S['Child'];
/** `kid_can_change_language` is BE-28: absent means allowed. */
export type ChildSettings = S['ChildSettings'] & { kid_can_change_language?: boolean };
export type World = S['World'];
export type Skill = S['Skill'];
export type Journey = S['Journey'];
export type JourneyNode = S['JourneyNode'];
export type Session = S['Session'];
export type Beat = S['Beat'];
export type Question = S['Question'];
export type Narration = S['Narration'];
export type AnswerResult = S['AnswerResult'];
export type SessionSummary = S['SessionSummary'];
export type Progress = S['Progress'];
export type Misconception = S['Misconception'];
export type Growth = S['Growth'];
export type WeeklyReport = S['WeeklyReport'];
export type Engagement = S['Engagement'];
export type StoryCard = S['StoryCard'];
export type DailyQuest = S['DailyQuest'];
export type Problem = S['Problem'];
export type ReviewDue = S['ReviewDue'];

export const WORLD_IDS: WorldId[] = [
  'nature', 'espace', 'cuisine', 'sport', 'construction', 'medecine', 'science', 'echecs',
];

export type FeedItem = S['FeedItem'];
export type FeedPage = S['FeedPage'];
