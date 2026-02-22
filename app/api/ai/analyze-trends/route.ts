import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { entries, profile, timeframeLabel } = await request.json();

    const recentEntries = entries.map((e: { date: string; content: string; analysis?: { themes?: string[] } }) => ({
      date: e.date,
      content: e.content,
      themes: e.analysis?.themes || []
    }));

    const prompt = `過去${timeframeLabel}の日記データに基づいて、ユーザーの感情・行動・思考の傾向分析レポートを作成してください。

ユーザー名: ${profile?.name || 'ユーザー'}
MBTI: ${profile?.mbti || '不明'}

日記データ:
${JSON.stringify(recentEntries, null, 2)}

以下の項目を含めてください：
1. 感情の全体的な傾向（ポジティブ/ネガティブの比率、変化のパターン）
2. 繰り返し出現するテーマや話題
3. 成長や変化が見られるポイント
4. 今後に向けたアドバイス

温かく、励ましのトーンで書いてください。`;

    const response = await callWithRetry(async () => {
      return await getAnthropicClient().messages.create({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'analyzeJournalTrends');

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Journal Trends Error:', error);
    return NextResponse.json({
      result: '傾向分析の実行中にエラーが発生しました。しばらく時間を置いてから再度お試しください。'
    });
  }
}
