
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
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  analysis?: {
    emotions: EmotionScore;
    themes: string[];
    actions: string[];
  };
  aiComment?: string;
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

export interface MoneyConfig {
  assetCategories: string[];
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

export interface AppData {
  user: UserProfile | null;
  journal: JournalEntry[];
  goals: Goal[];
  assets: AssetRecord[];
  moneyConfig: MoneyConfig;
  budgetProfile: BudgetProfile;
}
