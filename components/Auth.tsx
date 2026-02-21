import React, { useState } from 'react';
import { Mail, UserPlus, LogIn } from 'lucide-react';

interface AuthProps {
  onLogin: (email: string, password: string) => void;
  hasExistingAccount: boolean;
  error?: string;
}

export const Auth: React.FC<AuthProps> = ({ onLogin, hasExistingAccount, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLogin(email, password);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          {/* Zen Circle Logo */}
          <div className="w-24 h-24 mx-auto mb-6 relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                <path 
                    d="M50 10C25 10 10 30 10 50C10 75 30 90 55 90C80 90 90 70 90 50C90 30 75 15 60 10" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="6" 
                    strokeLinecap="round"
                    style={{filter: 'url(#glow)'}}
                    opacity="0.9"
                />
                <path 
                    d="M50 15C30 15 15 35 15 50" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    opacity="0.5"
                />
            </svg>
            <span className="absolute text-4xl font-bold text-white font-sans tracking-widest pt-1">T</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">TARUSHIRU</h1>
          <p className="text-navy-200 mt-2 text-sm">人に見せない自分を整理する空間</p>
        </div>

        <div className="bg-navy-800/50 p-6 rounded-2xl border border-navy-700/50 backdrop-blur-sm">
          <h2 className="text-center text-lg font-medium mb-4 text-white">
            {hasExistingAccount ? 'おかえりなさい' : 'はじめる'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 text-navy-300" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="メールアドレス"
                className="w-full bg-navy-900 border border-navy-600 rounded-xl py-3 pl-12 pr-4 text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all"
              />
            </div>
            <div className="relative">
              <div className="absolute left-4 top-3.5 text-navy-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワード"
                className="w-full bg-navy-900 border border-navy-600 rounded-xl py-3 pl-12 pr-4 text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-500 transition-all"
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs text-center bg-red-900/20 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-white text-navy-900 py-3.5 rounded-xl font-bold hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2 group"
            >
              {hasExistingAccount ? <LogIn size={18} /> : <UserPlus size={18} />}
              <span>{hasExistingAccount ? 'ログイン' : 'アカウント作成して開始'}</span>
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-navy-400 mt-8 opacity-60">
          データはお使いのブラウザ内にのみ保存されます。<br/>
          （サーバーには送信されません）
        </p>
      </div>
    </div>
  );
};