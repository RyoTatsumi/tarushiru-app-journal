import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { myProfile, partnerProfile } = await request.json();

    const prompt = `
      あなたは関係性心理学とチームビルディングのスペシャリストです。
      以下の2人のプロフィールに基づき、高度な「相性診断」を行ってください。

      ## ユーザーA (自分)
      - 名前: ${myProfile.name}
      - MBTI: ${myProfile.mbti}
      - 強み: ${myProfile.strengths?.join(', ') || '未設定'}
      - 遺伝子タイプ: ${myProfile.geneticAnalysis?.determinedType || '未設定'}
      - 価値観: ${myProfile.values || '未設定'}

      ## ユーザーB (相手)
      - 名前: ${partnerProfile.name}
      - MBTI: ${partnerProfile.mbti}
      - 強み: ${partnerProfile.strengths?.join(', ') || '未設定'}
      - 遺伝子タイプ: ${partnerProfile.geneticAnalysis?.determinedType || '未設定'}
      - 価値観: ${partnerProfile.values || '未設定'}

      ## 分析項目 (Markdown形式で出力)
      1. **性格的マッチ度と関係性のコツ**: MBTIの相性やコミュニケーションの傾向。
      2. **強みのシナジー（相互補助）**: お互いの強みがどう補い合えるか。
      3. **遺伝的・バイオリズム的配慮**: 睡眠型（朝/夜）やストレス耐性など、生活面での共存のコツ。
      4. **二人の未来へのアドバイス**: より良いパートナーシップを築くための具体的な一歩。

      トーンは知的でありながら、温かみのある表現にしてください。
    `;

    const response = await callWithRetry(async () => {
      return await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'analyzeCompatibility');

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ result: text });
  } catch (error) {
    console.error('Compatibility Analysis Error:', error);
    return NextResponse.json({
      result: '相性診断の実行中にエラーが発生しました。しばらく時間を置いてから再度お試しください。'
    });
  }
}
