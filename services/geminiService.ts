import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { UserProfile, JournalEntry } from "../types";

// Initialize the Google GenAI client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey,
  apiVersion: 'v1'
});

// gemini-2.0-flash: 最新の高速モデル。1.5-flashより安定性・レートリミットが改善
const MODEL_FAST = 'gemini-2.0-flash';

// 安全性設定：日記の内容を制限しないようBLOCK_NONEを設定
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ============================
// リトライロジック（指数バックオフ）
// ============================
// API呼び出しが429(レートリミット)や5xxエラーで失敗した場合、
// 自動的に待機時間を増やしながら最大3回リトライする
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000; // 最初の待機: 2秒

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: any): boolean {
  if (!error) return false;
  const message = String(error.message || error).toLowerCase();
  // 429 = レートリミット、503 = サービス過負荷、500 = サーバーエラー
  return message.includes('429') ||
         message.includes('rate limit') ||
         message.includes('resource exhausted') ||
         message.includes('503') ||
         message.includes('500') ||
         message.includes('overloaded') ||
         message.includes('unavailable') ||
         message.includes('quota');
}

async function callWithRetry<T>(fn: () => Promise<T>, context: string): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.warn(`[${context}] Attempt ${attempt + 1}/${MAX_RETRIES} failed:`, error?.message || error);

      if (attempt < MAX_RETRIES - 1 && isRetryableError(error)) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt); // 2s, 4s, 8s
        console.log(`[${context}] Retrying in ${delay}ms...`);
        await sleep(delay);
      } else if (!isRetryableError(error)) {
        // リトライ不可能なエラー（認証エラーなど）は即座に中断
        break;
      }
    }
  }
  throw lastError;
}

/**
 * ジャーナルエントリー分析
 */
export const analyzeJournalEntry = async (text: string, profile: UserProfile | null, pastEntries: JournalEntry[] = []) => {
  try {
    const profileContext = profile ? `
      [ユーザーの「本質」データ]
      - 名前: ${profile.name || 'ユーザー'}
      - 思考特性(MBTI): ${profile.mbti || '不明'} (このタイプ特有の思考癖や葛藤を考慮すること)
      - 才能の源泉(Strengths): ${profile.strengths?.join(', ') || '不明'} (この強みがどう状況に影響したか、あるいは活かせるか)
      - 生物学的特性(遺伝子/体質): ${profile.geneticAnalysis?.determinedType || '不明'} (エネルギーレベルやストレス耐性を考慮し、無理のない提案を)
      - 人生の核となる価値観: ${profile.values || '不明'} (今回の感情は、この価値観との合致・乖離が原因ではないか)
    ` : 'ユーザー特性: 未設定';

    const historyContext = pastEntries.length > 0
      ? `
      [直近のストーリーライン（文脈）]
      ${pastEntries.map(e => `- ${new Date(e.date).toLocaleDateString()}: ${e.content.slice(0, 150)}...`).join('\n')}

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
      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              emotions: {
                type: Type.OBJECT,
                properties: {
                  joy: { type: Type.NUMBER },
                  anger: { type: Type.NUMBER },
                  sadness: { type: Type.NUMBER },
                  anxiety: { type: Type.NUMBER },
                  calm: { type: Type.NUMBER },
                },
                required: ["joy", "anger", "sadness", "anxiety", "calm"]
              },
              themes: { type: Type.ARRAY, items: { type: Type.STRING } },
              actions: { type: Type.ARRAY, items: { type: Type.STRING } },
              aiComment: { type: Type.STRING }
            }
          },
          safetySettings: SAFETY_SETTINGS
        }
      });
      return response;
    }, 'analyzeJournalEntry');

    const rawText = result.text || "{}";
    const cleanedText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    let parsed;
    try {
        parsed = JSON.parse(cleanedText);
    } catch (e) {
        console.warn("Gemini: JSON parse failed, utilizing fallback structure.", e);
        parsed = {};
    }

    // 高度なフォールバック処理
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

    // 必須フィールドの補完
    if (!parsed.emotions) parsed.emotions = { joy: 0, anger: 0, sadness: 0, anxiety: 0, calm: 0 };
    if (!parsed.themes) parsed.themes = ["記録"];
    if (!parsed.actions) parsed.actions = [];

    return parsed;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      emotions: { joy: 0, anger: 0, sadness: 0, anxiety: 0, calm: 0 },
      themes: ["未分析"],
      actions: [],
      aiComment: "現在、AIとの接続が混み合っているようです。でも、あなたが記録を残したこと自体に価値があります。少し時間を置いてから、またお話ししましょう。"
    };
  }
};

/**
 * 相性診断
 */
export const analyzeCompatibility = async (myProfile: UserProfile, partnerProfile: UserProfile) => {
  try {
    const prompt = `
      あなたは関係性心理学とチームビルディングのスペシャリストです。
      以下の2人のプロフィールに基づき、高度な「相性診断」を行ってください。

      ## ユーザーA (自分)
      - 名前: ${myProfile.name}
      - MBTI: ${myProfile.mbti}
      - 強み: ${myProfile.strengths.join(', ')}
      - 遺伝子タイプ: ${myProfile.geneticAnalysis?.determinedType || '未設定'}
      - 価値観: ${myProfile.values || '未設定'}

      ## ユーザーB (相手)
      - 名前: ${partnerProfile.name}
      - MBTI: ${partnerProfile.mbti}
      - 強み: ${partnerProfile.strengths.join(', ')}
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
      return await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        config: { safetySettings: SAFETY_SETTINGS }
      });
    }, 'analyzeCompatibility');

    return response.text;
  } catch (error) {
    console.error("Compatibility Analysis Error:", error);
    return "相性診断の実行中にエラーが発生しました。しばらく時間を置いてから再度お試しください。";
  }
};

