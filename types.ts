
export enum ViewState {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  JOURNAL = 'JOURNAL',
  MONEY = 'MONEY',
  GOALS = 'GOALS',
  PROFILE = 'PROFILE',
  PUBLIC_PROFILE = 'PUBLIC_PROFILE'
}

export interface EmotionScore {
  joy: number;
  anger: number;
  sadness: number;
  anxiety: number;
  calm: number;
  excitement?: number;
  trust?: number;
  surprise?: number;
}

export interface SubEmotionScore {
  // Joy family
  fulfillment?: number;
  gratitude?: number;
  pride?: number;
  relief?: number;
  love?: number;
  contentment?: number;
  // Anticipation family
  hope?: number;
  curiosity?: number;
  determination?: number;
  // Sadness family
  loneliness?: number;
  nostalgia?: number;
  disappointment?: number;
  // Anger family
  frustration?: number;
  irritation?: number;
  envy?: number;
  // Anxiety family
  overwhelm?: number;
  confusion?: number;
  guilt?: number;
  vulnerability?: number;
  // Other
  boredom?: number;
  shame?: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  analysis?: {
    emotions: EmotionScore;
    subEmotions?: SubEmotionScore;
    themes: string[];
    actions: string[];
    coachingQuestion?: string;
  };
  aiComment?: string;
  bookmarked?: boolean;
}

export interface AssetRecord {
  month: string;
  values: { [category: string]: number };
}

export interface FixedCostItem {
  id: string;
  name: string;
  amount: number;
}

export interface BudgetProfile {
  monthlyIncome: number;
  fixedCosts: FixedCostItem[];
  variableBudget: number;
}

export interface AssetGoal {
  targetAmount: number;
  targetDate: string;
  label: string;
}

export interface MoneyConfig {
  assetCategories: string[];
  assetGoal?: AssetGoal;
  displayInManYen?: boolean;
}

export type GoalCategory = 'being' | 'life' | 'work' | 'work_short';

export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: string;
  progress: number;
  category: GoalCategory;
}

export interface GeneticAnalysis {
  healthTips: string;
  workTips: string;
  lifeTips: string;
  determinedType: string;
}

export interface UserProfile {
  name: string;
  email: string;
  password?: string;
  mbti: string;
  strengths: string[];
  skills: string[];
  history: string;
  resumeMarkdown?: string;
  personalityAnalysis?: string;

  careerStrengths?: string;
  interests?: string;
  values?: string;
  environment?: string;
  careerSummary?: string;

  geneticTypeRaw?: string;
  geneticAnalysis?: GeneticAnalysis;
}

export interface AIMemory {
  patterns: string[];
  lastQuestion: string;
  updatedAt: string;
}

export interface AppData {
  user: UserProfile | null;
  journal: JournalEntry[];
  goals: Goal[];
  assets: AssetRecord[];
  moneyConfig: MoneyConfig;
  budgetProfile: BudgetProfile;
  aiMemory?: AIMemory;
}
