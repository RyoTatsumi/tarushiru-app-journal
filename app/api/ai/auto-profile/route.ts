import { NextRequest, NextResponse } from 'next/server';
import { getAnthropicClient, MODEL } from '@/lib/anthropic';
import { callWithRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
  try {
    const { rawText } = await request.json();

    const tool = {
      name: 'submit_profile_data',
      description: 'テキストから抽出したプロフィール・遺伝子・強み・目標のデータを返す',
      input_schema: {
        type: 'object' as const,
        properties: {
          mbti: {
            type: 'string' as const,
            description: 'MBTIタイプ（例: INTJ, ENFP）。見つからない場合は空文字。',
          },
          strengths: {
            type: 'array' as const,
            items: { type: 'string' as const },
            description: 'ストレングスファインダーのTOP5の強みテーマ名（日本語）。見つからない場合は空配列。',
          },
          careerStrengths: {
            type: 'string' as const,
            description: 'キャリア上の強み・得意なこと。見つからない場合は空文字。',
          },
          interests: {
            type: 'string' as const,
            description: '興味関心・好きなこと。見つからない場合は空文字。',
          },
          values: {
            type: 'string' as const,
            description: '大切にしている価値観。見つからない場合は空文字。',
          },
          lifePhilosophy: {
            type: 'string' as const,
            description: '人生哲学・モットー。見つからない場合は空文字。',
          },
          decisionStyle: {
            type: 'string' as const,
            description: '意思決定スタイル。見つからない場合は空文字。',
          },
          geneticAnalysis: {
            type: 'object' as const,
            description: '遺伝子検査の情報。見つからない場合はnull。',
            properties: {
              determinedType: { type: 'string' as const, description: '体質タイプ（例: 夜型・高感受性タイプ）' },
              healthTips: { type: 'string' as const, description: '健康面のアドバイス' },
              workTips: { type: 'string' as const, description: '仕事面のアドバイス' },
              lifeTips: { type: 'string' as const, description: '生活面のアドバイス' },
            },
          },
          goals: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                title: { type: 'string' as const },
                description: { type: 'string' as const },
                category: {
                  type: 'string' as const,
                  enum: ['being', 'life', 'work', 'work_short'],
                  description: 'being=在り方, life=人生目標, work=仕事長期, work_short=仕事短期',
                },
              },
              required: ['title', 'category'],
            },
            description: 'テキストから読み取れる目標・ゴール。見つからない場合は空配列。',
          },
          summary: {
            type: 'string' as const,
            description: '抽出した内容の要約（100〜200文字）。ユーザーに確認してもらうための説明。',
          },
        },
        required: ['mbti', 'strengths', 'careerStrengths', 'interests', 'values', 'lifePhilosophy', 'decisionStyle', 'goals', 'summary'],
      },
    };

    const prompt = `以下のテキストは、ユーザーがライフコーチング、ストレングスファインダー、遺伝子検査、性格診断などの結果をまとめて貼り付けたものです。

テキストから以下の情報を可能な限り抽出してください：

1. **MBTI**: テキスト中にMBTIタイプ（INTJ, ENFPなど）があれば抽出
2. **ストレングスファインダー**: TOP5の強みテーマ名を日本語で抽出（例: 内省, 学習欲, 着想, 戦略性, 収集心）
3. **キャリア上の強み**: キャリアや仕事に関する強み・得意領域
4. **興味関心**: 趣味や興味のある分野
5. **価値観**: 大切にしていること、信念
6. **人生哲学**: 人生のモットーや哲学
7. **意思決定スタイル**: 判断の傾向（直感型、分析型など）
8. **遺伝子検査結果**: 体質タイプ、健康・仕事・生活のアドバイス
9. **目標**: 人生目標、仕事目標、在り方（being）目標

## ルール
- テキストに含まれていない情報は空文字・空配列・nullで返す（推測で埋めない）
- 複数の情報源が混在していても、それぞれ正しく振り分ける
- ストレングスファインダーの強みは日本語名で返す（Gallupの正式な日本語テーマ名）
- 目標のcategoryは: being（在り方・ずっと体現するもの）、life（人生目標）、work（仕事長期）、work_short（仕事短期）
- summaryに何を抽出できたかを簡潔にまとめる

## テキスト
${rawText}

submit_profile_data ツールを使って結果を返してください。`;

    const result = await callWithRetry(async () => {
      return await getAnthropicClient().messages.create({
        model: MODEL,
        max_tokens: 2048,
        tools: [tool],
        tool_choice: { type: 'tool', name: 'submit_profile_data' },
        messages: [{ role: 'user', content: prompt }],
      });
    }, 'autoProfile');

    const toolBlock = result.content.find((b: { type: string }) => b.type === 'tool_use');
    const parsed = toolBlock && 'input' in toolBlock ? toolBlock.input : {};

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Auto Profile Error:', error);
    return NextResponse.json({
      error: 'プロフィールの自動解析に失敗しました。もう一度お試しください。'
    }, { status: 500 });
  }
}
