import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { assets, budget } = await request.json();

    const prompt = `以下の資産データと家計データに基づいて、FP（ファイナンシャルプランナー）の視点から分析レポートを作成してください。

資産データ:
${JSON.stringify(assets, null, 2)}

家計データ:
${JSON.stringify(budget, null, 2)}

以下の項目を含めてください：
1. 資産構成の評価
2. 収支バランスの分析
3. 改善点やリスク
4. 今後のアクションプラン

温かく実践的なトーンで書いてください。`;

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
