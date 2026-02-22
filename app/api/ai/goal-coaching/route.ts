import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { goals } = await request.json();

    const prompt = `以下の目標リストに基づいて、目標コーチングのアドバイスを提供してください。

目標リスト:
${JSON.stringify(goals, null, 2)}

以下の観点からアドバイスしてください：
1. 目標のバランス（Being/Life/Work/短期タスクの配分）
2. 達成に向けた具体的な次のアクション
3. モチベーションを維持するためのヒント
4. 全体を通しての応援メッセージ

温かく励ましのトーンで、具体的で実践的なアドバイスを心がけてください。`;

    const response = await callWithRetry(async () => {
      return await getAnthropicClient().messages.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'getGoalCoaching');

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Goal Coaching Error:', error);
    return NextResponse.json({
      result: '目標コーチングの実行中にエラーが発生しました。しばらく時間を置いてから再度お試しください。'
    });
  }
}
