import React, { useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { chatApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDateTime, truncate } from '../../utils/format';
import {
  EmptyState,
  ErrorState,
  Screen,
  SkeletonList
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function getId(item) {
  return item?.id || item?._id || item?.conversationId;
}

function ConversationCard({ conv, colors, onPress, onDelete }) {
  const convId = getId(conv);
  const lastMsg =
    conv?.lastMessage?.content ||
    conv?.lastMessage?.message ||
    conv?.preview ||
    conv?.title ||
    '—';
  const updatedAt = conv?.updatedAt || conv?.lastMessage?.createdAt || conv?.createdAt;
  const msgCount = conv?.messageCount ?? conv?.count;

  return (
    <TouchableOpacity
      accessibilityLabel={`Open conversation: ${truncate(lastMsg, 40)}`}
      accessibilityRole="button"
      onPress={() => onPress(convId)}
      onLongPress={() => onDelete(conv)}
      delayLongPress={600}
      style={[
        styles.convCard,
        { borderColor: colors.border, backgroundColor: colors.surface }
      ]}
    >
      <View style={styles.convMain}>
        <Text style={[styles.convPreview, { color: colors.text }]} numberOfLines={2}>
          {truncate(lastMsg, 80)}
        </Text>
        <View style={styles.convMeta}>
          {updatedAt ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {formatDateTime(updatedAt)}
            </Text>
          ) : null}
          {msgCount != null ? (
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {msgCount} message{msgCount !== 1 ? 's' : ''}
            </Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity
        accessibilityLabel="Delete conversation"
        accessibilityRole="button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        onPress={() => onDelete(conv)}
        style={styles.deleteBtn}
      >
        <Text style={[styles.deleteTxt, { color: colors.danger }]}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function ConversationsScreen({ navigation }) {
  const { colors } = useTheme();

  const {
    data,
    loading,
    error,
    refetch,
    refreshing,
    onRefresh
  } = useApi(() => chatApi.conversations(), []);

  const removeMut = useMutation((id) => chatApi.removeConversation(id));

  const conversations = data?.conversations ||
    data?.data?.conversations ||
    (Array.isArray(data) ? data : []);

  function openConversation(convId) {
    navigation.navigate('Assistant', { conversationId: convId });
  }

  function confirmDelete(conv) {
    const convId = getId(conv);
    Alert.alert(
      'Delete conversation',
      'This conversation and all its messages will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMut.mutate(convId);
              refetch().catch(() => {});
            } catch {
              // removeMut.error surfaces in the banner below
            }
          }
        }
      ]
    );
  }

  if (loading) {
    return <Screen><SkeletonList count={6} /></Screen>;
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message={error?.message} onRetry={refetch} />
      </Screen>
    );
  }

  if (!conversations.length) {
    return (
      <Screen>
        <EmptyState
          title="No conversations yet"
          message="Start a conversation with the AI assistant to see it here."
          actionLabel="New conversation"
          onAction={() => navigation.navigate('Assistant')}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.text }]}>Conversations</Text>

        {removeMut.error ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {removeMut.error.message}
          </Text>
        ) : null}

        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Long-press or tap ✕ to delete a conversation.
        </Text>

        {conversations.map((conv) => (
          <ConversationCard
            key={getId(conv)}
            conv={conv}
            colors={colors}
            onPress={openConversation}
            onDelete={confirmDelete}
          />
        ))}

        <TouchableOpacity
          accessibilityLabel="Start new conversation"
          accessibilityRole="button"
          onPress={() => navigation.navigate('Assistant')}
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.newBtnText, { color: colors.onPrimary }]}>
            + New conversation
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl
  },
  title: {
    ...typography.title
  },
  hint: {
    ...typography.caption
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  convMain: {
    flex: 1,
    gap: spacing.xs
  },
  convPreview: {
    ...typography.body
  },
  convMeta: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap'
  },
  deleteBtn: {
    minHeight: HIT_TARGET,
    minWidth: HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteTxt: {
    ...typography.bodyStrong
  },
  newBtn: {
    minHeight: HIT_TARGET,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md
  },
  newBtnText: {
    ...typography.bodyStrong
  },
  errorText: {
    ...typography.caption,
    textAlign: 'center'
  },
  meta: {
    ...typography.caption
  }
});
