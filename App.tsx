
import React, { useState, useEffect } from 'react';
import { ViewState, AppData, JournalEntry, Goal, UserProfile, AssetRecord, MoneyConfig, BudgetProfile } from './types';
import { Navigation } from './components/Navigation';
import { Journal } from './components/Journal';
import { Money } from './components/Money';
import { Profile } from './components/Profile';
import { Goals } from './components/Goals';
import { Auth } from './components/Auth';
import { PublicProfile } from './components/PublicProfile';

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
  const [sharedProfile, setSharedProfile] = useState<UserProfile | null>(null);
  const [isPreviewingSelf, setIsPreviewingSelf] = useState(false);

  // Detect public profile from URL hash
  useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash;
        if (hash.startsWith('#profile=')) {
            try {
                const encodedData = hash.replace('#profile=', '');
                const decodedJson = decodeURIComponent(escape(atob(encodedData)));
                const profile = JSON.parse(decodedJson);
                setSharedProfile(profile);
                setView(ViewState.PUBLIC_PROFILE);
                setIsPreviewingSelf(false);
            } catch (e) {
                console.error("Invalid shared profile link", e);
            }
        }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('tarushiru_data');
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        const mergedData: AppData = { ...INITIAL_DATA, ...parsedData };
        
        if (mergedData.user) {
            mergedData.user.strengths = Array.isArray(mergedData.user.strengths) ? mergedData.user.strengths : [];
            mergedData.user.careerStrengths = mergedData.user.careerStrengths || '';
            mergedData.user.interests = mergedData.user.interests || '';
            mergedData.user.values = mergedData.user.values || '';
            mergedData.user.environment = mergedData.user.environment || '';
        }
        setData(mergedData);
      } catch (e) { console.error(e); }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('tarushiru_data', JSON.stringify(data));
    }
  }, [data, isInitialized]);

  const handleLogin = (email: string, password: string) => {
    if (!data.user) {
        setData(prev => ({ ...prev, user: { name: email.split('@')[0], email, password, mbti: '', strengths: [], skills: [], history: '' } }));
        setView(ViewState.JOURNAL);
    } else if (data.user.password === password) {
        setView(ViewState.JOURNAL);
    } else {
        setAuthError('パスワードが違います');
    }
  };

  const handlePreviewSelf = () => {
      if (data.user) {
          setSharedProfile(data.user);
          setIsPreviewingSelf(true);
          setView(ViewState.PUBLIC_PROFILE);
      }
  };

  const handleImportData = (newData: AppData) => {
      setData(newData);
      alert('データをインポートしました。');
  };

  const handleExitPublic = () => {
      setView(ViewState.PROFILE);
      setSharedProfile(null);
      setIsPreviewingSelf(false);
      // Clean up hash if it exists
      if (window.location.hash.startsWith('#profile=')) {
          window.history.pushState("", document.title, window.location.pathname + window.location.search);
      }
  };

  const handleUpdateJournalEntry = (updatedEntry: JournalEntry) => {
      setData(prev => ({
          ...prev,
          journal: prev.journal.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry)
      }));
  };

  const handleDeleteJournalEntry = (id: string) => {
      setData(prev => ({
          ...prev,
          journal: prev.journal.filter(entry => entry.id !== id)
      }));
  };

  if (!isInitialized) return null;

  if (view === ViewState.PUBLIC_PROFILE && sharedProfile) {
      return (
          <PublicProfile 
              profile={sharedProfile} 
              isPreview={isPreviewingSelf}
              onBack={handleExitPublic}
              onStartDiagnosis={() => setView(ViewState.PROFILE)} 
          />
      );
  }

  if (view === ViewState.AUTH) {
    return <Auth onLogin={handleLogin} hasExistingAccount={!!data.user} error={authError} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative overflow-hidden flex flex-col">
        <div className="bg-white/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h1 className="font-bold text-navy-900 cursor-pointer" onClick={() => setView(ViewState.JOURNAL)}>TARUSHIRU</h1>
            <div className="w-8 h-8 bg-navy-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {data.user?.name?.charAt(0).toUpperCase()}
            </div>
        </div>
        <main className="p-6 flex-1 overflow-y-auto">
          {view === ViewState.JOURNAL && (
            <Journal
              entries={data.journal}
              onAddEntry={(e) => setData(p => ({...p, journal: [...p.journal, e]}))}
              onUpdateEntry={handleUpdateJournalEntry}
              onDeleteEntry={handleDeleteJournalEntry}
              profile={data.user}
            />
          )}
          {view === ViewState.MONEY && <Money assets={data.assets} onUpdateAssets={(a) => setData(p => ({...p, assets: a}))} moneyConfig={data.moneyConfig} onUpdateConfig={(c) => setData(p => ({...p, moneyConfig: c}))} budgetProfile={data.budgetProfile} onUpdateBudget={(b) => setData(p => ({...p, budgetProfile: b}))} />}
          {view === ViewState.GOALS && <Goals goals={data.goals} onUpdateGoals={(g) => setData(p => ({...p, goals: g}))} />}
          {view === ViewState.PROFILE && (
            <Profile 
              profile={data.user} 
              onUpdateProfile={(p) => setData(prev => ({...prev, user: p}))} 
              onResetData={() => {localStorage.removeItem('tarushiru_data'); window.location.reload();}} 
              onPreviewPublic={handlePreviewSelf}
              onImportData={handleImportData}
            />
          )}
        </main>
        <Navigation currentView={view} setView={setView} onLogout={() => setView(ViewState.AUTH)} />
      </div>
    </div>
  );
}

export default App;
