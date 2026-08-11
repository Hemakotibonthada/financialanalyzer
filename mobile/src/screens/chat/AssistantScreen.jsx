import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView
} from 'react-native';

import { chatApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDateTime } from '../../utils/format';
import {
  ErrorState,
  Input,
  Screen,
  SkeletonList
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function MessageBubble({ message, colors }) {
  const isUser = message?.role === 'user';
  const content = message?.content || message?.message || '';
  const timestamp = message?.createdAt || message?.timestamp;

  return (
    <View style={[styles.bubbleWrap, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.primary : colors.surfaceAlt,
            borderColor: isUser ? colors.primary : colors.border
          }
        ]}
      >
        <Text style={[styles.bubbleText, { color: isUser ? colors.onPrimary : colors.text }]}>
          {content}
        </Text>
        {timestamp ? (
          <Text
            style={[
              styles.timestamp,
              { color: isUser ? colors.onPrimary : colors.textMuted, opacity: 0.7 }
            ]}
          >
            {formatDateTime(timestamp)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function SuggestionChip({ label, colors, onPress }) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => onPress(label)}
      style={[
        styles.chip,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border }
      ]}
    >
      <Text style={[styles.chipText, { color: colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AssistantScreen({ route }) {
  const initialConversationId = route?.params?.conversationId || null;
  const { colors } = useTheme();
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);

  // Load suggestions (shown when conversation is empty)
  const { data: suggestionsData, loading: sugLoading } = useApi(
    () => chatApi.suggestions(),
    []
  );

  const suggestions = Array.isArray(suggestionsData) ? suggestionsData : [];

  // If we have an initial conversation, load its messages
  const { data: historyData, loading: histLoading, error: histError } = useApi(
    () =>
      initialConversationId
        ? chatApi.conversation(initialConversationId)
        : Promise.resolve(null),
    [initialConversationId]
  );

  useEffect(() => {
    if (!histLoading && historyData) {
      const msgs = Array.isArray(historyData)
        ? historyData
        : historyData?.messages || historyData?.data || [];
      setMessages(msgs);
    }
  }, [historyData, histLoading]);

  const sendMut = useMutation((msg, convId) => chatApi.send(msg, convId));

  async function sendMessage(text) {
    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed) return;

    setInputText('');

    // Optimistic: show the user message immediately
    const optimisticUserMsg = {
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
      _optimistic: true
    };
    setMessages((prev) => [...prev, optimisticUserMsg]);

    try {
      const result = await sendMut.mutate(trimmed, conversationId || undefined);
      // result = { conversationId, userMessage, assistantMessage }
      const convId = result?.conversationId || result?.data?.conversationId;
      const userMsg = result?.userMessage || result?.data?.userMessage;
      const assistantMsg = result?.assistantMessage || result?.data?.assistantMessage;

      if (convId && !conversationId) {
        setConversationId(convId);
      }

      setMessages((prev) => {
        // Replace the optimistic user message with the real one (if available)
        const without = prev.filter((m) => !m._optimistic);
        if (userMsg) return [...without, userMsg, assistantMsg].filter(Boolean);
        // If the server didn't echo the user message, keep our optimistic one
        return [...prev.filter((m) => !m._optimistic), optimisticUserMsg,
          assistantMsg].filter(Boolean);
      });
    } catch {
      // sendMut.error is already set; remove the optimistic user message
      setMessages((prev) => prev.filter((m) => !m._optimistic));
    }
  }

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  if (histLoading) {
    return <Screen><SkeletonList count={4} /></Screen>;
  }

  if (histError) {
    return (
      <Screen>
        <ErrorState message={histError?.message} />
      </Screen>
    );
  }

  const showSuggestions = messages.length === 0 && suggestions.length > 0;

  return (
    <Screen style={styles.screenNopad}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {/* Message list */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) =>
            item?.id || item?._id || item?.createdAt || String(index)
          }
          renderItem={({ item }) => (
            <MessageBubble message={item} colors={colors} />
          )}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            !sugLoading ? (
              <View style={styles.emptyChatWrap}>
                <Text style={[styles.emptyChatText, { color: colors.textMuted }]}>
                  Ask anything about your finances.
                </Text>
              </View>
            ) : null
          }
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* Suggestions */}
        {showSuggestions && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionRow}
            style={styles.suggestionScroll}
          >
            {suggestions.map((s, i) => (
              <SuggestionChip
                key={i}
                label={s}
                colors={colors}
                onPress={sendMessage}
              />
            ))}
          </ScrollView>
        )}

        {/* Error from last send */}
        {sendMut.error ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {sendMut.error.message}
          </Text>
        ) : null}

        {/* Input bar */}
        <View
          style={[
            styles.inputRow,
            { borderTopColor: colors.border, backgroundColor: colors.surface }
          ]}
        >
          <View style={styles.inputWrap}>
            <Input
              value={inputText}
              onChangeText={setInputText}
              accessibilityLabel="Message input"
              multiline
              style={styles.textInput}
            />
          </View>
          <TouchableOpacity
            accessibilityLabel="Send message"
            accessibilityRole="button"
            onPress={() => sendMessage(inputText)}
            disabled={sendMut.loading || !inputText.trim()}
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  sendMut.loading || !inputText.trim()
                    ? colors.border
                    : colors.primary
              }
            ]}
          >
            <Text
              style={[
                styles.sendBtnText,
                {
                  color:
                    sendMut.loading || !inputText.trim()
                      ? colors.textMuted
                      : colors.onPrimary
                }
              ]}
            >
              {sendMut.loading ? '…' : '↑'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenNopad: {
    flex: 1,
    padding: 0
  },
  kav: {
    flex: 1
  },
  messageList: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  bubbleWrap: {
    marginVertical: spacing.xs
  },
  bubbleLeft: {
    alignItems: 'flex-start'
  },
  bubbleRight: {
    alignItems: 'flex-end'
  },
  bubble: {
    maxWidth: '80%',
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.xs
  },
  bubbleText: {
    ...typography.body
  },
  timestamp: {
    ...typography.micro
  },
  emptyChatWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xxxl
  },
  emptyChatText: {
    ...typography.body
  },
  suggestionScroll: {
    maxHeight: 60,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  suggestionRow: {
    gap: spacing.sm,
    padding: spacing.md
  },
  chip: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chipText: {
    ...typography.caption
  },
  errorText: {
    ...typography.caption,
    textAlign: 'center',
    padding: spacing.sm
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    padding: spacing.md
  },
  inputWrap: {
    flex: 1
  },
  textInput: {
    maxHeight: 120
  },
  sendBtn: {
    width: HIT_TARGET,
    height: HIT_TARGET,
    borderRadius: HIT_TARGET / 2,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtnText: {
    ...typography.heading
  }
});
