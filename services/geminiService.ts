
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
 * 複数のジャーナルエントリーから傾向を分析します。
 */
export const analyzeJournalTrends = async (entries: any[]) => {
    try {
      // Limit to recent entries to save tokens, format for AI
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
      
      ## 指示
      1. ユーザーが入力した「経歴・職歴メモ」は、自然言語、箇条書き、あるいは乱雑なメモ書きの可能性があります。
         これを時系列に整理し、「会社名」「期間」「役職」「主な業務内容」「実績」といった標準的な経歴書フォーマットに構造化して書き直してください。
      2. 不足している情報（具体的な日付など）は、文脈から自然に補うか、あるいはプレースホルダー（例：20XX年）として残してください。
      3. 自己PRセクションも作成し、MBTI (${profileData.mbti}) やストレングスファインダー (${strengthsStr}) の強み、
         および本人が大切にしている価値観 (${profileData.values || '特になし'}) を具体的な職歴と結びつけてアピールしてください。
      4. Markdownの見出し (#, ##) を適切に使用し、読みやすくしてください。

      ## ユーザー情報
      氏名: ${profileData.name}
      MBTI: ${profileData.mbti}
      ストレングスファインダー: ${strengthsStr}
      スキル: ${profileData.skills.join(', ')}
      興味ある業界・テーマ: ${profileData.interests || '特になし'}
      大切にしている価値観: ${profileData.values || '特になし'}
      
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
          - **本人が認識している強み (性格/経験)**: ${profileData.careerStrengths || '未入力'}
          - **保有スキル**: ${profileData.skills.join(', ')}
          - **興味・関心**: ${profileData.interests || '未入力'}
          - **やりがい・価値観**: ${profileData.values || '未入力'}
          - **理想の環境**: ${profileData.environment || '未入力'}
    
          ## 出力要件
          - 300〜400文字程度の文章。
          - 「あなたのキャリアの核となるのは...」といった書き出しで、要素同士のつながり（例：強みとやりがいの一致点）を見つけて言語化してください。
          - 最後に、このユーザーに向いていると思われる役割や働き方のヒントを一言添えてください。
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
      
      特に、MBTIタイプ (${mbti}) の基本的特性に、ストレングスファインダーの上位資質 (${strengthsStr}) がどのように作用するか（相乗効果など）を具体的に分析してください。
      300文字以内で、ポジティブかつ洞察に満ちた内容にしてください。

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
 * 資産データに基づいてファイナンシャルアドバイスを提供します。
 */
export const analyzeAssetTrends = async (assets: any[]) => {
    try {
        // Sort by month
        const sortedAssets = [...assets].sort((a, b) => a.month.localeCompare(b.month));
        
        // Use last 24 months to allow yearly comparison
        const recentAssets = sortedAssets.slice(-24);

        const prompt = `
          あなたは優秀なファイナンシャルプランナー（FP）です。
          ユーザーの資産推移データ（最大24ヶ月分）を分析し、Markdown形式でレポートを作成してください。

          ## 分析観点
          1. **長期的トレンド**: 直近1年だけでなく、過去2年間の推移を見て、順調に資産が増えているか、あるいは停滞しているか評価してください。
          2. **前年比の変化**: もしデータがあれば、去年の同時期と比較してどう変化しているか言及してください。
          3. **ポートフォリオ**: 現金比率や投資比率についてのコメント（もしデータから読み取れれば）。
          4. **アドバイス**: 資産形成に向けた励ましや、もし急激な減少があれば注意喚起など。

          ## データ
          ${JSON.stringify(recentAssets)}
          
          ※具体的な投資銘柄の推奨はせず、あくまで資産バランスと推移に対するフィードバックを行ってください。
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
