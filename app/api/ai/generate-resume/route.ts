import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { profileData } = await request.json();

    const prompt = `以下のプロフィール情報に基づいて、プロフェッショナルな職務経歴書を日本語で作成してください。

プロフィール情報:
${JSON.stringify(profileData, null, 2)}

Markdown形式で、以下のセクションを含めてください：
1. 職務要約
2. 強み・スキル
3. 職務経歴（時系列）
4. 自己PR

簡潔かつ魅力的な表現を心がけてください。`;

    const response = await callWithRetry(async () => {
      return await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'generateResume');

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Resume Generation Error:', error);
    return NextResponse.json({
      result: '職務経歴書の生成中にエラーが発生しました。しばらく時間を置いてから再度お試しください。'
    });
  }
}
