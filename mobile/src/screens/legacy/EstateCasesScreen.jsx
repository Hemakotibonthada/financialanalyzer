import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { estateApi } from '../../api/endpoints';
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
  SkeletonList,
} from '../../components/ui';
import { spacing, typography } from '../../theme/tokens';

const STATUS_FILTERS = [
  'all',
  'initiated',
  'verification_pending',
  'verified',
  'asset_discovery',
  'claims_in_progress',
  'settlement_pending',
  'disbursed',
  'closed',
  'rejected',
  'revoked',
];

function arr(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.cases)) return data.cases;
  return [];
}

function statusTone(status) {
  if (status === 'verified' || status === 'disbursed' || status === 'closed') {
    return 'success';
  }
  if (status === 'rejected' || status === 'revoked') return 'danger';
  if (status === 'verification_pending' || status === 'awaiting_approval') {
    return 'warning';
  }
  return 'neutral';
}

export default function EstateCasesScreen({ navigation }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState('all');

  const list = useApi(() => estateApi.list(), []);

  const cases = arr(list.data).filter(
    (c) => filter === 'all' || c?.status === filter,
  );

  if (list.loading) {
    return (
      <Screen title="Estate Cases">
        <SkeletonList count={6} />
      </Screen>
    );
  }

  if (list.error) {
    return (
      <Screen title="Estate Cases">
        <ErrorState message={list.error.message} onRetry={list.refetch} />
      </Screen>
    );
  }

  return (
    <Screen
      title="Estate Cases"
      scroll
      refreshing={list.refreshing}
      onRefresh={list.onRefresh}
    >
      {list.fromCache && (
        <View style={[styles.banner, { backgroundColor: colors.warningSoft }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>
            Showing cached data — pull down to refresh.
          </Text>
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
            tone={filter === s ? 'neutral' : statusTone(s)}
            onPress={() => setFilter(s)}
          />
        ))}
      </ScrollView>

      {cases.length === 0 ? (
        <EmptyState
          title="No estate cases"
          description={
            filter === 'all'
              ? 'No estate cases have been opened.'
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
                titleCase(item?.status || '') +
                (item?.approval?.decision === 'pending'
                  ? ' · Awaiting approval'
                  : '')
              }
              right={formatDate(item?.slaDueAt) || ''}
              chevron
              accessibilityLabel={`Open estate case ${item?.caseNumber || ''}`}
              onPress={() =>
                navigation.navigate('EstateCaseDetail', {
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
  chipScroll: {
    marginBottom: spacing.md,
  },
  chips: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
