'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { JournalEntry, UserProfile, Goal, AIMemory } from '@/types';
import { analyzeJournalEntry, analyzeJournalTrends } from '@/lib/aiService';
import { useToast } from '@/components/Toast';
import { Loader2, Sparkles, Calendar, Tag, BarChart2, List, Edit2, Check, X as XIcon, Quote, Clock, Trash2, Bookmark, BookmarkCheck, MessageCircle, Lightbulb, Search, Sun, Moon, Heart, Filter, RefreshCw, Compass } from 'lucide-react';
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

// A3: Journal Templates
const JOURNAL_TEMPLATES: { id: string; label: string; icon: React.ElementType; placeholder: string }[] = [
  { id: 'free', label: '自由記述', icon: Edit2, placeholder: '今の気持ちや出来事を自由に書いてください...' },
  { id: 'morning', label: '朝日記', icon: Sun, placeholder: '今日の目標・やりたいこと・体調は？\n\n今日の目標:\n体調:\n意識したいこと:' },
  { id: 'evening', label: '夜日記', icon: Moon, placeholder: '今日あったこと・感じたこと・明日への一言\n\n今日のハイライト:\n感じたこと:\n明日の自分へ:' },
  { id: 'gratitude', label: '感謝日記', icon: Heart, placeholder: '今日感謝したいこと3つ\n\n1. \n2. \n3. \nなぜ感謝したいか:' },
];

// Expanded Emotion Display: full 35 sub-emotions
const SUB_EMOTION_LABELS: Record<string, string> = {
  fulfillment: '充実', gratitude: '感謝', pride: '誇り', relief: '安堵', love: '愛情', contentment: '満足',
  hope: '希望', curiosity: '好奇心', determination: '決意',
  loneliness: '孤独', nostalgia: '懐かしさ', disappointment: '失望',
  frustration: 'もどかしさ', irritation: '苛立ち', envy: '嫉妬',
  overwhelm: '圧倒', confusion: '迷い', guilt: '罪悪感', vulnerability: '不安定',
  boredom: '退屈', shame: '恥',
  empathy: '共感', self_compassion: '自己慈悲', awe: '畏敬',
  playfulness: '遊び心', serenity: '静けさ', restlessness: '焦り',
  melancholy: '物悲しさ', inspiration: '触発', acceptance: '受容',
  resistance: '抵抗', regret: '後悔', liberation: '解放感', exhaustion: '疲弊',
};

// Expanded 8 primary emotions
const EMOTION_LABELS: Record<string, string> = {
  joy: '喜び', anger: '怒り', sadness: '悲しみ', anxiety: '不安', calm: '穏やか',
  excitement: 'ワクワク', trust: '安心', surprise: '驚き',
};

