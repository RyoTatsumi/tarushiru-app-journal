import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { entries, profile, goals, month } = await request.json();

    const profileContext = profile ? `
      [ユーザーの特性]
      - 名前: ${profile.name || 'ユーザー'}
      - 思考特性: ${profile.mbti || '不明'}
      - 才能: ${profile.strengths?.join(', ') || '不明'}
      - 価値観: ${profile.values || '不明'}
    ` : '';

    const goalsContext = goals && goals.length > 0 ? `
      [目標]
      ${goals.map((g: { title: string; category: string; progress: number }) =>
        `- [${g.category}] ${g.title} (${g.progress}%)`
      ).join('\n')}
    ` : '';

    // Summarize entries for the month
    const entrySummary = entries.map((e: { date: string; content: string; analysis?: { emotions?: Record<string, number>; themes?: string[]; subEmotions?: Record<string, number> }; aiComment?: string }) => {
      const emotionStr = e.analysis?.emotions
        ? Object.entries(e.analysis.emotions)
            .filter(([, v]) => (v as number) > 0.3)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .map(([k, v]) => `${k}:${((v as number) * 10).toFixed(0)}`)
            .join(' ')
        : '';
      const subEmotionStr = e.analysis?.subEmotions
        ? Object.entries(e.analysis.subEmotions)
            .filter(([, v]) => (v as number) > 0.3)
            .map(([k, v]) => `${k}:${((v as number) * 10).toFixed(0)}`)
            .join(' ')
        : '';
      const themes = e.analysis?.themes?.join(', ') || '';
      return `- ${new Date(e.date).toLocaleDateString()}: ${e.content.slice(0, 150)} [感情: ${emotionStr}] [サブ: ${subEmotionStr}] [テーマ: ${themes}]`;
    }).join('\n');

    const prompt = `
      あなたは、ユーザーの1ヶ月を振り返り、成長と気づきを言語化する「月次パーソナルアナリスト」です。

      ${profileContext}
      ${goalsContext}

      [${month}の全日記データ]
      ${entrySummary}

      ## 月次レポート作成の指針

      以下の構成でレポートを生成してください。マークダウン形式で。

      ### 📊 ${month} の概要
      - この月の日記数、主要テーマTOP3、全体的な感情の傾向を簡潔に

      ### 🌊 感情の流れ
      - 月初→月中→月末でどのように感情が変化したか
      - 感情のピーク（最も喜びが高かった日、最も不安が高かった日など）とその背景
      - サブ感情（充実感、孤独、誇り、罪悪感など）の特徴的なパターン

      ### 🌱 成長の軌跡
      - この月で見られた内面的な成長や変化
      - 繰り返し現れたテーマとその意味
      - 先月（もしデータがあれば）との比較での変化

      ### 💡 気づきと提案
      - ユーザー自身がまだ気づいていないかもしれないパターン
      - 来月に意識すると良さそうなこと（1〜2つ、具体的に）

      ### ✨ 今月のハイライト
      - 最も印象的だった日記の内容に触れ、一言コメント

      ## トーン
      - 温かく、知性的で、ユーザーの味方
      - データに基づきながらも、冷たくならない
      - 500〜1000文字程度
      - プロフィール情報（MBTI、Strengths等）は直接言及せず、理解として内部に持つ
    `;

    const response = await callWithRetry(async () => {
      return await getAnthropicClient().messages.create({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'generateMonthlyReport');

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Monthly Report Error:', error);
    return NextResponse.json({
      result: '月次レポートの生成中にエラーが発生しました。しばらく時間を置いてから再度お試しください。'
    });
  }
}
