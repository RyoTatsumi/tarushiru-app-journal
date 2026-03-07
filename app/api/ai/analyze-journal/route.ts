import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

// テーマTaxonomy（#2改善）
const THEME_TAXONOMY = [
  '仕事・キャリア', '人間関係', '健康・体調', 'お金・資産', '自己成長',
  '家族', '恋愛・パートナー', '趣味・楽しみ', '学び・スキル', '将来・不安',
  '達成・成功', '疲労・休息', '感謝・幸福', '孤独・寂しさ', '変化・転機',
  '日常・ルーティン', '創造・表現', '社会・貢献'
];

// tool_use スキーマ（#5改善）
const journalAnalysisTool = {
  name: 'submit_journal_analysis',
  description: '日記エントリーの分析結果をJSON形式で返す',
  input_schema: {
    type: 'object' as const,
    properties: {
      emotions: {
        type: 'object' as const,
        description: 'コア感情スコア（0.0〜1.0）',
        properties: {
          joy: { type: 'number' as const }, anger: { type: 'number' as const },
          sadness: { type: 'number' as const }, anxiety: { type: 'number' as const },
          calm: { type: 'number' as const },
          excitement: { type: 'number' as const }, trust: { type: 'number' as const },
          surprise: { type: 'number' as const },
        },
        required: ['joy', 'anger', 'sadness', 'anxiety', 'calm'],
      },
      subEmotions: {
        type: 'object' as const,
        description: 'サブ感情スコア（0.0〜1.0）- 検出された感情のみ。0.3以上のもののみ返す。35種から該当するもの',
        properties: {
          // 喜び系 (Joy family)
          fulfillment: { type: 'number' as const }, gratitude: { type: 'number' as const },
          pride: { type: 'number' as const }, relief: { type: 'number' as const },
          love: { type: 'number' as const }, contentment: { type: 'number' as const },
          // 期待系 (Anticipation)
          hope: { type: 'number' as const }, curiosity: { type: 'number' as const },
          determination: { type: 'number' as const },
          // 悲しみ系 (Sadness)
          loneliness: { type: 'number' as const }, nostalgia: { type: 'number' as const },
          disappointment: { type: 'number' as const },
          // 怒り系 (Anger)
          frustration: { type: 'number' as const }, irritation: { type: 'number' as const },
          envy: { type: 'number' as const },
          // 不安系 (Anxiety)
          overwhelm: { type: 'number' as const }, confusion: { type: 'number' as const },
          guilt: { type: 'number' as const }, vulnerability: { type: 'number' as const },
          // 不安系追加
          restlessness: { type: 'number' as const },
          // つながり系 (Connection)
          empathy: { type: 'number' as const }, self_compassion: { type: 'number' as const },
          awe: { type: 'number' as const },
          // エネルギー系 (Energy)
          playfulness: { type: 'number' as const }, serenity: { type: 'number' as const },
          exhaustion: { type: 'number' as const }, liberation: { type: 'number' as const },
          // 内省系 (Introspection)
          acceptance: { type: 'number' as const }, regret: { type: 'number' as const },
          boredom: { type: 'number' as const }, shame: { type: 'number' as const },
          // 期待系追加
          inspiration: { type: 'number' as const },
          // 悲しみ系追加
          melancholy: { type: 'number' as const },
          // 怒り系追加
          resistance: { type: 'number' as const },
        },
      },
      themes: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: `テーマタグ（以下のリストから2〜4つ選択）: ${THEME_TAXONOMY.join(', ')}`,
      },
      actions: {
        type: 'array' as const,
        items: { type: 'string' as const },
        description: '記録された行動事実',
      },
      aiComment: {
        type: 'string' as const,
        description: '150〜250文字の温かいフィードバック。ユーザーの特性データは直接言及せず、その理解を「にじませる」こと。過去の流れとの変化や気づきに触れ、内省や自己肯定感を促す。',
      },
      coachingQuestion: {
        type: 'string' as const,
        description: 'ユーザーへの内省を促す問いかけ（1文）',
      },
      lifeReflectionQuestion: {
        type: 'string' as const,
        description: 'ユーザーの人生を見つめ直す深い問いかけ（1文）。目標・日記の傾向・記録期間に基づき、3年/1年/90日/30日/7日スケールでの振り返りや、人生の方向性・成長・ビジョンに関する質問。例：「過去12ヶ月で最も大きな学びは何でしたか？」「90日前と比べて、目標やビジョンはどのくらい明確になりましたか？」',
      },
      focusInsights: {
        type: 'object' as const,
        description: 'フォーカスタグごとの個別コメント（50〜100文字）。選択されたタグに対してのみ返す。',
        properties: {
          health: { type: 'string' as const },
          beauty: { type: 'string' as const },
          career: { type: 'string' as const },
          goals: { type: 'string' as const },
          values: { type: 'string' as const },
          relationships: { type: 'string' as const },
          finance: { type: 'string' as const },
          learning: { type: 'string' as const },
          mindfulness: { type: 'string' as const },
        },
      },
    },
    required: ['emotions', 'themes', 'actions', 'aiComment'],
  },
};

