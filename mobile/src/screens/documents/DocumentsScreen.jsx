import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { documentsApi } from '../../api/endpoints';
import { useTheme } from '../../contexts/ThemeContext';
import { useApi, useMutation } from '../../hooks/useApi';
import {
  Button,
  EmptyState,
  ErrorState,
  Screen,
  SectionHeader,
  Sheet,
  SkeletonList,
} from '../../components/ui';
import {
  formatDate,
  formatMoney,
  titleCase,
  truncate,
} from '../../utils/format';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function listFrom(value) {
  return value?.documents || value?.items || value?.data || [];
}

function txListFrom(value) {
  return value?.transactions || value?.items || value?.data || [];
}

const STATUS_META = {
  pending: { color: 'textMuted', icon: 'clock-outline', label: 'Pending' },
  processing: { color: 'warning', icon: 'loading', label: 'Processing' },
  completed: { color: 'success', icon: 'check-circle-outline', label: 'Processed' },
  failed: { color: 'danger', icon: 'alert-circle-outline', label: 'Failed' },
  password_required: {
    color: 'warning',
    icon: 'lock-outline',
    label: 'Password required',
  },
};

function statusMeta(status) {
  const meta = STATUS_META[status];
  if (meta) return meta;
  return {
    color: 'textMuted',
    icon: 'file-outline',
    label: titleCase(status || 'Unknown'),
  };
}

