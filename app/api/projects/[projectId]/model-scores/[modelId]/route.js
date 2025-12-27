import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取特定模型的详细评分记录
export async function GET(request, { params }) {
  try {
    const { projectId, modelId } = params;

    // 获取包含该模型的所有评估记录
    const evaluations = await db.modelTestEvaluation.findMany({
      where: {
        session: {
          projectId
        },
        OR: [
          { modelAId: modelId },
          { modelBId: modelId },
          { modelCId: modelId }
        ]
      },
      include: {
        session: true
      },
      orderBy: {
        createAt: 'desc'
      }
    });

    // 为每条记录添加该模型的得分
    const details = evaluations.map(evaluation => {
      let score = 0;
      if (evaluation.modelAId === modelId) score = evaluation.modelAScore;
      else if (evaluation.modelBId === modelId) score = evaluation.modelBScore;
      else if (evaluation.modelCId === modelId) score = evaluation.modelCScore;

      return {
        ...evaluation,
        score,
        modelMapping: evaluation.session.modelMapping,
        userQuestion: evaluation.session.userQuestion,
        conversations: evaluation.session.conversations, // 包含所有模型的对话内容
        createAt: evaluation.createAt
      };
    });

    return NextResponse.json({
      success: true,
      data: details
    });
  } catch (error) {
    console.error('获取模型详细评分失败:', error);
    return NextResponse.json(
      { error: '获取模型详细评分失败', details: error.message },
      { status: 500 }
    );
  }
}

