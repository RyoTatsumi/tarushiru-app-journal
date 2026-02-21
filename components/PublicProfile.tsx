
import React from 'react';
import { UserProfile } from '../types';
import { User, Trophy, Heart, Target, Zap, Smile, Briefcase, Dna, ArrowRight, Share2, Sparkles, Edit2, ChevronLeft, Award, History } from 'lucide-react';

interface PublicProfileProps {
  profile: UserProfile;
  isPreview?: boolean;
  onBack?: () => void;
  onStartDiagnosis: () => void;
}

export const PublicProfile: React.FC<PublicProfileProps> = ({ profile, isPreview, onBack, onStartDiagnosis }) => {
  return (
    <div className="min-h-screen bg-navy-900 text-white p-6 pb-32 overflow-y-auto">
      <div className="max-w-md mx-auto space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
        
        {/* Navigation if in preview mode */}
        {isPreview && (
            <button 
                onClick={onBack}
                className="flex items-center space-x-2 text-navy-300 hover:text-white transition-colors bg-white/5 py-2 px-4 rounded-full border border-white/10"
            >
                <ChevronLeft size={16} />
                <span className="text-xs font-bold">プロフィール編集に戻る</span>
            </button>
        )}

        {/* Header / Identity */}
        <div className="text-center pt-4">
          <div className="w-24 h-24 bg-gradient-to-br from-navy-700 to-navy-900 rounded-full mx-auto mb-6 flex items-center justify-center border-2 border-navy-500 shadow-2xl relative">
            <User size={48} className="text-navy-300" />
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 p-2 rounded-full text-navy-900 shadow-lg">
                <Sparkles size={16} />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">{profile.name}</h1>
          <div className="inline-block bg-navy-500/30 backdrop-blur-md px-4 py-1.5 rounded-full border border-navy-400/50 text-sm font-bold tracking-widest text-navy-100">
            {profile.mbti || 'TYPE PENDING'}
          </div>
        </div>

        {/* Identity Summary (AI Summary) */}
        {profile.careerSummary && (
            <div className="bg-white/10 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 bg-yellow-400/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <h3 className="text-[10px] font-bold text-navy-300 uppercase tracking-[0.2em] mb-3 flex items-center">
                    <Sparkles size={12} className="mr-2 text-yellow-400" />
                    AI IDENTITY SUMMARY
                </h3>
                <p className="text-sm leading-relaxed text-white/90 italic font-medium relative z-10">
                    "{profile.careerSummary}"
                </p>
            </div>
        )}

        {/* Detailed Sections (Values) */}
        <div className="space-y-4">
            <Section title="強み・特性" icon={Zap} content={profile.careerStrengths} color="text-yellow-400" />
            <Section title="興味・関心" icon={Smile} content={profile.interests} color="text-green-400" />
            <Section title="やりがい・価値観" icon={Heart} content={profile.values} color="text-red-400" />
            <Section title="理想の環境・社風" icon={Briefcase} content={profile.environment} color="text-blue-400" />
        </div>

        {/* Strengths (Tags) */}
        {profile.strengths && profile.strengths.filter(s => s).length > 0 && (
            <div className="bg-navy-800/50 rounded-3xl p-6 border border-navy-700">
                <h3 className="text-xs font-bold mb-4 flex items-center text-navy-300 uppercase tracking-widest">
                    <Trophy size={14} className="mr-2 text-yellow-500" />
                    Core Strengths
                </h3>
                <div className="flex flex-wrap gap-2">
                    {profile.strengths.filter(s => s).map((s, i) => (
                        <span key={i} className="bg-navy-900 px-3 py-1.5 rounded-xl border border-navy-600 text-xs font-bold text-white shadow-sm">
                            {s}
                        </span>
                    ))}
                </div>
            </div>
        )}

        {/* Biological Type */}
        {profile.geneticAnalysis && (
            <div className="bg-navy-800/50 rounded-3xl p-6 border border-navy-700 border-l-4 border-l-navy-400">
                <h3 className="text-xs font-bold mb-3 flex items-center text-navy-300 uppercase tracking-widest">
                    <Dna size={14} className="mr-2 text-navy-400" />
                    Biological Profile
                </h3>
                <p className="text-xl font-bold text-white mb-2">{profile.geneticAnalysis.determinedType}</p>
                <p className="text-[11px] text-navy-300 leading-relaxed italic">{profile.geneticAnalysis.workTips}</p>
            </div>
        )}

        {/* Career & Skills (実務的な裏付け：最下部へ) */}
        {(profile.skills || profile.history) && (
            <div className="space-y-4">
                {profile.skills && (
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                        <div className="flex items-center space-x-2 mb-3 text-navy-300">
                            <Award size={16} />
                            <h4 className="text-xs font-bold uppercase tracking-widest">Skills & Expertise</h4>
                        </div>
                        <p className="text-sm text-navy-100">{profile.skills as any}</p>
                    </div>
                )}
                {profile.history && (
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                        <div className="flex items-center space-x-2 mb-3 text-navy-300">
                            <History size={16} />
                            <h4 className="text-xs font-bold uppercase tracking-widest">Experience</h4>
                        </div>
                        <p className="text-xs text-navy-200 leading-relaxed line-clamp-6">{profile.history}</p>
                    </div>
                )}
            </div>
        )}

        {/* CTA */}
        {!isPreview && (
            <div className="pt-8 text-center space-y-4">
                <p className="text-xs text-navy-400">この人と診断を始めるには</p>
                <button 
                    onClick={onStartDiagnosis}
                    className="w-full bg-white text-navy-900 py-4 rounded-2xl font-bold flex items-center justify-center space-x-3 shadow-2xl hover:scale-[1.02] transition-transform active:scale-95"
                >
                    <Heart className="text-red-500" fill="currentColor" size={20} />
                    <span>相性診断を開始する</span>
                    <ArrowRight size={18} />
                </button>
            </div>
        )}

        {isPreview && (
            <div className="pt-8 text-center">
                <button onClick={onBack} className="text-xs text-navy-400 underline underline-offset-4 hover:text-white transition-colors">
                    プレビューを閉じて編集を続ける
                </button>
            </div>
        )}

        <div className="py-8 text-center">
            <p className="text-[10px] text-navy-600 font-bold tracking-[0.3em]">TARUSHIRU IDENTITY</p>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, icon: Icon, content, color }: any) => {
    if (!content) return null;
    return (
        <div className="bg-white/5 rounded-3xl p-6 border border-white/5 hover:bg-white/10 transition-colors">
            <div className={`flex items-center space-x-2 mb-3 ${color}`}>
                <Icon size={16} />
                <h4 className="text-xs font-bold uppercase tracking-widest">{title}</h4>
            </div>
            <p className="text-sm text-navy-100 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
    );
};
