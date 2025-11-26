
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { generateResume, analyzePersonality, summarizeCareerProfile } from '../services/geminiService';
import { User, FileText, Loader2, Save, Trash2, Sparkles, Trophy, Check, Download, Upload, RefreshCw, Briefcase, Heart, Users, Zap, Share2, QrCode, Image as ImageIcon, X } from 'lucide-react';

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
      personalityAnalysis: '',
      careerStrengths: '',
      interests: '',
      values: '',
      environment: '',
      careerSummary: ''
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
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
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
      alert('性格分析に失敗しました。');
    } finally {
      setIsAnalyzingPersonality(false);
    }
  };

  const handleSummarizeCareer = async () => {
      setIsSummarizing(true);
      try {
          const summary = await summarizeCareerProfile(formData);
          const updatedProfile = { ...formData, careerSummary: summary };
          setFormData(updatedProfile);
          onUpdateProfile(updatedProfile);
      } catch (error) {
          alert('キャリア要約の生成に失敗しました。');
      } finally {
          setIsSummarizing(false);
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
              const parsed = JSON.parse(json);
              if (!parsed.user) throw new Error("Invalid Data Format");
              
              if (window.confirm('現在のデータを上書きして、バックアップを復元しますか？')) {
                  localStorage.setItem('tarushiru_data', json);
                  window.location.reload();
              }
          } catch (err) {
              alert('ファイルの読み込みに失敗しました。データ形式が正しくない可能性があります。');
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Image Generation (Canvas)
  const handleGenerateImage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas Settings
    canvas.width = 800;
    canvas.height = 1000;
    
    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, 1000);
    gradient.addColorStop(0, '#102a43');
    gradient.addColorStop(1, '#243b53');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 1000);

    // Decorative Elements
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(700, 100, 200, 0, Math.PI * 2);
    ctx.stroke();

    // Text Settings
    ctx.textAlign = 'center';
    
    // Title
    ctx.fillStyle = '#d9e2ec';
    ctx.font = '24px "Zen Kaku Gothic New", sans-serif';
    ctx.fillText('TARUSHIRU JOURNAL', 400, 80);

    // Name
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px "Zen Kaku Gothic New", sans-serif';
    ctx.fillText(formData.name || 'No Name', 400, 180);

    // MBTI Container
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.roundRect(300, 220, 200, 80, 20);
    ctx.fill();
    ctx.fillStyle = '#f0f4f8';
    ctx.font = 'bold 40px "Zen Kaku Gothic New", sans-serif';
    ctx.fillText(formData.mbti || 'MBTI', 400, 275);

    // Strengths Title
    ctx.fillStyle = '#9fb3c8';
    ctx.font = '24px "Zen Kaku Gothic New", sans-serif';
    ctx.fillText('Top 5 Strengths', 400, 380);

    // Strengths List
    ctx.fillStyle = 'white';
    ctx.font = '32px "Zen Kaku Gothic New", sans-serif';
    const strengths = formData.strengths.filter(s => s).slice(0, 5);
    strengths.forEach((s, i) => {
        ctx.fillText(`${i + 1}. ${s}`, 400, 440 + (i * 50));
    });

    // Career Axis (if exists)
    if (formData.interests || formData.values) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.roundRect(100, 700, 600, 200, 20);
        ctx.fill();
        
        ctx.fillStyle = '#9fb3c8';
        ctx.font = '20px "Zen Kaku Gothic New", sans-serif';
        ctx.fillText('Values & Interests', 400, 740);
        
        ctx.fillStyle = 'white';
        ctx.font = '24px "Zen Kaku Gothic New", sans-serif';
        // Wrap text logic simplified
        const text = (formData.values || formData.interests || '').replace(/\n/g, ' ').substring(0, 60) + '...';
        ctx.fillText(text, 400, 800);
    }

    // Footer
    ctx.fillStyle = '#486581';
    ctx.font = '20px sans-serif';
    ctx.fillText('Generated by TARUSHIRU', 400, 950);

    // Download
    const link = document.createElement('a');
    link.download = `tarushiru_profile_${new Date().getTime()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // QR Data (Simulate data string)
  const qrData = `TARUSHIRU_PROFILE\nName:${formData.name}\nMBTI:${formData.mbti}\nStrengths:${formData.strengths.join(',')}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  return (
    <div className="space-y-6 pb-24 relative">
       <header className="mb-6 flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-navy-900">Profile</h2>
            <p className="text-sm text-gray-500">あなたのキャリア資産。</p>
        </div>
        
        {/* Share Button */}
        <button 
            onClick={() => setShowShareModal(true)}
            className="flex items-center space-x-2 bg-navy-900 text-white px-4 py-2 rounded-xl shadow-md hover:bg-navy-800 transition-all text-xs font-bold"
        >
            <Share2 size={16} />
            <span>シェア / 出力</span>
        </button>
      </header>

      {/* Share Modal */}
      {showShareModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-navy-50">
                      <h3 className="font-bold text-navy-900 flex items-center">
                          <Share2 size={16} className="mr-2"/>
                          プロフィールを共有
                      </h3>
                      <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-navy-900">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      {/* QR Section */}
                      <div className="flex flex-col items-center space-y-3">
                          <div className="bg-white p-4 rounded-xl border-2 border-navy-100 shadow-sm">
                              <img src={qrUrl} alt="QR Code" className="w-40 h-40 object-contain" />
                          </div>
                          <div className="text-center">
                              <p className="text-xs font-bold text-navy-900">QRコードを表示</p>
                              <p className="text-[10px] text-gray-400">読み取るとあなたの基本データが表示されます</p>
                          </div>
                      </div>

                      <div className="border-t border-gray-100 pt-6">
                          <button 
                             onClick={handleGenerateImage}
                             className="w-full bg-navy-900 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-navy-800 transition-colors shadow-lg"
                          >
                              <ImageIcon size={18} />
                              <span>プロフィール画像を生成・保存</span>
                          </button>
                          <p className="text-[10px] text-gray-400 text-center mt-2">
                              SNS等でシェアできるカード画像を生成します
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 1. Basic Info & Traits */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h3 className="text-sm font-bold text-navy-900 flex items-center space-x-2 border-b border-gray-100 pb-2">
            <User size={16} />
            <span>基本情報と特性 (Soft)</span>
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
                    {formData.personalityAnalysis && (
                         <div className="relative z-10">
                            <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap bg-white/80 p-3 rounded-lg border border-navy-50">
                                {formData.personalityAnalysis}
                            </div>
                         </div>
                    )}
                </div>
            )}
        </div>
      </div>

      {/* 2. Career Anchors & Environment */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="text-sm font-bold text-navy-900 flex items-center space-x-2 border-b border-gray-100 pb-2">
            <Heart size={16} />
            <span>キャリアの軸・環境</span>
          </h3>
          
          <div className="space-y-5">
              <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2 flex items-center">
                      <Zap size={12} className="mr-1"/>
                      強み・特性 (Personality & Experience)
                  </label>
                  <textarea 
                      className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-navy-500 h-24 resize-none"
                      value={formData.careerStrengths}
                      onChange={e => handleChange('careerStrengths', e.target.value)}
                      placeholder="性格的な強み（例：慎重さ、共感性）と、経験からくる強み（例：チームマネジメント、危機管理）を組み合わせて、仕事でどう活かせるか記入してください。"
                  />
              </div>

              <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2 flex items-center">
                      <Briefcase size={12} className="mr-1"/>
                      興味・関心 (Industry / Theme)
                  </label>
                  <textarea 
                      className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-navy-500 h-20 resize-none"
                      value={formData.interests}
                      onChange={e => handleChange('interests', e.target.value)}
                      placeholder="例：教育Tech、地方創生、デザイン思考、メンタルヘルス..."
                  />
              </div>

              <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2 flex items-center">
                      <Sparkles size={12} className="mr-1"/>
                      やりがい・価値観 (Values)
                  </label>
                  <textarea 
                      className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-navy-500 h-20 resize-none"
                      value={formData.values}
                      onChange={e => handleChange('values', e.target.value)}
                      placeholder="例：人の成長を直接感じる時、チームで難局を乗り越えること、自由な発想が許されること..."
                  />
              </div>

              <div>
                  <label className="text-xs font-bold text-gray-500 block mb-2 flex items-center">
                      <Users size={12} className="mr-1"/>
                      理想の環境・社風 (Environment)
                  </label>
                  <textarea 
                      className="w-full p-3 bg-navy-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-navy-500 h-20 resize-none"
                      value={formData.environment}
                      onChange={e => handleChange('environment', e.target.value)}
                      placeholder="例：心理的安全性が高い、フラットな組織、リモートワーク推奨、ロジカルより感情を大切にする..."
                  />
              </div>
          </div>
          
          {/* AI Career Summary */}
          <div className="bg-navy-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10 bg-white rounded-full blur-3xl w-32 h-32 transform translate-x-10 -translate-y-10 pointer-events-none"></div>
               <div className="relative z-10">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold flex items-center text-sm">
                            <Sparkles className="mr-2 text-yellow-400" size={16}/>
                            AI キャリア自己統合サマリー
                        </h4>
                        <button 
                            onClick={handleSummarizeCareer}
                            disabled={isSummarizing}
                            className="text-[10px] bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors flex items-center backdrop-blur-sm"
                        >
                            {isSummarizing ? <Loader2 className="animate-spin mr-1" size={10}/> : <RefreshCw size={10} className="mr-1"/>}
                            {formData.careerSummary ? '再生成' : '要約を生成'}
                        </button>
                    </div>
                    
                    {formData.careerSummary ? (
                        <div className="text-xs leading-relaxed text-navy-100 bg-black/20 p-4 rounded-lg">
                            {formData.careerSummary}
                        </div>
                    ) : (
                        <p className="text-xs text-navy-300">
                            あなたの強み、スキル、興味、価値観を全て統合し、「自分はどういう人間で、どこで輝くのか」をAIが言語化します。
                        </p>
                    )}
               </div>
          </div>
      </div>

      {/* 3. Skills & Resume */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
         <h3 className="text-sm font-bold text-navy-900 flex items-center space-x-2 border-b border-gray-100 pb-2">
            <FileText size={16} />
            <span>スキル・職務経歴書 (Hard)</span>
        </h3>
        
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
        
        <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-500 block">経歴・職歴メモ</label>
                <span className="text-[10px] text-navy-600 bg-navy-50 px-2 py-0.5 rounded-full border border-navy-100">自然言語・箇条書きでOK</span>
            </div>
            <textarea 
                className="w-full p-3 bg-navy-50 rounded-lg text-sm h-48 border border-gray-200 focus:outline-none focus:border-navy-500 resize-none leading-relaxed"
                value={formData.history} 
                onChange={e => handleChange('history', e.target.value)} 
                placeholder="過去の職務経験を自由に入力してください..."
            />
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

       {/* Save Button (Floating or Bottom) */}
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

       {/* System Settings Section (Moved to bottom) */}
       <div className="mt-12 pt-8 border-t border-gray-200">
           <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">システム設定</h3>
           
           <div className="bg-gray-50 rounded-xl p-4 space-y-4">
               {/* Backup Controls */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-bold text-navy-900">データのバックアップ</p>
                        <p className="text-[10px] text-gray-500">データをファイル(.json)として保存・復元します</p>
                    </div>
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
                </div>

                <div className="border-t border-gray-200 pt-4">
                    <button
                        onClick={onResetData}
                        className="w-full py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 text-xs"
                    >
                        <Trash2 size={14} />
                        <span>全データを削除してリセット</span>
                    </button>
                </div>
           </div>
       </div>

    </div>
  );
};