const FOCUS_TAG_LABELS: Record<string, string> = {
  health: '健康', beauty: '美容', career: 'キャリア', goals: '目標',
  values: '価値観', relationships: '人間関係', finance: 'お金',
  learning: '学び', mindfulness: 'マインドフルネス',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFocusTagContext(focusTags: any, profile: any): string {
  if (!focusTags?.selectedTags?.length) return '';
  const genetic = profile?.geneticAnalysis;
  const sections: string[] = [];

  for (const tag of focusTags.selectedTags) {
    const data = focusTags[tag] || {};
    switch (tag) {
      case 'health': {
        let ctx = `[フォーカス: 健康]\n`;
        if (data.sleepHours !== undefined) ctx += `  睡眠: ${data.sleepHours}時間\n`;
        if (data.healthStatus) ctx += `  体調レベル: ${data.healthStatus}/5\n`;
        if (data.exercise) ctx += `  運動: ${data.exercise}\n`;
        if (genetic?.healthTips) ctx += `  [遺伝子的な健康傾向（にじませる参考情報）]: ${genetic.healthTips}\n`;
        if (genetic?.determinedType) ctx += `  [体質タイプ]: ${genetic.determinedType}\n`;
        sections.push(ctx);
        break;
      }
      case 'beauty': {
        let ctx = `[フォーカス: 美容]\n`;
        if (data.skinCondition) ctx += `  肌の調子: ${data.skinCondition}/5\n`;
        if (data.beautyRoutine) ctx += `  ケア内容: ${data.beautyRoutine}\n`;
        if (data.concerns) ctx += `  気になる点: ${data.concerns}\n`;
        if (genetic?.healthTips) ctx += `  [遺伝子的な体質傾向（美容関連の参考情報）]: ${genetic.healthTips}\n`;
        if (genetic?.lifeTips) ctx += `  [遺伝子的なライフスタイル傾向]: ${genetic.lifeTips}\n`;
        sections.push(ctx);
        break;
      }
      case 'career': {
        let ctx = `[フォーカス: キャリア]\n`;
        if (data.achievements) ctx += `  今日の成果: ${data.achievements}\n`;
        if (data.challenges) ctx += `  課題: ${data.challenges}\n`;
        if (data.learnings) ctx += `  学び: ${data.learnings}\n`;
        if (genetic?.workTips) ctx += `  [遺伝子的なワークスタイル傾向（参考情報）]: ${genetic.workTips}\n`;
        sections.push(ctx);
        break;
      }
      case 'goals': {
        let ctx = `[フォーカス: 目標]\n`;
        if (data.progressReflection) ctx += `  進捗の振り返り: ${data.progressReflection}\n`;
        if (data.nextAction) ctx += `  次のアクション: ${data.nextAction}\n`;
        sections.push(ctx);
        break;
      }
      case 'values': {
        let ctx = `[フォーカス: 価値観]\n`;
        if (data.reflection) ctx += `  内省: ${data.reflection}\n`;
        if (data.alignment) ctx += `  価値観一致度: ${data.alignment}/5\n`;
        sections.push(ctx);
        break;
      }
      case 'relationships': {
        let ctx = `[フォーカス: 人間関係]\n`;
        if (data.interactions) ctx += `  人との関わり: ${data.interactions}\n`;
        if (data.gratitude) ctx += `  感謝: ${data.gratitude}\n`;
        sections.push(ctx);
        break;
      }
      case 'finance': {
        let ctx = `[フォーカス: お金]\n`;
        if (data.spending) ctx += `  支出メモ: ${data.spending}\n`;
        if (data.financialMood) ctx += `  お金の安心度: ${data.financialMood}/5\n`;
        sections.push(ctx);
        break;
      }
      case 'learning': {
        let ctx = `[フォーカス: 学び]\n`;
        if (data.topic) ctx += `  学んだこと: ${data.topic}\n`;
        if (data.source) ctx += `  情報源: ${data.source}\n`;
        if (data.insight) ctx += `  気づき: ${data.insight}\n`;
        sections.push(ctx);
        break;
      }
      case 'mindfulness': {
        let ctx = `[フォーカス: マインドフルネス]\n`;
        if (data.meditation) ctx += `  瞑想: 実施\n`;
        if (data.gratitudeNote) ctx += `  感謝メモ: ${data.gratitudeNote}\n`;
        if (data.mood) ctx += `  心の穏やかさ: ${data.mood}/5\n`;
        sections.push(ctx);
        break;
      }
    }
  }

  const tagLabels = focusTags.selectedTags.map((t: string) => FOCUS_TAG_LABELS[t] || t).join('、');
  return `
    [フォーカスタグ情報]
    ユーザーが今回の日記で特に意識しているテーマ: ${tagLabels}
    ${sections.join('\n')}
    ※ フォーカスタグに基づいて、aiCommentではこれらのテーマに自然に触れてください。
    ※ 遺伝子ベースの情報は直接言及せず「にじませる」こと。
    ※ 各フォーカスタグについて focusInsights で個別のコメント(50〜100文字)も返してください。
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { text, profile, pastEntries, goals, aiMemory, focusTags } = await request.json();

    // プロフィールコンテキスト
    const profileContext = profile ? `
      [ユーザーの深層理解 - ※この情報はコメントに直接表面化させないこと。理解として内部に持ち、自然ににじませる]
      - 名前: ${profile.name || 'ユーザー'}
      - 思考の傾向(MBTI): ${profile.mbti || '不明'}
      - 才能の源泉(Strengths): ${profile.strengths?.join(', ') || '不明'}
      - 体質傾向: ${profile.geneticAnalysis?.determinedType || '不明'}
      - 大切にしている価値観: ${profile.values || '不明'}
      - キャリア上の強み: ${profile.careerStrengths || '不明'}
      - 興味関心: ${profile.interests || '不明'}
      - 人生哲学: ${profile.lifePhilosophy || '不明'}
      - 意思決定スタイル: ${profile.decisionStyle || '不明'}
      - キャリア経歴: ${profile.careerHistory?.map((c: any) => `${c.company}(${c.role})`).join(' → ') || profile.history?.slice(0, 100) || '不明'}
      - 主な実績: ${profile.keyAchievements?.join(', ') || '不明'}
      ※ 上記の情報は「この人はこういう人だ」という深い理解として使い、「あなたはMBTI◯◯だから」「Strengths◯◯が」のように直接的に言及しないこと。
    ` : 'ユーザー特性: 未設定';

    // 過去エントリーコンテキスト（感情スコア + テーマも含む）（#1改善）
    const historyContext = pastEntries && pastEntries.length > 0
      ? `
      [直近のストーリーライン（文脈）]
      ${pastEntries.map((e: { date: string; content: string; analysis?: { emotions?: Record<string, number>; themes?: string[] }; aiComment?: string }) => {
        const emotionSummary = e.analysis?.emotions
          ? `[感情: 喜${(e.analysis.emotions.joy * 10).toFixed(0)} 穏${(e.analysis.emotions.calm * 10).toFixed(0)} 不安${(e.analysis.emotions.anxiety * 10).toFixed(0)}]`
          : '';
        const themes = e.analysis?.themes?.join(', ') || '';
        return `- ${new Date(e.date).toLocaleDateString()}: ${e.content.slice(0, 200)} ${emotionSummary} [テーマ: ${themes}]`;
      }).join('\n')}

      前回のAIコメント: ${pastEntries[pastEntries.length - 1]?.aiComment?.slice(0, 150) || 'なし'}

      ※ 重要: 過去の悩みとの関連、成長の兆し、パターンがあれば「伏線回収」のように触れてください。
      `
      : '過去の文脈: 特になし（今回が初めて、または久しぶりの記録）';

    // 目標コンテキスト（Being vs Achievement区別）
    const goalsContext = goals && goals.length > 0
      ? `
      [ユーザーの目標 - ※直接的に「目標に書いてあった〜」とは言わないこと]
      在り方(Being - 一生続く、体現するもの):
      ${goals.filter((g: { category: string }) => g.category === 'being').map((g: { title: string; progress: number; description?: string }) =>
        `- ${g.title} (体現度: ${g.progress}%)${g.description ? ` - ${g.description}` : ''}`
      ).join('\n') || 'なし'}
      達成型(Life/Work/短期):
      ${goals.filter((g: { category: string; progress: number }) => g.category !== 'being' && g.progress < 100).map((g: { title: string; category: string; progress: number }) =>
        `- [${g.category}] ${g.title} (${g.progress}%)`
      ).join('\n') || 'なし'}
      `
      : '';

    // AIメモリコンテキスト（#6改善）
    const memoryContext = aiMemory
      ? `
      [これまでの重要パターン]
      ${aiMemory.patterns?.join('\n') || 'なし'}
      前回の問いかけ: ${aiMemory.lastQuestion || 'なし'}
      `
      : '';

    const focusContext = buildFocusTagContext(focusTags, profile);

    const prompt = `
      あなたは、ユーザーの人生を深く理解し、魂の成長を支援する「専属ライフ・パートナーAI」です。
      カウンセラーやコーチ以上に、ユーザーの「本質（プロフィール）」と「文脈（過去）」を理解している存在として振る舞ってください。

      ${profileContext}

      ${historyContext}

      ${goalsContext}

      ${focusContext}

      ${memoryContext}

      [今回の記録]
      "${text}"

      ## 感情分析の深化ルール
      1. **言葉の選び方から感情を読む**: 「疲れた」と「くたくた」では強度が違う。「嬉しい」と「最高」「救われた」ではニュアンスが違う。言葉の温度感を精密に数値化する。
      2. **文脈から暗黙の感情を推測**: 「今日は何もしなかった」→ 退屈？罪悪感？安堵？文脈と過去の傾向から推測する。
      3. **感情の複層性を捉える**: 人は同時に複数の感情を持つ。「昇進したけど不安」= joy + anxiety + pride。矛盾する感情の共存を正確に表現する。
      4. **8つの基本感情を精密に**: joy, anger, sadness, anxiety, calm に加え、excitement（ワクワク・興奮）, trust（信頼・安心感）, surprise（驚き）も検出する。
      5. **35のサブ感情で奥行きを**: 基本感情だけでは表現しきれない微妙な心の動きをサブ感情で捕捉する。0.3以上のもののみ返す。
         - 喜び系: 充実感, 感謝, 誇り, 安堵, 愛情, 満足感
         - 期待系: 希望, 好奇心, 決意, 触発(インスピレーション)
         - 悲しみ系: 孤独, 懐かしさ, 失望, 物悲しさ
         - 怒り系: もどかしさ, 苛立ち, 嫉妬, 抵抗
         - 不安系: 圧倒感, 混乱, 罪悪感, 不安定さ, 焦り
         - つながり系: 共感, 自己慈悲, 畏敬
         - エネルギー系: 遊び心, 静けさ, 疲弊, 解放感
         - 内省系: 受容, 後悔, 恥, 退屈
      6. **数値の精度**: 0.0〜1.0の範囲で、0.1刻みではなく0.05刻みで細かく。「少し感じる」=0.2-0.3、「はっきり感じる」=0.5-0.7、「強く感じる」=0.8-1.0。

      ## aiComment 生成の厳守ルール
      1. **プロフィール情報を絶対に表面に出さない**: MBTI名、Strengths名、遺伝子タイプ名、価値観のキーワードをそのまま書かない。「あなたは◯◯タイプだから」「◯◯という強みが」は禁止。代わりに、その理解を自然ににじませる。
         - ❌「内省の強みを持つあなたは…」
         - ⭕「こうやって立ち止まって考えられること、実はすごいことですよね」
         - ❌「INTJらしく戦略的に…」
         - ⭕「先のことまで見据えて動いている感じが伝わります」
      2. **「点」ではなく「線」**: 今回を単体で評価せず、過去エントリーとの変化・成長・繰り返しに触れる。「前にこういうことがあったけど、今回は〜」のような接続。初回の場合は「記録を始めたこと自体」を肯定。
      3. **自己肯定感・自己効力感を育てる**: 「あなたはちゃんとやれている」「気づいている時点で前に進んでいる」など、小さな変化を見逃さず言語化する。
      4. **継続のモチベーション**: 「書き続けることで見えてくるもの」「この記録が未来の自分への手紙になる」など、記録の価値を伝える。
      5. **問いかけは押し付けない**: coachingQuestionとは別に、aiComment内では「〜かもしれませんね」「〜なのかな」程度の柔らかい投げかけに留める。
      6. **トーン**: 長年の友人のような温かさ。知性的だが偉そうでない。批判ゼロ。提案型。150〜250文字。

      ## 目標との接続
      日記の内容が目標に関連していれば自然に触れる。ただし「目標に書いてあった〜」とは言わず、「最近意識していることと繋がっている感じがします」のように間接的に。

      ## 人生を見つめ直す問い（lifeReflectionQuestion）
      **重要: この問いは毎回出すのではなく、4〜5回に1回程度の頻度で出す。**
      日記の内容が特に深い内省や転機・葛藤・大きな決断を含む場合にのみ出す。
      日常的な記録や軽い内容の場合は、lifeReflectionQuestionを省略する（返さない）。

      出す場合は、ユーザーの目標・日記の志向性・記録期間から読み取り、人生を豊かにする深い問いを1つ投げかける。
      目的は、この問いが次回の日記のトピックとなり、内省が深まること。

      問いの方向性（記録の文脈に応じて選ぶ）:
      - **長期スケール**: 「過去3年間でどんな成長をしましたか？」「人生で最も誇りに思う決断は？」
      - **中期スケール**: 「過去12ヶ月での最大の学びは？」「12ヶ月前の自分に伝えたいことは？」
      - **短期スケール**: 「90日前と比べて、目標やビジョンはどのくらい明確になった？」「この30日で人生はどう良くなった？」
      - **直近スケール**: 「過去7日間で、どんな重要な進歩があったか？」「今週、最も大切にした時間は？」
      - **ビジョン系**: 「5年後の理想の1日はどんな1日？」「今の延長線上にある未来は、あなたが望む未来？」
      - **Being系**: 「今、最も体現したい在り方は何？」「どんな人として記憶されたい？」

      ルール:
      - 日記の内容や目標に自然に接続する問いにする
      - 抽象的すぎず、具体的に答えられるものにする
      - 押し付けがましくなく、穏やかに投げかける
      - 通常の日記（日常報告、軽い感想）では出さない。深い内容のときだけ出す

      ## テーマの選択
      以下のリストから2〜4つ選んでください: ${THEME_TAXONOMY.join(', ')}

      ${focusTags?.selectedTags?.length ? `
      ## フォーカスタグ対応ルール
      ユーザーが「${focusTags.selectedTags.map((t: string) => FOCUS_TAG_LABELS[t] || t).join('、')}」をフォーカスに選んでいます。

      1. **aiComment**: 全体的なコメントの中で、選択されたフォーカステーマに自然に触れる。複数選択されている場合はバランスよく言及する。
      2. **focusInsights**: 各フォーカスタグについて50〜100文字の個別コメントを返す。
         - 健康: 睡眠時間・体調データと体質傾向を踏まえた具体的アドバイス。「あなたの体質は〜」とは言わず自然に。
         - 美容: 肌の調子データと体質傾向を踏まえた助言。
         - キャリア: 成果・課題から読み取れる成長パターンへの気づき。
         - 目標: 進捗の振り返りと次のアクションへのフィードバック。
         - 価値観: 内省の深さへの共感と新たな視点の提供。
         - 人間関係: つながりの質への気づき。
         - お金: 経済的な安心感についての前向きなコメント。
         - 学び: 知的好奇心への肯定と学びの応用への示唆。
         - マインドフルネス: 心の状態への共感と継続の価値の言語化。
      3. 構造化データが空でも、タグが選択されていればそのテーマに触れる。
      ` : ''}

      submit_journal_analysis ツールを使って結果を返してください。
    `;

    const result = await callWithRetry(async () => {
      return await getAnthropicClient().messages.create({
        model: MODEL,
        max_tokens: 1500,
        tools: [journalAnalysisTool],
        tool_choice: { type: 'tool', name: 'submit_journal_analysis' },
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'analyzeJournalEntry');

    // tool_use レスポンスからデータ抽出
    const toolBlock = result.content.find((b: { type: string }) => b.type === 'tool_use');
    let parsed = toolBlock && 'input' in toolBlock ? toolBlock.input as Record<string, unknown> : null;

    // フォールバック: テキストレスポンスの場合
    if (!parsed) {
      const rawText = result.content.find((b: { type: string }) => b.type === 'text');
      if (rawText && 'text' in rawText) {
        try {
          const cleaned = (rawText.text as string).replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleaned);
        } catch {
          parsed = {};
        }
      } else {
        parsed = {};
      }
    }

    // フォールバック処理
    if (!parsed || !parsed.aiComment || typeof parsed.aiComment !== 'string' || (parsed.aiComment as string).trim() === '') {
      if (!parsed) parsed = {};
      const name = profile?.name || 'あなた';
      const hour = new Date().getHours();
      const timeGreeting = hour < 10 ? 'おはようございます。' : hour > 18 ? '今日もお疲れ様でした。' : 'こんにちは。';
      const fallbackMessages = [
        `${timeGreeting} ${name}さんの言葉を受け取りました。書くことで整理される感情もあります。焦らず、ご自身のペースで進んでいきましょう。`,
        `記録に残してくださりありがとうございます。${name}さんが日々感じていることは、決して無駄ではありません。静かな時間を持って、心と体を労ってくださいね。`,
        `気持ちを吐き出すことは、自分自身を大切にする行為です。${name}さんの強みは、こうして自分と向き合えることかもしれませんね。`,
      ];
      parsed.aiComment = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    }

    if (!parsed.emotions) parsed.emotions = { joy: 0, anger: 0, sadness: 0, anxiety: 0, calm: 0 };
    if (!parsed.themes) parsed.themes = ['記録'];
    if (!parsed.actions) parsed.actions = [];

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Analyze Journal Error:', error);
    return NextResponse.json({
      emotions: { joy: 0, anger: 0, sadness: 0, anxiety: 0, calm: 0 },
      themes: ['未分析'],
      actions: [],
      aiComment: '現在、AIとの接続が混み合っているようです。でも、あなたが記録を残したこと自体に価値があります。少し時間を置いてから、またお話ししましょう。'
    });
  }
}
