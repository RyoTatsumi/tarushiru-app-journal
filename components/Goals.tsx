
import React, { useState } from 'react';
import { Goal, GoalCategory } from '../types';
import { Target, CheckCircle2, Circle, Sparkles, Loader2, Briefcase, Heart, Sun, Clock, Edit2, Check, X } from 'lucide-react';
import { getGoalCoaching } from '../services/geminiService';

interface GoalsProps {
  goals: Goal[];
  onUpdateGoals: (goals: Goal[]) => void;
}

const CATEGORIES: { id: GoalCategory; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'being', label: '在り方 (Being)', icon: Heart, description: '自分はどうありたいか、人生の指針' },
    { id: 'life', label: '生活 (Life)', icon: Sun, description: '健康、趣味、暮らしの目標' },
    { id: 'work', label: '仕事 (Work)', icon: Briefcase, description: '中長期的なキャリア目標' },
    { id: 'work_short', label: '短期・タスク', icon: Clock, description: '直近でやりたいこと・タスク（ジャンル不問）' },
];

export const Goals: React.FC<GoalsProps> = ({ goals, onUpdateGoals }) => {
  const [activeTab, setActiveTab] = useState<GoalCategory>('being');
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [advice, setAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    
    const newGoal: Goal = {
        id: Date.now().toString(),
        title: newGoalTitle,
        description: '',
        deadline: '',
        progress: 0,
        category: activeTab
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

  const handleDelete = (id: string) => {
      if (window.confirm('この目標を削除しますか？')) {
        onUpdateGoals(goals.filter(g => g.id !== id));
      }
  };

  const startEdit = (goal: Goal) => {
      setEditingId(goal.id);
      setEditTitle(goal.title);
  };

  const cancelEdit = () => {
      setEditingId(null);
      setEditTitle('');
  };

  const saveEdit = (id: string) => {
      if (!editTitle.trim()) return;
      const updated = goals.map(g => 
          g.id === id ? { ...g, title: editTitle } : g
      );
      onUpdateGoals(updated);
      setEditingId(null);
      setEditTitle('');
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

  const currentCategoryGoals = goals.filter(g => (g.category || 'being') === activeTab);

  return (
    <div className="space-y-6 pb-24">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-navy-900">Goals & Vision</h2>
        <p className="text-sm text-gray-500">4つの視点で目標を管理。</p>
      </header>
      
       {/* Coach Section */}
       <div className="bg-gradient-to-br from-navy-900 to-navy-700 p-5 rounded-2xl shadow-lg text-white mb-6">
           <div className="flex items-start space-x-3">
                <Sparkles className="text-yellow-400 shrink-0 mt-1" size={20} />
                <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">AI コーチ</h3>
                    <div className="text-navy-100 text-sm leading-relaxed whitespace-pre-wrap">
                        {advice ? advice : "あなたの目標バランスを分析し、次のアクションをアドバイスします。"}
                    </div>
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

      {/* Category Tabs */}
      <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-hide">
          {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center space-x-1 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                    activeTab === cat.id 
                    ? 'bg-navy-900 text-white border-navy-900' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-navy-300'
                }`}
              >
                  <cat.icon size={14} />
                  <span>{cat.label}</span>
              </button>
          ))}
      </div>

      {/* Current Category Content */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-navy-900 flex items-center">
                {CATEGORIES.find(c => c.id === activeTab)?.label}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
                {CATEGORIES.find(c => c.id === activeTab)?.description}
            </p>
          </div>

          <ul className="space-y-3 mb-6">
              {currentCategoryGoals.length === 0 && <p className="text-xs text-gray-400 text-center py-4">このカテゴリの目標はまだありません。</p>}
              
              {currentCategoryGoals.map(goal => (
                  <li key={goal.id} className="p-3 bg-navy-50 rounded-xl group hover:shadow-sm transition-all border border-transparent hover:border-navy-100">
                      {editingId === goal.id ? (
                          <div className="flex items-center space-x-2 w-full">
                              <input 
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="flex-1 p-2 text-sm border border-navy-300 rounded focus:outline-none focus:ring-2 focus:ring-navy-500"
                                  autoFocus
                              />
                              <button onClick={() => saveEdit(goal.id)} className="p-2 bg-navy-900 text-white rounded hover:bg-navy-700">
                                  <Check size={14} />
                              </button>
                              <button onClick={cancelEdit} className="p-2 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">
                                  <X size={14} />
                              </button>
                          </div>
                      ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 cursor-pointer" onClick={() => toggleProgress(goal.id)}>
                                <button className={`transition-colors shrink-0 ${goal.progress === 100 ? 'text-navy-500' : 'text-gray-300 hover:text-navy-500'}`}>
                                    {goal.progress === 100 ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                </button>
                                <span className={`text-sm select-none ${goal.progress === 100 ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                    {goal.title}
                                </span>
                            </div>
                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEdit(goal)} className="p-1.5 text-gray-400 hover:text-navy-600 rounded hover:bg-navy-100">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleDelete(goal.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50">
                                    <X size={14} />
                                </button>
                            </div>
                          </div>
                      )}
                  </li>
              ))}
          </ul>

          <form onSubmit={handleAddGoal} className="flex space-x-2 border-t border-gray-100 pt-4">
              <input 
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="新しい目標を入力..."
                className="flex-1 p-2 bg-navy-50 border border-transparent focus:bg-white focus:border-navy-300 rounded-lg text-sm focus:outline-none transition-all"
              />
              <button type="submit" className="bg-navy-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-800">
                  追加
              </button>
          </form>
      </div>
    </div>
  );
};
