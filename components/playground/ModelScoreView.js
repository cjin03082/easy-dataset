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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  TableSortLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const ModelScoreView = ({ open, onClose, projectId, availableModels }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [modelDetails, setModelDetails] = useState([]);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });

  // 获取模型真实名称
  const getModelRealName = modelId => {
    const model = availableModels.find(m => m.id === modelId);
    return model ? `${model.providerName}: ${model.modelName}` : modelId;
  };

  // 加载评分数据
  useEffect(() => {
    if (open && projectId) {
      loadScores();
    }
  }, [open, projectId]);

  const loadScores = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/projects/${projectId}/model-scores`);
      setScores(response.data.data || []);
    } catch (error) {
      console.error('加载评分数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载模型详细评分
  const loadModelDetails = async modelId => {
    if (selectedModel === modelId && modelDetails.length > 0) {
      setSelectedModel(null);
      setModelDetails([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/api/projects/${projectId}/model-scores/${modelId}`);
      setModelDetails(response.data.data || []);
      setSelectedModel(modelId);
    } catch (error) {
      console.error('加载模型详细评分失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理排序
  const handleSort = field => {
    setSortConfig(prev => {
      if (prev.field === field) {
        // 如果点击同一列，切换排序方向
        return {
          field,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      } else {
        // 如果点击不同列，设置为新列，默认升序
        return {
          field,
          direction: 'asc'
        };
      }
    });
  };

  // 排序后的数据
  const sortedScores = React.useMemo(() => {
    if (!sortConfig.field) return scores;

    return [...scores].sort((a, b) => {
      let aValue, bValue;

      if (sortConfig.field === 'totalScore') {
        aValue = a.score || 0;
        bValue = b.score || 0;
      } else if (sortConfig.field === 'averageScore') {
        const aCount = a.evaluations?.length || 0;
        const bCount = b.evaluations?.length || 0;
        aValue = aCount > 0 ? (a.score || 0) / aCount : 0;
        bValue = bCount > 0 ? (b.score || 0) / bCount : 0;
      } else {
        return 0;
      }

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  }, [scores, sortConfig]);

  // 获取所有唯一的模型ID（使用排序后的数据）
  const uniqueModelIds = sortedScores.map(score => score.modelId);

  // 统计每个模型的评估次数
  const getEvaluationCount = modelId => {
    const scoreItem = sortedScores.find(score => score.modelId === modelId);
    return scoreItem ? (scoreItem.evaluations?.length || 0) : 0;
  };

  // 获取总分（累加分数）
  const getTotalScore = modelId => {
    const scoreItem = sortedScores.find(score => score.modelId === modelId);
    return scoreItem ? (scoreItem.score || 0) : 0;
  };

  // 获取平均分
  const getAverageScore = modelId => {
    const scoreItem = sortedScores.find(score => score.modelId === modelId);
    if (!scoreItem) return 0;
    const count = scoreItem.evaluations?.length || 0;
    return count > 0 ? ((scoreItem.score || 0) / count).toFixed(2) : '0.00';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>{t('playground.scores.title', '模型评分结果')}</DialogTitle>
      <DialogContent>
        {loading && scores.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : scores.length === 0 ? (
          <Alert severity="info">{t('playground.scores.noData', '暂无评分数据')}</Alert>
        ) : (
          <>
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <strong>{t('playground.scores.modelName', '模型名称')}</strong>
                    </TableCell>
                    <TableCell align="right" sortDirection={sortConfig.field === 'totalScore' ? sortConfig.direction : false}>
                      <TableSortLabel
                        active={sortConfig.field === 'totalScore'}
                        direction={sortConfig.field === 'totalScore' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('totalScore')}
                      >
                        <strong>{t('playground.scores.totalScore', '总分')}</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{t('playground.scores.evaluationCount', '评估次数')}</strong>
                    </TableCell>
                    <TableCell align="right" sortDirection={sortConfig.field === 'averageScore' ? sortConfig.direction : false}>
                      <TableSortLabel
                        active={sortConfig.field === 'averageScore'}
                        direction={sortConfig.field === 'averageScore' ? sortConfig.direction : 'asc'}
                        onClick={() => handleSort('averageScore')}
                      >
                        <strong>{t('playground.scores.averageScore', '平均分')}</strong>
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">
                      <strong>{t('playground.scores.actions', '操作')}</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {uniqueModelIds.map(modelId => {
                    const totalScore = getTotalScore(modelId);
                    const count = getEvaluationCount(modelId);
                    const averageScore = getAverageScore(modelId);

                    return (
                      <TableRow key={modelId} hover>
                        <TableCell>{getModelRealName(modelId)}</TableCell>
                        <TableCell align="right">
                          <Chip label={totalScore} color="primary" />
                        </TableCell>
                        <TableCell align="right">{count}</TableCell>
                        <TableCell align="right">
                          <Chip label={averageScore} color="secondary" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => loadModelDetails(modelId)}
                          >
                            {selectedModel === modelId
                              ? t('playground.scores.hideDetails', '隐藏详情')
                              : t('playground.scores.showDetails', '查看详情')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {selectedModel && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {t('playground.scores.details', '详细评分记录')} - {getModelRealName(selectedModel)}
                </Typography>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <Box>
                    {modelDetails.map((detail, index) => {
                      const mapping = JSON.parse(detail.modelMapping || '{}');
                      const modelLabel = Object.keys(mapping).find(
                        key => mapping[key] === selectedModel
                      );
                      // 解析对话内容
                      const conversations = detail.conversations 
                        ? (typeof detail.conversations === 'string' 
                            ? JSON.parse(detail.conversations) 
                            : detail.conversations)
                        : {};

                      return (
                        <Accordion key={index}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                              <Typography variant="subtitle2">
                                {t('playground.scores.session', '评估会话')} #{index + 1}
                              </Typography>
                              <Chip
                                label={`${t('playground.scores.score', '得分')}: ${detail.score}`}
                                color="primary"
                                size="small"
                              />
                              <Typography variant="caption" color="textSecondary">
                                {new Date(detail.createAt).toLocaleString()}
                              </Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box>
                              <Typography variant="subtitle2" gutterBottom>
                                {t('playground.scores.userQuestion', '用户问题')}:
                              </Typography>
                              <Paper sx={{ p: 1, mb: 2, bgcolor: 'background.default' }}>
                                <Typography variant="body2">{detail.userQuestion}</Typography>
                              </Paper>

                              <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                {t('playground.scores.modelAnswers', '模型回答')}:
                              </Typography>
                              <Box sx={{ mb: 2 }}>
                                {Object.entries(mapping).map(([label, modelId]) => {
                                  const modelConversation = conversations[modelId] || [];
                                  const lastMessage = modelConversation[modelConversation.length - 1];
                                  let answer = '';
                                  
                                  if (lastMessage?.content) {
                                    if (typeof lastMessage.content === 'string') {
                                      answer = lastMessage.content;
                                    } else if (Array.isArray(lastMessage.content)) {
                                      const textItem = lastMessage.content.find(item => item.type === 'text');
                                      answer = textItem?.text || '';
                                    }
                                  }

                                  return (
                                    <Paper key={label} sx={{ p: 2, mb: 1, bgcolor: 'background.default' }}>
                                      <Typography variant="subtitle2" gutterBottom>
                                        模型{label} {modelId === selectedModel && '(当前模型)'}
                                      </Typography>
                                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {answer || t('playground.evaluation.noAnswer', '暂无回答')}
                                      </Typography>
                                    </Paper>
                                  );
                                })}
                              </Box>

                              <Typography variant="subtitle2" gutterBottom>
                                {t('playground.scores.evaluationResult', '评估结果')}:
                              </Typography>
                              <Box sx={{ mb: 2 }}>
                                <Chip
                                  label={
                                    detail.evaluationType === 'best'
                                      ? `${t('playground.scores.best', '最佳')}: 模型${modelLabel}`
                                      : detail.evaluationType === 'tie'
                                        ? t('playground.scores.tie', '平局')
                                        : t('playground.scores.allBad', '都不好')
                                  }
                                  color={
                                    detail.evaluationType === 'best'
                                      ? 'success'
                                      : detail.evaluationType === 'tie'
                                        ? 'warning'
                                        : 'error'
                                  }
                                />
                              </Box>

                              <Typography variant="subtitle2" gutterBottom>
                                {t('playground.scores.modelMapping', '模型映射')}:
                              </Typography>
                              <Box>
                                {Object.entries(mapping).map(([label, id]) => (
                                  <Typography key={label} variant="body2">
                                    模型{label}: {getModelRealName(id)}
                                  </Typography>
                                ))}
                              </Box>
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close', '关闭')}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModelScoreView;

