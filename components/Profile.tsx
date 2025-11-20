import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { generateResume, analyzePersonality } from '../services/geminiService';
import { User, FileText, Loader2, Save, Trash2, Sparkles, Trophy, Check, Download, Upload, RefreshCw } from 'lucide-react';

interface ProfileProps {
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetData: () => void;
}

const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ"
];

const STRENGTHS_THEMES = [
  "アレンジ", "運命思考", "回復志向", "学習欲", "活発性", 
  "共感性", "競争性", "規律性", "原点思考", "公平性", 
  "個別化", "コミュニケーション", "最上志向", "自我", "自己確信", 
  "社交性", "収集心", "指令性", "慎重さ", "信念", 
  "親密性", "成長促進", "責任感", "戦略性", "達成欲", 
  "着想", "調和性", "適応性", "内省", "分析思考", 
  "包含", "ポジティブ", "未来志向", "目標志向"
].sort();

export const Profile: React.FC<ProfileProps> = ({ profile, onUpdateProfile, onResetData }) => {
  const [formData, setFormData] = useState<UserProfile>({
      name: '',
      email: '',
      mbti: '',
      strengths: [],
      skills: [],
      history: '',
      resumeMarkdown: '',
      personalityAnalysis: ''
  });
  
  // Sync state with props when profile loads or updates
  useEffect(() => {
      if (profile) {
          setFormData({
            ...profile,
            strengths: Array.isArray(profile.strengths) 
                ? profile.strengths 
                : (profile.strengths ? [profile.strengths as any] : [])
          });
      }
  }, [profile]);

  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isAnalyzingPersonality, setIsAnalyzingPersonality] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStrengthChange = (index: number, value: string) => {
    const newStrengths = [...formData.strengths];
    while (newStrengths.length <= index) {
        newStrengths.push('');
    }
    newStrengths[index] = value;
    setFormData(prev => ({ ...prev, strengths: newStrengths }));
  };

  const handleSkillChange = (value: string) => {
    const skills = value.split(',').map(s => s.trim());
    setFormData(prev => ({ ...prev, skills }));
  };

  const handleSave = () => {
    onUpdateProfile(formData);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  const handleAnalyzePersonality = async () => {
    const validStrengths = formData.strengths.filter(s => s);
    if (!formData.mbti || validStrengths.length === 0) {
        alert('MBTIとストレングスファインダー(少なくとも1つ)を選択してください。');
        return;
    }
    
    setIsAnalyzingPersonality(true);
    try {
      const result = await analyzePersonality(formData.mbti, validStrengths);
      const updatedProfile = { ...formData, personalityAnalysis: result };
      setFormData(updatedProfile);
      onUpdateProfile(updatedProfile);
    } catch (error) {
      console.error(error);
      alert('性格分析に失敗しました。インターネット接続やAPIキーを確認してください。');
    } finally {
      setIsAnalyzingPersonality(false);
    }
  };

  const handleGenerateResume = async () => {
    if (!formData.history) {
        alert('経歴・職歴メモを入力してください。');
        return;
    }
    setIsGeneratingResume(true);
    try {
      const markdown = await generateResume(formData);
      const updatedProfile = { ...formData, resumeMarkdown: markdown };
      setFormData(updatedProfile);
      onUpdateProfile(updatedProfile);
    } catch (error) {
      alert('経歴書の生成に失敗しました。');
    } finally {
      setIsGeneratingResume(false);
    }
  };

  // Export / Import Handlers
  const handleExportData = () => {
    const dataStr = localStorage.getItem('tarushiru_data');
    if (!dataStr) {
        alert('保存するデータがありません。');
        return;
    }
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tarushiru_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = event.target?.result as string;
              // Basic validation
              const parsed = JSON.parse(json);
              if (!parsed.user) throw new Error("Invalid Data Format");
              
              if (window.confirm('現在のデータを上書きして、バックアップを復元しますか？')) {
                  localStorage.setItem('tarushiru_data', json);
                  window.location.reload(); // Reload to apply changes safely
              }
          } catch (err) {
              alert('ファイルの読み込みに失敗しました。データ形式が正しくない可能性があります。');
          }
      };
      reader.readAsText(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 pb-24">
       <header className="mb-6 flex justify-between items-end">
        <div>
            <h2 className="text-2xl font-bold text-navy-900">Profile</h2>
            <p className="text-sm text-gray-500">あなたのキャリア資産とアイデンティティ。</p>
        </div>
        
        {/* Backup Controls */}
        <div className="flex space-x-2">
            <button 
                onClick={handleExportData}
                className="p-2 bg-white border border-gray-200 rounded-lg text-navy-600 hover:bg-navy-50 hover:text-navy-900 transition-colors"
                title="データをファイルに保存 (バックアップ)"
            >
                <Download size={18} />
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white border border-gray-200 rounded-lg text-navy-600 hover:bg-navy-50 hover:text-navy-900 transition-colors"
                title="ファイルを読み込んで復元"
            >
                <Upload size={18} />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImportData} 
                accept=".json" 
                className="hidden" 
            />
        </div>
      </header>

      {/* Basic Info Form */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h3 className="text-sm font-bold text-navy-900 flex items-center space-x-2 border-b border-gray-100 pb-2">
            <User size={16} />
            <span>基本情報と性格特性</span>
        </h3>
        
        <div className="space-y-4">
            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">氏名</label>
                <input 
                    className="w-full p-2.5 bg-navy-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-navy-500 transition-colors"
                    value={formData.name} 
                    onChange={e => handleChange('name', e.target.value)} 
                    placeholder="山田 太郎"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">MBTI (16タイプ)</label>
                    <div className="relative">
                        <select 
                            className="w-full p-2.5 bg-white rounded-lg text-sm border border-gray-200 appearance-none focus:ring-2 focus:ring-navy-500 focus:outline-none"
                            value={formData.mbti} 
                            onChange={e => handleChange('mbti', e.target.value)}
                        >
                            <option value="">選択してください</option>
                            {MBTI_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <div className="absolute right-3 top-3 pointer-events-none text-gray-400">▼</div>
                    </div>
                </div>
            </div>

            <div className="bg-navy-50/50 p-4 rounded-xl border border-navy-100">
                 <label className="text-xs font-bold text-navy-900 block mb-3 flex items-center">
                    <Trophy size={12} className="mr-1 text-yellow-600"/>
                    ストレングスファインダー (Top 5)
                 </label>
                 <div className="space-y-2">
                    {[0, 1, 2, 3, 4].map((index) => (
                        <div key={index} className="flex items-center space-x-3 bg-white p-2 rounded-lg border border-gray-100">
                            <span className={`text-[10px] font-bold w-8 text-center py-1 rounded ${
                                index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                index === 1 ? 'bg-gray-100 text-gray-600' :
                                index === 2 ? 'bg-orange-50 text-orange-600' :
                                'text-gray-400 bg-gray-50'
                            }`}>
                                {index + 1}位
                            </span>
                            <select 
                                className="flex-1 bg-transparent text-sm focus:outline-none"
                                value={formData.strengths[index] || ''} 
                                onChange={e => handleStrengthChange(index, e.target.value)}
                            >
                                <option value="">資質を選択...</option>
                                {STRENGTHS_THEMES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* Auto Personality Analysis */}
            {(formData.mbti || formData.strengths.some(s => s)) && (
                <div className="bg-gradient-to-br from-white to-navy-50 p-4 rounded-xl border border-navy-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles size={60} />
                    </div>
                    <div className="flex justify-between items-center mb-3 relative z-10">
                         <span className="text-xs font-bold text-navy-800 flex items-center">
                            <Sparkles size={14} className="mr-1.5 text-yellow-500"/>
                            AI特性分析
                         </span>
                         {!formData.personalityAnalysis && (
                             <button 
                                onClick={handleAnalyzePersonality}
                                disabled={isAnalyzingPersonality}
                                className="text-[10px] text-white bg-navy-900 px-3 py-1.5 rounded-full hover:bg-navy-700 disabled:opacity-50 transition-all shadow-sm"
                             >
                                {isAnalyzingPersonality ? '分析中...' : '強みを分析する'}
                             </button>
                         )}
                    </div>
                    
                    {formData.personalityAnalysis ? (
                        <div className="relative z-10">
                            <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-white/80 p-3 rounded-lg border border-navy-50">
                                {formData.personalityAnalysis}
                            </div>
                            <div className="text-right mt-2">
                                <button onClick={handleAnalyzePersonality} className="text-[10px] text-navy-500 hover:text-navy-800 underline flex items-center ml-auto">
                                    <RefreshCw size={10} className="mr-1" />
                                    再分析する
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400 relative z-10">
                            あなたのMBTIとストレングスファインダーの組み合わせから、<br/>独自の強みとキャリアの活かし方をAIが分析します。
                        </p>
                    )}
                </div>
            )}

            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">保有スキル</label>
                <input 
                    className="w-full p-2.5 bg-navy-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-navy-500"
                    value={formData.skills.join(', ')} 
                    onChange={e => handleSkillChange(e.target.value)} 
                    placeholder="例: React, Python, チームビルディング, 英語(TOEIC 800)"
                />
                <p className="text-[10px] text-gray-400 mt-1">カンマ区切りで入力</p>
            </div>
        </div>

        <div className="pt-2">
            <button 
                onClick={handleSave}
                className={`w-full py-3 rounded-xl font-bold transition-all flex justify-center items-center space-x-2 shadow-md ${
                    showSaveSuccess ? 'bg-green-500 text-white' : 'bg-navy-900 text-white hover:bg-navy-800'
                }`}
            >
                {showSaveSuccess ? <Check size={18} /> : <Save size={18} />}
                <span>{showSaveSuccess ? '保存しました！' : 'プロフィールを保存'}</span>
            </button>
        </div>
      </div>

      {/* Resume Generator */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
         <h3 className="text-sm font-bold text-navy-900 flex items-center space-x-2 border-b border-gray-100 pb-2">
            <FileText size={16} />
            <span>職務経歴書 自動生成</span>
        </h3>
        
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-500 block">経歴・職歴メモ</label>
                <span className="text-[10px] text-navy-600 bg-navy-50 px-2 py-0.5 rounded-full border border-navy-100">自然言語・箇条書きでOK</span>
            </div>
            <textarea 
                className="w-full p-3 bg-navy-50 rounded-lg text-sm h-48 border border-gray-200 focus:outline-none focus:border-navy-500 resize-none leading-relaxed"
                value={formData.history} 
                onChange={e => handleChange('history', e.target.value)} 
                placeholder={`【入力例】
・2018年4月 〇〇株式会社に入社。
・営業部に配属され、新規開拓を担当。
・2020年にはチームリーダーになり、5人の部下を持った。
・売上目標を3年連続で達成。
・使用ツール：Salesforce, Excel

※ このように思いつくまま書いてください。AIがきれいな経歴書フォーマットに書き換えます。`}
            />
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="text-xs text-blue-800 leading-relaxed">
                入力されたメモとプロフィール情報を統合し、フォーマルな職務経歴書（Markdown形式）を作成します。
            </p>
        </div>
        
        <button
            onClick={handleGenerateResume}
            disabled={isGeneratingResume}
            className="w-full border-2 border-navy-900 text-navy-900 py-3 rounded-xl font-bold hover:bg-navy-50 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
             {isGeneratingResume ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
             <span>AIで経歴書を生成する</span>
        </button>

        {formData.resumeMarkdown && (
            <div className="mt-6 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-navy-900">生成結果 (Markdown)</h4>
                    <span className="text-[10px] text-gray-400">コピーして利用可能</span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 overflow-x-auto max-h-96 overflow-y-auto shadow-inner">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                        {formData.resumeMarkdown}
                    </pre>
                </div>
            </div>
        )}
      </div>

       {/* Reset Data */}
       <div className="pt-6">
        <button
            onClick={onResetData}
            className="w-full py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2 text-xs"
        >
            <Trash2 size={14} />
            <span>全データを削除してリセット</span>
        </button>
       </div>

    </div>
  );
};