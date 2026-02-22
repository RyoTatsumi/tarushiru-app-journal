'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { JournalEntry, UserProfile, Goal, AIMemory } from '@/types';
import { analyzeJournalEntry, analyzeJournalTrends } from '@/lib/aiService';
import { useToast } from '@/components/Toast';
import { Loader2, Sparkles, Calendar, Tag, BarChart2, List, Edit2, Check, X, Quote, Clock, Trash2, Bookmark, BookmarkCheck, MessageCircle, Lightbulb } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface JournalProps {
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
  onUpdateEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
  profile: UserProfile | null;
  goals: Goal[];
  aiMemory?: AIMemory;
}

type TabMode = 'list' | 'analysis';
type Timeframe = '1m' | '3m' | '6m' | '1y' | '2y';

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  '1m': '1ヶ月', '3m': '3ヶ月', '6m': '6ヶ月', '1y': '1年', '2y': '2年'
};

const WRITING_PROMPTS = [
  '今日、一番印象に残った瞬間は？',
  '今の気持ちを一言で表すと？',
  '最近、自分を褒めたいことは？',
  '今、頭の中にあるモヤモヤは何？',
  '今日、感謝したいことはある？',
  '最近の「小さな幸せ」は？',
  '今、挑戦していることは？',
  '心に残っている会話はある？',
];

const DRAFT_KEY = 'tarushiru_journal_draft';

const SUB_EMOTION_LABELS: Record<string, string> = {
  fulfillment: '充実', loneliness: '孤独', gratitude: '感謝',
  frustration: 'もどかしさ', hope: '希望', confusion: '迷い',
};

