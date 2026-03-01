import { UserProfile, JournalEntry, Goal, AIMemory } from '@/types';

async function callApi(endpoint: string, body: unknown) {
  const response = await fetch(`/api/ai/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export const analyzeJournalEntry = async (
  text: string,
  profile: UserProfile | null,
  pastEntries: JournalEntry[] = [],
  goals: Goal[] = [],
  aiMemory?: AIMemory
) => {
  return callApi('analyze-journal', { text, profile, pastEntries, goals, aiMemory });
};

export const analyzeCompatibility = async (
  myProfile: UserProfile,
  partnerProfile: UserProfile
) => {
  const data = await callApi('analyze-compatibility', { myProfile, partnerProfile });
  return data.result;
};

export const analyzeJournalTrends = async (
  entries: JournalEntry[],
  profile: UserProfile | null,
  timeframeLabel: string
) => {
  const data = await callApi('analyze-trends', { entries, profile, timeframeLabel });
  return data.result;
};

export const generateResume = async (profileData: UserProfile) => {
  const data = await callApi('generate-resume', { profileData });
  return data.result;
};

export const summarizeCareerProfile = async (profileData: UserProfile) => {
  const data = await callApi('summarize-career', { profileData });
  return data.result;
};

export const analyzePersonality = async (mbti: string, strengths: string[]) => {
  const data = await callApi('analyze-personality', { mbti, strengths });
  return data.result;
};

export const analyzeGeneticType = async (rawText: string) => {
  return callApi('analyze-genetic', { rawText });
};

export const analyzeAssetTrends = async (assets: unknown[], budget: unknown, profile?: UserProfile | null) => {
  const data = await callApi('analyze-assets', { assets, budget, profile });
  return data.result;
};

export const getGoalCoaching = async (goals: Goal[], profile?: UserProfile | null, recentJournal?: JournalEntry[]) => {
  const data = await callApi('goal-coaching', { goals, profile, recentJournal });
  return data.result;
};

export const generateMonthlyReport = async (
  entries: JournalEntry[],
  profile: UserProfile | null,
  goals: Goal[],
  month: string
) => {
  const data = await callApi('analyze-monthly', { entries, profile, goals, month });
  return data.result;
};
