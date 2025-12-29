'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Alert, Button, IconButton } from '@mui/material';
import { useParams } from 'next/navigation';
import { useTheme } from '@mui/material/styles';
import ChatArea from '@/components/playground/ChatArea';
import MessageInput from '@/components/playground/MessageInput';
import PlaygroundHeader from '@/components/playground/PlaygroundHeader';
import ModelEvaluationDialog from '@/components/playground/ModelEvaluationDialog';
import ModelScoreView from '@/components/playground/ModelScoreView';
import useModelPlayground from '@/hooks/useModelPlayground';
import { playgroundStyles } from '@/styles/playground';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai/index';
import { modelConfigListAtom } from '@/lib/store';
import AssessmentIcon from '@mui/icons-material/Assessment';
import StarIcon from '@mui/icons-material/Star';
import axios from 'axios';
import { toast } from 'sonner';

export default function ModelPlayground({ searchParams }) {
  const theme = useTheme();
  const params = useParams();
  const { projectId } = params;
  const modelId = searchParams?.modelId || null;
  const styles = playgroundStyles(theme);
  const { t } = useTranslation();

  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [scoreViewOpen, setScoreViewOpen] = useState(false);
  const [useAnonymousNames, setUseAnonymousNames] = useState(false);
  const [modelMapping, setModelMapping] = useState({});
  const [lastUserQuestion, setLastUserQuestion] = useState('');
  const [lastConversations, setLastConversations] = useState({});
  const processedConversationRef = useRef(new Set()); // 跟踪已处理的对话

  const {
    selectedModels,
    loading,
    userInput,
    conversations,
    error,
    outputMode,
    uploadedImage,
    handleModelSelection,
    handleInputChange,
    handleImageUpload,
    handleRemoveImage,
    handleSendMessage,
    handleClearConversations,
    handleOutputModeChange
  } = useModelPlayground(projectId, modelId);

  const availableModels = useAtomValue(modelConfigListAtom);

  // 当选择多个模型时，自动启用匿名化并创建随机映射
  useEffect(() => {
    if (selectedModels.length > 1) {
      setUseAnonymousNames(true);
      // 创建模型ID的随机副本
      const shuffledModels = [...selectedModels];
      // Fisher-Yates 洗牌算法进行随机打乱
      for (let i = shuffledModels.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledModels[i], shuffledModels[j]] = [shuffledModels[j], shuffledModels[i]];
      }
      // 将打乱后的模型映射到A、B、C
      const mapping = {};
      const labels = ['A', 'B', 'C'];
      shuffledModels.forEach((modelId, index) => {
        mapping[labels[index]] = modelId;
      });
      setModelMapping(mapping);
    } else {
      setUseAnonymousNames(false);
      setModelMapping({});
    }
  }, [selectedModels]);

  // 检查是否所有模型都已完成回答
  const allModelsResponded = () => {
    if (selectedModels.length === 0) return false;
    return selectedModels.every(modelId => {
      const conversation = conversations[modelId] || [];
      if (conversation.length === 0) return false;
      const lastMessage = conversation[conversation.length - 1];
      return (
        lastMessage &&
        (lastMessage.role === 'assistant' || lastMessage.role === 'error') &&
        !loading[modelId]
      );
    });
  };

  // 当所有模型回答完成后，自动弹出评估对话框
  useEffect(() => {
    if (allModelsResponded() && selectedModels.length > 1 && !evaluationDialogOpen) {
      // 生成对话的唯一标识（基于所有模型的最后一条消息）
      const conversationKey = selectedModels
        .map(modelId => {
          const conversation = conversations[modelId] || [];
          const lastMsg = conversation[conversation.length - 1];
          return lastMsg ? `${modelId}-${conversation.length}-${JSON.stringify(lastMsg.content).substring(0, 50)}` : '';
        })
        .join('|');
      
      // 如果这个对话已经处理过，跳过
      if (processedConversationRef.current.has(conversationKey)) {
        return;
      }
      
      // 找到最后一条用户消息
      let lastUserMsg = null;
      let maxIndex = -1;
      
      selectedModels.forEach(modelId => {
        const conversation = conversations[modelId] || [];
        conversation.forEach((msg, index) => {
          if (msg.role === 'user' && index > maxIndex) {
            maxIndex = index;
            lastUserMsg = msg;
          }
        });
      });
      
      if (lastUserMsg) {
        let question = '';
        if (typeof lastUserMsg.content === 'string') {
          question = lastUserMsg.content;
        } else if (Array.isArray(lastUserMsg.content)) {
          const textItem = lastUserMsg.content.find(item => item.type === 'text');
          question = textItem?.text || '';
        }
        
        if (question) {
          // 标记这个对话已处理
          processedConversationRef.current.add(conversationKey);
          
          setLastUserQuestion(question);
          setLastConversations(conversations);
          
          // 延迟一点时间再弹出，让用户看到回答
          const timer = setTimeout(() => {
            setEvaluationDialogOpen(true);
          }, 1000);
          
          return () => clearTimeout(timer);
        }
      }
    }
  }, [conversations, loading, selectedModels, evaluationDialogOpen]);

  // 获取模型名称
  const getModelName = modelId => {
    const model = availableModels.find(m => m.id === modelId);
    return model ? `${model.providerName}: ${model.modelName}` : modelId;
  };

  // 处理评估提交
  const handleEvaluate = async evaluationType => {
    try {
      const selectedModel = evaluationType.startsWith('best_')
        ? evaluationType.replace('best_', '')
        : null;

      // 计算分数
      let modelAScore = 0;
      let modelBScore = 0;
      let modelCScore = 0;
      let finalEvaluationType = evaluationType;
      let finalSelectedModel = selectedModel;

      if (evaluationType.startsWith('best_')) {
        // 选择最好的得100分
        finalEvaluationType = 'best';
        finalSelectedModel = evaluationType.replace('best_', '');
        if (finalSelectedModel === 'A') modelAScore = 100;
        else if (finalSelectedModel === 'B') modelBScore = 100;
        else if (finalSelectedModel === 'C') modelCScore = 100;
      } else if (evaluationType === 'tie') {
        // 平局所有模型记50分
        modelAScore = 50;
        modelBScore = 50;
        modelCScore = 50;
      } else if (evaluationType === 'all_bad') {
        // 都不好所有模型得0分
        modelAScore = 0;
        modelBScore = 0;
        modelCScore = 0;
      }

      // 保存评估结果
      await axios.post(`/api/projects/${projectId}/model-evaluation`, {
        userQuestion: lastUserQuestion,
        modelMapping: JSON.stringify(modelMapping),
        conversations: JSON.stringify(lastConversations),
        evaluationType: finalEvaluationType,
        selectedModel: finalSelectedModel,
        modelAScore,
        modelBScore,
        modelCScore,
        modelAId: modelMapping.A || '',
        modelBId: modelMapping.B || null,
        modelCId: modelMapping.C || null
      });

      toast.success(t('playground.evaluation.success', '评估已保存'));
    } catch (error) {
      console.error('保存评估失败:', error);
      toast.error(t('playground.evaluation.error', '保存评估失败'));
      throw error;
    }
  };

  return (
    <Box sx={styles.container}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          {t('playground.title')}
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<AssessmentIcon />}
            onClick={() => setScoreViewOpen(true)}
            sx={{ mr: 1 }}
          >
            {t('playground.viewScores', '查看评分')}
          </Button>
          {selectedModels.length > 1 && allModelsResponded() && (
            <Button
              variant="contained"
              startIcon={<StarIcon />}
              onClick={() => {
                // 找到最后一条用户消息
                let lastUserMsg = null;
                let maxIndex = -1;
                
                selectedModels.forEach(modelId => {
                  const conversation = conversations[modelId] || [];
                  conversation.forEach((msg, index) => {
                    if (msg.role === 'user' && index > maxIndex) {
                      maxIndex = index;
                      lastUserMsg = msg;
                    }
                  });
                });
                
                if (lastUserMsg) {
                  let question = '';
                  if (typeof lastUserMsg.content === 'string') {
                    question = lastUserMsg.content;
                  } else if (Array.isArray(lastUserMsg.content)) {
                    const textItem = lastUserMsg.content.find(item => item.type === 'text');
                    question = textItem?.text || '';
                  }
                  
                  if (question) {
                    setLastUserQuestion(question);
                    setLastConversations(conversations);
                    setEvaluationDialogOpen(true);
                  }
                }
              }}
            >
              {t('playground.evaluate', '评估回答')}
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={2} sx={styles.mainPaper}>
        <PlaygroundHeader
          availableModels={availableModels}
          selectedModels={selectedModels}
          handleModelSelection={handleModelSelection}
          handleClearConversations={() => {
            handleClearConversations();
            // 清空已处理的对话记录
            processedConversationRef.current.clear();
          }}
          conversations={conversations}
          outputMode={outputMode}
          handleOutputModeChange={handleOutputModeChange}
        />

        <ChatArea
          selectedModels={selectedModels}
          conversations={conversations}
          loading={loading}
          getModelName={getModelName}
          useAnonymousNames={useAnonymousNames}
        />

        <MessageInput
          userInput={userInput}
          handleInputChange={handleInputChange}
          handleSendMessage={handleSendMessage}
          loading={loading}
          selectedModels={selectedModels}
          uploadedImage={uploadedImage}
          handleImageUpload={handleImageUpload}
          handleRemoveImage={handleRemoveImage}
          availableModels={availableModels}
        />
      </Paper>

      <ModelEvaluationDialog
        open={evaluationDialogOpen}
        onClose={() => setEvaluationDialogOpen(false)}
        modelMapping={modelMapping}
        availableModels={availableModels}
        userQuestion={lastUserQuestion}
        conversations={lastConversations}
        onEvaluate={handleEvaluate}
        projectId={projectId}
      />

      <ModelScoreView
        open={scoreViewOpen}
        onClose={() => setScoreViewOpen(false)}
        projectId={projectId}
        availableModels={availableModels}
      />
    </Box>
  );
}
