import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client with fallback for Vite environment
const apiKey = (import.meta as any).env?.VITE_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey });

const MODEL_FAST = 'gemini-2.5-flash';

/**
 * ジャーナルエントリーを分析し、感情・テーマ・行動を抽出します。
 */
export const analyzeJournalEntry = async (text: string) => {
  try {
    const prompt = `
      ユーザーが書いた以下の日記（ジャーナル）を分析してください。
      感情スコア（0.0〜1.0）、主要なテーマ（日本語）、および具体的な行動（日本語）を抽出してください。
      
      日記の内容: "${text}"
    `;

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
                joy: { type: Type.NUMBER, description: "喜び" },
                anger: { type: Type.NUMBER, description: "怒り" },
                sadness: { type: Type.NUMBER, description: "悲しみ" },
                anxiety: { type: Type.NUMBER, description: "不安" },
                calm: { type: Type.NUMBER, description: "安らぎ・平穏" },
              },
              required: ["joy", "anger", "sadness", "anxiety", "calm"]
            },
            themes: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "抽出されたテーマ（例：仕事、家族、将来など）"
            },
            actions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "ユーザーが取った行動、または取ろうとしている行動"
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

/**
 * プロフィール情報を元にMarkdown形式の職務経歴書を生成します。
 */
export const generateResume = async (profileData: any) => {
  try {
    const strengthsStr = Array.isArray(profileData.strengths) 
      ? profileData.strengths.filter((s: string) => s).join(', ') 
      : profileData.strengths;

    const prompt = `
      あなたはプロのキャリアコンサルタントです。
      以下のユーザープロフィールに基づき、フォーマルで魅力的な日本の「職務経歴書」をMarkdown形式で作成してください。
      
      ## 指示
      1. ユーザーが入力した「経歴・職歴メモ」は、自然言語、箇条書き、あるいは乱雑なメモ書きの可能性があります。
         これを時系列に整理し、「会社名」「期間」「役職」「主な業務内容」「実績」といった標準的な経歴書フォーマットに構造化して書き直してください。
      2. 不足している情報（具体的な日付など）は、文脈から自然に補うか、あるいはプレースホルダー（例：20XX年）として残してください。
      3. 自己PRセクションも作成し、MBTI (${profileData.mbti}) やストレングスファインダー (${strengthsStr}) の強みを、
         具体的な職歴と結びつけてアピールしてください。
      4. Markdownの見出し (#, ##) を適切に使用し、読みやすくしてください。

      ## ユーザー情報
      氏名: ${profileData.name}
      MBTI: ${profileData.mbti}
      ストレングスファインダー: ${strengthsStr}
      スキル: ${profileData.skills.join(', ')}
      
      ## 経歴・職歴メモ (整理対象):
      ${profileData.history}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Resume Generation Error:", error);
    throw error;
  }
};

/**
 * MBTIとストレングスファインダーに基づいて性格とキャリアアドバイスを生成します。
 */
export const analyzePersonality = async (mbti: string, strengths: string[]) => {
  try {
    // Ensure strengths is an array before filtering
    const safeStrengths = Array.isArray(strengths) ? strengths : [];
    const validStrengths = safeStrengths.filter(s => s && typeof s === 'string');
    const strengthsStr = validStrengths.join(', ');

    const prompt = `
      心理学とキャリア開発の専門家として振る舞ってください。
      以下の特性を持つ人物の「性格的な強み」と「キャリアでの活かし方」を日本語で解説してください。
      
      特に、MBTIタイプ (${mbti}) の基本的特性に、ストレングスファインダーの上位資質 (${strengthsStr}) がどのように作用するか（相乗効果など）を具体的に分析してください。
      300文字以内で、ポジティブかつ洞察に満ちた内容にしてください。読者が「自分の強み」を再発見できるような文章をお願いします。

      MBTI: ${mbti}
      ストレングスファインダー(Top 5): ${strengthsStr}
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Personality Analysis Error:", error);
    throw error;
  }
};

/**
 * 目標に基づいたコーチングアドバイスを提供します。
 */
export const getGoalCoaching = async (goals: any[]) => {
    try {
      const goalsText = JSON.stringify(goals);
      const prompt = `
        あなたは支援的なライフコーチです。以下の目標リストを見て、
        ユーザーを励ます短い要約と、前進するための具体的なアドバイスを1つ提示してください。
        口調は丁寧かつ親しみやすく、日本語で出力してください。200文字以内でお願いします。
        
        目標リスト: ${goalsText}
      `;
  
      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
      });
  
      return response.text;
    } catch (error) {
      console.error("Gemini Coaching Error:", error);
      throw error;
    }
  };