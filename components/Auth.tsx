import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, UserPlus, LogIn } from 'lucide-react';

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
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">TARUSHIRU</h1>
          <p className="text-navy-200 mt-2 text-sm">人に見せない自分を整理する空間</p>
        </div>

        <div className="bg-navy-800/50 p-6 rounded-2xl border border-navy-700/50">
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
              <Lock className="absolute left-4 top-3.5 text-navy-300" size={18} />
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

        <p className="text-center text-xs text-navy-400 mt-8">
          データはお使いのブラウザ内に暗号化されず保存されます。<br/>
          （デモ版のため、重要な個人情報の入力はご注意ください）
        </p>
      </div>
    </div>
  );
};