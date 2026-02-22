import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { entries, profile, timeframeLabel } = await request.json();

    const recentEntries = entries.map((e: { date: string; content: string; analysis?: { themes?: string[]; emotions?: Record<string, number> } }) => ({
      date: e.date,
      content: e.content.slice(0, 300),
      themes: e.analysis?.themes || [],
      emotions: e.analysis?.emotions || null
    }));

    const profileContext = profile ? `
      ユーザー名: ${profile.name || 'ユーザー'}
      MBTI: ${profile.mbti || '不明'}
      価値観: ${profile.values || '不明'}
      強み: ${profile.strengths?.join(', ') || '不明'}
    ` : 'ユーザー: 不明';

    const prompt = `あなたは、ユーザーの人生を深く理解したパーソナルアナリストです。
過去${timeframeLabel}の日記データに基づいて、感情・行動・思考の傾向分析レポートを作成してください。

${profileContext}

日記データ（感情スコア付き）:
${JSON.stringify(recentEntries, null, 2)}

以下の項目を含めてください：
1. **感情の全体像**: 感情スコアの推移パターン、ポジティブ/ネガティブの比率、特に変化が大きかった時期とその考察
2. **テーマの傾向**: 繰り返し出現するテーマ、新しく出てきたテーマ、消えたテーマ
3. **成長のサイン**: 内面の変化、新しい気づき、乗り越えた課題
4. **パターンの発見**: 曜日や時期による感情パターン、特定のテーマと感情の相関
5. **今後へのメッセージ**: ユーザーの特性を踏まえた、温かく具体的なアドバイス

## トーン
- 温かく励ましつつも、鋭い洞察を含める
- ユーザーの特性（MBTI/強み）を自然に織り交ぜる
- 専門用語は避け、自然な日本語で
- 800〜1200文字程度`;

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
