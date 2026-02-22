import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { profileData } = await request.json();

    const prompt = `以下のプロフィール情報に基づいて、この人物の「自己統合サマリー」を作成してください。
キャリア、強み、価値観、性格特性を統合した、一人称で語れるような短い自己紹介文です。

プロフィール情報:
${JSON.stringify(profileData, null, 2)}

200文字程度で、温かく知性的なトーンで、その人の本質を捉えた文章を作成してください。`;

    const response = await callWithRetry(async () => {
      return await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'summarizeCareerProfile');

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Career Profile Error:', error);
    return NextResponse.json({
      result: 'サマリーの生成中にエラーが発生しました。しばらく時間を置いてから再度お試しください。'
    });
  }
}
