import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { rawText } = await request.json();

    const prompt = `以下の遺伝子検査レポートの情報を分析し、この人の生物学的な特性タイプを判定してください。

遺伝子検査レポート:
${rawText}

以下の4つのキーを持つJSONオブジェクトで回答してください（Markdownコードブロックは使用しないでください）：
- determinedType: 判定された体質タイプ名（例：「夜型・高感受性タイプ」）
- healthTips: 健康面でのアドバイス
- workTips: 仕事面でのアドバイス
- lifeTips: 生活面でのアドバイス`;

    const response = await callWithRetry(async () => {
      return await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: 'あなたはJSON形式でのみ応答するAIです。以下のキーを持つJSONオブジェクトを返してください: determinedType (string), healthTips (string), workTips (string), lifeTips (string)。Markdownコードブロック（```）は絶対に使用しないでください。',
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'analyzeGeneticType');

    const rawResponse = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const cleaned = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      return NextResponse.json(JSON.parse(cleaned));
    } catch {
      return NextResponse.json({
        determinedType: '解析エラー',
        healthTips: '再度お試しください',
        workTips: '',
        lifeTips: ''
      });
    }
  } catch (error) {
    console.error('Genetic Analysis Error:', error);
    return NextResponse.json({
      determinedType: '解析エラー',
      healthTips: '再度お試しください',
      workTips: '',
      lifeTips: ''
    });
  }
}
