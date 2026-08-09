import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

import { emiApi } from '../../api/endpoints';
import { useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMoney, formatPercent } from '../../utils/format';
import { Button, Card, Input, Screen, Sheet } from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

const REPAYMENT_TYPES = ['reducing_balance', 'flat_rate', 'interest_free'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function moneyRound(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
}

function numberFrom(value) {
  const parsed = Number(String(value || '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function asText(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function normaliseType(value) {
  return String(value || '').replace(/\s+/g, '_').toLowerCase() || 'reducing_balance';
}

function monthlyEmi(principal, annualRate, months) {
  if (principal <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate <= 0) return moneyRound(principal / months);
  const factor = Math.pow(1 + monthlyRate, months);
  return moneyRound((principal * monthlyRate * factor) / (factor - 1));
}

function impliedAnnualRate(principal, emiAmount, months) {
  if (principal <= 0 || emiAmount <= 0 || months <= 0) return 0;
  const minimum = principal / months;
  if (emiAmount <= minimum) return 0;

  let low = 0;
  let high = 1;
  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const factor = Math.pow(1 + mid, months);
    const estimate = (principal * mid * factor) / (factor - 1);
    if (estimate > emiAmount) high = mid;
    else low = mid;
  }
  return moneyRound(((low + high) / 2) * 12 * 100);
}

function calculation(values) {
  const principal = numberFrom(values.principal);
  const enteredEmi = numberFrom(values.emiAmount);
  const rate = numberFrom(values.interestRate);
  const tenure = Math.round(numberFrom(values.tenure));
  const derivedEmi = rate > 0
    ? monthlyEmi(principal, rate, tenure)
    : moneyRound(enteredEmi || principal / Math.max(tenure, 1));
  const impliedRate = rate > 0 ? rate : impliedAnnualRate(principal, enteredEmi, tenure);
  const totalPayable = moneyRound((derivedEmi || enteredEmi) * Math.max(tenure, 0));
  return {
    monthly: moneyRound(derivedEmi),
    impliedRate,
    totalPayable,
    totalInterest: moneyRound(Math.max(totalPayable - principal, 0))
  };
}

function initialValues(emi) {
  const start = emi?.startDate || emi?.start_date || new Date().toISOString();
  return {
    merchant: asText(emi?.merchant || emi?.lender || emi?.name),
    principal: asText(emi?.principal),
    emiAmount: asText(emi?.monthlyEmi || emi?.emiAmount || emi?.amount),
    interestRate: asText(emi?.interestRate || emi?.rate),
    tenure: asText(emi?.tenureMonths || emi?.tenure),
    startDate: start.slice(0, 7),
    repaymentType: normaliseType(emi?.repaymentType),
    notes: asText(emi?.notes)
  };
}

function Field({ label, value, onChangeText, keyboardType = 'default', multiline = false }) {
  return (
    <Input
      label={label}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      multiline={multiline}
      accessibilityLabel={label}
    />
  );
}

export default function EMIFormScreen({ navigation, route }) {
  const { colors } = useTheme();
  const editing = route?.params?.emi || null;
  const [values, setValues] = useState(() => initialValues(editing));
  const [errors, setErrors] = useState({});
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);
  const save = useMutation((body) => (
    editing ? emiApi.update(editing.id || editing._id, body) : emiApi.create(body)
  ));
  const remove = useMutation(() => emiApi.remove(editing.id || editing._id));
  const calc = useMemo(() => calculation(values), [values]);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function validate() {
    const next = {};
    if (!values.merchant.trim()) next.merchant = 'Lender is required';
    if (numberFrom(values.principal) <= 0) next.principal = 'Principal must be greater than zero';
    if (numberFrom(values.tenure) <= 0) next.tenure = 'Tenure must be greater than zero';
    if (numberFrom(values.emiAmount) <= 0 && numberFrom(values.interestRate) <= 0) {
      next.emiAmount = 'Enter EMI amount or interest rate';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSave() {
    if (!validate()) return;
    const payload = {
      merchant: values.merchant.trim(),
      lender: values.merchant.trim(),
      principal: moneyRound(numberFrom(values.principal)),
      emiAmount: moneyRound(numberFrom(values.emiAmount) || calc.monthly),
      monthlyEmi: moneyRound(calc.monthly || numberFrom(values.emiAmount)),
      interestRate: moneyRound(numberFrom(values.interestRate) || calc.impliedRate),
      tenureMonths: Math.round(numberFrom(values.tenure)),
      startDate: `${values.startDate}-01`,
      repaymentType: values.repaymentType,
      notes: values.notes.trim()
    };
    await save.mutate(payload);
    navigation.goBack();
  }

  function confirmDelete() {
    Alert.alert('Delete EMI?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove.mutate();
          navigation.goBack();
        }
      }
    ]);
  }

  function chooseMonth(monthIndex, year) {
    const month = String(monthIndex + 1).padStart(2, '0');
    update('startDate', `${year}-${month}`);
    setMonthSheetOpen(false);
  }

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.cardGap}>
          <Text style={[styles.title, { color: colors.text }]}> 
            {editing ? 'Edit EMI' : 'Add EMI'}
          </Text>
          <Field
            label="Merchant or lender"
            value={values.merchant}
            onChangeText={(v) => update('merchant', v)}
          />
          {errors.merchant ? (
            <Text style={[styles.error, { color: colors.danger }]}>{errors.merchant}</Text>
          ) : null}
          <Field
            label="Principal"
            value={values.principal}
            onChangeText={(v) => update('principal', v)}
            keyboardType="decimal-pad"
          />
          {errors.principal ? (
            <Text style={[styles.error, { color: colors.danger }]}>{errors.principal}</Text>
          ) : null}
          <Field
            label="EMI amount"
            value={values.emiAmount}
            onChangeText={(v) => update('emiAmount', v)}
            keyboardType="decimal-pad"
          />
          {errors.emiAmount ? (
            <Text style={[styles.error, { color: colors.danger }]}>{errors.emiAmount}</Text>
          ) : null}
          <Field
            label="Annual interest rate (%)"
            value={values.interestRate}
            onChangeText={(v) => update('interestRate', v)}
            keyboardType="decimal-pad"
          />
          <Field
            label="Tenure in months"
            value={values.tenure}
            onChangeText={(v) => update('tenure', v)}
            keyboardType="number-pad"
          />
          {errors.tenure ? (
            <Text style={[styles.error, { color: colors.danger }]}>{errors.tenure}</Text>
          ) : null}
        </Card>

        <Card style={styles.cardGap}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Repayment details</Text>
          <TouchableOpacity
            accessibilityLabel="Choose start month and year"
            accessibilityRole="button"
            onPress={() => setMonthSheetOpen(true)}
            style={[styles.selector, { borderColor: colors.border }]}
          >
            <Text style={[styles.selectorLabel, { color: colors.textMuted }]}>Start month</Text>
            <Text style={[styles.selectorValue, { color: colors.text }]}>{values.startDate}</Text>
          </TouchableOpacity>
          <View style={styles.typeWrap}>
            {REPAYMENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                accessibilityLabel={`Select ${type.replace(/_/g, ' ')} repayment`}
                accessibilityRole="button"
                onPress={() => update('repaymentType', type)}
                style={[
                  styles.typeChip,
                  {
                    borderColor: values.repaymentType === type ? colors.primary : colors.border,
                    backgroundColor: values.repaymentType === type ? colors.primarySoft : colors.surface
                  }
                ]}
              >
                <Text style={[styles.typeText, { color: colors.text }]}>
                  {type.replace(/_/g, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field
            label="Notes"
            value={values.notes}
            onChangeText={(v) => update('notes', v)}
            multiline
          />
        </Card>

        <Card style={styles.cardGap}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Live calculation</Text>
          <View style={styles.calcRow}>
            <Text style={[styles.meta, { color: colors.textMuted }]}>Derived monthly EMI</Text>
            <Text style={[styles.calcValue, { color: colors.text }]}>{formatMoney(calc.monthly)}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={[styles.meta, { color: colors.textMuted }]}>Implied annual rate</Text>
            <Text style={[styles.calcValue, { color: colors.text }]}>
              {formatPercent(calc.impliedRate)}
            </Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={[styles.meta, { color: colors.textMuted }]}>Total interest</Text>
            <Text style={[styles.calcValue, { color: colors.warning }]}> 
              {formatMoney(calc.totalInterest)}
            </Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={[styles.meta, { color: colors.textMuted }]}>Total payable</Text>
            <Text style={[styles.calcValue, { color: colors.text }]}>{formatMoney(calc.totalPayable)}</Text>
          </View>
        </Card>

        <Button
          title={save.loading ? 'Saving…' : 'Save EMI'}
          onPress={onSave}
          accessibilityLabel="Save EMI"
          accessibilityRole="button"
        />
        {editing ? (
          <TouchableOpacity
            accessibilityLabel="Delete EMI"
            accessibilityRole="button"
            onPress={confirmDelete}
            style={[styles.deleteButton, { borderColor: colors.danger }]}
          >
            <Text style={[styles.deleteText, { color: colors.danger }]}>Delete EMI</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Sheet visible={monthSheetOpen} onClose={() => setMonthSheetOpen(false)} title="Start month">
        <ScrollView contentContainerStyle={styles.sheetContent}>
          {years.map((year) => (
            <View key={year} style={styles.yearBlock}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{year}</Text>
              <View style={styles.monthGrid}>
                {MONTHS.map((month, index) => (
                  <TouchableOpacity
                    key={`${year}-${month}`}
                    accessibilityLabel={`Choose ${month} ${year}`}
                    accessibilityRole="button"
                    onPress={() => chooseMonth(index, year)}
                    style={[styles.monthButton, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.monthText, { color: colors.text }]}>{month}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </Sheet>
    </Screen>
  );
}

export { monthlyEmi, impliedAnnualRate };

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  cardGap: {
    gap: spacing.md
  },
  title: {
    ...typography.title
  },
  sectionTitle: {
    ...typography.bodyStrong
  },
  meta: {
    ...typography.body
  },
  error: {
    ...typography.caption
  },
  selector: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs
  },
  selectorLabel: {
    ...typography.caption
  },
  selectorValue: {
    ...typography.bodyStrong
  },
  typeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  typeChip: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  typeText: {
    ...typography.caption,
    textTransform: 'capitalize'
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg
  },
  calcValue: {
    ...typography.bodyStrong
  },
  deleteButton: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteText: {
    ...typography.bodyStrong
  },
  sheetContent: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  yearBlock: {
    gap: spacing.sm
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  monthButton: {
    minHeight: HIT_TARGET,
    minWidth: 72,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  monthText: {
    ...typography.bodyStrong
  }
});
