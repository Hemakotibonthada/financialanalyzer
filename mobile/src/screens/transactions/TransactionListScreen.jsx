import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { transactionsApi } from '../../api/endpoints';
import { useTheme } from '../../contexts/ThemeContext';
import { useApi, useMutation } from '../../hooks/useApi';
import { Card, Chip, EmptyState, ErrorState, Money, Screen, SkeletonList } from '../../components/ui';
import { formatDate, formatMoney, titleCase } from '../../utils/format';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

const PAGE_SIZE = 25;
const FILTERS = ['all', 'income', 'expense'];

function listFrom(value) {
  if (Array.isArray(value)) return value;
  return value?.items || value?.transactions || value?.data || value?.results || [];
}

function nextPageFrom(value, page) {
  if (value?.nextPage) return value.nextPage;
  if (value?.hasMore === false) return null;
  return listFrom(value).length >= PAGE_SIZE ? page + 1 : null;
}

export default function TransactionListScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [monthOffset, setMonthOffset] = useState(0);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const month = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset, 1);
    return d.toISOString().slice(0, 7);
  }, [monthOffset]);

  const api = useApi(async () => {
    const payload = await transactionsApi.list({
      page,
      limit: PAGE_SIZE,
      search: query || undefined,
      type: filter === 'all' ? undefined : filter,
      month
    });
    const items = listFrom(payload);
    setRows((current) => (page === 1 ? items : [...current, ...items]));
    return { ...payload, items };
  }, [page, query, filter, month]);
  const remove = useMutation((id) => transactionsApi.remove(id));

  const dataRows = rows.length ? rows : listFrom(api.data);
  const total = dataRows.reduce((sum, item) => {
    const amount = Number(item.amount) || 0;
    return sum + (item.type === 'income' ? Math.abs(amount) : -Math.abs(amount));
  }, 0);
  const hasMore = nextPageFrom(api.data, page);
  const grouped = useMemo(() => {
    let lastDate = null;
    return dataRows.flatMap((item) => {
      const day = formatDate(item.date || item.createdAt, 'd MMM yyyy');
      const withHeader = day !== lastDate ? [{ kind: 'header', id: `h-${day}`, day }] : [];
      lastDate = day;
      return [...withHeader, { kind: 'row', id: String(item.id || item._id), item }];
    });
  }, [dataRows]);

  const refresh = useCallback(() => {
    setPage(1);
    setRows([]);
    api.onRefresh();
  }, [api]);

  function confirmDelete(item) {
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove.mutate(item.id || item._id);
          setRows((current) => current.filter((row) => (row.id || row._id) !== (item.id || item._id)));
        }
      }
    ]);
  }

  function renderItem({ item }) {
    if (item.kind === 'header') return <Text style={styles.section}>{item.day}</Text>;
    const tx = item.item;
    const isIncome = tx.type === 'income' || Number(tx.amount) > 0;
    const icon = isIncome ? 'arrow-down-left' : 'arrow-up-right';
    return (
      <Pressable
        onPress={() => navigation.navigate('TransactionForm', { transaction: tx })}
        onLongPress={() => confirmDelete(tx)}
        style={styles.row}
        accessibilityLabel={`Open transaction ${tx.description || tx.category || ''}`}
        accessibilityRole="button"
      >
        <View style={styles.iconWrap}>
          <Icon name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>
            {tx.description || titleCase(tx.category) || 'Transaction'}
          </Text>
          <Text style={styles.rowSub}>
            {formatDate(tx.date || tx.createdAt)} · {titleCase(tx.category)}
          </Text>
        </View>
        <Money
          amount={Math.abs(Number(tx.amount) || 0)}
          color={isIncome ? colors.credit : colors.debit}
        />
      </Pressable>
    );
  }

  if (api.loading && !dataRows.length) {
    return (
      <Screen>
        <SkeletonList count={8} />
      </Screen>
    );
  }

  if (api.error && !dataRows.length) {
    return (
      <Screen>
        <ErrorState message={api.error.message} onRetry={api.refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.toolbar}>
        <TextInput
          value={query}
          onChangeText={(text) => { setPage(1); setRows([]); setQuery(text); }}
          placeholder="Search transactions"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          accessibilityLabel="Search transactions"
        />
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => { setPage(1); setRows([]); setMonthOffset((value) => value - 1); }}
            style={styles.monthButton}
            accessibilityLabel="Previous month"
            accessibilityRole="button"
          >
            <Icon name="chevron-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.monthText}>{month}</Text>
          <Pressable
            onPress={() => { setPage(1); setRows([]); setMonthOffset((value) => value + 1); }}
            style={styles.monthButton}
            accessibilityLabel="Next month"
            accessibilityRole="button"
          >
            <Icon name="chevron-right" size={22} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.chips}>
          {FILTERS.map((name) => (
            <Chip
              key={name}
              label={titleCase(name)}
              selected={filter === name}
              onPress={() => { setPage(1); setRows([]); setFilter(name); }}
              accessibilityLabel={`Filter ${name}`}
              accessibilityRole="button"
            />
          ))}
        </View>
        <Card style={styles.total}>
          <Text style={styles.totalText}>Running total</Text>
          <Text style={styles.totalAmount}>{formatMoney(total)}</Text>
        </Card>
      </View>
      <FlatList
        data={grouped}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={api.refreshing}
        onRefresh={refresh}
        onEndReached={() => { if (hasMore && !api.loading) setPage(hasMore); }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={(
          <EmptyState
            title="No transactions"
            message="Try another filter or add one."
          />
        )}
        contentContainerStyle={styles.list}
      />
      <Pressable
        onPress={() => navigation.navigate('TransactionForm')}
        style={styles.fab}
        accessibilityLabel="Add transaction"
        accessibilityRole="button"
      >
        <Icon name="plus" size={26} color={colors.onPrimary} />
      </Pressable>
    </Screen>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  toolbar: { gap: spacing.md, marginBottom: spacing.md },
  search: {
    minHeight: HIT_TARGET,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    color: colors.text
  },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: {
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center'
  },
  monthText: { ...typography.bodyStrong, color: colors.text },
  chips: { flexDirection: 'row', gap: spacing.sm },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalText: { ...typography.caption, color: colors.textMuted },
  totalAmount: { ...typography.heading, color: colors.text },
  list: { gap: spacing.sm, paddingBottom: 96 },
  section: {
    ...typography.micro,
    color: colors.textMuted,
    marginTop: spacing.md,
    textTransform: 'uppercase'
  },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft
  },
  rowText: { flex: 1 },
  rowTitle: { ...typography.bodyStrong, color: colors.text },
  rowSub: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 58,
    height: 58,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary
  }
});
