'use client';

import React from 'react';
import { Home, Book, Wallet, Target, User, LogOut } from 'lucide-react';
import { ViewState } from '@/types';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, setView, onLogout }) => {
  const navItems = [
    { view: ViewState.DASHBOARD, icon: Home, label: 'ホーム' },
    { view: ViewState.JOURNAL, icon: Book, label: '日記' },
    { view: ViewState.MONEY, icon: Wallet, label: '資産' },
    { view: ViewState.GOALS, icon: Target, label: '目標' },
    { view: ViewState.PROFILE, icon: User, label: 'MY' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-3 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 h-20">
      {navItems.map((item) => (
        <button
          key={item.view}
          onClick={() => setView(item.view)}
          className={`flex flex-col items-center space-y-1 w-13 transition-colors ${
            currentView === item.view ? 'text-navy-900' : 'text-gray-400 hover:text-navy-500'
          }`}
        >
          <item.icon size={22} strokeWidth={currentView === item.view ? 2.5 : 2} />
          <span className="text-[9px] font-medium">{item.label}</span>
        </button>
      ))}
      <button
        onClick={onLogout}
        className="flex flex-col items-center space-y-1 w-13 text-gray-400 hover:text-red-500 transition-colors"
      >
        <LogOut size={22} strokeWidth={2} />
        <span className="text-[9px] font-medium">終了</span>
      </button>
    </div>
  );
};
