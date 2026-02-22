
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, GeneticAnalysis, AppData } from '@/types';
import { generateResume, analyzePersonality, summarizeCareerProfile, analyzeGeneticType, analyzeCompatibility } from '@/lib/aiService';
import { User, FileText, Loader2, Save, Trash2, Sparkles, Trophy, Check, Download, Upload, RefreshCw, Briefcase, Heart, Users, Zap, Share2, ImageIcon, X, Dna, Activity, Moon, Link as LinkIcon, ExternalLink, Copy, Target, Smile, Eye, Award, History, Database } from 'lucide-react';

interface ProfileProps {
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetData: () => void;
  onPreviewPublic: () => void;
  onImportData: (data: AppData) => void; // 追加
}

const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"
];

const STRENGTHS_THEMES = [
  "アレンジ", "運命思考", "回復志向", "学習欲", "活発性", "共感性", "競争性", "規律性", "原点思考", "公平性", 
  "個別化", "コミュニケーション", "最上志向", "自我", "自己確信", "社交性", "収集心", "指令性", "慎重さ", "信念", 
  "親密性", "成長促進", "責任感", "戦略性", "達成欲", "着想", "調和性", "適応性", "内省", "分析思考", 
  "包含", "ポジティブ", "未来志向", "目標志向"
].sort();

