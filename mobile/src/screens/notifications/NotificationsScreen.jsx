import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { notificationsApi } from '../../api/endpoints';
import { useTheme } from '../../contexts/ThemeContext';
import { useApi, useMutation } from '../../hooks/useApi';
import {
  Chip,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonList,
} from '../../components/ui';
import { relativeTime, titleCase } from '../../utils/format';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

const FILTERS = [
  { label: 'All', params: {} },
  { label: 'Unread', params: { isRead: false } },
];

const ICON_MAP = {
  emi: 'calendar-check',
  budget: 'piggy-bank',
  bill: 'receipt',
  transaction: 'swap-horizontal',
  goal: 'flag',
  security: 'shield-alert',
  info: 'information',
};

function listFrom(value) {
  return value?.notifications || value?.items || value?.data || [];
}

export default function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [filterIndex, setFilterIndex] = useState(0);

  const { params } = FILTERS[filterIndex];

  const notifApi = useApi(
    () => notificationsApi.list({ ...params, limit: 50 }),
    [filterIndex],
  );
  const countApi = useApi(() => notificationsApi.unreadCount(), []);

  const markRead = useMutation((id) => notificationsApi.markRead(id));
  const markAllRead = useMutation(() => notificationsApi.markAllRead());
  const archiveMut = useMutation((id) => notificationsApi.archive(id));
  const removeMut = useMutation((id) => notificationsApi.remove(id));

  const items = listFrom(notifApi.data);
  const unreadCount = countApi.data?.count ?? 0;

  const handlePress = useCallback(
    async (item) => {
      if (item.isRead) return;
      try {
        await markRead.mutate(item.id || item._id);
        notifApi.refetch();
        countApi.refetch();
      } catch {
        /* error tracked in markRead.error */
      }
    },
    [markRead, notifApi, countApi],
  );

  const handleMarkAll = useCallback(async () => {
    try {
      await markAllRead.mutate();
      notifApi.refetch();
      countApi.refetch();
    } catch {
      /* error tracked in markAllRead.error */
    }
  }, [markAllRead, notifApi, countApi]);

  function showActions(item) {
    Alert.alert(
      item.title || 'Notification',
      undefined,
      [
        {
          text: 'Archive',
          onPress: () =>
            Alert.alert(
              'Archive notification?',
              'It will be hidden from this list.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Archive',
                  onPress: async () => {
                    try {
                      await archiveMut.mutate(item.id || item._id);
                      notifApi.refetch();
                    } catch {
                      /* error tracked in archiveMut.error */
                    }
                  },
                },
              ],
            ),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Delete notification?',
              'This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await removeMut.mutate(item.id || item._id);
                      notifApi.refetch();
                      countApi.refetch();
                    } catch {
                      /* error tracked in removeMut.error */
                    }
                  },
                },
              ],
            ),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  function renderItem({ item }) {
    const isRead = item.isRead;
    const iconName =
      ICON_MAP[String(item.type || '').toLowerCase()] ||
      ICON_MAP[String(item.category || '').toLowerCase()] ||
      'bell-outline';
    const priorityColor =
      item.priority === 'high'
        ? colors.danger
        : item.priority === 'medium'
          ? colors.warning
          : colors.textMuted;

    return (
      <Pressable
        style={[styles.row, !isRead && styles.rowUnread]}
        onPress={() => handlePress(item)}
        onLongPress={() => showActions(item)}
        accessibilityRole="button"
        accessibilityLabel={
          `${isRead ? '' : 'Unread: '}${item.title || 'Notification'}`
        }
      >
        <View style={[styles.iconWrap, { backgroundColor: `${priorityColor}22` }]}>
          <Icon name={iconName} size={20} color={priorityColor} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text
              style={[styles.rowTitle, !isRead && styles.titleStrong]}
              numberOfLines={1}
            >
              {item.title || 'Notification'}
            </Text>
            {!isRead && (
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            )}
          </View>
          {item.message ? (
            <Text style={styles.rowMsg} numberOfLines={2}>
              {item.message}
            </Text>
          ) : null}
          <Text style={styles.rowTime}>{relativeTime(item.createdAt)}</Text>
        </View>
      </Pressable>
    );
  }

  if (notifApi.loading && !items.length) {
    return (
      <Screen>
        <SkeletonList count={8} />
      </Screen>
    );
  }

  if (notifApi.error && !items.length) {
    return (
      <Screen>
        <ErrorState
          message={notifApi.error.message}
          onRetry={notifApi.refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {notifApi.fromCache && (
        <Text style={[styles.staleNote, { color: colors.warning }]}>
          Showing saved data · pull to refresh
        </Text>
      )}
      <View style={styles.toolbar}>
        <View style={styles.chipRow}>
          {FILTERS.map((f, i) => (
            <Chip
              key={f.label}
              label={f.label}
              selected={filterIndex === i}
              onPress={() => setFilterIndex(i)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${f.label.toLowerCase()} notifications`}
            />
          ))}
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={handleMarkAll}
            style={styles.markAllBtn}
            accessibilityRole="button"
            accessibilityLabel="Mark all notifications as read"
          >
            <Text style={[styles.markAllText, { color: colors.primary }]}>
              Mark all read
            </Text>
          </Pressable>
        )}
        {markAllRead.error ? (
          <Text style={[styles.errNote, { color: colors.danger }]}>
            {markAllRead.error.message}
          </Text>
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id || item._id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={notifApi.refreshing}
            onRefresh={notifApi.onRefresh}
          />
        }
        ListEmptyComponent={(
          <EmptyState
            title="No notifications"
            message={
              filterIndex === 1
                ? 'All caught up — no unread notifications.'
                : 'No notifications yet.'
            }
          />
        )}
        contentContainerStyle={styles.list}
      />
    </Screen>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    staleNote: {
      ...typography.micro,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    toolbar: { gap: spacing.sm, marginBottom: spacing.md },
    chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    badge: {
      borderRadius: radii.pill,
      minWidth: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
    },
    badgeText: { ...typography.micro, color: '#fff' },
    markAllBtn: {
      alignSelf: 'flex-end',
      minHeight: HIT_TARGET,
      justifyContent: 'center',
    },
    markAllText: { ...typography.caption, fontWeight: '600' },
    errNote: { ...typography.caption, textAlign: 'center' },
    list: { gap: spacing.sm, paddingBottom: 32 },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowUnread: { borderColor: colors.primary },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1, gap: spacing.xs },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    rowTitle: { ...typography.body, color: colors.text, flex: 1 },
    titleStrong: { ...typography.bodyStrong },
    dot: { width: 8, height: 8, borderRadius: radii.pill },
    rowMsg: { ...typography.caption, color: colors.textMuted },
    rowTime: { ...typography.micro, color: colors.textFaint },
  });