export const analyzeJournalTrends = async (entries: any[], profile: UserProfile | null, timeframeLabel: string) => {
  try {
    const recentEntries = entries.map(e => ({
        date: e.date,
        content: e.content,
        themes: e.analysis?.themes || []
    }));
    const prompt = `過去の日記分析レポートを作成してください: ${JSON.stringify(recentEntries)}`;
    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
          config: { safetySettings: SAFETY_SETTINGS }
      });
    }, 'analyzeJournalTrends');
    return response.text;
  } catch (error) {
    console.error("Journal Trends Error:", error);
    return "傾向分析の実行中にエラーが発生しました。しばらく時間を置いてから再度お試しください。";
  }
};

export const generateResume = async (profileData: any) => {
  try {
    const prompt = `以下の情報から職務経歴書を作成してください: ${JSON.stringify(profileData)}`;
    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
          config: { safetySettings: SAFETY_SETTINGS }
      });
    }, 'generateResume');
    return response.text;
  } catch (error) {
    console.error("Resume Generation Error:", error);
    return "職務経歴書の生成中にエラーが発生しました。しばらく時間を置いてから再度お試しください。";
  }
};

export const summarizeCareerProfile = async (profileData: any) => {
  try {
    const prompt = `自己統合サマリーを作成してください: ${JSON.stringify(profileData)}`;
    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
          config: { safetySettings: SAFETY_SETTINGS }
      });
    }, 'summarizeCareerProfile');
    return response.text;
  } catch (error) {
    console.error("Career Profile Error:", error);
    return "サマリーの生成中にエラーが発生しました。しばらく時間を置いてから再度お試しください。";
  }
};

export const analyzePersonality = async (mbti: string, strengths: string[]) => {
  try {
    const prompt = `性格分析: MBTI ${mbti}, Strengths ${strengths.join(', ')}`;
    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
    }, 'analyzePersonality');
    return response.text;
  } catch (error) {
    console.error("Personality Analysis Error:", error);
    return "性格分析の実行中にエラーが発生しました。しばらく時間を置いてから再度お試しください。";
  }
};

export const analyzeGeneticType = async (rawText: string) => {
  try {
    const prompt = `遺伝子解析: ${rawText}`;
    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              determinedType: { type: Type.STRING },
              healthTips: { type: Type.STRING },
              workTips: { type: Type.STRING },
              lifeTips: { type: Type.STRING },
            },
            required: ["determinedType", "healthTips", "workTips", "lifeTips"]
          },
          safetySettings: SAFETY_SETTINGS
        }
      });
    }, 'analyzeGeneticType');
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Genetic Analysis Error:", error);
    return { determinedType: "解析エラー", healthTips: "再度お試しください", workTips: "", lifeTips: "" };
  }
};

export const analyzeAssetTrends = async (assets: any[], budget: any) => {
  try {
    const prompt = `資産分析レポート: ${JSON.stringify({assets, budget})}`;
    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
          config: { safetySettings: SAFETY_SETTINGS }
      });
    }, 'analyzeAssetTrends');
    return response.text;
  } catch (error) {
    console.error("Asset Trends Error:", error);
    return "資産分析の実行中にエラーが発生しました。しばらく時間を置いてから再度お試しください。";
  }
};

export const getGoalCoaching = async (goals: any[]) => {
  try {
    const prompt = `目標コーチング: ${JSON.stringify(goals)}`;
    const response = await callWithRetry(async () => {
      return await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
          config: { safetySettings: SAFETY_SETTINGS }
      });
    }, 'getGoalCoaching');
    return response.text;
  } catch (error) {
    console.error("Goal Coaching Error:", error);
    return "目標コーチングの実行中にエラーが発生しました。しばらく時間を置いてから再度お試しください。";
  }
};
