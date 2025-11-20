import React, { useState } from 'react';
import { Goal } from '../types';
import { Target, CheckCircle2, Circle, Sparkles, Loader2 } from 'lucide-react';
import { getGoalCoaching } from '../services/geminiService';

interface GoalsProps {
  goals: Goal[];
  onUpdateGoals: (goals: Goal[]) => void;
}

export const Goals: React.FC<GoalsProps> = ({ goals, onUpdateGoals }) => {
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [advice, setAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    
    const newGoal: Goal = {
        id: Date.now().toString(),
        title: newGoalTitle,
        description: '',
        deadline: '',
        progress: 0
    };
    
    onUpdateGoals([...goals, newGoal]);
    setNewGoalTitle('');
  };

  const toggleProgress = (id: string) => {
    const updated = goals.map(g => 
        g.id === id ? { ...g, progress: g.progress === 100 ? 0 : 100 } : g
    );
    onUpdateGoals(updated);
  };

  const getAdvice = async () => {
    setLoadingAdvice(true);
    try {
        const text = await getGoalCoaching(goals);
        setAdvice(text || "継続は力なり。少しずつ進みましょう。");
    } catch (e) {
        setAdvice("コーチに接続できませんでした。");
    } finally {
        setLoadingAdvice(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-navy-900">Goals & Vision</h2>
        <p className="text-sm text-gray-500">目標とビジョンを定める。</p>
      </header>
      
       {/* Coach Section */}
       <div className="bg-gradient-to-br from-navy-900 to-navy-700 p-5 rounded-2xl shadow-lg text-white">
           <div className="flex items-start space-x-3">
                <Sparkles className="text-yellow-400 shrink-0 mt-1" size={20} />
                <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">AI コーチ</h3>
                    <p className="text-navy-100 text-sm leading-relaxed">
                        {advice ? advice : "あなたの目標を分析し、次の一歩を提案します。"}
                    </p>
                    {!advice && (
                        <button 
                            onClick={getAdvice}
                            disabled={loadingAdvice || goals.length === 0}
                            className="mt-4 bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-2 rounded-full transition-colors flex items-center space-x-2"
                        >
                            {loadingAdvice ? <Loader2 className="animate-spin" size={12}/> : <span>アドバイスをもらう</span>}
                        </button>
                    )}
                </div>
           </div>
       </div>

      {/* Goals List */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-navy-900 mb-4">現在の目標</h3>
          {goals.length === 0 && <p className="text-xs text-gray-400 mb-4">目標はまだ設定されていません。</p>}
          <ul className="space-y-3">
              {goals.map(goal => (
                  <li key={goal.id} className="flex items-center justify-between p-3 bg-navy-50 rounded-xl group">
                      <div className="flex items-center space-x-3">
                        <button onClick={() => toggleProgress(goal.id)} className="text-navy-500 hover:text-navy-700 transition-colors">
                            {goal.progress === 100 ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                        </button>
                        <span className={`text-sm ${goal.progress === 100 ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {goal.title}
                        </span>
                      </div>
                  </li>
              ))}
          </ul>

          <form onSubmit={handleAddGoal} className="mt-4 flex space-x-2">
              <input 
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="新しい目標を追加..."
                className="flex-1 p-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy-500"
              />
              <button type="submit" className="bg-navy-900 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  追加
              </button>
          </form>
      </div>
    </div>
  );
};