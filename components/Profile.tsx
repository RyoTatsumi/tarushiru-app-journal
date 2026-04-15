
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '@/components/Toast';
import { UserProfile, GeneticAnalysis, AppData, CareerEntry, Goal } from '@/types';
import { generateResume, analyzePersonality, summarizeCareerProfile, analyzeGeneticType, analyzeCompatibility, autoParseProfile } from '@/lib/aiService';
import { User, FileText, Loader2, Save, Trash2, Sparkles, Trophy, Check, Download, Upload, RefreshCw, Briefcase, Heart, Users, Zap, Share2, ImageIcon, X, Dna, Activity, Moon, Link as LinkIcon, ExternalLink, Copy, Target, Smile, Eye, Award, History, Database, Edit2 } from 'lucide-react';

interface ProfileProps {
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetData: () => void;
  onPreviewPublic: () => void;
  onImportData: (data: AppData) => void;
  goals?: Goal[];
  onUpdateGoals?: (goals: Goal[]) => void;
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

export const Profile: React.FC<ProfileProps> = ({ profile, onUpdateProfile, onResetData, onPreviewPublic, onImportData, goals, onUpdateGoals }) => {
  const { showToast, showConfirm } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<UserProfile>({
      name: '', email: '', mbti: '', strengths: [], skills: [], history: '',
      careerStrengths: '', interests: '', values: '', environment: '', careerSummary: '',
      geneticTypeRaw: '', geneticAnalysis: undefined, resumeMarkdown: '',
      careerHistory: [], keyAchievements: [], decisionStyle: '', lifePhilosophy: '',
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

  // Auto-import state
  const [showAutoImport, setShowAutoImport] = useState(false);
  const [autoImportText, setAutoImportText] = useState('');
  const [isAutoImporting, setIsAutoImporting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [autoImportResult, setAutoImportResult] = useState<any>(null);

  // Career entry state
  const [isAddingCareer, setIsAddingCareer] = useState(false);
  const [editingCareerId, setEditingCareerId] = useState<string | null>(null);
  const [careerCompany, setCareerCompany] = useState('');
  const [careerRole, setCareerRole] = useState('');
  const [careerPeriod, setCareerPeriod] = useState('');
  const [careerAchievements, setCareerAchievements] = useState('');
  const [careerDecisionReason, setCareerDecisionReason] = useState('');
  const [newAchievement, setNewAchievement] = useState('');

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

  const clearCareerForm = () => {
    setCareerCompany(''); setCareerRole(''); setCareerPeriod('');
    setCareerAchievements(''); setCareerDecisionReason('');
    setIsAddingCareer(false);
    setEditingCareerId(null);
  };

  const handleAddCareerEntry = () => {
    if (!careerCompany || !careerRole) return;

    if (editingCareerId) {
      // Update existing entry
      setFormData(prev => ({
        ...prev,
        careerHistory: (prev.careerHistory || []).map(c =>
          c.id === editingCareerId
            ? {
                ...c,
                company: careerCompany,
                role: careerRole,
                period: careerPeriod,
                achievements: careerAchievements.split('\n').filter(a => a.trim()),
                decisionReason: careerDecisionReason || undefined,
              }
            : c
        )
      }));
      showToast('経歴を更新しました', 'success');
    } else {
      // Add new entry
      const entry: CareerEntry = {
        id: Date.now().toString(),
        company: careerCompany,
        role: careerRole,
        period: careerPeriod,
        achievements: careerAchievements.split('\n').filter(a => a.trim()),
        decisionReason: careerDecisionReason || undefined,
      };
      setFormData(prev => ({
        ...prev,
        careerHistory: [...(prev.careerHistory || []), entry]
      }));
    }
    clearCareerForm();
  };

  const handleEditCareerEntry = (entry: CareerEntry) => {
    setEditingCareerId(entry.id);
    setCareerCompany(entry.company);
    setCareerRole(entry.role);
    setCareerPeriod(entry.period);
    setCareerAchievements(entry.achievements.join('\n'));
    setCareerDecisionReason(entry.decisionReason || '');
    setIsAddingCareer(true);
  };

  const handleDeleteCareerEntry = (id: string) => {
    showConfirm({
      message: 'この経歴を削除しますか？',
      confirmLabel: '削除',
      onConfirm: () => {
        setFormData(prev => ({
          ...prev,
          careerHistory: (prev.careerHistory || []).filter(c => c.id !== id)
        }));
      }
    });
  };

  const handleAddKeyAchievement = () => {
    if (!newAchievement.trim()) return;
    setFormData(prev => ({
      ...prev,
      keyAchievements: [...(prev.keyAchievements || []), newAchievement.trim()]
    }));
    setNewAchievement('');
  };

  const handleDeleteKeyAchievement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keyAchievements: (prev.keyAchievements || []).filter((_, i) => i !== index)
    }));
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
                  showConfirm({
                      message: 'データを読み込みますか？現在のデータは上書きされます。',
                      confirmLabel: '読み込む',
                      onConfirm: () => onImportData(parsed)
                  });
              } else {
                  showToast('有効なバックアップファイルではありません。', 'error');
              }
          } catch (err) {
              showToast('ファイルの読み込みに失敗しました。', 'error');
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
          showToast('生成に失敗しました。', 'error');
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
          showToast('解析に失敗しました。', 'error');
      } finally {
          setIsAnalyzingGenetics(false);
      }
  };

  // Auto-import: parse text and fill profile
  const handleAutoImport = async () => {
      if (!autoImportText.trim()) return;
      setIsAutoImporting(true);
      setAutoImportResult(null);
      try {
          const result = await autoParseProfile(autoImportText);
          setAutoImportResult(result);
      } catch {
          showToast('自動解析に失敗しました', 'error');
      } finally {
          setIsAutoImporting(false);
      }
  };

  // Apply auto-imported data to profile and goals
  const handleApplyAutoImport = () => {
      if (!autoImportResult) return;
      const r = autoImportResult;

      // Build career history from extracted data
      const newCareerHistory: CareerEntry[] = r.careerHistory?.length
          ? r.careerHistory.map((c: { company: string; role: string; period?: string; achievements?: string[]; decisionReason?: string }) => ({
              id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
              company: c.company,
              role: c.role,
              period: c.period || '',
              achievements: c.achievements || [],
              decisionReason: c.decisionReason,
          }))
          : [];

      // Merge key achievements
      const mergedAchievements = r.keyAchievements?.length
          ? [...(formData.keyAchievements || []), ...r.keyAchievements.filter((a: string) => !(formData.keyAchievements || []).includes(a))]
          : formData.keyAchievements;

      // Merge career history (append new, don't duplicate)
      const existingCompanies = (formData.careerHistory || []).map(c => c.company);
      const mergedCareer = [
          ...(formData.careerHistory || []),
          ...newCareerHistory.filter(c => !existingCompanies.includes(c.company)),
      ];

      // Update profile fields (only non-empty values)
      setFormData(prev => ({
          ...prev,
          mbti: r.mbti || prev.mbti,
          strengths: r.strengths?.length ? r.strengths : prev.strengths,
          careerStrengths: r.careerStrengths || prev.careerStrengths,
          interests: r.interests || prev.interests,
          values: r.values || prev.values,
          lifePhilosophy: r.lifePhilosophy || prev.lifePhilosophy,
          decisionStyle: r.decisionStyle || prev.decisionStyle,
          environment: r.environment || prev.environment,
          geneticAnalysis: r.geneticAnalysis?.determinedType ? r.geneticAnalysis : prev.geneticAnalysis,
          geneticTypeRaw: r.geneticAnalysis?.determinedType ? autoImportText : prev.geneticTypeRaw,
          careerHistory: mergedCareer,
          keyAchievements: mergedAchievements,
      }));

      // Add goals if provided
      if (r.goals?.length && onUpdateGoals && goals) {
          const newGoals: Goal[] = r.goals.map((g: { title: string; description?: string; category: string }) => ({
              id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
              title: g.title,
              description: g.description || '',
              deadline: '',
              progress: 0,
              category: g.category || 'life',
          }));
          onUpdateGoals([...goals, ...newGoals]);
      }

      // Auto-save profile
      const updatedProfile = {
          ...formData,
          mbti: r.mbti || formData.mbti,
          strengths: r.strengths?.length ? r.strengths : formData.strengths,
          careerStrengths: r.careerStrengths || formData.careerStrengths,
          interests: r.interests || formData.interests,
          values: r.values || formData.values,
          lifePhilosophy: r.lifePhilosophy || formData.lifePhilosophy,
          decisionStyle: r.decisionStyle || formData.decisionStyle,
          environment: r.environment || formData.environment,
          geneticAnalysis: r.geneticAnalysis?.determinedType ? r.geneticAnalysis : formData.geneticAnalysis,
          geneticTypeRaw: r.geneticAnalysis?.determinedType ? autoImportText : formData.geneticTypeRaw,
          careerHistory: mergedCareer,
          keyAchievements: mergedAchievements,
      };
      onUpdateProfile(updatedProfile);

      setAutoImportResult(null);
      setAutoImportText('');
      setShowAutoImport(false);
      showToast('プロフィールを自動入力しました', 'success');
  };

  const generateProfileLink = () => {
      const dataToShare = {
          name: formData.name, mbti: formData.mbti, strengths: formData.strengths,
          careerStrengths: formData.careerStrengths, interests: formData.interests,
          values: formData.values, environment: formData.environment,
          geneticAnalysis: formData.geneticAnalysis, careerSummary: formData.careerSummary,
          skills: formData.skills, history: formData.history,
          careerHistory: formData.careerHistory, keyAchievements: formData.keyAchievements,
          decisionStyle: formData.decisionStyle, lifePhilosophy: formData.lifePhilosophy,
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
                              <button onClick={() => {navigator.clipboard.writeText(generateProfileLink()); showToast('URLをコピーしました', 'success');}} className="bg-navy-900 text-white px-4 py-2 rounded-lg"><Copy size={16}/></button>
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
                              } catch (e) { showToast('URLが無効です', 'error'); } finally { setIsAnalyzingCompatibility(false); }
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

      {/* Auto Import Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-200/50">
          <button
              onClick={() => setShowAutoImport(!showAutoImport)}
              className="w-full flex items-center justify-between"
          >
              <div className="flex items-center space-x-3">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                      <Zap size={18} className="text-indigo-600" />
                  </div>
                  <div className="text-left">
                      <h3 className="text-sm font-bold text-navy-900">AI自動入力</h3>
                      <p className="text-[10px] text-gray-500">コーチング・遺伝子検査・ストレングスファインダーの結果を貼り付けるだけ</p>
                  </div>
              </div>
              <span className="text-gray-400 text-lg">{showAutoImport ? '−' : '+'}</span>
          </button>

          {showAutoImport && (
              <div className="mt-4 space-y-3">
                  <div className="bg-white/80 p-3 rounded-lg text-[10px] text-gray-600 space-y-1">
                      <p className="font-bold text-navy-900">以下の情報をまとめて貼り付けてください:</p>
                      <p>• ストレングスファインダーの結果（TOP5の強み）</p>
                      <p>• 遺伝子検査のレポート（体質タイプ、健康アドバイス等）</p>
                      <p>• ライフコーチングのメモ（価値観、目標、人生哲学等）</p>
                      <p>• MBTI診断の結果</p>
                      <p className="text-indigo-600 font-medium mt-1">※ 全て一度に貼っても、一部だけでもOKです</p>
                  </div>

                  <textarea
                      value={autoImportText}
                      onChange={(e) => setAutoImportText(e.target.value)}
                      placeholder="ここにテキストを貼り付けてください...&#10;&#10;例:&#10;ストレングスファインダー結果: 1.内省 2.学習欲 3.着想 4.戦略性 5.収集心&#10;&#10;遺伝子検査: 夜型体質、カフェイン感受性高め...&#10;&#10;コーチングメモ: 大切にしている価値観は「成長」と「自由」..."
                      className="w-full h-40 p-3 bg-white rounded-xl text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                  />

                  <button
                      onClick={handleAutoImport}
                      disabled={isAutoImporting || !autoImportText.trim()}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-40"
                  >
                      {isAutoImporting ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} />}
                      <span>{isAutoImporting ? 'AIが解析中...' : 'AIで自動解析する'}</span>
                  </button>

                  {/* Result Preview */}
                  {autoImportResult && !autoImportResult.error && (
                      <div className="bg-white p-4 rounded-xl border border-indigo-200 space-y-3 animate-in zoom-in-95">
                          <div className="flex items-center space-x-2 mb-2">
                              <Check size={16} className="text-green-500" />
                              <span className="text-sm font-bold text-navy-900">解析結果</span>
                          </div>

                          <p className="text-xs text-gray-600 bg-indigo-50 p-3 rounded-lg leading-relaxed">
                              {autoImportResult.summary}
                          </p>

                          <div className="space-y-2 text-xs">
                              {autoImportResult.mbti && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                      <span className="text-gray-500">MBTI</span>
                                      <span className="font-bold text-navy-900">{autoImportResult.mbti}</span>
                                  </div>
                              )}
                              {autoImportResult.strengths?.length > 0 && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                      <span className="text-gray-500">ストレングス</span>
                                      <span className="font-bold text-navy-900">{autoImportResult.strengths.join(', ')}</span>
                                  </div>
                              )}
                              {autoImportResult.values && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                      <span className="text-gray-500">価値観</span>
                                      <span className="font-bold text-navy-900 text-right max-w-[200px] truncate">{autoImportResult.values}</span>
                                  </div>
                              )}
                              {autoImportResult.lifePhilosophy && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                      <span className="text-gray-500">人生哲学</span>
                                      <span className="font-bold text-navy-900 text-right max-w-[200px] truncate">{autoImportResult.lifePhilosophy}</span>
                                  </div>
                              )}
                              {autoImportResult.geneticAnalysis?.determinedType && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                      <span className="text-gray-500">遺伝子タイプ</span>
                                      <span className="font-bold text-navy-900">{autoImportResult.geneticAnalysis.determinedType}</span>
                                  </div>
                              )}
                              {autoImportResult.careerStrengths && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                      <span className="text-gray-500">キャリア強み</span>
                                      <span className="font-bold text-navy-900 text-right max-w-[200px] truncate">{autoImportResult.careerStrengths}</span>
                                  </div>
                              )}
                              {autoImportResult.environment && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                      <span className="text-gray-500">理想の環境</span>
                                      <span className="font-bold text-navy-900 text-right max-w-[200px] truncate">{autoImportResult.environment}</span>
                                  </div>
                              )}
                              {autoImportResult.decisionStyle && (
                                  <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                      <span className="text-gray-500">意思決定</span>
                                      <span className="font-bold text-navy-900 text-right max-w-[200px] truncate">{autoImportResult.decisionStyle}</span>
                                  </div>
                              )}
                              {autoImportResult.careerHistory?.length > 0 && (
                                  <div className="py-1.5 border-b border-gray-100">
                                      <span className="text-gray-500">経歴</span>
                                      <div className="mt-1 space-y-1">
                                          {autoImportResult.careerHistory.map((c: { company: string; role: string; period?: string }, i: number) => (
                                              <div key={i} className="flex items-center space-x-2">
                                                  <Briefcase size={10} className="text-blue-500" />
                                                  <span className="text-navy-900 font-medium">{c.company}</span>
                                                  <span className="text-gray-400">{c.role}</span>
                                                  {c.period && <span className="text-[9px] text-gray-400">{c.period}</span>}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                              {autoImportResult.keyAchievements?.length > 0 && (
                                  <div className="py-1.5 border-b border-gray-100">
                                      <span className="text-gray-500">主な実績</span>
                                      <div className="mt-1 space-y-1">
                                          {autoImportResult.keyAchievements.map((a: string, i: number) => (
                                              <div key={i} className="flex items-center space-x-2">
                                                  <Trophy size={10} className="text-amber-500" />
                                                  <span className="text-navy-900 font-medium">{a}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                              {autoImportResult.goals?.length > 0 && (
                                  <div className="py-1.5 border-b border-gray-100">
                                      <span className="text-gray-500">抽出された目標</span>
                                      <div className="mt-1 space-y-1">
                                          {autoImportResult.goals.map((g: { title: string; category: string }, i: number) => (
                                              <div key={i} className="flex items-center space-x-2">
                                                  <Target size={10} className="text-amber-500" />
                                                  <span className="text-navy-900 font-medium">{g.title}</span>
                                                  <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded">{g.category}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>

                          <div className="flex space-x-2 pt-2">
                              <button
                                  onClick={handleApplyAutoImport}
                                  className="flex-1 bg-green-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-green-700"
                              >
                                  <Check size={16} />
                                  <span>この内容で保存する</span>
                              </button>
                              <button
                                  onClick={() => setAutoImportResult(null)}
                                  className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm"
                              >
                                  やり直す
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>

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

      {/* 4. Career History & Achievements (Expanded) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-navy-900 border-b pb-2 flex items-center"><Briefcase size={16} className="mr-2"/>キャリア・経歴</h3>

          {/* Life Philosophy & Decision Style */}
          <div className="space-y-3">
              <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1 flex items-center"><Heart size={12} className="mr-1 text-red-400"/>人生哲学・座右の銘</label>
                  <textarea className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 h-16" value={formData.lifePhilosophy || ''} onChange={e => handleChange('lifePhilosophy', e.target.value)} placeholder="例：「好奇心を持ち続け、変化を恐れない」" />
              </div>
              <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1 flex items-center"><Target size={12} className="mr-1 text-navy-600"/>意思決定スタイル</label>
                  <textarea className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 h-16" value={formData.decisionStyle || ''} onChange={e => handleChange('decisionStyle', e.target.value)} placeholder="例：「データと直感の両方を大切にする。迷ったら、5年後に後悔しない方を選ぶ」" />
              </div>
          </div>

          {/* Key Achievements */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-100">
              <label className="text-xs font-bold text-amber-800 block mb-2 flex items-center"><Trophy size={14} className="mr-1 text-amber-600"/>人生の主な実績・成果</label>
              <div className="space-y-2 mb-3">
                  {(formData.keyAchievements || []).map((achievement, i) => (
                      <div key={i} className="flex items-start space-x-2 bg-white/80 p-2.5 rounded-lg border border-amber-100/50">
                          <span className="text-amber-500 text-xs font-bold shrink-0 mt-0.5">{i + 1}.</span>
                          <span className="text-xs text-gray-700 flex-1">{achievement}</span>
                          <button onClick={() => handleDeleteKeyAchievement(i)} className="text-gray-300 hover:text-red-500 shrink-0">
                              <Trash2 size={12} />
                          </button>
                      </div>
                  ))}
              </div>
              <div className="flex space-x-2">
                  <input
                      value={newAchievement}
                      onChange={e => setNewAchievement(e.target.value)}
                      placeholder="例：年間売上150%達成、海外拠点の立ち上げ..."
                      className="flex-1 p-2 bg-white rounded-lg text-xs border border-amber-200"
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddKeyAchievement(); } }}
                  />
                  <button onClick={handleAddKeyAchievement} className="bg-amber-600 text-white px-3 rounded-lg text-xs font-bold">追加</button>
              </div>
          </div>

          {/* Career Timeline */}
          <div>
              <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold text-gray-500 flex items-center"><History size={14} className="mr-1"/>職歴タイムライン</label>
                  {!isAddingCareer && (
                      <button onClick={() => setIsAddingCareer(true)} className="text-xs text-navy-600 hover:text-navy-900 font-bold">+ 追加</button>
                  )}
              </div>

              {/* Existing career entries */}
              <div className="space-y-3">
                  {(formData.careerHistory || []).map((entry, i) => (
                      <div key={entry.id} className="relative pl-6 pb-4 border-l-2 border-navy-200 last:pb-0">
                          <div className="absolute -left-2 top-0 w-4 h-4 bg-navy-900 rounded-full border-2 border-white" />
                          <div className="bg-navy-50 p-3 rounded-xl border border-navy-100 group">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <p className="text-sm font-bold text-navy-900">{entry.company}</p>
                                      <p className="text-xs text-navy-600">{entry.role}</p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">{entry.period}</p>
                                  </div>
                                  <div className="flex space-x-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => handleEditCareerEntry(entry)} className="text-gray-300 hover:text-navy-600 transition-colors p-1" title="編集">
                                          <Edit2 size={14} />
                                      </button>
                                      <button onClick={() => handleDeleteCareerEntry(entry.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1" title="削除">
                                          <Trash2 size={14} />
                                      </button>
                                  </div>
                              </div>
                              {entry.achievements.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                      {entry.achievements.map((a, j) => (
                                          <div key={j} className="flex items-start space-x-1.5">
                                              <Check size={10} className="text-green-500 shrink-0 mt-0.5" />
                                              <span className="text-[11px] text-gray-600">{a}</span>
                                          </div>
                                      ))}
                                  </div>
                              )}
                              {entry.decisionReason && (
                                  <div className="mt-2 p-2 bg-white/60 rounded-lg border border-navy-100/30">
                                      <p className="text-[10px] text-navy-500 italic">💭 {entry.decisionReason}</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>

              {/* Add new career entry form */}
              {isAddingCareer && (
                  <div className="mt-3 p-4 bg-navy-50 rounded-xl border border-navy-100 space-y-3 animate-in zoom-in-95">
                      <p className="text-xs font-bold text-navy-900">{editingCareerId ? '経歴を編集' : '経歴を追加'}</p>
                      <div className="grid grid-cols-2 gap-2">
                          <input value={careerCompany} onChange={e => setCareerCompany(e.target.value)} placeholder="会社名" className="p-2 bg-white rounded-lg text-xs border border-gray-200" />
                          <input value={careerRole} onChange={e => setCareerRole(e.target.value)} placeholder="役職・ポジション" className="p-2 bg-white rounded-lg text-xs border border-gray-200" />
                      </div>
                      <input value={careerPeriod} onChange={e => setCareerPeriod(e.target.value)} placeholder="期間（例：2020年4月〜2023年3月）" className="w-full p-2 bg-white rounded-lg text-xs border border-gray-200" />
                      <div>
                          <label className="text-[10px] text-gray-500 mb-1 block">成果・実績（1行に1つ）</label>
                          <textarea value={careerAchievements} onChange={e => setCareerAchievements(e.target.value)} placeholder={"売上を前年比120%に\nチーム5名のマネジメント\n新規事業の企画・立ち上げ"} className="w-full p-2 bg-white rounded-lg text-xs border border-gray-200 h-20" />
                      </div>
                      <div>
                          <label className="text-[10px] text-gray-500 mb-1 block">なぜこの選択をした？（任意）</label>
                          <input value={careerDecisionReason} onChange={e => setCareerDecisionReason(e.target.value)} placeholder="例：「より大きな裁量を求めて」" className="w-full p-2 bg-white rounded-lg text-xs border border-gray-200" />
                      </div>
                      <div className="flex space-x-2">
                          <button onClick={handleAddCareerEntry} className="flex-1 bg-navy-900 text-white py-2 rounded-lg text-xs font-bold">{editingCareerId ? '更新する' : '追加する'}</button>
                          <button onClick={clearCareerForm} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs">キャンセル</button>
                      </div>
                  </div>
              )}

              {/* Fallback: legacy free-text history */}
              {(!formData.careerHistory || formData.careerHistory.length === 0) && !isAddingCareer && (
                  <div className="mt-2">
                      <p className="text-[10px] text-gray-400 mb-1">または自由記述で入力</p>
                      <textarea className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 h-24" value={formData.history} onChange={e => handleChange('history', e.target.value)} placeholder="20XX年〜 株式会社◯◯ 入社。..." />
                  </div>
              )}
          </div>

          {/* Skills */}
          <div>
              <label className="text-xs font-bold text-gray-500 block mb-1 flex items-center"><Award size={14} className="mr-1"/>保有スキル（言語、資格、得意分野など）</label>
              <textarea className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 h-20" value={formData.skills as any} onChange={e => handleChange('skills', e.target.value)} placeholder="React, Python, プロジェクトマネジメント..." />
          </div>

          {/* Resume Generation */}
          <div className="pt-2">
              <button onClick={handleGenerateResume} disabled={isGeneratingResume || (!formData.history && (!formData.careerHistory || formData.careerHistory.length === 0))} className="w-full bg-navy-50 border border-navy-200 text-navy-900 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-navy-100 transition-colors">
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

      <button onClick={handleSave} className={`w-full py-4 rounded-xl font-bold flex justify-center items-center space-x-2 shadow-lg transition-all ${showSaveSuccess ? 'bg-green-500 text-white' : 'bg-navy-900 text-white active:scale-95'}`}>
          {showSaveSuccess ? <Check size={20} /> : <Save size={20} />}
          <span>{showSaveSuccess ? '保存完了' : 'プロフィールを保存'}</span>
      </button>

      {/* App Share */}
      <div className="bg-gradient-to-r from-navy-50 to-indigo-50 p-5 rounded-2xl border border-navy-100 space-y-3 mt-8">
          <h3 className="text-sm font-bold text-navy-900 flex items-center"><Share2 size={16} className="mr-2"/>アプリをシェア</h3>
          <p className="text-[10px] text-gray-500 leading-relaxed">
              TARUSHIRUを友人や知人に紹介しましょう。
          </p>
          <button
            onClick={() => {
              const url = window.location.origin + window.location.pathname;
              navigator.clipboard.writeText(url).then(() => {
                showToast('アプリURLをコピーしました', 'success');
              });
            }}
            className="w-full bg-navy-900 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-md hover:bg-navy-800 active:scale-95 transition-all"
          >
            <Copy size={14} /><span>アプリURLをコピー</span>
          </button>
      </div>

      {/* Data Management Section (Backup) */}
      <div className="bg-navy-50 p-5 rounded-2xl border border-navy-100 space-y-4">
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
