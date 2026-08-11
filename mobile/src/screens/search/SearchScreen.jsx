import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { searchApi } from '../../api/endpoints';
import { useTheme } from '../../contexts/ThemeContext';
import { useApi, useMutation } from '../../hooks/useApi';
import {
  Button,
  EmptyState,
  Input,
  Screen,
  SectionHeader,
  Sheet,
  SkeletonList,
} from '../../components/ui';
import { formatDate, formatMoney, titleCase, truncate } from '../../utils/format';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

const DEBOUNCE_MS = 350;

function suggestList(value) {
  if (Array.isArray(value)) return value;
  return value?.suggestions || value?.data || value?.items || [];
}

function popularList(value) {
  if (Array.isArray(value)) return value;
  return value?.terms || value?.popular || value?.data || [];
}

// Returns an array of { type, items } from the global search response.
function toGroups(data) {
  if (!data || typeof data !== 'object') return [];
  const src =
    data.results && typeof data.results === 'object'
      ? data.results
      : data;
  return Object.entries(src)
    .filter(([, v]) => Array.isArray(v) && v.length > 0)
    .map(([type, items]) => ({ type, items }));
}

function ResultItem({ type, item, navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const id = item.id || item._id;
  const label =
    item.description ||
    item.name ||
    item.title ||
    item.vendor ||
    titleCase(type);

  function handlePress() {
    if (type === 'transactions') {
      navigation.navigate('Transactions', { highlightId: id });
      return;
    }
  }

  return (
    <Pressable
      style={styles.resultRow}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${titleCase(type)} result: ${label}`}
    >
      <View style={styles.resultBody}>
        <Text style={styles.resultLabel} numberOfLines={1}>
          {truncate(label, 50)}
        </Text>
        {item.amount != null ? (
          <Text style={styles.resultSub}>
            {formatMoney(item.amount)}
            {item.date ? ` · ${formatDate(item.date)}` : ''}
          </Text>
        ) : item.date ? (
          <Text style={styles.resultSub}>{formatDate(item.date)}</Text>
        ) : null}
      </View>
      {type === 'transactions' && (
        <Icon
          name="chevron-right"
          size={18}
          color={colors.textMuted}
        />
      )}
    </Pressable>
  );
}

export default function SearchScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedResults, setAdvancedResults] = useState(null);

  // Advanced sheet form state
  const [advQuery, setAdvQuery] = useState('');
  const [advStart, setAdvStart] = useState('');
  const [advEnd, setAdvEnd] = useState('');
  const [advMin, setAdvMin] = useState('');
  const [advMax, setAdvMax] = useState('');

  const debounceRef = useRef(null);

  const handleQueryChange = useCallback((text) => {
    setQuery(text);
    setAdvancedResults(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, DEBOUNCE_MS);
  }, []);

  const popularApi = useApi(() => searchApi.popular(), []);

  const suggestApi = useApi(
    () => searchApi.suggestions(debouncedQuery),
    [debouncedQuery],
    { immediate: debouncedQuery.length > 0 },
  );

  const globalApi = useApi(
    () => searchApi.global(debouncedQuery),
    [debouncedQuery],
    { immediate: debouncedQuery.length > 0 },
  );

  const advancedMut = useMutation((body) => searchApi.advanced(body));

  const handleAdvancedSearch = useCallback(async () => {
    const body = {
      query: advQuery || undefined,
      dateRange:
        advStart || advEnd
          ? {
              start: advStart || undefined,
              end: advEnd || undefined,
            }
          : undefined,
      amountRange:
        advMin || advMax
          ? {
              min: advMin ? Number(advMin) : undefined,
              max: advMax ? Number(advMax) : undefined,
            }
          : undefined,
    };
    try {
      const result = await advancedMut.mutate(body);
      setAdvancedResults(result);
      setShowAdvanced(false);
    } catch {
      /* error surfaced via advancedMut.error in the sheet */
    }
  }, [advancedMut, advQuery, advStart, advEnd, advMin, advMax]);

  const groups = useMemo(() => {
    if (advancedResults) return toGroups(advancedResults);
    if (!debouncedQuery) return [];
    return toGroups(globalApi.data);
  }, [globalApi.data, advancedResults, debouncedQuery]);

  const suggestions = suggestList(suggestApi.data);
  const popular = popularList(popularApi.data);

  const showResults =
    advancedResults != null ||
    (debouncedQuery.length > 0 && (globalApi.data != null || globalApi.loading));

  return (
    <Screen>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Icon name="magnify" size={20} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Search transactions, goals…"
          placeholderTextColor={colors.textFaint}
          style={[styles.searchInput, { color: colors.text }]}
          returnKeyType="search"
          accessibilityLabel="Search"
          clearButtonMode="while-editing"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery('');
              setDebouncedQuery('');
              setAdvancedResults(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.clearBtn}
          >
            <Icon name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
        <Pressable
          onPress={() => setShowAdvanced(true)}
          accessibilityRole="button"
          accessibilityLabel="Advanced search"
          style={styles.advBtn}
        >
          <Icon name="tune-variant" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {advancedResults && (
        <Pressable
          onPress={() => setAdvancedResults(null)}
          style={styles.clearAdvRow}
          accessibilityRole="button"
          accessibilityLabel="Clear advanced search results"
        >
          <Icon name="close" size={14} color={colors.primary} />
          <Text style={[styles.clearAdvText, { color: colors.primary }]}>
            Clear advanced filter
          </Text>
        </Pressable>
      )}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Popular searches — shown when box is empty */}
        {!query && !showResults && (
          <View style={styles.section}>
            <SectionHeader title="Popular" />
            {popularApi.loading ? (
              <SkeletonList count={4} />
            ) : (
              <View style={styles.chipRow}>
                {popular.map((term, i) => {
                  const label =
                    typeof term === 'string' ? term : term.label || term.text || String(term);
                  return (
                    <Pressable
                      key={i}
                      style={[
                        styles.popularChip,
                        { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                      ]}
                      onPress={() => handleQueryChange(label)}
                      accessibilityRole="button"
                      accessibilityLabel={`Search for ${label}`}
                    >
                      <Text style={[styles.popularChipText, { color: colors.text }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Suggestions — shown while typing */}
        {query.length > 0 && suggestions.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Suggestions" />
            {suggestions.slice(0, 6).map((item, i) => {
              const label =
                typeof item === 'string' ? item : item.text || item.label || String(item);
              return (
                <Pressable
                  key={i}
                  style={styles.suggRow}
                  onPress={() => handleQueryChange(label)}
                  accessibilityRole="button"
                  accessibilityLabel={`Use suggestion: ${label}`}
                >
                  <Icon name="magnify" size={16} color={colors.textMuted} />
                  <Text style={[styles.suggText, { color: colors.text }]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Global search results — grouped by type */}
        {globalApi.loading && !groups.length ? (
          <SkeletonList count={5} />
        ) : null}

        {globalApi.error && !groups.length ? (
          <Text style={[styles.errNote, { color: colors.danger }]}>
            {globalApi.error.message}
          </Text>
        ) : null}

        {showResults && !globalApi.loading && groups.length === 0 ? (
          <EmptyState
            title="No results"
            message="Try different keywords or use Advanced search."
          />
        ) : null}

        {groups.map(({ type, items }) => (
          <View key={type} style={styles.section}>
            <SectionHeader title={titleCase(type)} />
            {items.map((item) => (
              <ResultItem
                key={String(item.id || item._id || item)}
                type={type}
                item={item}
                navigation={navigation}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Advanced search sheet */}
      <Sheet
        visible={showAdvanced}
        title="Advanced search"
        onClose={() => setShowAdvanced(false)}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.sheetContent}
        >
          <Input
            label="Keywords"
            value={advQuery}
            onChangeText={setAdvQuery}
          />
          <SectionHeader title="Date range" style={styles.sheetSectionHeader} />
          <View style={styles.rangeRow}>
            <Input
              label="From (YYYY-MM-DD)"
              value={advStart}
              onChangeText={setAdvStart}
              placeholder="2024-01-01"
              style={styles.rangeField}
            />
            <Input
              label="To (YYYY-MM-DD)"
              value={advEnd}
              onChangeText={setAdvEnd}
              placeholder="2024-12-31"
              style={styles.rangeField}
            />
          </View>
          <SectionHeader
            title="Amount range (₹)"
            style={styles.sheetSectionHeader}
          />
          <View style={styles.rangeRow}>
            <Input
              label="Min"
              value={advMin}
              onChangeText={setAdvMin}
              placeholder="0"
              keyboardType="numeric"
              style={styles.rangeField}
            />
            <Input
              label="Max"
              value={advMax}
              onChangeText={setAdvMax}
              placeholder="100000"
              keyboardType="numeric"
              style={styles.rangeField}
            />
          </View>
          {advancedMut.error ? (
            <Text style={[styles.errNote, { color: colors.danger }]}>
              {advancedMut.error.message}
            </Text>
          ) : null}
          <Button
            title={advancedMut.loading ? 'Searching…' : 'Search'}
            onPress={handleAdvancedSearch}
            disabled={advancedMut.loading}
            accessibilityLabel="Run advanced search"
            style={styles.sheetBtn}
          />
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: HIT_TARGET,
      marginBottom: spacing.md,
    },
    searchInput: {
      ...typography.body,
      flex: 1,
      minHeight: HIT_TARGET,
    },
    clearBtn: {
      minWidth: HIT_TARGET,
      minHeight: HIT_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
    },
    advBtn: {
      minWidth: HIT_TARGET,
      minHeight: HIT_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearAdvRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    clearAdvText: { ...typography.caption, fontWeight: '600' },
    scrollContent: { gap: spacing.md, paddingBottom: 32 },
    section: { gap: spacing.sm },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    popularChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
      borderWidth: 1,
    },
    popularChipText: { ...typography.caption },
    suggRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: HIT_TARGET,
      paddingHorizontal: spacing.sm,
    },
    suggText: { ...typography.body },
    errNote: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: HIT_TARGET,
    },
    resultBody: { flex: 1 },
    resultLabel: { ...typography.bodyStrong, color: colors.text },
    resultSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
    sheetContent: { gap: spacing.md, paddingBottom: 32 },
    sheetSectionHeader: { marginTop: spacing.sm },
    rangeRow: { flexDirection: 'row', gap: spacing.sm },
    rangeField: { flex: 1 },
    sheetBtn: { marginTop: spacing.sm },
  });
