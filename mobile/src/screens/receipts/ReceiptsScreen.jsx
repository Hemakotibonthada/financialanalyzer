import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { receiptsApi } from '../../api/endpoints';
import { useTheme } from '../../contexts/ThemeContext';
import { useApi, useMutation } from '../../hooks/useApi';
import {
  Button,
  EmptyState,
  ErrorState,
  Screen,
  SectionHeader,
  SkeletonList,
  StatTile,
} from '../../components/ui';
import { formatDate, formatMoney, titleCase, truncate } from '../../utils/format';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function listFrom(value) {
  return value?.receipts || value?.items || value?.data || [];
}

const STATUS_COLOR = {
  completed: 'success',
  processing: 'warning',
  pending: 'textMuted',
  failed: 'danger',
};

const STATUS_ICON = {
  completed: 'check-circle-outline',
  processing: 'loading',
  pending: 'clock-outline',
  failed: 'alert-circle-outline',
};

export default function ReceiptsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [uploading, setUploading] = useState(false);

  const listApi = useApi(() => receiptsApi.list(), []);
  const analyticsApi = useApi(() => receiptsApi.analytics(), []);
  const scanMut = useMutation((asset) => receiptsApi.scan(asset));

  const items = listFrom(listApi.data);

  // Only show analytics values that are actually present and non-zero.
  // Showing zero reads as "spent nothing", which is a different claim from "no data".
  const analyticsAmt = Number(analyticsApi.data?.totalAmount);
  const analyticsCnt = Number(analyticsApi.data?.totalReceipts);
  const showAmt =
    analyticsApi.data != null &&
    Number.isFinite(analyticsAmt) &&
    analyticsAmt > 0;
  const showCnt =
    analyticsApi.data != null &&
    Number.isFinite(analyticsCnt) &&
    analyticsCnt > 0;

  const handleScan = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera access required',
        'Please enable camera access in Settings to scan receipts.',
        [{ text: 'OK' }],
      );
      return;
    }
    setUploading(true);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [3, 4],
    });
    setUploading(false);
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      await scanMut.mutate(asset);
      listApi.refetch();
    } catch {
      Alert.alert('Upload failed', scanMut.error?.message || 'Could not process receipt.');
    }
  }, [scanMut, listApi]);

  const handleLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo library access required',
        'Please enable photo access in Settings to import receipts.',
        [{ text: 'OK' }],
      );
      return;
    }
    setUploading(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    setUploading(false);
    if (result.canceled) return;
    const asset = result.assets[0];
    try {
      await scanMut.mutate(asset);
      listApi.refetch();
    } catch {
      Alert.alert('Upload failed', scanMut.error?.message || 'Could not process receipt.');
    }
  }, [scanMut, listApi]);

  function showScanOptions() {
    Alert.alert(
      'Add receipt',
      undefined,
      [
        { text: 'Scan with camera', onPress: handleScan },
        { text: 'Choose from library', onPress: handleLibrary },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  function renderItem({ item }) {
    const id = item.id || item._id;
    const status = item.status || 'pending';
    const statusColor = colors[STATUS_COLOR[status]] || colors.textMuted;
    const statusIcon = STATUS_ICON[status] || 'clock-outline';
    const hasAmount = item.amount != null && Number.isFinite(Number(item.amount));

    return (
      <Pressable
        style={styles.row}
        onPress={() =>
          navigation.navigate('ReceiptDetail', { id, receipt: item })
        }
        accessibilityRole="button"
        accessibilityLabel={
          `Receipt from ${item.vendor || 'unknown vendor'}, ${
            hasAmount ? formatMoney(item.amount) : 'amount unknown'
          }`
        }
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumb}
            accessibilityLabel="Receipt image"
          />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Icon name="receipt" size={22} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {truncate(item.vendor || 'Unknown vendor', 32)}
          </Text>
          {hasAmount ? (
            <Text style={styles.rowAmount}>
              {formatMoney(item.amount)}
            </Text>
          ) : (
            <Text style={[styles.rowSub, { color: colors.textMuted }]}>
              Amount not extracted
            </Text>
          )}
          {item.date ? (
            <Text style={styles.rowSub}>{formatDate(item.date)}</Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22` }]}>
          <Icon name={statusIcon} size={14} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {titleCase(status)}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color={colors.textFaint} />
      </Pressable>
    );
  }

  if (listApi.loading && !items.length) {
    return (
      <Screen>
        <SkeletonList count={6} />
      </Screen>
    );
  }

  if (listApi.error && !items.length) {
    return (
      <Screen>
        <ErrorState
          message={listApi.error.message}
          onRetry={listApi.refetch}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {listApi.fromCache && (
        <Text style={[styles.staleNote, { color: colors.warning }]}>
          Showing saved data · pull to refresh
        </Text>
      )}
      {scanMut.error ? (
        <Text style={[styles.staleNote, { color: colors.danger }]}>
          {scanMut.error.message}
        </Text>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id || item._id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={listApi.refreshing}
            onRefresh={listApi.onRefresh}
          />
        }
        ListHeaderComponent={(
          <View>
            <View style={styles.header}>
              <SectionHeader title="Receipts" />
              <Button
                title={uploading ? 'Uploading…' : 'Scan receipt'}
                onPress={showScanOptions}
                disabled={uploading}
                accessibilityLabel="Scan or import a receipt"
                size="sm"
              />
            </View>
            {(showAmt || showCnt) ? (
              <View style={styles.statsRow}>
                {showCnt ? (
                  <StatTile
                    label="Captured"
                    value={String(analyticsCnt)}
                    style={styles.statTile}
                  />
                ) : null}
                {showAmt ? (
                  <StatTile
                    label="Total scanned"
                    value={formatMoney(analyticsAmt)}
                    style={styles.statTile}
                  />
                ) : null}
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={(
          <EmptyState
            title="No receipts yet"
            message="Tap 'Scan receipt' to capture and parse a receipt."
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    list: { paddingBottom: 32 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    thumb: {
      width: 52,
      height: 52,
      borderRadius: radii.md,
    },
    thumbEmpty: {
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1, gap: 2 },
    rowTitle: { ...typography.bodyStrong, color: colors.text },
    rowAmount: { ...typography.body, color: colors.text },
    rowSub: { ...typography.caption, color: colors.textMuted },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radii.pill,
    },
    statusText: { ...typography.micro },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    statTile: { flex: 1 },
  });
