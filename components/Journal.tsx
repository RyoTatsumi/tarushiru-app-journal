import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { analyzeJournalEntry } from '../services/geminiService';
import { Loader2, Sparkles, Calendar, Tag } from 'lucide-react';

interface JournalProps {
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
}

export const Journal: React.FC<JournalProps> = ({ entries, onAddEntry }) => {
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeJournalEntry(content);
      
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        content,
        analysis
      };

      onAddEntry(newEntry);
      setContent('');
    } catch (error) {
      alert('分析に失敗しました。もう一度お試しください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="mb-6">
        <h2 className="text-2xl font-bold text-navy-900">Journal</h2>
        <p className="text-sm text-gray-500">日々の思考と感情を整理する。</p>
      </header>

      {/* Input Area */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="今の気持ちや出来事を自由に書いてください..."
          className="w-full h-32 p-3 bg-navy-50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-navy-500 text-gray-700 placeholder-gray-400"
        />
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={isAnalyzing || !content}
            className="flex items-center space-x-2 bg-navy-900 text-white px-5 py-2.5 rounded-full hover:bg-navy-800 disabled:opacity-50 transition-all shadow-md active:scale-95"
          >
            {isAnalyzing ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Sparkles size={18} />
            )}
            <span className="font-medium">保存 & AI分析</span>
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {entries.length === 0 && (
            <div className="text-center py-10 text-gray-400">
                <p>まだ記録がありません。<br/>今日何があったか書いてみましょう。</p>
            </div>
        )}
        {entries.slice().reverse().map((entry) => (
          <div key={entry.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
                <Calendar size={14} />
                <span>{new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
            
            <p className="text-gray-800 whitespace-pre-wrap leading-relaxed mb-4">{entry.content}</p>

            {/* Analysis Results */}
            {entry.analysis && (
              <div className="bg-navy-50 rounded-xl p-4 space-y-4">
                {/* Emotion Bars */}
                <div>
                  <span className="text-xs font-bold text-navy-900 uppercase tracking-wider block mb-2">感情バランス</span>
                  <div className="flex h-2 rounded-full overflow-hidden bg-white">
                    <div style={{ width: `${(entry.analysis.emotions.joy || 0) * 100}%` }} className="bg-yellow-400" title="喜び" />
                    <div style={{ width: `${(entry.analysis.emotions.calm || 0) * 100}%` }} className="bg-blue-300" title="平穏" />
                    <div style={{ width: `${(entry.analysis.emotions.anxiety || 0) * 100}%` }} className="bg-purple-400" title="不安" />
                    <div style={{ width: `${(entry.analysis.emotions.sadness || 0) * 100}%` }} className="bg-gray-400" title="悲しみ" />
                    <div style={{ width: `${(entry.analysis.emotions.anger || 0) * 100}%` }} className="bg-red-400" title="怒り" />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1 px-1">
                    <span>ポジティブ</span>
                    <span>ネガティブ</span>
                  </div>
                </div>

                {/* Themes & Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {entry.analysis.themes && entry.analysis.themes.length > 0 && (
                       <div>
                            <span className="text-xs font-bold text-navy-900 uppercase tracking-wider block mb-2">テーマ</span>
                            <div className="flex flex-wrap gap-2">
                                {entry.analysis.themes.map((theme, idx) => (
                                <span key={idx} className="inline-flex items-center space-x-1 bg-white text-navy-700 px-2 py-1 rounded-md text-xs border border-navy-100">
                                    <Tag size={10} />
                                    <span>{theme}</span>
                                </span>
                                ))}
                            </div>
                       </div>
                   )}
                   
                   {entry.analysis.actions && entry.analysis.actions.length > 0 && (
                        <div>
                            <span className="text-xs font-bold text-navy-900 uppercase tracking-wider block mb-2">抽出された行動</span>
                            <ul className="space-y-1">
                                {entry.analysis.actions.map((action, idx) => (
                                    <li key={idx} className="text-xs text-navy-800 flex items-start">
                                        <span className="mr-2 text-green-500">•</span>
                                        {action}
                                    </li>
                                ))}
                            </ul>
                        </div>
                   )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};