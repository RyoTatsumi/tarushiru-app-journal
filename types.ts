
export enum ViewState {
  AUTH = 'AUTH',
  JOURNAL = 'JOURNAL',
  MONEY = 'MONEY',
  GOALS = 'GOALS',
  PROFILE = 'PROFILE'
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
  date: string; // ISO string
  content: string;
  analysis?: {
    emotions: EmotionScore;
    themes: string[];
    actions: string[];
  };
  aiComment?: string; // AIによるポジティブな一言
}

// 資産管理（Stock）
export interface AssetRecord {
  month: string; // YYYY-MM
  values: { [category: string]: number };
}

// 収支構造・予算（Flow）
export interface FixedCostItem {
  id: string;
  name: string;
  amount: number;
}

export interface BudgetProfile {
  monthlyIncome: number; // 手取り月収
  fixedCosts: FixedCostItem[]; // 固定費リスト
  variableBudget: number; // 変動費（想定予算）
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
  progress: number; // 0-100
  category: GoalCategory;
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
}

export interface AppData {
  user: UserProfile | null;
  journal: JournalEntry[];
  goals: Goal[];
  assets: AssetRecord[];
  moneyConfig: MoneyConfig;
  budgetProfile: BudgetProfile; // New: 収支構造
}
