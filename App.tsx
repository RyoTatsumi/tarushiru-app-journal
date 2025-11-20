import React, { useState, useEffect } from 'react';
import { ViewState, AppData, JournalEntry, Transaction, Goal, UserProfile, AssetRecord, MoneyConfig } from './types';
import { Navigation } from './components/Navigation';
import { Journal } from './components/Journal';
import { Money } from './components/Money';
import { Profile } from './components/Profile';
import { Goals } from './components/Goals';
import { Auth } from './components/Auth';

// Initial Data Template
const INITIAL_DATA: AppData = {
  user: null,
  journal: [],
  transactions: [],
  goals: [],
  assets: [], 
  moneyConfig: {
      assetCategories: ['現金・預金', '株式・投信', '暗号資産'],
      enableExpenses: true
  }
};

function App() {
  const [view, setView] = useState<ViewState>(ViewState.AUTH);
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>(undefined);

  // Load data from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('tarushiru_data');
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        // Migration & Merge Logic with INITIAL_DATA to ensure structure
        const mergedData: AppData = { 
            ...INITIAL_DATA, 
            ...parsedData,
            // Ensure nested objects are merged correctly
            moneyConfig: { ...INITIAL_DATA.moneyConfig, ...(parsedData.moneyConfig || {}) },
            user: parsedData.user ? { ...parsedData.user } : null
        };
        
        // Ensure assets array exists
        if (!Array.isArray(mergedData.assets)) {
            mergedData.assets = [];
        }
        
        // CRITICAL MIGRATION: Handle strengths format change (string -> string[])
        if (mergedData.user) {
            if (typeof mergedData.user.strengths === 'string') {
                // Convert legacy string to array
                mergedData.user.strengths = [mergedData.user.strengths];
            } else if (!Array.isArray(mergedData.user.strengths)) {
                // Initialize if undefined/null
                mergedData.user.strengths = [];
            }
            
            // Ensure skills is array
            if (!Array.isArray(mergedData.user.skills)) {
                mergedData.user.skills = [];
            }
        }

        setData(mergedData);
      } catch (e) {
        console.error("Failed to parse saved data", e);
        // If parse fails, keep INITIAL_DATA but don't overwrite localStorage yet
        // (In a real app, we might want to backup the corrupted data)
      }
    }
    setIsInitialized(true);
  }, []);

  // Save data to local storage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('tarushiru_data', JSON.stringify(data));
      } catch (e) {
        console.error("Failed to save data", e);
      }
    }
  }, [data, isInitialized]);

  // Handlers
  const handleLogin = (email: string, password: string) => {
    setAuthError(undefined);

    // Mode 1: Registration (First time user)
    if (!data.user) {
        const newUser: UserProfile = {
            name: email.split('@')[0],
            email: email,
            password: password,
            mbti: '',
            strengths: [],
            skills: [],
            history: ''
        };
        setData(prev => ({
            ...prev,
            user: newUser
        }));
        setView(ViewState.JOURNAL);
        return;
    }

    // Mode 2: Login (Existing user)
    if (data.user.password && data.user.password !== password) {
        setAuthError('パスワードが間違っています。');
        return;
    }

    // Allow login
    setView(ViewState.JOURNAL);
  };

  const handleLogout = () => {
    setView(ViewState.AUTH);
    setAuthError(undefined);
  };

  const handleResetData = () => {
    if (window.confirm('本当に全てのデータを削除しますか？この操作は取り消せません。')) {
        localStorage.removeItem('tarushiru_data');
        setData(INITIAL_DATA);
        setView(ViewState.AUTH);
        setAuthError(undefined);
    }
  };

  const addJournalEntry = (entry: JournalEntry) => {
    setData(prev => ({ ...prev, journal: [...prev.journal, entry] }));
  };

  const addTransaction = (transaction: Transaction) => {
    setData(prev => ({ ...prev, transactions: [...prev.transactions, transaction] }));
  };
  
  const updateAssets = (assets: AssetRecord[]) => {
      setData(prev => ({ ...prev, assets }));
  };

  const updateMoneyConfig = (config: MoneyConfig) => {
      setData(prev => ({ ...prev, moneyConfig: config }));
  };

  const updateProfile = (profile: UserProfile) => {
    setData(prev => ({ ...prev, user: profile }));
  };

  const updateGoals = (goals: Goal[]) => {
    setData(prev => ({ ...prev, goals }));
  };

  if (!isInitialized) return null;

  if (view === ViewState.AUTH) {
    return (
        <Auth 
            onLogin={handleLogin} 
            hasExistingAccount={!!data.user} 
            error={authError}
        />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative overflow-hidden">
        {/* Top Branding Bar */}
        <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h1 className="font-bold text-navy-900 tracking-tight">TARUSHIRU</h1>
            <div className="flex items-center space-x-2">
                <span className="text-[10px] text-gray-400">Demo v0.2</span>
                <div className="w-8 h-8 bg-navy-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {data.user?.name ? data.user.name.charAt(0).toUpperCase() : 'U'}
                </div>
            </div>
        </div>

        {/* Main Content Area */}
        <main className="p-6 min-h-[calc(100vh-80px)]">
          {view === ViewState.JOURNAL && (
            <Journal entries={data.journal} onAddEntry={addJournalEntry} />
          )}
          {view === ViewState.MONEY && (
            <Money 
                transactions={data.transactions} 
                onAddTransaction={addTransaction} 
                assets={data.assets}
                onUpdateAssets={updateAssets}
                moneyConfig={data.moneyConfig}
                onUpdateConfig={updateMoneyConfig}
            />
          )}
          {view === ViewState.GOALS && (
            <Goals goals={data.goals} onUpdateGoals={updateGoals} />
          )}
          {view === ViewState.PROFILE && (
            <Profile profile={data.user} onUpdateProfile={updateProfile} onResetData={handleResetData} />
          )}
        </main>

        {/* Bottom Navigation */}
        <Navigation currentView={view} setView={setView} onLogout={handleLogout} />
      </div>
    </div>
  );
}

export default App;