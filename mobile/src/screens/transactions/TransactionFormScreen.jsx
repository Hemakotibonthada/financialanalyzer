import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { receiptsApi, transactionsApi } from '../../api/endpoints';
import { useTheme } from '../../contexts/ThemeContext';
import { useMutation } from '../../hooks/useApi';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  Sheet,
  Skeleton
} from '../../components/ui';
import { formatDate, titleCase } from '../../utils/format';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

const CATEGORIES = ['food', 'transport', 'shopping', 'bills', 'salary', 'investment', 'other'];
const METHODS = ['upi', 'card', 'cash', 'bank', 'wallet'];

function dateParts(value) {
  const d = value ? new Date(value) : new Date();
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default function TransactionFormScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const editing = route.params?.transaction;
  const [type, setType] = useState(editing?.type || 'expense');
  const [amount, setAmount] = useState(String(editing?.amount ? Math.abs(editing.amount) : ''));
  const [category, setCategory] = useState(editing?.category || 'other');
  const [date, setDate] = useState(dateParts(editing?.date || editing?.createdAt));
  const [description, setDescription] = useState(editing?.description || '');
  const [method, setMethod] = useState(editing?.paymentMethod || editing?.method || 'upi');
  const [notes, setNotes] = useState(editing?.notes || '');
  const [errors, setErrors] = useState({});
  const [dateOpen, setDateOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const save = useMutation((body) => editing
    ? transactionsApi.update(editing.id || editing._id, body)
    : transactionsApi.create(body));
  const remove = useMutation((id) => transactionsApi.remove(id));

  useEffect(() => {
    if (route.params?.scan) scanReceipt();
  }, []);

  function validate() {
    const next = {};
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) next.amount = 'Enter an amount greater than zero.';
    if (!description.trim()) next.description = 'Add a short description.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSave() {
    if (!validate()) return;
    setFormError(null);
    const value = Number(amount);
    const body = {
      amount: type === 'income' ? value : -value,
      type,
      category,
      date: date.toISOString(),
      description: description.trim(),
      paymentMethod: method,
      notes: notes.trim() || undefined
    };
    try {
      await save.mutate(body);
      navigation.goBack();
    } catch (error) {
      setFormError(error?.message || 'Could not save this transaction.');
    }
  }

  async function scanReceipt() {
    setFormError(null);
    setScanLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8
      });
      if (result.canceled) return;
      const scanned = await receiptsApi.scan(result.assets[0]);
      const payload = scanned?.transaction || scanned || {};
      if (payload.amount) setAmount(String(Math.abs(Number(payload.amount))));
      if (payload.type) setType(payload.type);
      if (payload.category) setCategory(payload.category);
      if (payload.date) setDate(dateParts(payload.date));
      if (payload.description || payload.merchant) {
        setDescription(payload.description || payload.merchant);
      }
      if (payload.paymentMethod) setMethod(payload.paymentMethod);
      if (payload.notes) setNotes(payload.notes);
    } catch (error) {
      setFormError(error?.message || 'Receipt scan failed.');
    } finally {
      setScanLoading(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove.mutate(editing.id || editing._id);
          navigation.goBack();
        }
      }
    ]);
  }

  function updateDate(monthDelta, day) {
    const next = new Date(date);
    if (Number.isFinite(monthDelta)) next.setMonth(next.getMonth() + monthDelta);
    if (day) next.setDate(day);
    setDate(next);
  }

  if (save.loading && !amount) {
    return (
      <Screen>
        <Skeleton height={420} />
      </Screen>
    );
  }

  if (!transactionsApi?.create) {
    return (
      <Screen>
        <EmptyState title="Transactions unavailable" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {formError ? <ErrorState message={formError} onRetry={onSave} /> : null}
        <Card style={styles.amountCard}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.textFaint}
            style={styles.amountInput}
            accessibilityLabel="Transaction amount"
          />
          {errors.amount ? <Text style={styles.error}>{errors.amount}</Text> : null}
          <View style={styles.toggleRow}>
            {['income', 'expense'].map((name) => (
              <Pressable
                key={name}
                onPress={() => setType(name)}
                style={[styles.toggle, type === name && styles.toggleActive]}
                accessibilityLabel={`Set ${name}`}
                accessibilityRole="button"
              >
                <Text style={[styles.toggleText, type === name && styles.toggleTextActive]}>
                  {titleCase(name)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>{CATEGORIES.map((name) => (
            <Chip
              key={name}
              label={titleCase(name)}
              selected={category === name}
              onPress={() => setCategory(name)}
              accessibilityLabel={`Choose ${name} category`}
              accessibilityRole="button"
            />
          ))}</View>
          <Pressable
            onPress={() => setDateOpen(true)}
            style={styles.dateButton}
            accessibilityLabel="Choose transaction date"
            accessibilityRole="button"
          >
            <Icon name="calendar-month-outline" size={20} color={colors.primary} />
            <Text style={styles.dateText}>{formatDate(date)}</Text>
          </Pressable>
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            error={errors.description}
            accessibilityLabel="Transaction description"
          />
          <Text style={styles.label}>Payment method</Text>
          <View style={styles.chips}>{METHODS.map((name) => (
            <Chip
              key={name}
              label={titleCase(name)}
              selected={method === name}
              onPress={() => setMethod(name)}
              accessibilityLabel={`Choose ${name} payment method`}
              accessibilityRole="button"
            />
          ))}</View>
          <Input
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            multiline
            accessibilityLabel="Notes"
          />
          <Button
            title="Scan receipt"
            variant="secondary"
            onPress={scanReceipt}
            loading={scanLoading}
            accessibilityLabel="Scan receipt"
            accessibilityRole="button"
          />
          <Button
            title={editing ? 'Save changes' : 'Add transaction'}
            onPress={onSave}
            loading={save.loading}
            disabled={save.loading}
            accessibilityLabel="Save transaction"
            accessibilityRole="button"
          />
          {editing ? (
            <Button
              title="Delete transaction"
              variant="danger"
              onPress={confirmDelete}
              loading={remove.loading}
              accessibilityLabel="Delete transaction"
              accessibilityRole="button"
            />
          ) : null}
        </Card>
      </ScrollView>
      <Sheet visible={dateOpen} onClose={() => setDateOpen(false)} title="Select date">
        <View style={styles.sheetContent}>
          <View style={styles.monthRow}>
            <Pressable
              onPress={() => updateDate(-1)}
              style={styles.monthButton}
              accessibilityLabel="Previous month"
              accessibilityRole="button"
            >
              <Icon name="chevron-left" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.monthText}>{formatDate(date, 'MMMM yyyy')}</Text>
            <Pressable
              onPress={() => updateDate(1)}
              style={styles.monthButton}
              accessibilityLabel="Next month"
              accessibilityRole="button"
            >
              <Icon name="chevron-right" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.days}>{Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <Pressable
              key={day}
              onPress={() => updateDate(null, day)}
              style={[styles.day, date.getDate() === day && styles.dayActive]}
              accessibilityLabel={`Choose day ${day}`}
              accessibilityRole="button"
            >
              <Text style={[styles.dayText, date.getDate() === day && styles.dayTextActive]}>
                {day}
              </Text>
            </Pressable>
          ))}</View>
          <Button
            title="Done"
            onPress={() => setDateOpen(false)}
            accessibilityLabel="Done"
            accessibilityRole="button"
          />
        </View>
      </Sheet>
    </Screen>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  amountCard: { gap: spacing.md },
  card: { gap: spacing.md },
  label: { ...typography.caption, color: colors.textMuted },
  amountInput: {
    ...typography.display,
    color: colors.text,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  error: { ...typography.caption, color: colors.danger },
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggle: {
    flex: 1,
    minHeight: HIT_TARGET,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  toggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { ...typography.bodyStrong, color: colors.text },
  toggleTextActive: { color: colors.onPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateButton: {
    minHeight: HIT_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md
  },
  dateText: { ...typography.bodyStrong, color: colors.text },
  sheetContent: { gap: spacing.lg },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthButton: {
    minWidth: HIT_TARGET,
    minHeight: HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center'
  },
  monthText: { ...typography.heading, color: colors.text },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  day: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border
  },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { ...typography.bodyStrong, color: colors.text },
  dayTextActive: { color: colors.onPrimary }
});
