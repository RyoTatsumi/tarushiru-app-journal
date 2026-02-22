'use client';

import React, { useState } from 'react';
import { Book, User, Target, Wallet, Sparkles, ChevronRight, X } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    icon: Sparkles,
    title: 'TARUSHIRUへようこそ',
    description: 'あなた専属のAIライフパートナーが、日々の思考や感情を整理し、自分らしい人生の設計をサポートします。',
    color: 'bg-navy-900',
    textColor: 'text-white',
    subColor: 'text-navy-200',
  },
  {
    icon: Book,
    title: '日記で自分を知る',
    description: '日々の出来事や気持ちを自由に書くだけ。AIが感情を分析し、あなたの本質に寄り添うフィードバックを返します。',
    color: 'bg-yellow-50',
    textColor: 'text-navy-900',
    subColor: 'text-gray-500',
  },
  {
    icon: User,
    title: 'プロフィールで統合する',
    description: 'MBTI、StrengthsFinder、遺伝子タイプ、価値観。あなたの全てを一つに統合し、AIがよりパーソナライズされたアドバイスを提供します。',
    color: 'bg-blue-50',
    textColor: 'text-navy-900',
    subColor: 'text-gray-500',
  },
  {
    icon: Target,
    title: '目標を設計し、歩む',
    description: 'Being（在り方）、Life（生活）、Work（仕事）の3軸で目標を設定。AIコーチングで、あなたらしい道を一歩ずつ。',
    color: 'bg-green-50',
    textColor: 'text-navy-900',
    subColor: 'text-gray-500',
  },
  {
    icon: Wallet,
    title: 'お金も人生の一部',
    description: '資産の推移や家計を記録。AIがFP視点でアドバイスし、経済面でも自分らしい判断を支援します。',
    color: 'bg-purple-50',
    textColor: 'text-navy-900',
    subColor: 'text-gray-500',
  },
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const Icon = current.icon;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 transition-colors duration-500 ${current.color}`}>
      {/* Skip button */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/10 transition-colors"
      >
        <X size={20} className={current.textColor} />
      </button>

      <div className="max-w-sm w-full space-y-8 text-center">
        {/* Icon */}
        <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center ${
          step === 0 ? 'bg-white/10' : 'bg-white shadow-lg'
        }`}>
          <Icon size={36} className={step === 0 ? 'text-white' : 'text-navy-700'} />
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h2 className={`text-2xl font-bold ${current.textColor}`}>{current.title}</h2>
          <p className={`text-sm leading-relaxed ${current.subColor}`}>{current.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center space-x-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-current opacity-80' : 'w-1.5 bg-current opacity-20'
              } ${current.textColor}`}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={() => isLast ? onComplete() : setStep(step + 1)}
          className={`w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all active:scale-95 ${
            step === 0
              ? 'bg-white text-navy-900 hover:bg-gray-100'
              : 'bg-navy-900 text-white hover:bg-navy-800'
          }`}
        >
          <span>{isLast ? 'はじめる' : '次へ'}</span>
          {!isLast && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
};
