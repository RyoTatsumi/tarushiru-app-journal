import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { assets, budget, profile, goals, allocation, simulation } = await request.json();

    const profileContext = profile ? `
      ユーザー: ${profile.name || 'ユーザー'}
      価値観: ${profile.values || '不明'}
      興味関心: ${profile.interests || '不明'}
      人生哲学: ${profile.lifePhilosophy || '不明'}
      キャリア: ${profile.careerStrengths || '不明'}
    ` : '';

    const goalsContext = goals && goals.length > 0 ? `
      [ユーザーの目標]
      ${goals.map((g: { title: string; category: string; progress: number; description?: string }) =>
        `- [${g.category}] ${g.title} (${g.progress}%)${g.description ? ` — ${g.description}` : ''}`
      ).join('\n')}
    ` : '';

    const allocationContext = allocation && allocation.length > 0 ? `
      [資産配分]
      ${allocation.map((a: { name: string; pct: string; value: number }) =>
        `- ${a.name}: ${a.pct}%`
      ).join('\n')}
    ` : '';

    const simContext = simulation ? `
      [未来シミュレーション]
      毎月の投資可能額: ¥${simulation.monthlyInvestment?.toLocaleString() || 0}
      シミュレーション結果: 現在の資産 → ${simulation.data?.length ? simulation.data[simulation.data.length - 1]?.year : ''}で ¥${simulation.finalAssets?.toLocaleString() || 0}
    ` : '';

    const prompt = `あなたは、ユーザーの人生の価値観を理解したパーソナルFP（ファイナンシャルプランナー）です。
数字だけでなく、ユーザーの人生の優先順位を踏まえた実践的なアドバイスをしてください。
また「Die with Zero」の考え方を参考に、貯蓄だけでなく「今の若さと健康を活かした経験への投資」にも言及してください。

${profileContext}

${goalsContext}

資産データ:
${JSON.stringify(assets, null, 2)}

家計データ:
${JSON.stringify(budget, null, 2)}

${allocationContext}

${simContext}

以下の項目を含めてください：
1. **資産配分の評価**: 現在のポートフォリオバランス。偏りがあればリスク分散の提案。
2. **収支バランス**: 固定費率、変動費の内訳、貯蓄率の分析
3. **未来予測との接続**: シミュレーション結果を踏まえた現実的な見通し
4. **リスクと改善点**: ユーザーの価値観・目標に沿った改善提案
5. **経験への投資**: 今の健康と若さを活かした経験（旅、学び、挑戦）への投資の重要性。Die with Zeroの考え方を自然に取り入れる。
6. **アクションプラン**: 今月できる具体的な1〜2ステップ

## トーン
- 温かく実践的、批判しない
- ユーザーの価値観や目標を尊重
- 「今を犠牲にして将来のために貯める」だけでなく、「今にも投資する」バランスを意識
- 600〜1000文字程度`;

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
