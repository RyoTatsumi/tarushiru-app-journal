import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { mbti, strengths } = await request.json();

    const prompt = `性格分析を行ってください。

MBTI: ${mbti}
StrengthsFinder 強み: ${strengths?.join(', ') || '未設定'}

以下の項目について、温かく知性的なトーンで分析してください：
1. 性格特性の概要
2. 強みの活かし方
3. 気をつけたいポイント
4. 理想的な働き方・環境`;

    const response = await callWithRetry(async () => {
      return await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'analyzePersonality');

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Personality Analysis Error:', error);
    return NextResponse.json({
      result: '性格分析の実行中にエラーが発生しました。しばらく時間を置いてから再度お試しください。'
    });
  }
}