export const Journal: React.FC<JournalProps> = ({ entries, onAddEntry, onUpdateEntry, onDeleteEntry, profile, goals, aiMemory }) => {
  const { showToast, showConfirm } = useToast();
  const [mode, setMode] = useState<TabMode>('list');
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trendReport, setTrendReport] = useState<string | null>(null);
  const [isGeneratingTrend, setIsGeneratingTrend] = useState(false);
  const [reportTimeframe, setReportTimeframe] = useState<Timeframe>('1m');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');

  // Writing prompt
  const [writingPrompt] = useState(() => WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)]);

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) setContent(draft);
  }, []);

  // Save draft
  const saveDraft = useCallback((text: string) => {
    if (text.trim()) {
      localStorage.setItem(DRAFT_KEY, text);
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 300) + 'px';
    }
  }, []);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    saveDraft(e.target.value);
    autoResize();
  };

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
      const recentEntries = entries.slice(-5);
      const analysis = await analyzeJournalEntry(content, profile, recentEntries, goals, aiMemory);
      const newEntry: JournalEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        content,
        analysis,
        aiComment: analysis.aiComment
      };

      onAddEntry(newEntry);
      setContent('');
      localStorage.removeItem(DRAFT_KEY);
      showToast('日記を保存しました', 'success');
    } catch {
      showToast('分析に失敗しました。もう一度お試しください。', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setEditContent(entry.content);
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
    const updatedEntry = entries.find(e => e.id === editingId);
    if (updatedEntry) {
      const modified: JournalEntry = {
        ...updatedEntry,
        content: editContent,
        date: new Date(editDate).toISOString()
      };
      onUpdateEntry(modified);
      showToast('日記を更新しました', 'success');
    }
    cancelEdit();
  };

  const handleDelete = (id: string) => {
    showConfirm({
      message: 'この日記を削除しますか？一度削除すると元に戻せません。',
      confirmLabel: '削除する',
      onConfirm: () => {
        onDeleteEntry(id);
        if (editingId === id) cancelEdit();
        showToast('日記を削除しました', 'info');
      }
    });
  };

  const toggleBookmark = (entry: JournalEntry) => {
    onUpdateEntry({ ...entry, bookmarked: !entry.bookmarked });
    showToast(entry.bookmarked ? 'ブックマークを解除しました' : 'AIコメントをブックマークしました', 'success');
  };

  const handleGenerateTrend = async () => {
    setIsGeneratingTrend(true);
    try {
      const now = new Date();
      const monthsMap: Record<Timeframe, number> = { '1m': 1, '3m': 3, '6m': 6, '1y': 12, '2y': 24 };
      const cutoffDate = new Date();
      cutoffDate.setMonth(now.getMonth() - monthsMap[reportTimeframe]);

      const filteredEntries = entries.filter(e => new Date(e.date) >= cutoffDate);

      if (filteredEntries.length === 0) {
        showToast('この期間に日記データがありません。', 'info');
        return;
      }

      const report = await analyzeJournalTrends(filteredEntries, profile, TIMEFRAME_LABELS[reportTimeframe]);
      setTrendReport(report);
    } catch {
      showToast('傾向分析に失敗しました。', 'error');
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
          {/* Writing prompt */}
          {!content && (
            <div className="flex items-center space-x-2 mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-100">
              <Lightbulb size={14} className="text-yellow-500 shrink-0" />
              <span className="text-xs text-yellow-700">{writingPrompt}</span>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder="今の気持ちや出来事を自由に書いてください..."
            className="w-full min-h-[128px] p-3 bg-navy-50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-navy-500 text-gray-700 placeholder-gray-400 text-sm"
          />
          <div className="mt-3 flex justify-between items-center">
            <span className="text-[10px] text-gray-300">{content.length}文字</span>
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
                <div className="flex space-x-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(entry)}
                    className="text-gray-300 hover:text-navy-600 transition-colors p-1"
                    title="編集"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-1"
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed mb-4 text-sm">{entry.content}</p>

              {(entry.analysis || entry.aiComment) && (
                <div className="bg-navy-50 rounded-xl p-4 space-y-4 border border-navy-100 relative overflow-hidden">
                  <div className="absolute -right-2 -bottom-2 opacity-5 text-navy-900 pointer-events-none">
                    <Sparkles size={64} />
                  </div>

                  {entry.aiComment && (
                    <div className="relative z-10">
                      <div className="flex items-start space-x-3 mb-2">
                        <Quote className="text-navy-300 shrink-0 mt-0.5" size={16} />
                        <p className="text-sm text-navy-800 font-medium italic leading-relaxed flex-1">
                          {entry.aiComment}
                        </p>
                        <button
                          onClick={() => toggleBookmark(entry)}
                          className="shrink-0 p-1 hover:bg-navy-100 rounded transition-colors"
                          title={entry.bookmarked ? 'ブックマーク解除' : 'ブックマーク'}
                        >
                          {entry.bookmarked ? (
                            <BookmarkCheck size={14} className="text-yellow-500" />
                          ) : (
                            <Bookmark size={14} className="text-navy-300" />
                          )}
                        </button>
                      </div>

                      {/* Coaching question */}
                      {entry.analysis?.coachingQuestion && (
                        <div className="mt-3 p-3 bg-white/60 rounded-lg border border-navy-100/50">
                          <div className="flex items-center space-x-2 mb-1">
                            <MessageCircle size={12} className="text-navy-500" />
                            <span className="text-[10px] font-bold text-navy-500 uppercase tracking-wider">問いかけ</span>
                          </div>
                          <p className="text-xs text-navy-700 leading-relaxed">{entry.analysis.coachingQuestion}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {entry.analysis && (
                    <div className="relative z-10">
                      {/* Emotion bar */}
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

                      {/* Sub-emotions */}
                      {entry.analysis.subEmotions && Object.keys(entry.analysis.subEmotions).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {Object.entries(entry.analysis.subEmotions)
                            .filter(([, v]) => v && v > 0.3)
                            .sort(([, a], [, b]) => (b || 0) - (a || 0))
                            .map(([key, val]) => (
                              <span key={key} className="inline-flex items-center bg-white/70 text-navy-600 px-2 py-0.5 rounded-full text-[10px] border border-navy-100/50">
                                {SUB_EMOTION_LABELS[key] || key} {((val || 0) * 10).toFixed(0)}
                              </span>
                            ))
                          }
                        </div>
                      )}

                      {/* Themes */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {entry.analysis.themes?.map((theme, idx) => (
                          <span key={idx} className="inline-flex items-center space-x-1 bg-white text-navy-700 px-2 py-1 rounded-md text-[10px] border border-navy-100 shadow-sm">
                            <Tag size={10} />
                            <span>{theme}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-navy-900 mb-4">感情の推移 (直近)</h3>
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

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-navy-900 flex items-center">
                <Clock size={16} className="mr-2 text-navy-600"/>
                分析期間
              </h3>
            </div>

            <div className="flex p-1 bg-navy-50 rounded-xl space-x-1">
              {(['1m', '3m', '6m', '1y', '2y'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setReportTimeframe(tf)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    reportTimeframe === tf ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-400 hover:text-navy-600'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateTrend}
              disabled={isGeneratingTrend}
              className="w-full bg-navy-900 text-white py-3 rounded-xl font-bold hover:bg-navy-800 transition-all flex items-center justify-center space-x-2"
            >
              {isGeneratingTrend ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} className="text-yellow-400" />}
              <span>AI成長レポートを生成</span>
            </button>

            {trendReport && (
              <div className="mt-4 p-4 bg-navy-50 rounded-xl border border-navy-100 animate-in zoom-in-95">
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
                  {trendReport}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