export default function DocumentsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [txSheetDocId, setTxSheetDocId] = useState(null);
  const [txSheetTitle, setTxSheetTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  const listApi = useApi(() => documentsApi.list(), []);
  const txApi = useApi(
    () => (txSheetDocId ? documentsApi.transactions(txSheetDocId) : null),
    [txSheetDocId],
    { immediate: Boolean(txSheetDocId) },
  );

  const uploadMut = useMutation((asset) => documentsApi.upload(asset));
  const processMut = useMutation((id) => documentsApi.process(id));
  const retryMut = useMutation((id) => documentsApi.retry(id));
  const removeMut = useMutation((id) => documentsApi.remove(id));

  const items = listFrom(listApi.data);

  const handleUpload = useCallback(async () => {
    let result;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
    } catch (err) {
      Alert.alert('Picker error', err?.message || 'Could not open document picker.');
      return;
    }
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      await uploadMut.mutate(asset);
      listApi.refetch();
    } catch {
      Alert.alert(
        'Upload failed',
        uploadMut.error?.message || 'Document could not be uploaded.',
      );
    } finally {
      setUploading(false);
    }
  }, [uploadMut, listApi]);

  function showDocumentActions(doc) {
    const id = doc.id || doc._id;
    const canProcess =
      doc.processingStatus === 'pending' || doc.processingStatus === 'failed';
    const canRetry =
      doc.processingStatus === 'failed' ||
      doc.processingStatus === 'password_required';

    const actions = [];
    if (canProcess) {
      actions.push({
        text: 'Process',
        onPress: async () => {
          try {
            await processMut.mutate(id);
            listApi.refetch();
          } catch {
            Alert.alert('Process error', processMut.error?.message || 'Could not process document.');
          }
        },
      });
    }
    if (canRetry) {
      actions.push({
        text: 'Retry',
        onPress: async () => {
          try {
            await retryMut.mutate(id);
            listApi.refetch();
          } catch {
            Alert.alert('Retry error', retryMut.error?.message || 'Retry failed.');
          }
        },
      });
    }
    actions.push({
      text: 'View extracted transactions',
      onPress: () => {
        setTxSheetTitle(doc.originalName || 'Transactions');
        setTxSheetDocId(id);
      },
    });
    actions.push({
      text: 'Delete',
      style: 'destructive',
      onPress: () =>
        Alert.alert(
          'Delete document?',
          'Associated extracted transactions will also be deleted. This cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await removeMut.mutate(id);
                  listApi.refetch();
                } catch {
                  Alert.alert('Delete error', removeMut.error?.message || 'Could not delete.');
                }
              },
            },
          ],
        ),
    });
    actions.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(
      truncate(doc.originalName || 'Document', 40),
      undefined,
      actions,
    );
  }

  function renderItem({ item }) {
    const meta = statusMeta(item.processingStatus);
    const statusColor = colors[meta.color] || colors.textMuted;
    const isFailed =
      item.processingStatus === 'failed' ||
      item.processingStatus === 'password_required';

    return (
      <Pressable
        style={styles.row}
        onLongPress={() => showDocumentActions(item)}
        onPress={() => showDocumentActions(item)}
        accessibilityRole="button"
        accessibilityLabel={
          `${item.originalName || 'Document'}, status: ${meta.label}`
        }
      >
        <View style={[styles.iconWrap, { backgroundColor: `${statusColor}22` }]}>
          <Icon name={meta.icon} size={22} color={statusColor} />
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {truncate(item.originalName || 'Unnamed document', 38)}
          </Text>
          <View style={styles.rowMeta}>
            <View
              style={[styles.statusPill, { backgroundColor: `${statusColor}22` }]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {meta.label}
              </Text>
            </View>
            {item.transactionCount != null && item.transactionCount > 0 && (
              <Text style={styles.txCount}>
                {item.transactionCount} transaction{item.transactionCount !== 1 ? 's' : ''}
              </Text>
            )}
            {item.createdAt ? (
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            ) : null}
          </View>
          {/* Surface the real error — never silently show a failed doc as ok */}
          {isFailed && item.error ? (
            <Text style={[styles.errText, { color: colors.danger }]} numberOfLines={2}>
              {item.error}
            </Text>
          ) : null}
          {isFailed && !item.error ? (
            <Text style={[styles.errText, { color: colors.danger }]}>
              Processing failed — tap to retry.
            </Text>
          ) : null}
        </View>
        <Icon name="dots-vertical" size={18} color={colors.textMuted} />
      </Pressable>
    );
  }

  if (listApi.loading && !items.length) {
    return (
      <Screen>
        <SkeletonList count={5} />
      </Screen>
    );
  }

  if (listApi.error && !items.length) {
    return (
      <Screen>
        <ErrorState message={listApi.error.message} onRetry={listApi.refetch} />
      </Screen>
    );
  }

  const txItems = txListFrom(txApi.data);

  return (
    <Screen>
      {listApi.fromCache && (
        <Text style={[styles.staleNote, { color: colors.warning }]}>
          Showing saved data · pull to refresh
        </Text>
      )}
      {uploadMut.error ? (
        <Text style={[styles.staleNote, { color: colors.danger }]}>
          {uploadMut.error.message}
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
        ListHeaderComponent={
          <View style={styles.header}>
            <SectionHeader title="Documents" />
            <Button
              title={uploading ? 'Uploading…' : 'Upload'}
              onPress={handleUpload}
              disabled={uploading}
              accessibilityLabel="Upload a financial document"
              size="sm"
            />
          </View>
        }
        ListEmptyComponent={(
          <EmptyState
            title="No documents"
            message="Upload a bank statement, invoice, or PDF to extract transactions automatically."
          />
        )}
        contentContainerStyle={styles.list}
      />

      {/* Transactions sheet */}
      <Sheet
        visible={Boolean(txSheetDocId)}
        title={truncate(txSheetTitle, 32)}
        onClose={() => {
          setTxSheetDocId(null);
          setTxSheetTitle('');
        }}
      >
        <ScrollView
          style={styles.txSheet}
          keyboardShouldPersistTaps="handled"
        >
          {txApi.loading ? <SkeletonList count={4} /> : null}
          {txApi.error ? (
            <Text style={[styles.errText, { color: colors.danger }]}>
              {txApi.error.message}
            </Text>
          ) : null}
          {!txApi.loading && !txApi.error && txItems.length === 0 ? (
            <Text style={[styles.emptyTx, { color: colors.textMuted }]}>
              No transactions extracted from this document yet.
            </Text>
          ) : null}
          {txItems.map((tx, i) => {
            const amt = Number(tx.amount);
            const hasAmt = Number.isFinite(amt);
            return (
              <View
                key={String(tx.id || tx._id || i)}
                style={[styles.txRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.txBody}>
                  <Text style={[styles.txDesc, { color: colors.text }]} numberOfLines={1}>
                    {tx.description || titleCase(tx.category) || 'Transaction'}
                  </Text>
                  <Text style={[styles.txDate, { color: colors.textMuted }]}>
                    {tx.date ? formatDate(tx.date) : '—'}
                    {tx.category ? ` · ${titleCase(tx.category)}` : ''}
                  </Text>
                </View>
                {hasAmt ? (
                  <Text style={[styles.txAmt, { color: colors.text }]}>
                    {formatMoney(Math.abs(amt))}
                  </Text>
                ) : (
                  <Text style={[styles.txAmt, { color: colors.textMuted }]}>—</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      </Sheet>
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
      alignItems: 'flex-start',
      gap: spacing.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: { flex: 1, gap: spacing.xs },
    rowTitle: { ...typography.bodyStrong, color: colors.text },
    rowMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    statusPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.pill,
    },
    statusText: { ...typography.micro },
    txCount: { ...typography.caption, color: colors.textMuted },
    date: { ...typography.caption, color: colors.textFaint },
    errText: { ...typography.caption, fontStyle: 'italic' },
    txSheet: { maxHeight: 400 },
    emptyTx: { ...typography.body, textAlign: 'center', padding: spacing.xl },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
    },
    txBody: { flex: 1, gap: 2 },
    txDesc: { ...typography.bodyStrong },
    txDate: { ...typography.caption },
    txAmt: { ...typography.bodyStrong, marginLeft: spacing.sm },
  });
