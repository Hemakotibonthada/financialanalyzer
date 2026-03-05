// ============================================================================
// AI FINANCIAL CHATBOT — Enhanced Conversational AI Component
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, IconButton, Avatar, Chip,
  Fade, CircularProgress, Tooltip, Button, Divider, Card, CardContent,
  List, ListItem, ListItemButton, ListItemText, Collapse
} from '@mui/material';
import {
  Send, SmartToy, Person, Psychology, ContentCopy, ThumbUp,
  ThumbDown, ExpandMore, ExpandLess, Refresh, Close,
  AutoAwesome, Mic, TrendingUp, AccountBalance, Savings,
  Assessment, ShowChart
} from '@mui/icons-material';
import { useAIChat, useAIFeedback } from '../hooks/useAIFeatures';

// ============================================================================
// §1  MESSAGE BUBBLE
// ============================================================================

function MessageBubble({ message, onFeedback }) {
  const [showDetails, setShowDetails] = useState(false);
  const isUser = message.role === 'user';

  const intentIcons = {
    spending_query: <TrendingUp fontSize="small" />,
    budget_query: <AccountBalance fontSize="small" />,
    savings_query: <Savings fontSize="small" />,
    investment_query: <ShowChart fontSize="small" />,
    health_query: <Assessment fontSize="small" />,
    forecast_query: <Psychology fontSize="small" />
  };

  return (
    <Fade in timeout={300}>
      <Box sx={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        mb: 2,
        px: 1
      }}>
        <Box sx={{
          display: 'flex',
          flexDirection: isUser ? 'row-reverse' : 'row',
          gap: 1,
          maxWidth: '85%'
        }}>
          <Avatar sx={{
            width: 36, height: 36,
            bgcolor: isUser ? 'primary.main' : 'secondary.main',
            mt: 0.5
          }}>
            {isUser ? <Person fontSize="small" /> : <SmartToy fontSize="small" />}
          </Avatar>

          <Box>
            <Paper elevation={1} sx={{
              p: 2,
              borderRadius: 2,
              borderTopLeftRadius: isUser ? 16 : 4,
              borderTopRightRadius: isUser ? 4 : 16,
              bgcolor: isUser ? 'primary.main' : 'background.paper',
              color: isUser ? 'primary.contrastText' : 'text.primary',
              minWidth: 100
            }}>
              <Typography variant="body2" sx={{
                whiteSpace: 'pre-wrap',
                '& strong, & b': { fontWeight: 700 },
                lineHeight: 1.6
              }}>
                {message.content}
              </Typography>
            </Paper>

            {/* Metadata row */}
            {!isUser && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                {message.intent && message.intent !== 'unknown' && (
                  <Chip
                    icon={intentIcons[message.intent] || <Psychology fontSize="small" />}
                    label={message.intent.replace(/_/g, ' ')}
                    size="small"
                    variant="outlined"
                    sx={{ height: 22, fontSize: '0.7rem' }}
                  />
                )}
                {message.confidence > 0 && (
                  <Chip
                    label={`${(message.confidence * 100).toFixed(0)}%`}
                    size="small"
                    color={message.confidence > 0.7 ? 'success' : 'default'}
                    sx={{ height: 22, fontSize: '0.7rem' }}
                  />
                )}

                {/* Feedback buttons */}
                <Tooltip title="Helpful">
                  <IconButton size="small" onClick={() => onFeedback?.(message.id, true)} sx={{ p: 0.25 }}>
                    <ThumbUp sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Not helpful">
                  <IconButton size="small" onClick={() => onFeedback?.(message.id, false)} sx={{ p: 0.25 }}>
                    <ThumbDown sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Copy">
                  <IconButton
                    size="small"
                    onClick={() => navigator.clipboard.writeText(message.content)}
                    sx={{ p: 0.25 }}
                  >
                    <ContentCopy sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>

                {message.entities?.length > 0 && (
                  <IconButton size="small" onClick={() => setShowDetails(!showDetails)} sx={{ p: 0.25 }}>
                    {showDetails ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
                  </IconButton>
                )}
              </Box>
            )}

            {/* Entity details */}
            <Collapse in={showDetails}>
              {message.entities?.length > 0 && (
                <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" fontWeight="bold">Detected Entities:</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {message.entities.map((entity, i) => (
                      <Chip
                        key={i}
                        label={`${entity.type}: ${entity.value}`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Collapse>

            {/* Follow-up prompt */}
            {message.followUp && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontStyle: 'italic' }}>
                {message.followUp}
              </Typography>
            )}

            {/* Suggestions */}
            {message.suggestions?.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {message.suggestions.map((suggestion, i) => (
                  <Chip
                    key={i}
                    label={suggestion}
                    size="small"
                    variant="outlined"
                    color="primary"
                    clickable
                    onClick={() => {
                      // Trigger sending this suggestion as a message
                      const event = new CustomEvent('ai-suggestion', { detail: suggestion });
                      window.dispatchEvent(event);
                    }}
                    sx={{ fontSize: '0.7rem' }}
                  />
                ))}
              </Box>
            )}

            <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Fade>
  );
}

