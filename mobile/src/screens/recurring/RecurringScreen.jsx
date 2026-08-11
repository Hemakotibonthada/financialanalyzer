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

import { recurringApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMoney, formatDate, titleCase } from '../../utils/format';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Screen,
  Sheet,
  SkeletonList,
  StatTile
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

const TABS = ['Detected', 'Upcoming', 'Statistics'];

function getId(item) {
  return item?.id || item?._id;
}

function PatternRow({ pattern, colors, onPress, onConfirm, confirmLoading }) {
  const amount = Number(pattern?.averageAmount ?? pattern?.amount ?? 0);
  const confidence = Number(pattern?.confidence ?? 0);
  const desc =
    pattern?.merchantName || pattern?.merchant || pattern?.description || '—';
  const freq = titleCase(pattern?.frequency || pattern?.patternType || '');

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <TouchableOpacity
        accessibilityLabel={`View pattern detail: ${desc}`}
        accessibilityRole="button"
        onPress={onPress}
        style={styles.cardPressable}
      >
        <View style={styles.rowTop}>
          <Text
            style={[styles.rowTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {desc}
          </Text>
          <Text style={[styles.rowAmount, { color: colors.text }]}>
            {formatMoney(amount)}
          </Text>
        </View>
        <View style={styles.rowBottom}>
          <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{freq}</Text>
          <Text
            style={[
              styles.rowConfidence,
              { color: confidence >= 70 ? colors.success : colors.textMuted }
            ]}
          >
            {confidence}% confidence
          </Text>
        </View>
      </TouchableOpacity>
      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <Button
          title={confirmLoading ? 'Confirming…' : 'Confirm recurring'}
          size="sm"
          variant="secondary"
          onPress={onConfirm}
          accessibilityLabel={`Confirm ${desc} as recurring`}
          loading={confirmLoading}
        />
      </View>
    </View>
  );
}

function PredictionRow({ prediction, colors }) {
  const amount = Number(prediction?.expectedAmount ?? prediction?.amount ?? 0);
  const date = formatDate(prediction?.predictedDate ?? prediction?.date);
  const desc =
    prediction?.merchantName || prediction?.merchant || prediction?.description || '—';

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <View style={styles.cardPressable}>
        <View style={styles.rowTop}>
          <Text
            style={[styles.rowTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {desc}
          </Text>
          <Text style={[styles.rowAmount, { color: colors.text }]}>
            {formatMoney(amount)}
          </Text>
        </View>
        <Text style={[styles.rowMeta, { color: colors.textMuted }]}>
          Expected: {date}
        </Text>
      </View>
    </View>
  );
}

function PatternDetailSheet({ visible, onClose, pattern, colors }) {
  if (!pattern) return null;
  const amount = Number(pattern?.averageAmount ?? pattern?.amount ?? 0);
  const txns = Array.isArray(pattern?.transactions)
    ? pattern.transactions
    : [];

  return (
    <Sheet visible={visible} onClose={onClose} title="Pattern detail">
      <ScrollView contentContainerStyle={styles.sheetBody}>
        <Text style={[styles.sheetHeading, { color: colors.text }]}>
          {pattern?.merchantName || pattern?.merchant || '—'}
        </Text>
        <View style={styles.statGrid}>
          <StatTile label="Average" value={formatMoney(amount)} />
          <StatTile
            label="Frequency"
            value={titleCase(pattern?.frequency || pattern?.patternType || '—')}
          />
          <StatTile
            label="Confidence"
            value={`${pattern?.confidence ?? 0}%`}
          />
        </View>
        {txns.length > 0 && (
          <>
            <Text style={[styles.subheading, { color: colors.text }]}>
              Transactions ({txns.length})
            </Text>
            {txns.slice(0, 10).map((t, i) => (
              <View key={t.id || t._id || i} style={styles.txnRow}>
                <Text
                  style={[styles.txnDesc, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {t.description || t.merchant || '—'}
                </Text>
                <Text style={[styles.txnAmount, { color: colors.text }]}>
                  {formatMoney(Number(t.amount ?? 0))}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

export default function RecurringScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState('Detected');
  const [patternSheetOpen, setPatternSheetOpen] = useState(false);
  const [activePattern, setActivePattern] = useState(null);

  const { data, loading, error, refetch, refreshing, onRefresh } = useApi(
    () =>
      Promise.all([
        recurringApi.detect(),
        recurringApi.predictions(),
        recurringApi.statistics()
      ]).then(([det, pred, stats]) => ({
        patterns: det?.patterns || (Array.isArray(det) ? det : []),
        predictions: pred?.predictions || (Array.isArray(pred) ? pred : []),
        statistics: stats || {}
      })),
    []
  );

  const markPattern = useMutation((body) => recurringApi.mark(body));
  const autoCategorize = useMutation(() => recurringApi.autoCategorize({}));
  const loadPattern = useMutation((pid) => recurringApi.pattern(pid));

  const patterns = data?.patterns || [];
  const predictions = data?.predictions || [];
  const statistics = data?.statistics || {};

  async function confirmPattern(pattern) {
    const transactionIds = (pattern?.transactions || [])
      .map((t) => t.id || t._id)
      .filter(Boolean);
    const pid = pattern?.id || pattern?._id;
    const freq = pattern?.frequency || pattern?.patternType || 'monthly';
    try {
      await markPattern.mutate({ transactionIds, patternId: pid, frequency: freq });
      refetch().catch(() => {});
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not confirm pattern.');
    }
  }

  async function runAutoCategorize() {
    try {
      const result = await autoCategorize.mutate();
      const categorized =
        result?.transactionsCategorized ??
        result?.data?.transactionsCategorized ??
        0;
      const found =
        result?.patternsFound ?? result?.data?.patternsFound ?? 0;
      Alert.alert(
        'Auto-categorized',
        `${categorized} transactions categorized across ${found} patterns.`
      );
      refetch().catch(() => {});
    } catch (e) {
      Alert.alert(
        'Auto-categorize failed',
        e?.message || 'Could not auto-categorize.'
      );
    }
  }

  async function openPatternDetail(pattern) {
    const pid = pattern?.id || pattern?._id;
    try {
      const detail = await loadPattern.mutate(pid);
      setActivePattern(detail?.data || detail || pattern);
    } catch {
      setActivePattern(pattern);
    }
    setPatternSheetOpen(true);
  }

  if (loading) return <Screen><SkeletonList count={6} /></Screen>;
  if (error) {
    return <Screen><ErrorState message={error?.message} onRetry={refetch} /></Screen>;
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={tab === t}
              onPress={() => setTab(t)}
              accessibilityLabel={`Show ${t}`}
              accessibilityRole="button"
            />
          ))}
        </View>

        {tab === 'Detected' && (
          <>
            <Button
              title={
                autoCategorize.loading ? 'Categorizing…' : 'Auto-categorize'
              }
              variant="secondary"
              size="sm"
              loading={autoCategorize.loading}
              onPress={runAutoCategorize}
              accessibilityLabel="Auto-categorize high-confidence recurring patterns"
            />
            {!patterns.length ? (
              <EmptyState
                title="No patterns detected"
                description="Pull to refresh or wait for more transaction history."
              />
            ) : (
              patterns.map((p) => (
                <PatternRow
                  key={getId(p)}
                  pattern={p}
                  colors={colors}
                  onPress={() => openPatternDetail(p)}
                  onConfirm={() => confirmPattern(p)}
                  confirmLoading={markPattern.loading}
                />
              ))
            )}
          </>
        )}

        {tab === 'Upcoming' && (
          <>
            {!predictions.length ? (
              <EmptyState
                title="No upcoming predictions"
                description="Predictions appear once recurring patterns are confirmed."
              />
            ) : (
              predictions.map((p, i) => (
                <PredictionRow
                  key={getId(p) || i}
                  prediction={p}
                  colors={colors}
                />
              ))
            )}
          </>
        )}

        {tab === 'Statistics' && (
          <Card style={styles.statsCard}>
            {!Object.keys(statistics).length ? (
              <EmptyState
                title="No statistics yet"
                description="Confirm patterns to generate statistics."
              />
            ) : (
              <View style={styles.statsGrid}>
                {statistics.totalPatterns != null && (
                  <StatTile
                    label="Total patterns"
                    value={String(statistics.totalPatterns)}
                  />
                )}
                {statistics.activePatterns != null && (
                  <StatTile
                    label="Active"
                    value={String(statistics.activePatterns)}
                  />
                )}
                {statistics.totalMonthlyAmount != null && (
                  <StatTile
                    label="Monthly total"
                    value={formatMoney(statistics.totalMonthlyAmount)}
                  />
                )}
                {statistics.averageAmount != null && (
                  <StatTile
                    label="Average"
                    value={formatMoney(statistics.averageAmount)}
                  />
                )}
              </View>
            )}
          </Card>
        )}
      </ScrollView>

      <PatternDetailSheet
        visible={patternSheetOpen}
        onClose={() => setPatternSheetOpen(false)}
        pattern={activePattern}
        colors={colors}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: 'hidden'
  },
  cardPressable: {
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    alignItems: 'flex-start'
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  rowTitle: {
    ...typography.subheading,
    flex: 1
  },
  rowAmount: {
    ...typography.bodyStrong
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  rowMeta: {
    ...typography.caption
  },
  rowConfidence: {
    ...typography.caption,
    fontWeight: '700'
  },
  statsCard: {
    gap: spacing.md
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  sheetBody: {
    padding: spacing.lg,
    gap: spacing.md
  },
  sheetHeading: {
    ...typography.heading
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap'
  },
  subheading: {
    ...typography.subheading
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.md
  },
  txnDesc: {
    ...typography.caption,
    flex: 1
  },
  txnAmount: {
    ...typography.caption,
    fontWeight: '600'
  }
});
