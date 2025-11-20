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
}

// 支出・収入（既存機能）
export interface Transaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  note: string;
  type: 'income' | 'expense';
}

// 新しい資産管理機能用
export interface AssetRecord {
  month: string; // YYYY-MM
  values: { [category: string]: number }; // "Bank A": 10000
}

export interface MoneyConfig {
  assetCategories: string[]; // ユーザー定義の資産カテゴリーリスト
  enableExpenses: boolean; // 支出管理機能のON/OFF
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  deadline: string;
  progress: number; // 0-100
}

export interface UserProfile {
  name: string;
  email: string;
  password?: string;
  mbti: string;
  strengths: string[]; // 変更: 配列型へ
  skills: string[];
  history: string;
  resumeMarkdown?: string;
  personalityAnalysis?: string; // AI性格診断結果
}

export interface AppData {
  user: UserProfile | null;
  journal: JournalEntry[];
  transactions: Transaction[];
  goals: Goal[];
  assets: AssetRecord[];
  moneyConfig: MoneyConfig;
}
export enum ViewState {
  JOURNAL = 'JOURNAL',
  MONEY = 'MONEY',
  GOALS = 'GOALS',
  PROFILE = 'PROFILE',
}