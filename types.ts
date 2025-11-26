
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
  strengths: string[];
  skills: string[];
  history: string;
  resumeMarkdown?: string;
  personalityAnalysis?: string;
  
  // New Fields for Detailed Career Profile
  careerStrengths?: string; // キャリアにおける強み（性格・経験）
  interests?: string; // 興味・関心（業界、テーマ）
  values?: string; // やりがい・価値観
  environment?: string; // 理想の環境・社風
  careerSummary?: string; // AIによるキャリア要約
}

export interface AppData {
  user: UserProfile | null;
  journal: JournalEntry[];
  transactions: Transaction[];
  goals: Goal[];
  assets: AssetRecord[];
  moneyConfig: MoneyConfig;
}
