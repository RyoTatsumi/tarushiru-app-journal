import { UserProfile, JournalEntry } from '@/types';

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
  pastEntries: JournalEntry[] = []
) => {
  return callApi('analyze-journal', { text, profile, pastEntries });
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

export const analyzeAssetTrends = async (assets: unknown[], budget: unknown) => {
  const data = await callApi('analyze-assets', { assets, budget });
  return data.result;
};

export const getGoalCoaching = async (goals: unknown[]) => {
  const data = await callApi('goal-coaching', { goals });
  return data.result;
};
