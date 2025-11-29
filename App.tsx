import React, { useState, useEffect } from 'react';
import { ViewState, AppData, JournalEntry, Goal, UserProfile, AssetRecord, MoneyConfig, BudgetProfile } from './types';
import { Navigation } from './components/Navigation';
import { Journal } from './components/Journal';
import { Money } from './components/Money';
import { Profile } from './components/Profile';
import { Goals } from './components/Goals';
import { Auth } from './components/Auth';

const INITIAL_DATA: AppData = {
  user: null,
  journal: [],
  goals: [],
  assets: [], 
  moneyConfig: {
      assetCategories: ['現金・預金', '株式・投信', '暗号資産'],
  },
  budgetProfile: {
      monthlyIncome: 0,
      fixedCosts: [],
      variableBudget: 0
  }
};

function App() {
  const [view, setView] = useState<ViewState>(ViewState.AUTH);
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem('tarushiru_data');
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        const mergedData: AppData = { ...INITIAL_DATA, ...parsedData };
        
        // --- Migration Logic ---
        
        // 1. User Strengths (String -> Array)
        if (mergedData.user) {
            if (typeof mergedData.user.strengths === 'string') {
                mergedData.user.strengths = [mergedData.user.strengths];
            } else if (!Array.isArray(mergedData.user.strengths)) {
                mergedData.user.strengths = [];
            }
            if (!Array.isArray(mergedData.user.skills)) mergedData.user.skills = [];
            // New profile fields
            mergedData.user.careerStrengths = mergedData.user.careerStrengths || '';
            mergedData.user.interests = mergedData.user.interests || '';
            mergedData.user.values = mergedData.user.values || '';
            mergedData.user.environment = mergedData.user.environment || '';
        }

        // 2. Goals Categories
        mergedData.goals = mergedData.goals.map(g => ({
            ...g,
            category: g.category || 'work' // Default old goals to 'work'
        }));

        // 3. Money Config & Budget
        mergedData.moneyConfig = { ...INITIAL_DATA.moneyConfig, ...(parsedData.moneyConfig || {}) };
        mergedData.budgetProfile = { ...INITIAL_DATA.budgetProfile, ...(parsedData.budgetProfile || {}) };

        setData(mergedData);
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('tarushiru_data', JSON.stringify(data));
    }
  }, [data, isInitialized]);

  const handleLogin = (email: string, password: string) => {
    setAuthError(undefined);
    if (!data.user) {
        const newUser: UserProfile = {
            name: email.split('@')[0],
            email: email,
            password: password,
            mbti: '',
            strengths: [],
            skills: [],
            history: '',
            careerStrengths: '',
            interests: '',
            values: '',
            environment: ''
        };
        setData(prev => ({ ...prev, user: newUser }));
        setView(ViewState.JOURNAL);
        return;
    }
    if (data.user.password && data.user.password !== password) {
        setAuthError('パスワードが間違っています。');
        return;
    }
    setView(ViewState.JOURNAL);
  };

  const handleLogout = () => {
    setView(ViewState.AUTH);
  };

  const handleResetData = () => {
    if (window.confirm('本当に全てのデータを削除しますか？')) {
        localStorage.removeItem('tarushiru_data');
        setData(INITIAL_DATA);
        setView(ViewState.AUTH);
    }
  };

  const addJournalEntry = (entry: JournalEntry) => {
    setData(prev => {
        // Check if updating existing entry (by ID)
        const index = prev.journal.findIndex(e => e.id === entry.id);
        if (index >= 0) {
            const updated = [...prev.journal];
            updated[index] = entry;
            return { ...prev, journal: updated };
        }
        return { ...prev, journal: [...prev.journal, entry] };
    });
  };
  
  const updateAssets = (assets: AssetRecord[]) => {
      setData(prev => ({ ...prev, assets }));
  };

  const updateMoneyConfig = (config: MoneyConfig) => {
      setData(prev => ({ ...prev, moneyConfig: config }));
  };
  
  const updateBudgetProfile = (budget: BudgetProfile) => {
      setData(prev => ({ ...prev, budgetProfile: budget }));
  };

  const updateProfile = (profile: UserProfile) => {
    setData(prev => ({ ...prev, user: profile }));
  };

  const updateGoals = (goals: Goal[]) => {
    setData(prev => ({ ...prev, goals }));
  };

  if (!isInitialized) return null;

  if (view === ViewState.AUTH) {
    return <Auth onLogin={handleLogin} hasExistingAccount={!!data.user} error={authError} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative overflow-hidden flex flex-col">
        <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <div className="flex items-center space-x-2">
                <svg viewBox="0 0 100 100" className="w-6 h-6">
                    <path d="M50 10C25 10 10 30 10 50C10 75 30 90 55 90C80 90 90 70 90 50C90 30 75 15 60 10" fill="none" stroke="#102a43" strokeWidth="8" strokeLinecap="round"/>
                </svg>
                <h1 className="font-bold text-navy-900 tracking-tight">TARUSHIRU</h1>
            </div>
            <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-navy-900 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {data.user?.name ? data.user.name.charAt(0).toUpperCase() : 'U'}
                </div>
            </div>
        </div>

        <main className="p-6 flex-1 overflow-y-auto">
          {view === ViewState.JOURNAL && <Journal entries={data.journal} onAddEntry={addJournalEntry} />}
          {view === ViewState.MONEY && (
            <Money 
                assets={data.assets}
                onUpdateAssets={updateAssets}
                moneyConfig={data.moneyConfig}
                onUpdateConfig={updateMoneyConfig}
                budgetProfile={data.budgetProfile}
                onUpdateBudget={updateBudgetProfile}
            />
          )}
          {view === ViewState.GOALS && <Goals goals={data.goals} onUpdateGoals={updateGoals} />}
          {view === ViewState.PROFILE && <Profile profile={data.user} onUpdateProfile={updateProfile} onResetData={handleResetData} />}
        </main>

        <Navigation currentView={view} setView={setView} onLogout={handleLogout} />
      </div>
    </div>
  );
}

export default App;