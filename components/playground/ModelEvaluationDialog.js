'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Paper,
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const ModelEvaluationDialog = ({
  open,
  onClose,
  modelMapping,
  availableModels,
  userQuestion,
  conversations,
  onEvaluate,
  projectId
}) => {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState(null);
  const [showRealNames, setShowRealNames] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  // 当对话框打开时，重置所有状态
  useEffect(() => {
    if (open) {
      setSelectedOption(null);
      setShowRealNames(false);
      setEvaluating(false);
    }
  }, [open]);

  // 获取模型真实名称
  const getModelRealName = modelId => {
    const model = availableModels.find(m => m.id === modelId);
    return model ? `${model.providerName}: ${model.modelName}` : modelId;
  };

  // 获取模型标识（A/B/C）
  const getModelLabel = modelId => {
    for (const [label, id] of Object.entries(modelMapping)) {
      if (id === modelId) return label;
    }
    return null;
  };

  // 处理评估选择
  const handleEvaluate = async () => {
    if (!selectedOption) return;

    setEvaluating(true);
    try {
      await onEvaluate(selectedOption);
      setShowRealNames(true);
      // 延迟关闭对话框，让用户看到真实名称
      setTimeout(() => {
        onClose();
        setSelectedOption(null);
        setShowRealNames(false);
      }, 3000);
    } catch (error) {
      console.error('评估失败:', error);
      setEvaluating(false);
    }
  };

  // 解析模型映射
  const parsedMapping = typeof modelMapping === 'string' ? JSON.parse(modelMapping) : modelMapping;
  const modelLabels = ['A', 'B', 'C'].filter(label => parsedMapping[label]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('playground.evaluation.title', '模型评估')}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            {t('playground.evaluation.userQuestion', '用户问题')}:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="body1">{userQuestion}</Typography>
          </Paper>
        </Box>

        {showRealNames ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              {t('playground.evaluation.realNames', '模型真实名称')}:
            </Typography>
            <Box sx={{ mt: 1 }}>
              {modelLabels.map(label => {
                const modelId = parsedMapping[label];
                const realName = getModelRealName(modelId);
                return (
                  <Typography key={label} variant="body2" sx={{ mb: 0.5 }}>
                    <strong>模型{label}:</strong> {realName}
                  </Typography>
                );
              })}
            </Box>
          </Alert>
        ) : (
          <>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mb: 2 }}>
              {t('playground.evaluation.selectBest', '请选择哪个模型的回答最好')}:
            </Typography>
            <Grid container spacing={2}>
              {modelLabels.map(label => {
                const modelId = parsedMapping[label];
                const modelConversation = conversations[modelId] || [];
                const lastMessage = modelConversation[modelConversation.length - 1];
                let answer = '';
                if (lastMessage?.content) {
                  if (typeof lastMessage.content === 'string') {
                    answer = lastMessage.content;
                  } else if (Array.isArray(lastMessage.content)) {
                    // 处理视觉模型的复合格式
                    const textItem = lastMessage.content.find(item => item.type === 'text');
                    answer = textItem?.text || '';
                  }
                }

                return (
                  <Grid item xs={12} md={12 / modelLabels.length} key={label}>
                    <Paper
                      sx={{
                        p: 2,
                        border: selectedOption === `best_${label}` ? 2 : 1,
                        borderColor: selectedOption === `best_${label}` ? 'primary.main' : 'divider',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={() => setSelectedOption(`best_${label}`)}
                    >
                      <Typography variant="h6" gutterBottom>
                        模型{label}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          maxHeight: '200px',
                          overflow: 'auto',
                          color: 'text.secondary',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {answer || t('playground.evaluation.noAnswer', '暂无回答')}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant={selectedOption === 'tie' ? 'contained' : 'outlined'}
                fullWidth
                onClick={() => setSelectedOption('tie')}
                sx={{ justifyContent: 'flex-start' }}
              >
                {t('playground.evaluation.tie', '平局 - 所有模型表现相当')}
              </Button>
              <Button
                variant={selectedOption === 'all_bad' ? 'contained' : 'outlined'}
                color={selectedOption === 'all_bad' ? 'error' : 'inherit'}
                fullWidth
                onClick={() => setSelectedOption('all_bad')}
                sx={{ justifyContent: 'flex-start' }}
              >
                {t('playground.evaluation.allBad', '都不好 - 所有模型回答都不满意')}
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={evaluating}>
          {showRealNames ? t('common.close', '关闭') : t('common.cancel', '取消')}
        </Button>
        {!showRealNames && (
          <Button
            variant="contained"
            onClick={handleEvaluate}
            disabled={!selectedOption || evaluating}
          >
            {t('playground.evaluation.submit', '提交评估')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ModelEvaluationDialog;

