import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../types';
import { analyzeJournalEntry, analyzeJournalTrends } from '../services/geminiService';
import { Loader2, Sparkles, Calendar, Tag, BarChart2, List } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface JournalProps {
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
}

type TabMode = 'list' | 'analysis';

export const Journal: React.FC<JournalProps> = ({ entries, onAddEntry }) => {
  const [mode, setMode] = useState<TabMode>('list');
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trendReport, setTrendReport] = useState<string | null>(null);
  const [isGeneratingTrend, setIsGeneratingTrend] = useState(false);

  // Prepare data for emotion chart
  const emotionData = useMemo(() => {
    return entries
        .filter(e => e.analysis && e.analysis.emotions)
        .map(e => ({
            date: new Date(e.date).toLocaleDateString(),
            joy: e.analysis?.emotions.joy || 0,
            anxiety: e.analysis?.emotions.anxiety || 0,
            calm: e.analysis?.emotions.calm || 0,
        }))
        .slice(-14); // Last 14 entries
  }, [entries]);

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

  const handleGenerateTrend = async () => {
      setIsGeneratingTrend(true);
      try {
          const report = await analyzeJournalTrends(entries);
          setTrendReport(report);
      } catch (error) {
          alert('傾向分析に失敗しました。');
      } finally {
          setIsGeneratingTrend(false);
      }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="mb-4 flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-navy-900">Journal</h2>
            <p className="text-sm text-gray-500">日々の思考と感情を整理する。</p>
        </div>
        <div className="bg-navy-50 p-1 rounded-lg flex space-x-1">
            <button 
                onClick={() => setMode('list')}
                className={`p-2 rounded-md transition-all ${mode === 'list' ? 'bg-white shadow text-navy-900' : 'text-gray-400 hover:text-navy-700'}`}
                title="リスト表示"
            >
                <List size={20} />
            </button>
            <button 
                onClick={() => setMode('analysis')}
                className={`p-2 rounded-md transition-all ${mode === 'analysis' ? 'bg-white shadow text-navy-900' : 'text-gray-400 hover:text-navy-700'}`}
                title="傾向分析"
            >
                <BarChart2 size={20} />
            </button>
        </div>
      </header>

      {/* Input Area (Always visible in List mode, Optional in Analysis?) - Keep visible only in List for simplicity */}
      {mode === 'list' && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
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
      )}

      {/* Mode Content */}
      {mode === 'list' ? (
          /* Timeline */
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
      ) : (
          /* Analysis View */
          <div className="space-y-6">
              {entries.length < 2 ? (
                  <div className="text-center py-10 text-gray-400 bg-white rounded-2xl border border-gray-100">
                    <p>分析には少なくとも2日分の記録が必要です。</p>
                  </div>
              ) : (
                  <>
                    {/* Emotion Chart */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-navy-900 mb-4">感情の推移 (直近2週間)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={emotionData}>
                                    <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                    <YAxis hide domain={[0, 1]} />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px'}} 
                                    />
                                    <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                                    <Line type="monotone" dataKey="joy" stroke="#facc15" strokeWidth={2} name="喜び" dot={false} />
                                    <Line type="monotone" dataKey="anxiety" stroke="#c084fc" strokeWidth={2} name="不安" dot={false} />
                                    <Line type="monotone" dataKey="calm" stroke="#93c5fd" strokeWidth={2} name="平穏" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* AI Trend Report */}
                    <div className="bg-gradient-to-br from-white to-navy-50 p-5 rounded-2xl shadow-sm border border-navy-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-navy-900 flex items-center">
                                <Sparkles size={16} className="mr-2 text-navy-600"/>
                                AI 月次傾向レポート
                            </h3>
                            <button 
                                onClick={handleGenerateTrend}
                                disabled={isGeneratingTrend}
                                className="text-xs bg-navy-900 text-white px-3 py-1.5 rounded-full hover:bg-navy-800 disabled:opacity-50 transition-colors shadow-sm flex items-center"
                            >
                                {isGeneratingTrend ? <Loader2 className="animate-spin mr-1" size={12}/> : null}
                                {trendReport ? '再分析' : '分析を実行'}
                            </button>
                        </div>

                        {trendReport ? (
                            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap animate-in fade-in">
                                {trendReport}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 py-4 text-center">
                                「分析を実行」を押すと、最近の日記から<br/>感情の変化や思考の癖をAIが読み解きます。
                            </p>
                        )}
                    </div>
                  </>
              )}
          </div>
      )}
    </div>
  );
};