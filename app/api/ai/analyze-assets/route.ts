import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { assets, budget, profile } = await request.json();

    const profileContext = profile ? `
      ユーザー: ${profile.name || 'ユーザー'}
      価値観: ${profile.values || '不明'}
      興味関心: ${profile.interests || '不明'}
    ` : '';

    const prompt = `あなたは、ユーザーの人生の価値観を理解したパーソナルFP（ファイナンシャルプランナー）です。
数字だけでなく、ユーザーの人生の優先順位を踏まえた実践的なアドバイスをしてください。

${profileContext}

資産データ:
${JSON.stringify(assets, null, 2)}

家計データ:
${JSON.stringify(budget, null, 2)}

以下の項目を含めてください：
1. **資産構成の評価**: 現在のポートフォリオバランス
2. **収支バランス**: 固定費率、貯蓄率の分析
3. **リスクと改善点**: ユーザーの価値観に沿った改善提案
4. **アクションプラン**: 今月できる具体的な1〜2ステップ

## トーン
- 温かく実践的、批判しない
- ユーザーの価値観や興味を尊重
- 500〜800文字程度`;

    const response = await callWithRetry(async () => {
      return await getAnthropicClient().messages.create({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'analyzeAssetTrends');

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Asset Trends Error:', error);
    return NextResponse.json({
      result: '資産分析の実行中にエラーが発生しました。しばらく時間を置いてから再度お試しください。'
    });
  }
}