// ============================================================================
// §2  QUICK ACTIONS
// ============================================================================

function QuickActions({ onAction }) {
  const actions = [
    { label: 'How much did I spend this month?', icon: <TrendingUp />, category: 'spending' },
    { label: 'Show my budget status', icon: <AccountBalance />, category: 'budget' },
    { label: 'Financial health check', icon: <Assessment />, category: 'health' },
    { label: 'Investment advice', icon: <ShowChart />, category: 'investment' },
    { label: 'What are my active loans?', icon: <Savings />, category: 'loans' },
    { label: 'Any unusual transactions?', icon: <Psychology />, category: 'anomaly' }
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Quick Actions
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {actions.map((action, i) => (
          <Chip
            key={i}
            icon={action.icon}
            label={action.label}
            variant="outlined"
            color="primary"
            clickable
            onClick={() => onAction(action.label)}
            sx={{ borderRadius: 2 }}
          />
        ))}
      </Box>
    </Box>
  );
}

// ============================================================================
// §3  MAIN CHATBOT COMPONENT
// ============================================================================

export default function EnhancedAIChatbot({ floating = false, onClose }) {
  const { messages, loading, error, conversationMeta, sendMessage, clearMessages } = useAIChat();
  const { submitFeedback } = useAIFeedback();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for suggestion clicks
  useEffect(() => {
    const handler = (e) => {
      setInput(e.detail);
      sendMessage(e.detail);
    };
    window.addEventListener('ai-suggestion', handler);
    return () => window.removeEventListener('ai-suggestion', handler);
  }, [sendMessage]);

  const handleSend = useCallback(() => {
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput('');
  }, [input, loading, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFeedback = (messageId, isPositive) => {
    submitFeedback(`msg_${messageId}`, isPositive);
  };

  const containerSx = floating ? {
    width: 420,
    height: 600,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 3,
    overflow: 'hidden'
  } : {
    height: 'calc(100vh - 120px)',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 900,
    mx: 'auto'
  };

  return (
    <Paper elevation={floating ? 8 : 3} sx={containerSx}>
      {/* Header */}
      <Box sx={{
        p: 2,
        background: 'linear-gradient(135deg, #1976d2 0%, #7c4dff 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 36, height: 36 }}>
            <AutoAwesome fontSize="small" />
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">AI Financial Assistant</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Local AI • {conversationMeta.turnCount || 0} turns
            </Typography>
          </Box>
        </Box>
        <Box>
          <Tooltip title="Clear conversation">
            <IconButton size="small" sx={{ color: 'white' }} onClick={clearMessages}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          {onClose && (
            <IconButton size="small" sx={{ color: 'white' }} onClick={onClose}>
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Messages Area */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        py: 2,
        bgcolor: 'grey.50',
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.300', borderRadius: 3 }
      }}>
        {messages.length === 0 ? (
          <>
            <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
              <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                <SmartToy sx={{ fontSize: 32 }} />
              </Avatar>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Hi! I'm your AI Financial Assistant
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 300, mx: 'auto' }}>
                Ask me about spending, budgets, investments, loans, tax planning, or financial health. I run entirely on your local machine.
              </Typography>
            </Box>
            <QuickActions onAction={(text) => { setInput(text); sendMessage(text); }} />
          </>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onFeedback={handleFeedback}
            />
          ))
        )}

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, mb: 2 }}>
            <Avatar sx={{ width: 36, height: 36, bgcolor: 'secondary.main' }}>
              <SmartToy fontSize="small" />
            </Avatar>
            <Paper elevation={1} sx={{ p: 1.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">Thinking...</Typography>
            </Paper>
          </Box>
        )}

        {error && (
          <Box sx={{ px: 3, mb: 2 }}>
            <Chip label={error} color="error" size="small" onDelete={() => {}} />
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box sx={{
        p: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            ref={inputRef}
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder="Ask me about your finances..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              '&:disabled': { bgcolor: 'grey.300' }
            }}
          >
            <Send fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
          Runs locally • No data sent to external services
        </Typography>
      </Box>
    </Paper>
  );
}
