import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取所有模型的评分汇总
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // 获取所有评估记录
    const evaluations = await db.modelTestEvaluation.findMany({
      where: {
        session: {
          projectId
        }
      },
      include: {
        session: true
      },
      orderBy: {
        createAt: 'desc'
      }
    });

    // 汇总每个模型的得分
    const scoreMap = {};

    evaluations.forEach(evaluation => {
      // 处理模型A
      if (evaluation.modelAId) {
        if (!scoreMap[evaluation.modelAId]) {
          scoreMap[evaluation.modelAId] = {
            modelId: evaluation.modelAId,
            score: 0,
            evaluations: []
          };
        }
        scoreMap[evaluation.modelAId].score += evaluation.modelAScore;
        scoreMap[evaluation.modelAId].evaluations.push({
          ...evaluation,
          score: evaluation.modelAScore
        });
      }

      // 处理模型B
      if (evaluation.modelBId) {
        if (!scoreMap[evaluation.modelBId]) {
          scoreMap[evaluation.modelBId] = {
            modelId: evaluation.modelBId,
            score: 0,
            evaluations: []
          };
        }
        scoreMap[evaluation.modelBId].score += evaluation.modelBScore;
        scoreMap[evaluation.modelBId].evaluations.push({
          ...evaluation,
          score: evaluation.modelBScore
        });
      }

      // 处理模型C
      if (evaluation.modelCId) {
        if (!scoreMap[evaluation.modelCId]) {
          scoreMap[evaluation.modelCId] = {
            modelId: evaluation.modelCId,
            score: 0,
            evaluations: []
          };
        }
        scoreMap[evaluation.modelCId].score += evaluation.modelCScore;
        scoreMap[evaluation.modelCId].evaluations.push({
          ...evaluation,
          score: evaluation.modelCScore
        });
      }
    });

    // 转换为数组，score字段保持为累加分数（总分）
    const scores = Object.values(scoreMap).map(scoreItem => {
      const evaluationCount = scoreItem.evaluations.length;
      const averageScore = evaluationCount > 0 ? scoreItem.score / evaluationCount : 0;
      
      return {
        ...scoreItem,
        // score字段保持为累加分数（总分）
        averageScore: Math.round(averageScore * 100) / 100, // 平均分，保留2位小数
        evaluationCount: evaluationCount
      };
    });

    return NextResponse.json({
      success: true,
      data: scores
    });
  } catch (error) {
    console.error('获取模型评分失败:', error);
    return NextResponse.json(
      { error: '获取模型评分失败', details: error.message },
      { status: 500 }
    );
  }
}

