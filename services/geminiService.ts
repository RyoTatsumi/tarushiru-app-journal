
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client with fallback for Vite environment
const apiKey = (import.meta as any).env?.VITE_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey });

const MODEL_FAST = 'gemini-2.5-flash';

/**
 * ジャーナルエントリーを分析し、感情・テーマ・行動・コメントを抽出します。
 */
export const analyzeJournalEntry = async (text: string) => {
  try {
    const prompt = `
      ユーザーが書いた以下の日記（ジャーナル）を分析してください。
      感情スコア（0.0〜1.0）、主要なテーマ（日本語）、具体的な行動（日本語）、そして「ポジティブな一言コメント」を出力してください。
      
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
              description: "抽出されたテーマ"
            },
            actions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "ユーザーが取った行動"
            },
            aiComment: {
                type: Type.STRING,
                description: "ユーザーへの共感や励まし、あるいは洞察を含む温かい一言コメント（50文字以内）"
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
 * 複数のジャーナルエントリーから傾向を分析します。
 */
export const analyzeJournalTrends = async (entries: any[]) => {
    try {
      const recentEntries = entries.slice(-15).map(e => ({
          date: e.date,
          content: e.content,
          themes: e.analysis?.themes || []
      }));
      
      const prompt = `
        あなたはユーザーのメンタルヘルスと自己成長を支援するAIパートナーです。
        以下の過去の日記データ（最近のもの最大15件）を時系列で分析し、ユーザーに対する「月次レポート」のようなフィードバックを作成してください。
  
        ## 分析の観点
        1. **感情の傾向と変化**: 最近どのような感情が支配的か？以前と比べてどう変化したか？
        2. **主要なテーマ**: ユーザーが繰り返し言及している悩みや関心事は何か？
        3. **具体的なアドバイス**: これらを踏まえ、来月に向けて意識すべきことや、継続すべき良い習慣は？
  
        口調は温かく、励ますようなトーンでお願いします。Markdown形式で見出しをつけて構造化してください。
  
        データ:
        ${JSON.stringify(recentEntries)}
      `;
  
      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
      });
  
      return response.text;
    } catch (error) {
      console.error("Gemini Trend Analysis Error:", error);
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
      
      ## ユーザー情報
      氏名: ${profileData.name}
      MBTI: ${profileData.mbti}
      ストレングスファインダー: ${strengthsStr}
      スキル: ${profileData.skills.join(', ')}
      興味ある業界・テーマ: ${profileData.interests || '特になし'}
      大切にしている価値観: ${profileData.values || '特になし'}
      
      ## 経歴・職歴メモ:
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
 * プロフィールの全項目を統合して、キャリアの要約を作成します。
 */
export const summarizeCareerProfile = async (profileData: any) => {
    try {
        const strengthsStr = Array.isArray(profileData.strengths) 
            ? profileData.strengths.filter((s: string) => s).join(', ') 
            : '';
        
        const prompt = `
          キャリアコーチとして振る舞ってください。
          以下のユーザーの「強み」「スキル」「興味」「価値観」「理想の環境」といった断片的な情報を統合し、
          「私という人間はどういう特性を持ち、どのような環境で輝くのか」という **自己統合サマリー** を作成してください。
    
          ## 入力情報
          - **MBTI**: ${profileData.mbti}
          - **StrengthFinder**: ${strengthsStr}
          - **本人が認識している強み**: ${profileData.careerStrengths || '未入力'}
          - **保有スキル**: ${profileData.skills.join(', ')}
          - **興味・関心**: ${profileData.interests || '未入力'}
          - **やりがい・価値観**: ${profileData.values || '未入力'}
          - **理想の環境**: ${profileData.environment || '未入力'}
        `;
    
        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });
    
        return response.text;
      } catch (error) {
        console.error("Gemini Profile Summary Error:", error);
        throw error;
      }
};

/**
 * MBTIとストレングスファインダーに基づいて性格とキャリアアドバイスを生成します。
 */
export const analyzePersonality = async (mbti: string, strengths: string[]) => {
  try {
    const safeStrengths = Array.isArray(strengths) ? strengths : [];
    const validStrengths = safeStrengths.filter(s => s && typeof s === 'string');
    const strengthsStr = validStrengths.join(', ');

    const prompt = `
      心理学とキャリア開発の専門家として振る舞ってください。
      以下の特性を持つ人物の「性格的な強み」と「キャリアでの活かし方」を日本語で解説してください。
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
 * 資産データと家計予算構造に基づいてファイナンシャルアドバイスを提供します。
 */
export const analyzeAssetTrends = async (assets: any[], budget: any) => {
    try {
        const sortedAssets = [...assets].sort((a, b) => a.month.localeCompare(b.month));
        const recentAssets = sortedAssets.slice(-24);

        const prompt = `
          あなたは優秀なファイナンシャルプランナー（FP）です。
          ユーザーの「資産推移（Stock）」と「現在の収支構造（Flow）」の両方を分析し、
          資産形成のスピードを上げるための構造的なアドバイス（支出削減やバランス調整）を行ってください。

          ## 収支構造 (Flow)
          - 手取り月収: ${budget.monthlyIncome}円
          - 変動費予算: ${budget.variableBudget}円
          - 固定費リスト: ${JSON.stringify(budget.fixedCosts)}

          ## 資産推移データ (Stock - 直近24ヶ月)
          ${JSON.stringify(recentAssets)}

          ## 出力要件
          - Markdown形式
          - まず現状の「貯蓄率（余剰金割合）」や「固定費率」について評価してください。
          - 資産の増減トレンドについてコメントしてください。
          - 具体的で実行可能な改善提案（どの固定費を見直すべきか、など）を提示してください。
        `;

        const response = await ai.models.generateContent({
            model: MODEL_FAST,
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Gemini Asset Analysis Error:", error);
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
        各カテゴリ（在り方、生活、仕事、直近の仕事目標）のバランスについてコメントし、
        特に「直近の仕事目標」を達成するための具体的なアクションプランを1つ提案してください。
        口調は丁寧かつ親しみやすく、日本語で出力してください。
        
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
