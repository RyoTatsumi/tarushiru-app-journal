'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Shield } from 'lucide-react';
import { AppData } from '@/types';

interface BackupReminderProps {
  data: AppData;
}

const BACKUP_REMINDER_KEY = 'tarushiru_last_backup_reminder';
const REMINDER_INTERVAL_DAYS = 30;

export const BackupReminder: React.FC<BackupReminderProps> = ({ data }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const lastReminder = localStorage.getItem(BACKUP_REMINDER_KEY);
    const now = Date.now();

    if (!lastReminder) {
      // 初回：日記が3件以上あれば表示
      if (data.journal.length >= 3) {
        setShow(true);
      }
    } else {
      const daysSince = (now - parseInt(lastReminder)) / (1000 * 60 * 60 * 24);
      if (daysSince >= REMINDER_INTERVAL_DAYS && data.journal.length > 0) {
        setShow(true);
      }
    }
  }, [data.journal.length]);

  const handleBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarushiru_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    dismiss();
  };

  const dismiss = () => {
    localStorage.setItem(BACKUP_REMINDER_KEY, Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 space-y-4">
        <div className="flex justify-between items-start">
          <div className="w-12 h-12 bg-navy-50 rounded-xl flex items-center justify-center">
            <Shield className="text-navy-700" size={24} />
          </div>
          <button onClick={dismiss} className="text-gray-300 hover:text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-navy-900">データのバックアップ</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            あなたの大切な記録を守るために、定期的なバックアップをおすすめします。
            データはこのブラウザにのみ保存されています。
          </p>
        </div>

        <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
          日記 {data.journal.length}件 / 目標 {data.goals.length}件 / 資産記録 {data.assets.length}件
        </div>

        <div className="flex space-x-3">
          <button
            onClick={dismiss}
            className="flex-1 py-3 text-gray-500 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
          >
            あとで
          </button>
          <button
            onClick={handleBackup}
            className="flex-1 py-3 bg-navy-900 text-white rounded-xl text-sm font-bold hover:bg-navy-800 transition-colors flex items-center justify-center space-x-2"
          >
            <Download size={16} />
            <span>バックアップ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
