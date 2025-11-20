
import React, { createContext, useContext, useState } from 'react';
import type { Profile, CareerEntry, JournalEntry, FinancialRecord } from '../types';

// Mock Data
const initialProfile: Profile = {
    name: '志流 太郎',
    mbti: 'INFJ',
    strengths: '学習欲, 達成欲, 内省, 収集心, 回復志向',
    bio: '情熱的な開発者であり、生涯学習者。個人が自己を理解し、キャリアを成長させるためのツールを構築することに専念しています。'
};

const initialCareer: CareerEntry[] = [
    { id: 'c1', company: '株式会社テックソリューションズ', title: 'シニアフロントエンドエンジニア', startDate: '2021-01', endDate: '現在', description: '新しいデザインシステムの開発を主導し、アプリケーションのパフォーマンスを30%向上させました。' },
    { id: 'c2', company: 'デジタルクリエイターズ社', title: 'Reactデベロッパー', startDate: '2018-06', endDate: '2020-12', description: 'ReactとTypeScriptを使用して、クライアント向けのWebアプリケーションを開発・保守しました。' }
];

const initialJournal: JournalEntry[] = [
    { id: 'j1', date: '2024-07-20', content: '今日は信じられないほど生産的だった。複雑なコンポーネントのリファクタリングに成功して、最高の気分だ。チームも本当に協力的だった。', sentiment: 'Positive', keywords: ['生産的', 'リファクタリング', 'コンポーネント', 'チーム', '協力的'] },
    { id: 'j2', date: '2024-07-18', content: '少しスローな一日だった。数時間バグと格闘してしまった。もっと頻繁に休憩を取ることを忘れないようにしないと。', sentiment: 'Negative', keywords: ['スローな一日', 'バグ', '苦闘', '休憩', 'リマインダー'] }
];

const initialMoney: FinancialRecord[] = [
    { id: 'm1', date: '2024-07-01', type: 'income', amount: 5000, category: '給与', description: '月給' },
    { id: 'm2', date: '2024-07-05', type: 'expense', amount: 1200, category: '家賃', description: 'アパートの家賃' },
    { id: 'm3', date: '2024-07-15', type: 'expense', amount: 300, category: '食費', description: '週の買い物' }
];

// App Context
interface AppContextType {
    profile: Profile;
    setProfile: React.Dispatch<React.SetStateAction<Profile>>;
    careerHistory: CareerEntry[];
    addCareerEntry: (entry: Omit<CareerEntry, 'id'>) => void;
    journalEntries: JournalEntry[];
    addJournalEntry: (entry: JournalEntry) => void;
    updateJournalEntry: (entry: JournalEntry) => void;
    financialRecords: FinancialRecord[];
    addFinancialRecord: (record: Omit<FinancialRecord, 'id'>) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Component
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<Profile>(initialProfile);
    const [careerHistory, setCareerHistory] = useState<CareerEntry[]>(initialCareer);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(initialJournal);
    const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(initialMoney);

    const addCareerEntry = (entry: Omit<CareerEntry, 'id'>) => {
        setCareerHistory(prev => [...prev, { ...entry, id: `c${Date.now()}` }]);
    };
    
    const addJournalEntry = (entry: JournalEntry) => {
        setJournalEntries(prev => [entry, ...prev]);
    };

    const updateJournalEntry = (updatedEntry: JournalEntry) => {
        setJournalEntries(prev => prev.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry));
    };

    const addFinancialRecord = (record: Omit<FinancialRecord, 'id'>) => {
        setFinancialRecords(prev => [...prev, { ...record, id: `m${Date.now()}` }]);
    };

    const value = {
        profile, setProfile,
        careerHistory, addCareerEntry,
        journalEntries, addJournalEntry, updateJournalEntry,
        financialRecords, addFinancialRecord
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Custom Hook
export const useAppStore = (): AppContextType => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppStoreはAppProvider内で使用する必要があります');
    }
    return context;
};
