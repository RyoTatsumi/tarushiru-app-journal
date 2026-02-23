import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { goals, profile, recentJournal } = await request.json();

    // プロフィールコンテキスト
    const profileContext = profile ? `
      [ユーザーの特性]
      - 名前: ${profile.name || 'ユーザー'}
      - 思考特性(MBTI): ${profile.mbti || '不明'}
      - 才能(Strengths): ${profile.strengths?.join(', ') || '不明'}
      - 価値観: ${profile.values || '不明'}
      - キャリアの強み: ${profile.careerStrengths || '不明'}
      - 興味関心: ${profile.interests || '不明'}
    ` : 'ユーザー特性: 未設定';

    // 直近の日記コンテキスト
    const journalContext = recentJournal && recentJournal.length > 0
      ? `
      [直近の日記から読み取れる状況]
      ${recentJournal.slice(-5).map((e: { date: string; content: string; analysis?: { emotions?: Record<string, number>; themes?: string[] } }) => {
        const themes = e.analysis?.themes?.join(', ') || '';
        return `- ${new Date(e.date).toLocaleDateString()}: ${e.content.slice(0, 150)} [テーマ: ${themes}]`;
      }).join('\n')}
      `
      : '';

    // 目標の構造化
    const beingGoals = goals.filter((g: { category: string }) => g.category === 'being');
    const achievementGoals = goals.filter((g: { category: string; progress: number }) => g.category !== 'being' && g.progress < 100);
    const completedGoals = goals.filter((g: { category: string; progress: number }) => g.category !== 'being' && g.progress >= 100);

    const prompt = `
      あなたは、ユーザーの「本質」を深く理解した専属ライフコーチです。
      GROWモデル（Goal→Reality→Options→Will）に基づいてコーチングを行います。

      ${profileContext}

      ${journalContext}

      [現在の目標一覧]
      ■ 在り方（Being）- 死ぬまで続く。「達成」ではなく「今どれだけ体現できているか」:
      ${beingGoals.map((g: { title: string; progress: number; description?: string }) =>
        `- ${g.title} (体現度: ${g.progress}%)${g.description ? ` - ${g.description}` : ''}`
      ).join('\n') || 'なし'}

      ■ 達成型の目標（Life/Work/短期タスク）- 進行中:
      ${achievementGoals.map((g: { title: string; category: string; progress: number; description?: string; deadline?: string }) =>
        `- [${g.category}] ${g.title} (進捗: ${g.progress}%)${g.description ? ` 説明: ${g.description}` : ''}${g.deadline ? ` 期限: ${g.deadline}` : ''}`
      ).join('\n') || 'なし'}

      ■ 達成済み:
      ${completedGoals.map((g: { title: string; category: string }) =>
        `- [${g.category}] ${g.title} ✓`
      ).join('\n') || 'なし'}

      ## コーチングの指針（GROWモデル）

      ### 1. Goal（理想の明確化）
      - 「在り方（Being）」目標は達成するものではなく、一生をかけて体現し続けるもの。「できている/できていない」ではなく「今どのくらい意識できているか」という視点でフィードバック
      - 達成型目標は具体的なゴールと期限に触れる
      - 在り方と達成型の接続を見つける（例：「思いやりを持つ」という在り方が、チームプロジェクトの目標にどう活きるか）

      ### 2. Reality（現状の認識）
      - 日記から読み取れる最近の状態・感情を踏まえる
      - 在り方目標について：最近の日記の中で、その在り方が自然に表れている場面を見つけて伝える
      - 達成済みの目標があれば、その成功を称える
      - 進捗が停滞している目標があれば、原因を優しく考察する

      ### 3. Options（選択肢の提示）
      - 在り方目標：日常の中で体現度を上げる具体的な場面や意識の持ち方を提案
      - 達成型目標：小さな一歩として取り組めるアクションを提案
      - 各目標カテゴリ(Being/Life/Work)のバランスについてのアドバイス

      ### 4. Will（意志の確認）
      - 今週取り組める具体的なアクションを1〜2つ提案
      - 在り方目標については「今週意識してみたい場面」を問いかける
      - モチベーションを高める問いかけを1つ投げかける

      ## トーン
      - 温かく、知性的で、絶対的な味方
      - 専門用語は使わず自然な言葉で
      - ユーザーの特性への理解と受容を示す
      - 500〜800文字程度で簡潔に
    `;

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
