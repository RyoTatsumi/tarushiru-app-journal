
import React, { useState, useMemo } from 'react';
import { JournalEntry } from '../types';
import { analyzeJournalEntry, analyzeJournalTrends } from '../services/geminiService';
import { Loader2, Sparkles, Calendar, Tag, BarChart2, List, Edit2, Check, X, Quote } from 'lucide-react';
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

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');

  const emotionData = useMemo(() => {
    return entries
        .filter(e => e.analysis && e.analysis.emotions)
        .map(e => ({
            date: new Date(e.date).toLocaleDateString(),
            joy: e.analysis?.emotions.joy || 0,
            anxiety: e.analysis?.emotions.anxiety || 0,
            calm: e.analysis?.emotions.calm || 0,
        }))
        .slice(-14);
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
        analysis,
        aiComment: analysis.aiComment
      };

      onAddEntry(newEntry);
      setContent('');
    } catch (error) {
      alert('分析に失敗しました。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startEdit = (entry: JournalEntry) => {
      setEditingId(entry.id);
      setEditContent(entry.content);
      // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
      const d = new Date(entry.date);
      const formattedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setEditDate(formattedDate);
  };

  const cancelEdit = () => {
      setEditingId(null);
      setEditContent('');
      setEditDate('');
  };

  const saveEdit = () => {
      if (!editingId) return;
      // In a real app, we would update the existing entry in the array
      // Here, since onAddEntry appends, we need to handle updates differently in App.tsx
      // For this prototype, I will create a new entry with same ID to simulate update in App.tsx (requires App.tsx change)
      // OR simpler: we assume onAddEntry is actually onUpdateEntry or we filter and re-add.
      
      // Let's assume for this MVP we just update the content in the parent via a new prop? 
      // Ideally, App.tsx should pass an onUpdateEntry function. 
      // Since I can only modify files here, I will rely on App.tsx finding and replacing by ID.
      // Wait, App.tsx `addJournalEntry` just pushes. I need to change App.tsx logic too.
      // I will implement a custom event or logic in App.tsx.
      // For now, let's create a new updated object.
      
      const updatedEntry = entries.find(e => e.id === editingId);
      if (updatedEntry) {
         // Create a modified copy
         const modified: JournalEntry = {
             ...updatedEntry,
             content: editContent,
             date: new Date(editDate).toISOString()
         };
         // To support update, I need to pass a different function. 
         // Since interface is fixed to onAddEntry, I will use a trick: 
         // In App.tsx, I will modify `addJournalEntry` to check for existing ID.
         onAddEntry(modified);
      }
      cancelEdit();
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
            >
                <List size={20} />
            </button>
            <button 
                onClick={() => setMode('analysis')}
                className={`p-2 rounded-md transition-all ${mode === 'analysis' ? 'bg-white shadow text-navy-900' : 'text-gray-400 hover:text-navy-700'}`}
            >
                <BarChart2 size={20} />
            </button>
        </div>
      </header>

      {mode === 'list' && !editingId && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
            <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="今の気持ちや出来事を自由に書いてください..."
            className="w-full h-32 p-3 bg-navy-50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-navy-500 text-gray-700 placeholder-gray-400 text-sm"
            />
            <div className="mt-3 flex justify-end">
            <button
                onClick={handleSubmit}
                disabled={isAnalyzing || !content}
                className="flex items-center space-x-2 bg-navy-900 text-white px-5 py-2.5 rounded-full hover:bg-navy-800 disabled:opacity-50 transition-all shadow-md active:scale-95"
            >
                {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                <span className="font-medium text-xs">保存 & AI分析</span>
            </button>
            </div>
        </div>
      )}

      {/* Editing Modal or Inline */}
      {editingId && (
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-navy-100 mb-6 animate-in zoom-in-95">
              <h3 className="text-sm font-bold text-navy-900 mb-2">日記を編集</h3>
              <input 
                 type="datetime-local" 
                 value={editDate}
                 onChange={e => setEditDate(e.target.value)}
                 className="w-full mb-2 p-2 bg-gray-50 rounded border border-gray-200 text-sm"
              />
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-32 p-3 bg-navy-50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-navy-500 text-gray-700 text-sm mb-3"
              />
              <div className="flex justify-end space-x-2">
                  <button onClick={cancelEdit} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-xs">キャンセル</button>
                  <button onClick={saveEdit} className="px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-bold">更新する</button>
              </div>
          </div>
      )}

      {mode === 'list' ? (
          <div className="space-y-4">
            {entries.slice().reverse().map((entry) => (
            <div key={entry.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 group">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
                        <Calendar size={14} />
                        <span>{new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <button 
                        onClick={() => startEdit(entry)}
                        className="text-gray-300 hover:text-navy-600 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    >
                        <Edit2 size={14} />
                    </button>
                </div>
                
                <p className="text-gray-800 whitespace-pre-wrap leading-relaxed mb-4 text-sm">{entry.content}</p>

                {/* AI Analysis Result */}
                {(entry.analysis || entry.aiComment) && (
                <div className="bg-navy-50 rounded-xl p-4 space-y-4 border border-navy-100">
                    {/* AI Comment */}
                    {entry.aiComment && (
                        <div className="flex space-x-3 mb-2">
                            <Quote className="text-navy-300 shrink-0" size={16} />
                            <p className="text-sm text-navy-800 font-medium italic">
                                {entry.aiComment}
                            </p>
                        </div>
                    )}

                    {entry.analysis && (
                    <>
                        {/* Emotions */}
                        <div>
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-white/50">
                            <div style={{ width: `${(entry.analysis.emotions.joy || 0) * 100}%` }} className="bg-yellow-400" />
                            <div style={{ width: `${(entry.analysis.emotions.calm || 0) * 100}%` }} className="bg-blue-300" />
                            <div style={{ width: `${(entry.analysis.emotions.anxiety || 0) * 100}%` }} className="bg-purple-400" />
                            <div style={{ width: `${(entry.analysis.emotions.sadness || 0) * 100}%` }} className="bg-gray-400" />
                            <div style={{ width: `${(entry.analysis.emotions.anger || 0) * 100}%` }} className="bg-red-400" />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
                            <span>Joy</span><span>Calm</span><span>Anxiety</span>
                        </div>
                        </div>

                        {/* Themes */}
                        <div className="flex flex-wrap gap-2 pt-1">
                            {entry.analysis.themes?.map((theme, idx) => (
                            <span key={idx} className="inline-flex items-center space-x-1 bg-white text-navy-700 px-2 py-1 rounded-md text-[10px] border border-navy-100 shadow-sm">
                                <Tag size={10} />
                                <span>{theme}</span>
                            </span>
                            ))}
                        </div>
                    </>
                    )}
                </div>
                )}
            </div>
            ))}
          </div>
      ) : (
          /* Analysis View (Same as before) */
          <div className="space-y-6">
               <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-bold text-navy-900 mb-4">感情の推移</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={emotionData}>
                                <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                <YAxis hide domain={[0, 1]} />
                                <Tooltip contentStyle={{backgroundColor: '#fff', fontSize: '12px'}} />
                                <Legend wrapperStyle={{fontSize: '12px'}}/>
                                <Line type="monotone" dataKey="joy" stroke="#facc15" strokeWidth={2} name="喜び" dot={false} />
                                <Line type="monotone" dataKey="anxiety" stroke="#c084fc" strokeWidth={2} name="不安" dot={false} />
                                <Line type="monotone" dataKey="calm" stroke="#93c5fd" strokeWidth={2} name="平穏" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-navy-900 flex items-center">
                            <Sparkles size={16} className="mr-2 text-navy-600"/>AI レポート
                        </h3>
                        <button onClick={handleGenerateTrend} disabled={isGeneratingTrend} className="text-xs bg-navy-900 text-white px-3 py-1.5 rounded-full hover:bg-navy-800 flex items-center">
                            {isGeneratingTrend ? <Loader2 className="animate-spin mr-1" size={12}/> : null} 分析
                        </button>
                    </div>
                    {trendReport && <div className="text-sm text-gray-700 whitespace-pre-wrap">{trendReport}</div>}
                </div>
          </div>
      )}
    </div>
  );
};
