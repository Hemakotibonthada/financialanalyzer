import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { dormancyApi } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDate, titleCase } from '../../utils/format';
import {
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ListRow,
  Screen,
  SectionHeader,
  SkeletonList,
} from '../../components/ui';
import { spacing, typography } from '../../theme/tokens';

const STATUS_FILTERS = [
  'all',
  'open',
  'in_progress',
  'awaiting_user',
  'awaiting_nominee',
  'awaiting_documents',
  'on_hold',
  'closed_alive',
  'closed_deceased',
  'cancelled',
];

function priorityTone(p) {
  if (p === 'critical') return 'danger';
  if (p === 'high') return 'warning';
  return 'neutral';
}

function arr(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.cases)) return data.cases;
  return [];
}

export default function DormancyCasesScreen({ navigation }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState('all');

  const list = useApi(() => dormancyApi.list(), []);
  const slaResult = useApi(() => dormancyApi.slaBreaches(), []);

  const cases = arr(list.data).filter(
    (c) => filter === 'all' || c?.status === filter || c?.stage === filter,
  );

  const breaches = arr(slaResult.data);

  if (list.loading) {
    return (
      <Screen title="Dormancy Cases">
        <SkeletonList count={6} />
      </Screen>
    );
  }

  if (list.error) {
    return (
      <Screen title="Dormancy Cases">
        <ErrorState
          message={list.error.message}
          onRetry={() => { list.refetch(); slaResult.refetch(); }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Dormancy Cases"
      scroll
      refreshing={list.refreshing}
      onRefresh={() => { list.onRefresh(); slaResult.onRefresh(); }}
    >
      {list.fromCache && (
        <View style={[styles.banner, { backgroundColor: colors.warningSoft }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>
            Showing cached data — pull down to refresh.
          </Text>
        </View>
      )}

      {breaches.length > 0 && (
        <View style={[styles.slaBox, { backgroundColor: colors.dangerSoft }]}>
          <Text style={[styles.slaTitle, { color: colors.danger }]}>
            ⚠ {breaches.length} SLA breach{breaches.length !== 1 ? 'es' : ''} require
            immediate attention
          </Text>
          {breaches.slice(0, 3).map((b, i) => (
            <Text
              key={b?.id || b?._id || i}
              style={[styles.slaLine, { color: colors.danger }]}
            >
              {b?.caseNumber || 'Case'} · {titleCase(b?.status || '')} ·
              Due {formatDate(b?.slaDueAt)}
            </Text>
          ))}
          {breaches.length > 3 && (
            <Text style={[styles.slaLine, { color: colors.danger }]}>
              …and {breaches.length - 3} more
            </Text>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chips}
      >
        {STATUS_FILTERS.map((s) => (
          <Chip
            key={s}
            label={s === 'all' ? 'All' : titleCase(s)}
            selected={filter === s}
            onPress={() => setFilter(s)}
          />
        ))}
      </ScrollView>

      {cases.length === 0 ? (
        <EmptyState
          title="No cases"
          description={
            filter === 'all'
              ? 'No dormancy cases have been opened.'
              : `No cases with status "${titleCase(filter)}".`
          }
        />
      ) : (
        <Card padded={false}>
          {cases.map((item, i) => (
            <ListRow
              key={item?.id || item?._id || i}
              title={item?.caseNumber || 'Untitled case'}
              subtitle={
                `${titleCase(item?.stage || item?.status || '')}` +
                (item?.daysInactiveAtDetection
                  ? ` · ${item.daysInactiveAtDetection}d inactive`
                  : '')
              }
              right={
                item?.priority && item.priority !== 'normal'
                  ? titleCase(item.priority)
                  : formatDate(item?.slaDueAt) || ''
              }
              chevron
              accessibilityLabel={`Open case ${item?.caseNumber || ''}`}
              onPress={() =>
                navigation.navigate('DormancyCaseDetail', {
                  id: item?.id || item?._id,
                })
              }
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 8,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  bannerText: {
    ...typography.caption,
  },
  slaBox: {
    borderRadius: 8,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  slaTitle: {
    ...typography.bodyStrong,
  },
  slaLine: {
    ...typography.caption,
  },
  chipScroll: {
    marginBottom: spacing.md,
  },
  chips: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
