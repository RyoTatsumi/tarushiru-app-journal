import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { text, profile, pastEntries } = await request.json();

    const profileContext = profile ? `
      [ユーザーの「本質」データ]
      - 名前: ${profile.name || 'ユーザー'}
      - 思考特性(MBTI): ${profile.mbti || '不明'} (このタイプ特有の思考癖や葛藤を考慮すること)
      - 才能の源泉(Strengths): ${profile.strengths?.join(', ') || '不明'} (この強みがどう状況に影響したか、あるいは活かせるか)
      - 生物学的特性(遺伝子/体質): ${profile.geneticAnalysis?.determinedType || '不明'} (エネルギーレベルやストレス耐性を考慮し、無理のない提案を)
      - 人生の核となる価値観: ${profile.values || '不明'} (今回の感情は、この価値観との合致・乖離が原因ではないか)
    ` : 'ユーザー特性: 未設定';

    const historyContext = pastEntries && pastEntries.length > 0
      ? `
      [直近のストーリーライン（文脈）]
      ${pastEntries.map((e: { date: string; content: string }) => `- ${new Date(e.date).toLocaleDateString()}: ${e.content.slice(0, 150)}...`).join('\n')}

      ※ 重要指示: 過去の悩みとの関連、成長の兆し、あるいは繰り返されるパターンがあれば、自然な会話の中で「伏線回収」のように触れてください。
      `
      : '過去の文脈: 特になし（今回が初めて、または久しぶりの記録）';

    const prompt = `
      あなたは、ユーザーの人生を深く理解し、魂の成長を支援する「専属ライフ・パートナーAI」です。
      カウンセラーやコーチ以上に、ユーザーの「本質（プロフィール）」と「文脈（過去）」を理解している存在として振る舞ってください。

      ${profileContext}

      ${historyContext}

      [今回の記録]
      "${text}"

      ## 生成の指針
      1. **「点」ではなく「線」で捉える**: 今回の出来事を単体で評価せず、過去の流れやユーザーの人生という大きな文脈の中に位置づけてコメントしてください。「以前悩んでいた〇〇について、変化がありましたね」といった言及を歓迎します。
      2. **特性への深い理解と受容**:
         - 専門用語（"MBTIが〜"など）は使わず、「深く思考を巡らせるあなただからこそ…」「調和を大切にするあまり…」といった自然な表現で特性に触れてください。
         - 遺伝子特性（体質）を考慮し、無理のない休息や、エネルギーの注ぎ方を提案してください。
      3. **魂への問いかけ**:
         - 単なる共感で終わらせず、「もしかすると、今の疲れは〇〇を大切にしたいというサインかもしれません」といった、一歩踏み込んだ「気づき」や「問い」を1つ投げかけてください。
      4. **トーン**:
         - 温かく、知性的で、決して批判せず、絶対的な味方であること。
         - 「〜しましょう」「〜すべきです」という指示ではなく、「〜という視点もあるかもしれません」という提案型で。

      ## 出力フォーマット (JSON)
      必ず以下のJSON形式で出力してください。Markdownのコードブロックは不要です。
      {
        "emotions": { "joy": 0.0〜1.0, "anger": 0.0〜1.0, "sadness": 0.0〜1.0, "anxiety": 0.0〜1.0, "calm": 0.0〜1.0 },
        "themes": ["タグ1", "タグ2", "タグ3"],
        "actions": ["行動事実1", "行動事実2"],
        "aiComment": "150文字〜200文字程度の、心に響くパーソナライズされたフィードバック"
      }
    `;

    const result = await callWithRetry(async () => {
      return await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: 'あなたはJSON形式でのみ応答するAIです。Markdownのコードブロック（```）は絶対に使用せず、純粋なJSONオブジェクトのみを返してください。',
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'analyzeJournalEntry');

    const rawText = result.content[0].type === 'text' ? result.content[0].text : '{}';
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      console.warn('JSON parse failed, using fallback structure.');
      parsed = {};
    }

    // フォールバック処理
    if (!parsed.aiComment || typeof parsed.aiComment !== 'string' || parsed.aiComment.trim() === '') {
      const name = profile?.name || 'あなた';
      const hour = new Date().getHours();
      const timeGreeting = hour < 10 ? 'おはようございます。' : hour > 18 ? '今日もお疲れ様でした。' : 'こんにちは。';

      const fallbackMessages = [
        `${timeGreeting} ${name}さんの言葉を受け取りました。書くことで整理される感情もあります。焦らず、ご自身のペースで進んでいきましょう。`,
        `記録に残してくださりありがとうございます。${name}さんが日々感じていることは、決して無駄ではありません。静かな時間を持って、心と体を労ってくださいね。`,
        `気持ちを吐き出すことは、自分自身を大切にする行為です。${name}さんの強みは、こうして自分と向き合えることかもしれませんね。`,
        `${timeGreeting} ${name}さんの正直な気持ちに触れさせていただきました。今は答えが出なくても、書き留めたことが未来のヒントになるはずです。`
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
