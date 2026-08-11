import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { receiptsApi } from '../../api/endpoints';
import { useTheme } from '../../contexts/ThemeContext';
import { useApi, useMutation } from '../../hooks/useApi';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  SectionHeader,
  Sheet,
  SkeletonList,
} from '../../components/ui';
import { formatDate, formatMoney, titleCase } from '../../utils/format';
import { radii, spacing, typography } from '../../theme/tokens';

const CONFIDENCE_WARN = 0.6;

function receiptFrom(value) {
  return value?.receipt || value?.data?.receipt || value?.data || value;
}

function FieldRow({ label, value }) {
  const { colors } = useTheme();
  if (value == null || value === '') return null;
  return (
    <View style={fieldRowStyles.row}>
      <Text style={[fieldRowStyles.label, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[fieldRowStyles.value, { color: colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const fieldRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  label: { ...typography.caption, flex: 1 },
  value: { ...typography.bodyStrong, flex: 2, textAlign: 'right' },
});

export default function ReceiptDetailScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const { id } = route.params || {};

  const detailApi = useApi(
    () => (id ? receiptsApi.detail(id) : Promise.resolve(null)),
    [id],
  );

  const updateMut = useMutation((body) => receiptsApi.update(id, body));
  const removeMut = useMutation(() => receiptsApi.remove(id));

  const [showEdit, setShowEdit] = useState(false);
  const [editVendor, setEditVendor] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const receipt = receiptFrom(detailApi.data);

  const openEdit = useCallback(() => {
    if (!receipt) return;
    setEditVendor(receipt.vendor || '');
    const rawAmt = receipt.amount;
    setEditAmount(
      rawAmt != null && Number.isFinite(Number(rawAmt))
        ? String(rawAmt)
        : '',
    );
    setEditDate(receipt.date ? formatDate(receipt.date, 'yyyy-MM-dd') : '');
    setEditCategory(receipt.category || '');
    setEditNotes(receipt.notes || '');
    setShowEdit(true);
  }, [receipt]);

  const handleSave = useCallback(async () => {
    const body = {};
    if (editVendor.trim()) body.vendor = editVendor.trim();
    if (editAmount !== '') {
      const n = Number(editAmount);
      if (!Number.isFinite(n)) {
        Alert.alert('Invalid amount', 'Please enter a valid number.');
        return;
      }
      body.amount = n;
    }
    if (editDate.trim()) body.date = editDate.trim();
    if (editCategory.trim()) body.category = editCategory.trim();
    if (editNotes.trim()) body.notes = editNotes.trim();
    if (Object.keys(body).length === 0) {
      setShowEdit(false);
      return;
    }
    try {
      await updateMut.mutate(body);
      setShowEdit(false);
      detailApi.refetch();
    } catch {
      /* error surfaced via updateMut.error in the sheet */
    }
  }, [updateMut, detailApi, editVendor, editAmount, editDate, editCategory, editNotes]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete receipt?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMut.mutate();
              navigation.goBack();
            } catch {
              Alert.alert(
                'Delete failed',
                removeMut.error?.message || 'Could not delete receipt.',
              );
            }
          },
        },
      ],
    );
  }, [removeMut, navigation]);

  if (detailApi.loading) {
    return (
      <Screen>
        <SkeletonList count={4} />
      </Screen>
    );
  }

  if (detailApi.error) {
    return (
      <Screen>
        <ErrorState
          message={detailApi.error.message}
          onRetry={detailApi.refetch}
        />
      </Screen>
    );
  }

  if (!receipt) {
    return (
      <Screen>
        <EmptyState
          title="Receipt not found"
          message="This receipt may have been deleted."
        />
      </Screen>
    );
  }

  const hasAmount =
    receipt.amount != null && Number.isFinite(Number(receipt.amount));
  const confidence = Number(receipt.confidence);
  const lowConfidence =
    Number.isFinite(confidence) && confidence < CONFIDENCE_WARN;
  const status = receipt.status || 'unknown';
  const isFailed = status === 'failed';

  return (
    <Screen scroll>
      {/* OCR warning — shown when confidence is low or extraction failed */}
      {(isFailed || lowConfidence) && (
        <View style={[styles.warnBanner, { backgroundColor: colors.warningSoft }]}>
          <Icon name="alert-circle-outline" size={18} color={colors.warning} />
          <Text style={[styles.warnText, { color: colors.warning }]}>
            {isFailed
              ? 'OCR processing failed. Fields below may be incomplete.'
              : 'Low OCR confidence. Verify the details before saving.'}
          </Text>
        </View>
      )}

      {/* Receipt image */}
      {receipt.imageUrl ? (
        <Image
          source={{ uri: receipt.imageUrl }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel="Captured receipt image"
        />
      ) : (
        <View style={styles.imageEmpty}>
          <Icon name="receipt" size={48} color={colors.textFaint} />
          <Text style={[styles.imageEmptyText, { color: colors.textMuted }]}>
            No image
          </Text>
        </View>
      )}

      {/* Extracted fields */}
      <Card style={styles.card}>
        <SectionHeader title="Extracted details" />
        <FieldRow
          label="Vendor"
          value={receipt.vendor || (isFailed ? '—' : null)}
        />
        {hasAmount ? (
          <FieldRow
            label="Amount"
            value={formatMoney(receipt.amount)}
          />
        ) : (
          <Text style={[styles.missingNote, { color: colors.textMuted }]}>
            Amount could not be extracted
          </Text>
        )}
        <FieldRow
          label="Date"
          value={receipt.date ? formatDate(receipt.date) : null}
        />
        <FieldRow
          label="Category"
          value={receipt.category ? titleCase(receipt.category) : null}
        />
        <FieldRow label="Status" value={titleCase(status)} />
        {Number.isFinite(confidence) && (
          <FieldRow
            label="OCR confidence"
            value={`${Math.round(confidence * 100)}%`}
          />
        )}
        {receipt.notes ? (
          <View style={styles.notesRow}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Notes
            </Text>
            <Text
              style={[typography.body, { color: colors.text, marginTop: spacing.xs }]}
            >
              {receipt.notes}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Line items */}
      {Array.isArray(receipt.items) && receipt.items.length > 0 && (
        <Card style={styles.card}>
          <SectionHeader title="Line items" />
          {receipt.items.map((lineItem, i) => (
            <View
              key={i}
              style={[styles.lineItem, { borderTopColor: colors.border }]}
            >
              <Text
                style={[styles.lineItemName, { color: colors.text }]}
                numberOfLines={2}
              >
                {lineItem.name || lineItem.description || `Item ${i + 1}`}
              </Text>
              {lineItem.amount != null &&
                Number.isFinite(Number(lineItem.amount)) && (
                  <Text style={[styles.lineItemAmt, { color: colors.text }]}>
                    {formatMoney(lineItem.amount)}
                  </Text>
                )}
            </View>
          ))}
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Edit details"
          onPress={openEdit}
          variant="secondary"
          style={styles.actionBtn}
          accessibilityLabel="Edit receipt details"
        />
        <Button
          title="Delete"
          onPress={handleDelete}
          variant="danger"
          style={styles.actionBtn}
          loading={removeMut.loading}
          accessibilityLabel="Delete this receipt"
        />
      </View>

      {/* Edit sheet */}
      <Sheet
        visible={showEdit}
        title="Edit receipt"
        onClose={() => setShowEdit(false)}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.sheetContent}
        >
          <Input
            label="Vendor / merchant"
            value={editVendor}
            onChangeText={setEditVendor}
          />
          <Input
            label="Amount (₹)"
            value={editAmount}
            onChangeText={setEditAmount}
            keyboardType="numeric"
          />
          <Input
            label="Date (YYYY-MM-DD)"
            value={editDate}
            onChangeText={setEditDate}
          />
          <Input
            label="Category"
            value={editCategory}
            onChangeText={setEditCategory}
          />
          <Input
            label="Notes"
            value={editNotes}
            onChangeText={setEditNotes}
            multiline
          />
          {updateMut.error ? (
            <Text style={[styles.errText, { color: colors.danger }]}>
              {updateMut.error.message}
            </Text>
          ) : null}
          <Button
            title={updateMut.loading ? 'Saving…' : 'Save changes'}
            onPress={handleSave}
            disabled={updateMut.loading}
            accessibilityLabel="Save receipt edits"
            style={styles.sheetBtn}
          />
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    warnBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.md,
      marginBottom: spacing.md,
    },
    warnText: { ...typography.caption, flex: 1 },
    image: {
      width: '100%',
      height: 260,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceAlt,
      marginBottom: spacing.md,
    },
    imageEmpty: {
      height: 140,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    imageEmptyText: { ...typography.caption },
    card: { marginBottom: spacing.md, gap: spacing.xs },
    missingNote: {
      ...typography.caption,
      fontStyle: 'italic',
      marginTop: 2,
      paddingVertical: spacing.xs,
    },
    notesRow: { paddingTop: spacing.sm },
    lineItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.xs,
      borderTopWidth: 1,
    },
    lineItemName: {
      ...typography.body,
      flex: 1,
      marginRight: spacing.md,
    },
    lineItemAmt: { ...typography.bodyStrong },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.xl,
    },
    actionBtn: { flex: 1 },
    sheetContent: { gap: spacing.md, paddingBottom: 32 },
    errText: { ...typography.caption, textAlign: 'center' },
    sheetBtn: { marginTop: spacing.xs },
  });