export const Profile: React.FC<ProfileProps> = ({ profile, onUpdateProfile, onResetData, onPreviewPublic, onImportData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<UserProfile>({
      name: '', email: '', mbti: '', strengths: [], skills: [], history: '',
      careerStrengths: '', interests: '', values: '', environment: '', careerSummary: '',
      geneticTypeRaw: '', geneticAnalysis: undefined, resumeMarkdown: ''
  });
  
  useEffect(() => {
      if (profile) setFormData({ ...profile, strengths: Array.isArray(profile.strengths) ? profile.strengths : [] });
  }, [profile]);

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [isAnalyzingGenetics, setIsAnalyzingGenetics] = useState(false);
  const [isAnalyzingCompatibility, setIsAnalyzingCompatibility] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [partnerLink, setPartnerLink] = useState('');
  const [compatibilityResult, setCompatibilityResult] = useState<string | null>(null);

  const handleChange = (field: keyof UserProfile, value: string) => setFormData(prev => ({ ...prev, [field]: value }));
  
  const handleStrengthChange = (index: number, value: string) => {
    const newStrengths = [...formData.strengths];
    while (newStrengths.length <= index) newStrengths.push('');
    newStrengths[index] = value;
    setFormData(prev => ({ ...prev, strengths: newStrengths }));
  };

  const handleSave = () => {
    onUpdateProfile(formData);
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  // --- Data Backup Functions ---
  const handleExportData = () => {
      const savedData = localStorage.getItem('tarushiru_data');
      if (!savedData) return;
      
      const blob = new Blob([savedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `tarushiru_backup_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const content = event.target?.result as string;
              const parsed = JSON.parse(content);
              // Simple validation
              if (parsed.journal && parsed.goals) {
                  if (window.confirm('データを読み込みますか？現在のデータは上書きされます。')) {
                      onImportData(parsed);
                  }
              } else {
                  alert('有効なバックアップファイルではありません。');
              }
          } catch (err) {
              alert('ファイルの読み込みに失敗しました。');
          }
      };
      reader.readAsText(file);
      // Clear input so same file can be selected again
      e.target.value = '';
  };

  const handleGenerateResume = async () => {
      setIsGeneratingResume(true);
      try {
          const res = await generateResume(formData);
          setFormData(prev => ({ ...prev, resumeMarkdown: res }));
      } catch (e) {
          alert('生成に失敗しました。');
      } finally {
          setIsGeneratingResume(false);
      }
  };

  const handleAnalyzeGenetic = async () => {
      if (!formData.geneticTypeRaw) return;
      setIsAnalyzingGenetics(true);
      try {
          const analysis = await analyzeGeneticType(formData.geneticTypeRaw);
          setFormData(prev => ({ ...prev, geneticAnalysis: analysis }));
      } catch (e) {
          alert('解析に失敗しました。');
      } finally {
          setIsAnalyzingGenetics(false);
      }
  };

  const generateProfileLink = () => {
      const dataToShare = {
          name: formData.name, mbti: formData.mbti, strengths: formData.strengths,
          careerStrengths: formData.careerStrengths, interests: formData.interests,
          values: formData.values, environment: formData.environment,
          geneticAnalysis: formData.geneticAnalysis, careerSummary: formData.careerSummary,
          skills: formData.skills, history: formData.history
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(dataToShare))));
      return `${window.location.origin}${window.location.pathname}#profile=${encoded}`;
  };

  return (
    <div className="space-y-6 pb-24">
       <header className="mb-6 flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-navy-900">Profile</h2>
            <p className="text-sm text-gray-500">自己資産とアイデンティティの管理</p>
        </div>
        <button onClick={() => setShowShareModal(true)} className="bg-navy-900 text-white px-4 py-2 rounded-xl shadow-md text-xs font-bold flex items-center space-x-2">
            <Share2 size={16} /><span>共有・確認</span>
        </button>
      </header>

      {/* Share Modal */}
      {showShareModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-navy-50">
                      <h3 className="font-bold text-navy-900">プロフィールの共有</h3>
                      <button onClick={() => setShowShareModal(false)}><X size={24} className="text-gray-400" /></button>
                  </div>
                  <div className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
                      <div className="space-y-3">
                          <p className="text-xs font-bold text-navy-900">1. 見え方を確認する</p>
                          <button onClick={onPreviewPublic} className="w-full bg-white border-2 border-navy-900 text-navy-900 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-navy-50">
                              <Eye size={18} /><span>公開画面のプレビュー</span>
                          </button>
                      </div>
                      <div className="space-y-3 border-t pt-5">
                          <p className="text-xs font-bold text-navy-900">2. URLを発行して送る</p>
                          <div className="flex space-x-2">
                              <input readOnly value={generateProfileLink()} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-[10px] truncate"/>
                              <button onClick={() => {navigator.clipboard.writeText(generateProfileLink()); alert('URLをコピーしました');}} className="bg-navy-900 text-white px-4 py-2 rounded-lg"><Copy size={16}/></button>
                          </div>
                      </div>
                      <div className="space-y-3 border-t pt-5">
                          <p className="text-xs font-bold text-navy-900">3. 相手と相性診断する</p>
                          <input value={partnerLink} onChange={e => setPartnerLink(e.target.value)} placeholder="相手のURLを入力..." className="w-full bg-navy-50 border border-navy-100 rounded-xl p-3 text-xs focus:outline-none"/>
                          <button disabled={isAnalyzingCompatibility || !partnerLink} onClick={async () => {
                              setIsAnalyzingCompatibility(true);
                              try {
                                const hash = partnerLink.split('#profile=')[1];
                                const partner = JSON.parse(decodeURIComponent(escape(atob(hash))));
                                const res = await analyzeCompatibility(formData, partner);
                                setCompatibilityResult(res);
                              } catch (e) { alert('URLが無効です'); } finally { setIsAnalyzingCompatibility(false); }
                          }} className="w-full bg-navy-900 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50">
                              {isAnalyzingCompatibility ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} className="text-yellow-400"/>}
                              <span>AI 相性診断</span>
                          </button>
                          {compatibilityResult && <div className="p-4 bg-navy-50 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap">{compatibilityResult}</div>}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 1. Basic Info */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-bold text-navy-900 border-b pb-2 flex items-center"><User size={16} className="mr-2"/>基本特性</h3>
        <div className="grid grid-cols-1 gap-4">
            <div><label className="text-xs font-bold text-gray-500 block mb-1">氏名</label><input className="w-full p-2.5 bg-navy-50 rounded-lg text-sm border border-gray-200" value={formData.name} onChange={e => handleChange('name', e.target.value)} /></div>
            <div><label className="text-xs font-bold text-gray-500 block mb-1">MBTI</label><select className="w-full p-2.5 bg-white rounded-lg text-sm border border-gray-200" value={formData.mbti} onChange={e => handleChange('mbti', e.target.value)}><option value="">未選択</option>{MBTI_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="bg-navy-50/50 p-4 rounded-xl border border-navy-100">
                <label className="text-xs font-bold text-navy-900 block mb-2 flex items-center"><Trophy size={14} className="mr-1 text-yellow-600"/>StrengthsFinder (Top 5)</label>
                <div className="space-y-2">{[0, 1, 2, 3, 4].map(i => <select key={i} className="w-full p-2 bg-white rounded-lg border border-gray-200 text-sm" value={formData.strengths[i] || ''} onChange={e => handleStrengthChange(i, e.target.value)}><option value="">{i+1}位を選択...</option>{STRENGTHS_THEMES.map(t => <option key={t} value={t}>{t}</option>)}</select>)}</div>
            </div>
        </div>
      </div>

      {/* 2. Genetic Analysis */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-navy-900 border-b pb-2 flex items-center"><Dna size={16} className="mr-2 text-navy-600"/>遺伝子タイプ分析</h3>
          <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 block">遺伝子検査レポートの要約テキストを入力</label>
              <textarea 
                  className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 h-24" 
                  value={formData.geneticTypeRaw} 
                  onChange={e => handleChange('geneticTypeRaw', e.target.value)} 
                  placeholder="例：睡眠タイプ：夜型、ストレス耐性：やや低い..."
              />
              <button onClick={handleAnalyzeGenetic} disabled={isAnalyzingGenetics || !formData.geneticTypeRaw} className="w-full bg-navy-900 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2">
                  {isAnalyzingGenetics ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} className="text-yellow-400"/>}
                  <span>AIで遺伝子タイプを判定</span>
              </button>

              {formData.geneticAnalysis && (
                  <div className="space-y-3 animate-in fade-in zoom-in-95">
                      <div className="bg-navy-50 p-4 rounded-xl border border-navy-100 text-center">
                          <p className="text-[10px] text-navy-400 font-bold uppercase">判定されたタイプ</p>
                          <p className="text-lg font-bold text-navy-900">{formData.geneticAnalysis.determinedType}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                          <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-start space-x-3">
                              <Activity size={18} className="text-green-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-700 leading-relaxed"><span className="font-bold text-green-700">Health:</span> {formData.geneticAnalysis.healthTips}</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-start space-x-3">
                              <Briefcase size={18} className="text-navy-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-700 leading-relaxed"><span className="font-bold text-navy-700">Work:</span> {formData.geneticAnalysis.workTips}</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-start space-x-3">
                              <Moon size={18} className="text-orange-400 shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-700 leading-relaxed"><span className="font-bold text-orange-700">Life:</span> {formData.geneticAnalysis.lifeTips}</p>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* 3. Values & Summary */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-navy-900 border-b pb-2 flex items-center"><Target size={16} className="mr-2"/>キャリアの軸・価値観</h3>
          <div className="space-y-4">
              <div><label className="text-xs font-bold text-gray-500 block mb-1">強み・特性</label><textarea className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 h-20" value={formData.careerStrengths} onChange={e => handleChange('careerStrengths', e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-500 block mb-1">興味・関心</label><textarea className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 h-20" value={formData.interests} onChange={e => handleChange('interests', e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-500 block mb-1">やりがい・価値観</label><textarea className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 h-20" value={formData.values} onChange={e => handleChange('values', e.target.value)} /></div>
              <div><label className="text-xs font-bold text-gray-500 block mb-1">理想の環境・社風</label><textarea className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 h-20" value={formData.environment} onChange={e => handleChange('environment', e.target.value)} /></div>
              
              <div className="bg-navy-900 rounded-xl p-4 text-white">
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-xs flex items-center"><Sparkles size={14} className="mr-2 text-yellow-400"/>AI 自己統合サマリー</h4>
                        <button disabled={isSummarizing} onClick={async () => {
                            setIsSummarizing(true);
                            try { const res = await summarizeCareerProfile(formData); setFormData(p => ({...p, careerSummary: res})); }
                            finally { setIsSummarizing(false); }
                        }} className="text-[10px] bg-white/20 px-3 py-1 rounded-full disabled:opacity-50">{isSummarizing ? '生成中...' : '自動生成'}</button>
                    </div>
                    {formData.careerSummary && <div className="text-[11px] leading-relaxed text-navy-100 bg-black/20 p-3 rounded-lg">{formData.careerSummary}</div>}
              </div>
          </div>
      </div>

      {/* 4. Skills & History */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-navy-900 border-b pb-2 flex items-center"><Award size={16} className="mr-2"/>スキル・職務経歴</h3>
          <div className="space-y-4">
              <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">保有スキル（言語、資格、得意分野など）</label>
                  <textarea className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 h-20" value={formData.skills as any} onChange={e => handleChange('skills', e.target.value)} placeholder="React, Python, プロジェクトマネジメント..." />
              </div>
              <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1 flex items-center"><History size={14} className="mr-1"/>主な職務経歴・実績</label>
                  <textarea className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 h-32" value={formData.history} onChange={e => handleChange('history', e.target.value)} placeholder="20XX年〜 株式会社◯◯ 入社。..." />
              </div>

              <div className="pt-2">
                  <button onClick={handleGenerateResume} disabled={isGeneratingResume || !formData.history} className="w-full bg-navy-50 border border-navy-200 text-navy-900 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-navy-100 transition-colors">
                      {isGeneratingResume ? <Loader2 className="animate-spin" size={18}/> : <FileText size={18} />}
                      <span>AIで職務経歴書を生成</span>
                  </button>
              </div>

              {formData.resumeMarkdown && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Generated Resume</span>
                          <button onClick={() => handleChange('resumeMarkdown', '')} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                      <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                          {formData.resumeMarkdown}
                      </div>
                  </div>
              )}
          </div>
      </div>

      <button onClick={handleSave} className={`w-full py-4 rounded-xl font-bold flex justify-center items-center space-x-2 shadow-lg transition-all ${showSaveSuccess ? 'bg-green-500 text-white' : 'bg-navy-900 text-white active:scale-95'}`}>
          {showSaveSuccess ? <Check size={20} /> : <Save size={20} />}
          <span>{showSaveSuccess ? '保存完了' : 'プロフィールを保存'}</span>
      </button>

      {/* Data Management Section (Backup) */}
      <div className="bg-navy-50 p-5 rounded-2xl border border-navy-100 space-y-4 mt-8">
          <h3 className="text-sm font-bold text-navy-900 flex items-center"><Database size={16} className="mr-2"/>データバックアップ</h3>
          <p className="text-[10px] text-gray-500 leading-relaxed">
              機種変更時などは、現在のデータを書き出して保存し、新しいデバイスで読み込んでください。
          </p>
          <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleExportData}
                className="bg-white border border-navy-200 text-navy-800 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm hover:bg-navy-100"
              >
                  <Download size={14} /><span>エクスポート</span>
              </button>
              <button 
                onClick={handleImportClick}
                className="bg-white border border-navy-200 text-navy-800 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm hover:bg-navy-100"
              >
                  <Upload size={14} /><span>インポート</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".json"
              />
          </div>
      </div>

      <div className="text-center pt-8 border-t">
          <button onClick={onResetData} className="text-xs text-gray-400 flex items-center mx-auto space-x-1 hover:text-red-500 transition-colors">
              <Trash2 size={12} /><span>全データの初期化</span>
          </button>
      </div>
    </div>
  );
};