const EMOTION_COLORS: Record<string, string> = {
  joy: '#facc15', anger: '#f87171', sadness: '#94a3b8', anxiety: '#c084fc', calm: '#93c5fd',
  excitement: '#fb923c', trust: '#34d399', surprise: '#f472b6',
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

  // Re-analysis state
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [reanalysisProgress, setReanalysisProgress] = useState({ done: 0, total: 0 });

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editDate, setEditDate] = useState('');

  // A3: Template state
  const [selectedTemplate, setSelectedTemplate] = useState('free');

  // Writing prompt
  const [writingPrompt] = useState(() => WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)]);

  // A1: Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTheme, setFilterTheme] = useState<string | null>(null);
  const [filterEmotion, setFilterEmotion] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // A1: Available themes from all entries
  const availableThemes = useMemo(() =>
    [...new Set(entries.flatMap(e => e.analysis?.themes || []))].sort(),
    [entries]
  );

  // A1: Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!entry.content.toLowerCase().includes(query)) return false;
      }
      // Theme filter
      if (filterTheme) {
        if (!entry.analysis?.themes?.includes(filterTheme)) return false;
      }
      // Emotion filter: match if the specified emotion is the dominant one
      if (filterEmotion) {
        if (!entry.analysis?.emotions) return false;
        const emotions = entry.analysis.emotions as unknown as Record<string, number>;
        const dominantEmotion = Object.entries(emotions)
          .sort(([, a], [, b]) => (b as number) - (a as number))[0];
        if (!dominantEmotion || dominantEmotion[0] !== filterEmotion) return false;
      }
      return true;
    });
  }, [entries, searchQuery, filterTheme, filterEmotion]);

  const hasActiveFilters = searchQuery || filterTheme || filterEmotion;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterTheme(null);
    setFilterEmotion(null);
  };

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

  // Continuous emotionData: fill missing days with carried-forward values
  const emotionData = useMemo(() => {
    const analyzed = entries
      .filter(e => e.analysis && e.analysis.emotions)
      .map(e => ({
        dateStr: e.date.split('T')[0],
        emotions: e.analysis!.emotions,
      }))
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    if (analyzed.length === 0) return [];

    const result: { date: string; joy: number; anxiety: number; calm: number; excitement: number; trust: number }[] = [];
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start = new Date(now);
    start.setDate(start.getDate() - 13);
    start.setHours(0, 0, 0, 0);

    let lastKnown: typeof analyzed[0]['emotions'] | null = null;

    // Pre-fill with any data before the 14-day window
    const priorEntries = analyzed.filter(e => e.dateStr < start.toISOString().split('T')[0]);
    if (priorEntries.length > 0) {
      lastKnown = priorEntries[priorEntries.length - 1].emotions;
    }

    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayEntry = analyzed.find(e => e.dateStr === dateStr);

      if (dayEntry) {
        lastKnown = dayEntry.emotions;
      }

      if (lastKnown) {
        result.push({
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          joy: lastKnown.joy || 0,
          anxiety: lastKnown.anxiety || 0,
          calm: lastKnown.calm || 0,
          excitement: (lastKnown as any)?.excitement || 0,
          trust: (lastKnown as any)?.trust || 0,
        });
      }
    }

    return result;
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

  // Count entries needing re-analysis (missing new emotion fields)
  const entriesNeedingReanalysis = useMemo(() => {
    return entries.filter(e => {
      if (!e.analysis?.emotions) return true;
      const emotions = e.analysis.emotions as any;
      return emotions.excitement === undefined || emotions.trust === undefined || emotions.surprise === undefined;
    });
  }, [entries]);

  const handleReanalyze = async () => {
    const toReanalyze = entriesNeedingReanalysis;
    if (toReanalyze.length === 0) return;

    setIsReanalyzing(true);
    setReanalysisProgress({ done: 0, total: toReanalyze.length });

    for (let i = 0; i < toReanalyze.length; i++) {
      try {
        const entry = toReanalyze[i];
        const recentEntries = entries
          .filter(e => e.date < entry.date)
          .slice(-3);
        const analysis = await analyzeJournalEntry(entry.content, profile, recentEntries, goals, aiMemory);
        // Keep original date/content/bookmarked, update analysis + aiComment
        onUpdateEntry({
          ...entry,
          analysis,
          aiComment: analysis.aiComment || entry.aiComment,
        });
        setReanalysisProgress({ done: i + 1, total: toReanalyze.length });
        // Small delay to avoid rate limiting
        if (i < toReanalyze.length - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch {
        // Continue with next entry on error
        setReanalysisProgress(prev => ({ ...prev, done: prev.done + 1 }));
      }
    }

    setIsReanalyzing(false);
    showToast(`${toReanalyze.length}件の日記を再分析しました`, 'success');
  };

  // Get current template placeholder
  const currentTemplate = JOURNAL_TEMPLATES.find(t => t.id === selectedTemplate) || JOURNAL_TEMPLATES[0];

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
          {/* A3: Template selector pills */}
          <div className="flex space-x-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
            {JOURNAL_TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTemplate(t.id);
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedTemplate === t.id
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'bg-navy-50 text-gray-500 hover:bg-navy-100 hover:text-navy-700'
                }`}
              >
                <t.icon size={12} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Writing prompt: show only when template is 'free' and content is empty */}
          {selectedTemplate === 'free' && !content && (
            <div className="flex items-center space-x-2 mb-3 p-2 bg-yellow-50 rounded-lg border border-yellow-100">
              <Lightbulb size={14} className="text-yellow-500 shrink-0" />
              <span className="text-xs text-yellow-700">{writingPrompt}</span>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            placeholder={currentTemplate.placeholder}
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
          {/* A1: Search & Filter Bar */}
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="日記を検索..."
                  className="w-full pl-9 pr-3 py-2 bg-navy-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 text-gray-700 placeholder-gray-400"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-all ${showFilters || hasActiveFilters ? 'bg-navy-900 text-white' : 'bg-navy-50 text-gray-400 hover:text-navy-700'}`}
              >
                <Filter size={16} />
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                  title="フィルターをクリア"
                >
                  <XIcon size={16} />
                </button>
              )}
            </div>

            {showFilters && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                {/* Theme filter */}
                {availableThemes.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">テーマ</label>
                    <select
                      value={filterTheme || ''}
                      onChange={e => setFilterTheme(e.target.value || null)}
                      className="w-full px-3 py-1.5 bg-navy-50 rounded-lg text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-navy-500"
                    >
                      <option value="">すべてのテーマ</option>
                      {availableThemes.map(theme => (
                        <option key={theme} value={theme}>{theme}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Emotion filter */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">感情フィルター（支配的な感情）</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['joy', 'calm', 'anxiety', 'sadness', 'anger', 'excitement', 'trust', 'surprise'] as const).map(emotion => (
                      <button
                        key={emotion}
                        onClick={() => setFilterEmotion(filterEmotion === emotion ? null : emotion)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all border ${
                          filterEmotion === emotion
                            ? 'text-white border-transparent shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                        }`}
                        style={filterEmotion === emotion ? { backgroundColor: EMOTION_COLORS[emotion] } : {}}
                      >
                        {EMOTION_LABELS[emotion]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <div className="mt-2 text-[10px] text-gray-400">
                {filteredEntries.length}件 / {entries.length}件の日記を表示中
              </div>
            )}
          </div>

          {filteredEntries.slice().reverse().map((entry) => (
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

                      {/* Life Reflection Question */}
                      {entry.analysis?.lifeReflectionQuestion && (
                        <div className="mt-3 p-3 bg-gradient-to-r from-amber-50/80 to-yellow-50/80 rounded-lg border border-amber-200/50">
                          <div className="flex items-center space-x-2 mb-1">
                            <Compass size={12} className="text-amber-600" />
                            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">人生の問い</span>
                          </div>
                          <p className="text-xs text-amber-900 leading-relaxed">{entry.analysis.lifeReflectionQuestion}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {entry.analysis && (
                    <div className="relative z-10">
                      {/* Expanded Emotion bar: show all 8 emotions > 0.1 */}
                      <div>
                        <div className="flex h-1.5 rounded-full overflow-hidden bg-white/50">
                          {Object.entries(entry.analysis.emotions)
                            .filter(([, v]) => (v as number) > 0.1)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .map(([key, val]) => (
                              <div key={key} style={{ width: `${(val as number) * 100}%`, backgroundColor: EMOTION_COLORS[key] || '#d1d5db' }} />
                            ))
                          }
                        </div>
                        {/* Dynamic top 3-4 emotion labels */}
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
                          {Object.entries(entry.analysis.emotions)
                            .filter(([, v]) => (v as number) > 0.15)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .slice(0, 4)
                            .map(([key]) => (
                              <span key={key} style={{ color: EMOTION_COLORS[key] || '#9ca3af' }}>{EMOTION_LABELS[key] || key}</span>
                            ))
                          }
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
                  <Line type="monotone" dataKey="excitement" stroke="#fb923c" strokeWidth={2} name="ワクワク" dot={false} />
                  <Line type="monotone" dataKey="trust" stroke="#34d399" strokeWidth={2} name="安心" dot={false} />
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

          {/* Re-analysis of past entries */}
          {entriesNeedingReanalysis.length > 0 && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center space-x-2">
                <RefreshCw size={16} className="text-navy-600" />
                <h3 className="text-sm font-bold text-navy-900">過去の日記を再分析</h3>
              </div>
              <p className="text-xs text-gray-500">
                {entriesNeedingReanalysis.length}件の日記に新しい感情分析（35種のサブ感情）が未適用です。
                再分析すると、より精密な感情データが得られます。
              </p>
              {isReanalyzing ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="animate-spin text-navy-600" size={16} />
                    <span className="text-xs text-navy-700 font-medium">
                      {reanalysisProgress.done} / {reanalysisProgress.total} 件を分析中...
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-navy-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${reanalysisProgress.total > 0 ? (reanalysisProgress.done / reanalysisProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleReanalyze}
                  className="w-full bg-navy-900 text-white py-3 rounded-xl font-bold hover:bg-navy-800 transition-all flex items-center justify-center space-x-2"
                >
                  <RefreshCw size={18} />
                  <span>{entriesNeedingReanalysis.length}件を再分析する</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
