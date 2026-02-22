'use client';

import React, { useMemo, useState } from 'react';
import { AppData } from '@/types';
import { Sparkles, Book, Target, TrendingUp, ChevronLeft, ChevronRight, Sun, Moon, CloudSun } from 'lucide-react';

interface DashboardProps {
  data: AppData;
  onNavigate: (view: 'JOURNAL' | 'GOALS' | 'MONEY') => void;
}

const EMOTION_COLORS: Record<string, string> = {
  joy: '#facc15',
  calm: '#93c5fd',
  anxiety: '#c084fc',
  sadness: '#94a3b8',
  anger: '#f87171',
};

export const Dashboard: React.FC<DashboardProps> = ({ data, onNavigate }) => {
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const hour = new Date().getHours();
  const greeting = hour < 10 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'おつかれさまです';
  const GreetingIcon = hour < 10 ? Sun : hour < 18 ? CloudSun : Moon;
  const userName = data.user?.name || 'ユーザー';

  // Today's entry
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntry = data.journal.find(e => e.date.startsWith(todayStr));

  // Recent AI comment
  const latestCommented = [...data.journal].reverse().find(e => e.aiComment);

  // Active goals count
  const activeGoals = data.goals.filter(g => g.progress < 100);
  const completedGoals = data.goals.filter(g => g.progress >= 100);

  // Streak calculation
  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasEntry = data.journal.some(e => e.date.startsWith(dateStr));
      if (hasEntry) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  }, [data.journal]);

  // Emotion calendar data
  const calendarData = useMemo(() => {
    const { year, month } = calendarMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const entries: Record<number, { dominant: string; score: number }> = {};

    data.journal.forEach(e => {
      const d = new Date(e.date);
      if (d.getFullYear() === year && d.getMonth() === month && e.analysis?.emotions) {
        const emotions = e.analysis.emotions;
        const dominant = Object.entries(emotions).reduce((a, b) => a[1] > b[1] ? a : b);
        const day = d.getDate();
        if (!entries[day] || dominant[1] > entries[day].score) {
          entries[day] = { dominant: dominant[0], score: dominant[1] };
        }
      }
    });

    return { daysInMonth, firstDayOfWeek, entries };
  }, [data.journal, calendarMonth]);

  const monthLabel = `${calendarMonth.year}年${calendarMonth.month + 1}月`;

  const prevMonth = () => {
    setCalendarMonth(prev => {
      const m = prev.month - 1;
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
    });
  };

  const nextMonth = () => {
    setCalendarMonth(prev => {
      const m = prev.month + 1;
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
    });
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Greeting */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center">
          <GreetingIcon className="text-navy-700" size={20} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-navy-900">{greeting}、{userName}さん</h2>
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => onNavigate('JOURNAL')} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-navy-900">{streak}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">連続記録日</div>
        </button>
        <button onClick={() => onNavigate('JOURNAL')} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-navy-900">{data.journal.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">総日記数</div>
        </button>
        <button onClick={() => onNavigate('GOALS')} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
          <div className="text-2xl font-bold text-navy-900">{completedGoals.length}/{data.goals.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">目標達成</div>
        </button>
      </div>

      {/* Today's Status */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-2 mb-3">
          <Book size={16} className="text-navy-600" />
          <h3 className="text-sm font-bold text-navy-900">今日のステータス</h3>
        </div>
        {todayEntry ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 line-clamp-2">{todayEntry.content}</p>
            {todayEntry.analysis?.emotions && (
              <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
                {Object.entries(todayEntry.analysis.emotions).map(([key, val]) => (
                  <div key={key} style={{ width: `${(val as number) * 100}%`, backgroundColor: EMOTION_COLORS[key] }} />
                ))}
              </div>
            )}
            {todayEntry.analysis?.themes && (
              <div className="flex flex-wrap gap-1">
                {todayEntry.analysis.themes.slice(0, 4).map((t, i) => (
                  <span key={i} className="text-[10px] bg-navy-50 text-navy-600 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => onNavigate('JOURNAL')}
            className="w-full py-4 border-2 border-dashed border-navy-100 rounded-xl text-sm text-navy-400 hover:bg-navy-50 hover:text-navy-600 transition-colors"
          >
            今日の日記を書く
          </button>
        )}
      </div>

      {/* Latest AI Comment */}
      {latestCommented && latestCommented.aiComment && (
        <div className="bg-navy-50 rounded-2xl p-4 border border-navy-100 relative overflow-hidden">
          <div className="absolute -right-2 -bottom-2 opacity-5 text-navy-900 pointer-events-none">
            <Sparkles size={48} />
          </div>
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles size={14} className="text-navy-600" />
            <span className="text-[10px] font-bold text-navy-600 uppercase tracking-wider">AI からのメッセージ</span>
          </div>
          <p className="text-sm text-navy-800 italic leading-relaxed line-clamp-3 relative z-10">
            {latestCommented.aiComment}
          </p>
        </div>
      )}

      {/* Emotion Calendar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-navy-900">感情カレンダー</h3>
          <div className="flex items-center space-x-2">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft size={16} className="text-gray-400" />
            </button>
            <span className="text-xs font-medium text-gray-600 min-w-[80px] text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['日', '月', '火', '水', '木', '金', '土'].map(d => (
            <div key={d} className="text-[10px] text-center text-gray-400 font-medium py-1">{d}</div>
          ))}
          {/* Empty cells for first week offset */}
          {Array.from({ length: calendarData.firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {/* Day cells */}
          {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
            const day = i + 1;
            const entry = calendarData.entries[day];
            const isToday = day === new Date().getDate() &&
              calendarMonth.year === new Date().getFullYear() &&
              calendarMonth.month === new Date().getMonth();

            return (
              <div
                key={day}
                className={`aspect-square flex items-center justify-center rounded-lg text-xs relative ${
                  isToday ? 'ring-2 ring-navy-400 font-bold' : ''
                }`}
                style={entry ? {
                  backgroundColor: EMOTION_COLORS[entry.dominant] + '30',
                } : {}}
              >
                {entry && (
                  <div
                    className="absolute inset-1 rounded-md opacity-40"
                    style={{ backgroundColor: EMOTION_COLORS[entry.dominant] }}
                  />
                )}
                <span className={`relative z-10 ${entry ? 'font-medium text-gray-700' : 'text-gray-300'}`}>
                  {day}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex justify-center space-x-3 mt-3 pt-3 border-t border-gray-50">
          {Object.entries(EMOTION_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-gray-400">
                {key === 'joy' ? '喜' : key === 'calm' ? '穏' : key === 'anxiety' ? '不安' : key === 'sadness' ? '悲' : '怒'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Target size={16} className="text-navy-600" />
              <h3 className="text-sm font-bold text-navy-900">進行中の目標</h3>
            </div>
            <button onClick={() => onNavigate('GOALS')} className="text-[10px] text-navy-500 hover:text-navy-700">すべて見る</button>
          </div>
          <div className="space-y-2">
            {activeGoals.slice(0, 3).map(goal => (
              <div key={goal.id} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-navy-50 rounded-lg flex items-center justify-center text-[10px] font-bold text-navy-600">
                  {goal.progress}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{goal.title}</p>
                  <div className="w-full bg-gray-100 h-1 rounded-full mt-1">
                    <div className="bg-navy-600 h-1 rounded-full transition-all" style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('JOURNAL')}
          className="bg-navy-900 text-white rounded-2xl p-4 text-left hover:bg-navy-800 transition-colors shadow-md"
        >
          <Book size={20} className="mb-2" />
          <div className="text-sm font-bold">日記を書く</div>
          <div className="text-[10px] text-navy-200 mt-0.5">今の気持ちを記録する</div>
        </button>
        <button
          onClick={() => onNavigate('MONEY')}
          className="bg-white text-navy-900 rounded-2xl p-4 text-left border border-gray-100 hover:shadow-md transition-shadow"
        >
          <TrendingUp size={20} className="mb-2 text-navy-600" />
          <div className="text-sm font-bold">資産を確認</div>
          <div className="text-[10px] text-gray-400 mt-0.5">資産の変化をチェック</div>
        </button>
      </div>
    </div>
  );
};
