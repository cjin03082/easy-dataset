import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 保存模型评估结果
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    const {
      userQuestion,
      modelMapping,
      conversations,
      evaluationType,
      selectedModel,
      modelAScore,
      modelBScore,
      modelCScore,
      modelAId,
      modelBId,
      modelCId
    } = body;

    // 创建测试会话
    const session = await db.modelTestSession.create({
      data: {
        projectId,
        userQuestion,
        modelMapping,
        conversations
      }
    });

    // 创建评估记录
    const evaluation = await db.modelTestEvaluation.create({
      data: {
        sessionId: session.id,
        evaluationType,
        selectedModel,
        modelAScore,
        modelBScore,
        modelCScore,
        modelAId,
        modelBId,
        modelCId
      }
    });

    return NextResponse.json({
      success: true,
      data: { session, evaluation }
    });
  } catch (error) {
    console.error('保存模型评估失败:', error);
    return NextResponse.json(
      { error: '保存模型评估失败', details: error.message },
      { status: 500 }
    );
  }
}

