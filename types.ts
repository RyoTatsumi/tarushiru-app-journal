
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
  // Expanded (v3)
  empathy?: number;
  self_compassion?: number;
  awe?: number;
  playfulness?: number;
  serenity?: number;
  restlessness?: number;
  melancholy?: number;
  inspiration?: number;
  acceptance?: number;
  resistance?: number;
  regret?: number;
  liberation?: number;
  exhaustion?: number;
}

// Focus Tags
export type FocusTag = 'health' | 'beauty' | 'career' | 'goals' | 'values' | 'relationships' | 'finance' | 'learning' | 'mindfulness';

export interface HealthInput {
  sleepHours?: number;
  healthStatus?: 1 | 2 | 3 | 4 | 5;
  exercise?: string;
}

export interface BeautyInput {
  skinCondition?: 1 | 2 | 3 | 4 | 5;
  beautyRoutine?: string;
  concerns?: string;
}

export interface CareerInput {
  achievements?: string;
  challenges?: string;
  learnings?: string;
}

export interface GoalsInput {
  progressReflection?: string;
  nextAction?: string;
}

export interface ValuesInput {
  reflection?: string;
  alignment?: 1 | 2 | 3 | 4 | 5;
}

export interface RelationshipsInput {
  interactions?: string;
  gratitude?: string;
}

export interface FinanceInput {
  spending?: string;
  financialMood?: 1 | 2 | 3 | 4 | 5;
}

export interface LearningInput {
  topic?: string;
  source?: string;
  insight?: string;
}

export interface MindfulnessInput {
  meditation?: boolean;
  gratitudeNote?: string;
  mood?: 1 | 2 | 3 | 4 | 5;
}

export interface FocusTagData {
  selectedTags: FocusTag[];
  health?: HealthInput;
  beauty?: BeautyInput;
  career?: CareerInput;
  goals?: GoalsInput;
  values?: ValuesInput;
  relationships?: RelationshipsInput;
  finance?: FinanceInput;
  learning?: LearningInput;
  mindfulness?: MindfulnessInput;
}

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  focusTags?: FocusTagData;
  analysis?: {
    emotions: EmotionScore;
    subEmotions?: SubEmotionScore;
    themes: string[];
    actions: string[];
    coachingQuestion?: string;
    lifeReflectionQuestion?: string;
    focusInsights?: Record<string, string>;
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

export interface CareerEntry {
  id: string;
  company: string;
  role: string;
  period: string;
  achievements: string[];
  decisionReason?: string;
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

  // Career expansion (v3)
  careerHistory?: CareerEntry[];
  keyAchievements?: string[];
  decisionStyle?: string;
  lifePhilosophy?: string;
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
