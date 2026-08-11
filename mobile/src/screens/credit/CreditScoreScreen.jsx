import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { creditApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatMoney, formatDate, formatPercent, titleCase } from '../../utils/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  Sheet,
  SkeletonList,
  SectionHeader,
  StatTile,
} from '../../components/ui';
import { radii, spacing, typography } from '../../theme/tokens';

function InfoRow({ label, value, colors }) {
  if (value == null || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.caption, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function ScoreGauge({ score, grade, colors }) {
  const isGood = score >= 750;
  const isFair = score >= 650 && score < 750;
  const gaugeColor = isGood ? colors.success : isFair ? colors.warning : colors.danger;
  return (
    <View style={styles.gaugeContainer}>
      <Text style={[styles.scoreDisplay, { color: gaugeColor }]}>
        {score}
      </Text>
      {grade
        ? <Text style={[styles.subheading, { color: gaugeColor }]}>{grade}</Text>
        : null}
      <Text style={[styles.caption, { color: colors.textMuted }]}>CIBIL score</Text>
    </View>
  );
}

function FactorBar({ label, value, colors }) {
  if (value == null) return null;
  const pct = Math.max(0, Math.min(100, Number(value)));
  const barColor = pct >= 75 ? colors.success : pct >= 50 ? colors.warning : colors.danger;
  return (
    <View style={styles.factorRow}>
      <Text style={[styles.caption, { color: colors.textMuted, flex: 1 }]}>
        {titleCase(label)}
      </Text>
      <View style={[styles.factorTrack, { backgroundColor: colors.border }]}>
        <View style={[
          styles.factorFill,
          { width: `${pct}%`, backgroundColor: barColor },
        ]} />
      </View>
      <Text style={[styles.caption, { color: barColor, width: 36, textAlign: 'right' }]}>
        {Math.round(pct)}
      </Text>
    </View>
  );
}

function RefreshProfileSheet({ visible, onClose, onSubmit, loading }) {
  const [actualScore, setActualScore] = useState('');
  const [neverMissedPayment, setNeverMissedPayment] = useState('');
  const [actualCreditLimit, setActualCreditLimit] = useState('');

  function submit() {
    const score = Number(actualScore);
    const limit = Number(String(actualCreditLimit).replace(/,/g, ''));
    onSubmit({
      actualScore: Number.isFinite(score) && score > 0 ? score : undefined,
      actualCreditLimit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
      neverMissedPayment: neverMissedPayment.trim().toLowerCase() === 'yes',
    });
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Update CIBIL profile">
      <View style={styles.sheetContent}>
        <Input
          label="Your CIBIL score"
          value={actualScore}
          onChangeText={setActualScore}
          keyboardType="number-pad"
          accessibilityLabel="CIBIL score"
        />
        <Input
          label="Total credit limit (₹)"
          value={actualCreditLimit}
          onChangeText={setActualCreditLimit}
          keyboardType="decimal-pad"
          accessibilityLabel="Total credit limit"
        />
        <Input
          label="Never missed a payment? (yes / no)"
          value={neverMissedPayment}
          onChangeText={setNeverMissedPayment}
          accessibilityLabel="Never missed payment"
        />
        <Button
          title={loading ? 'Updating…' : 'Update profile'}
          onPress={submit}
          accessibilityLabel="Update CIBIL profile"
        />
      </View>
    </Sheet>
  );
}

export default function CreditScoreScreen() {
  const { colors } = useTheme();
  const [refreshOpen, setRefreshOpen] = useState(false);

  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
    fromCache,
  } = useApi(() => creditApi.profile(), []);

  const {
    data: intel,
    loading: intelLoading,
    error: intelError,
    refetch: refetchIntel,
  } = useApi(
    () => Promise.all([
      creditApi.healthScore(),
      creditApi.analytics(),
      creditApi.predictions(),
      creditApi.recommendations(),
      creditApi.borrowingInsights(),
      creditApi.risk(),
    ]).then(([health, analytics, predictions, recommendations, insights, risk]) => ({
      health, analytics, predictions, recommendations, insights, risk,
    })),
    []
  );

  const updateProfile = useMutation((body) => creditApi.updateProfile(body));

  async function handleRefreshProfile(body) {
    try {
      await updateProfile.mutate(body);
      setRefreshOpen(false);
      refetchProfile().catch(() => {});
      refetchIntel().catch(() => {});
    } catch {
      /* updateProfile.error surfaced below */
    }
  }

  const isLoading = profileLoading || intelLoading;
  if (isLoading) return <Screen><SkeletonList count={6} /></Screen>;

  const mainError = profileError || intelError;
  if (mainError && !profile && !intel) {
    return (
      <Screen>
        <ErrorState
          message={mainError?.message}
          onRetry={() => {
            refetchProfile().catch(() => {});
            refetchIntel().catch(() => {});
          }}
        />
      </Screen>
    );
  }

  const score = profile?.score;
  const hasScore = score != null && Number.isFinite(Number(score));
  const grade = profile?.grade;
  const factors = profile?.factors || {};
  const accounts = profile?.accounts || {};
  const creditCards = Array.isArray(profile?.creditCards)
    ? profile.creditCards : [];

  const health = intel?.health;
  const recommendations = Array.isArray(intel?.recommendations)
    ? intel.recommendations
    : Array.isArray(intel?.recommendations?.recommendations)
      ? intel.recommendations.recommendations
      : [];
  const predictions = intel?.predictions;
  const insights = intel?.insights;
  const risk = intel?.risk;

  return (
    <Screen scroll>
      {fromCache
        ? <Text style={[styles.caption, { color: colors.warning }]}>
            Showing saved profile — pull to refresh
          </Text>
        : null}

      <Card style={styles.block}>
        <View style={styles.between}>
          <Text style={[styles.heading, { color: colors.text }]}>
            CIBIL profile
          </Text>
          <TouchableOpacity
            accessibilityLabel="Update CIBIL profile"
            accessibilityRole="button"
            onPress={() => setRefreshOpen(true)}
            style={[styles.ghostBtn, { borderColor: colors.primary }]}
          >
            <Text style={[styles.caption, { color: colors.primary }]}>
              Refresh profile
            </Text>
          </TouchableOpacity>
        </View>

        {hasScore
          ? <ScoreGauge
              score={Number(score)}
              grade={grade}
              colors={colors}
            />
          : <View style={[styles.noScore, { backgroundColor: colors.warningSoft }]}>
              <Text style={[styles.subheading, { color: colors.warning }]}>
                No score on file
              </Text>
              <Text style={[styles.caption, { color: colors.textMuted }]}>
                Tap "Refresh profile" to enter your CIBIL score.
              </Text>
            </View>}

        {profile?.lastUpdated
          ? <Text style={[styles.caption, { color: colors.textMuted }]}>
              Last updated: {formatDate(profile.lastUpdated)}
            </Text>
          : null}
        {profile?.isRealData === false
          ? <Text style={[styles.caption, { color: colors.warning }]}>
              Profile may contain estimated data.
            </Text>
          : null}
      </Card>

      <Card style={styles.block}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Credit summary
        </Text>
        <View style={styles.statGrid}>
          {profile?.totalCreditLimit != null
            ? <StatTile
                label="Total limit"
                value={formatMoney(profile.totalCreditLimit)}
              />
            : null}
          {profile?.availableCredit != null
            ? <StatTile
                label="Available"
                value={formatMoney(profile.availableCredit)}
              />
            : null}
          {profile?.utilizationRatio != null
            ? <StatTile
                label="Utilisation"
                value={`${profile.utilizationRatio}%`}
              />
            : null}
        </View>
        {accounts.total != null
          ? <View style={styles.accountsRow}>
              <InfoRow
                label="Total accounts"
                value={String(accounts.total)}
                colors={colors}
              />
              {accounts.active != null
                ? <InfoRow
                    label="Active"
                    value={String(accounts.active)}
                    colors={colors}
                  />
                : null}
              {accounts.delinquent != null && accounts.delinquent > 0
                ? <InfoRow
                    label="Delinquent"
                    value={String(accounts.delinquent)}
                    colors={colors}
                  />
                : null}
            </View>
          : null}
      </Card>

      {Object.keys(factors).length > 0
        ? <Card style={styles.block}>
            <Text style={[styles.heading, { color: colors.text }]}>
              Score factors
            </Text>
            {Object.entries(factors).map(([k, v]) => (
              <FactorBar key={k} label={k} value={v} colors={colors} />
            ))}
          </Card>
        : null}

      {health != null
        ? <Card style={styles.block}>
            <Text style={[styles.heading, { color: colors.text }]}>
              Borrowing health score
            </Text>
            {typeof health === 'object'
              ? <>
                  {health?.score != null
                    ? <Text style={[styles.display, {
                        color: health.score >= 70 ? colors.success : colors.warning,
                      }]}>
                        {health.score}
                      </Text>
                    : null}
                  {health?.grade
                    ? <Text style={[styles.subheading, { color: colors.text }]}>
                        {titleCase(health.grade)}
                      </Text>
                    : null}
                  {health?.summary
                    ? <Text style={[styles.caption, { color: colors.textMuted }]}>
                        {health.summary}
                      </Text>
                    : null}
                </>
              : <Text style={[styles.body, { color: colors.text }]}>
                  {String(health)}
                </Text>}
          </Card>
        : null}

      {predictions != null
        ? <Card style={styles.block}>
            <Text style={[styles.heading, { color: colors.text }]}>
              Borrowing predictions
            </Text>
            {Array.isArray(predictions?.predictions)
              ? predictions.predictions.map((p, i) => (
                  <View key={i} style={styles.predictionItem}>
                    {p?.type
                      ? <Text style={[styles.bodyStrong, { color: colors.text }]}>
                          {titleCase(p.type)}
                        </Text>
                      : null}
                    {p?.prediction
                      ? <Text style={[styles.caption, { color: colors.textMuted }]}>
                          {p.prediction}
                        </Text>
                      : null}
                    {p?.probability != null
                      ? <Text style={[styles.caption, { color: colors.text }]}>
                          Probability: {formatPercent(p.probability)}
                        </Text>
                      : null}
                  </View>
                ))
              : <Text style={[styles.caption, { color: colors.textMuted }]}>
                  No prediction data returned.
                </Text>}
          </Card>
        : null}

      {recommendations.length > 0
        ? <Card style={styles.block}>
            <Text style={[styles.heading, { color: colors.text }]}>
              Recommendations
            </Text>
            {recommendations.map((rec, i) => (
              <View
                key={i}
                style={[styles.recItem, { borderLeftColor: colors.primary }]}
              >
                {rec?.title
                  ? <Text style={[styles.bodyStrong, { color: colors.text }]}>
                      {rec.title}
                    </Text>
                  : null}
                {rec?.description
                  ? <Text style={[styles.caption, { color: colors.textMuted }]}>
                      {rec.description}
                    </Text>
                  : null}
                {rec?.impact
                  ? <Text style={[styles.caption, { color: colors.success }]}>
                      Impact: {rec.impact}
                    </Text>
                  : null}
                {Array.isArray(rec?.actionItems) && rec.actionItems.length
                  ? rec.actionItems.map((action, j) => (
                      <Text
                        key={j}
                        style={[styles.caption, { color: colors.text }]}
                      >
                        • {action}
                      </Text>
                    ))
                  : null}
              </View>
            ))}
          </Card>
        : null}

      {insights != null
        ? <Card style={styles.block}>
            <Text style={[styles.heading, { color: colors.text }]}>
              Borrowing insights
            </Text>
            {Array.isArray(insights)
              ? insights.map((ins, i) => (
                  <Text key={i} style={[styles.caption, { color: colors.text }]}>
                    • {typeof ins === 'string' ? ins : ins?.text || ins?.insight || ''}
                  </Text>
                ))
              : typeof insights === 'object'
                ? Object.entries(insights).map(([k, v]) =>
                    v != null && typeof v !== 'object'
                      ? <InfoRow key={k} label={titleCase(k)} value={String(v)} colors={colors} />
                      : null
                  )
                : <Text style={[styles.body, { color: colors.text }]}>
                    {String(insights)}
                  </Text>}
          </Card>
        : null}

      {risk != null
        ? <Card style={styles.block}>
            <Text style={[styles.heading, { color: colors.text }]}>Risk profile</Text>
            {risk?.riskLevel
              ? <Text style={[styles.subheading, {
                  color: risk.riskLevel === 'low'
                    ? colors.success
                    : risk.riskLevel === 'medium'
                      ? colors.warning
                      : colors.danger,
                }]}>
                  {titleCase(risk.riskLevel)} risk
                </Text>
              : null}
            {risk?.summary
              ? <Text style={[styles.caption, { color: colors.textMuted }]}>
                  {risk.summary}
                </Text>
              : null}
            {Array.isArray(risk?.risks)
              ? risk.risks.map((r, i) => (
                  <Text key={i} style={[styles.caption, { color: colors.text }]}>
                    • {typeof r === 'string' ? r : r?.description || r?.type || ''}
                  </Text>
                ))
              : null}
          </Card>
        : null}

      {creditCards.length > 0
        ? <Card style={styles.block}>
            <Text style={[styles.heading, { color: colors.text }]}>
              Credit cards ({creditCards.length})
            </Text>
            {creditCards.map((card, i) => (
              <View
                key={card?._id || card?.id || i}
                style={[styles.cardRow, { borderTopColor: colors.border }]}
              >
                <Text style={[styles.bodyStrong, { color: colors.text }]}>
                  {card?.name || card?.bank || `Card ${i + 1}`}
                </Text>
                <View style={styles.between}>
                  {card?.creditLimit != null
                    ? <Text style={[styles.caption, { color: colors.textMuted }]}>
                        Limit: {formatMoney(card.creditLimit)}
                      </Text>
                    : null}
                  {card?.currentBalance != null
                    ? <Text style={[styles.caption, { color: colors.text }]}>
                        Balance: {formatMoney(card.currentBalance)}
                      </Text>
                    : null}
                </View>
              </View>
            ))}
          </Card>
        : null}

      {(profileError || intelError || updateProfile.error)
        ? <Text style={[styles.caption, { color: colors.danger }]}>
            {(profileError || intelError || updateProfile.error)?.message}
          </Text>
        : null}

      <RefreshProfileSheet
        visible={refreshOpen}
        onClose={() => setRefreshOpen(false)}
        onSubmit={handleRefreshProfile}
        loading={updateProfile.loading}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heading: { ...typography.heading },
  subheading: { ...typography.subheading },
  body: { ...typography.body },
  bodyStrong: { ...typography.bodyStrong },
  caption: { ...typography.caption },
  display: { ...typography.display, textAlign: 'center' },
  scoreDisplay: {
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 72,
    textAlign: 'center',
  },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gaugeContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  noScore: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    marginVertical: spacing.sm,
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  accountsRow: { gap: spacing.xs },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  factorTrack: {
    flex: 1,
    height: 6,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  factorFill: {
    height: 6,
    borderRadius: radii.pill,
  },
  recItem: {
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
    gap: 2,
    marginVertical: spacing.xs,
  },
  predictionItem: { gap: 2, paddingVertical: spacing.xs },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  cardRow: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  ghostBtn: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
