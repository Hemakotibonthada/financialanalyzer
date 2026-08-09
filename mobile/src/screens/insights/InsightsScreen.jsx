import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { insightsApi } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import { chartPalette, radii, spacing, typography } from "../../theme/tokens";
import { formatMoney, formatPercent, titleCase } from "../../utils/format";
import {
  Card,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  SkeletonList,
} from "../../components/ui";
import { BarChartCard, DonutChartCard } from "../../components/charts";
const arr = (v) =>
  Array.isArray(v)
    ? v
    : Array.isArray(v?.items)
      ? v.items
      : Array.isArray(v?.data)
        ? v.data
        : Array.isArray(v?.categories)
          ? v.categories
          : Array.isArray(v?.trends)
            ? v.trends
            : [];
const amt = (o, ks) =>
  Number(o?.[ks.find((k) => Number.isFinite(Number(o?.[k])))] || 0);
const dArr = (d, ks) => arr(d?.[ks.find((k) => Array.isArray(d?.[k]))]);
export default function InsightsScreen() {
  const { colors } = useTheme();
  const dash = useApi(() => insightsApi.dashboard(), []);
  const cat = useApi(() => insightsApi.categories(), []);
  const trend = useApi(() => insightsApi.trends(), []);
  const d = dash.data || {};
  const health = d.healthScore || d.financialHealth || {};
  const score = Number(health.score ?? health.value ?? d.score);
  const factors = arr(health.factors || d.factors);
  const insights = dArr(d, ["insights", "plainLanguageInsights", "cards"]);
  const merchants = dArr(d, ["topMerchants", "merchants"]);
  const changes = dArr(d, [
    "biggestChanges",
    "changes",
    "monthOverMonthChanges",
  ]);
  const cats = arr(cat.data)
    .map((x, i) => ({
      label: titleCase(x?.category || x?.name || x?.label || "Category"),
      value: amt(x, ["amount", "value", "total", "spent"]),
      color: chartPalette[i % chartPalette.length],
    }))
    .filter((x) => x.value > 0);
  const trends = arr(trend.data)
    .map((x) => ({
      label: x?.label || x?.month || x?.period || "",
      value: amt(x, ["amount", "value", "total", "spent"]),
    }))
    .filter((x) => x.label || x.value);
  const error = dash.error || cat.error || trend.error;
  const has =
    Number.isFinite(score) ||
    factors.length ||
    insights.length ||
    merchants.length ||
    changes.length ||
    cats.length ||
    trends.length;
  const ref = () => {
    dash.refetch().catch(() => {});
    cat.refetch().catch(() => {});
    trend.refetch().catch(() => {});
  };
  if (dash.loading || cat.loading || trend.loading)
    return (
      <Screen title="Insights" scroll>
        <Skeleton height={150} radius={radii.lg} style={styles.block} />
        <SkeletonList count={4} />
      </Screen>
    );
  if (error && !has)
    return (
      <Screen title="Insights">
        <ErrorState message={error.message} onRetry={ref} />
      </Screen>
    );
  if (!has)
    return (
      <Screen title="Insights" refreshing={dash.refreshing} onRefresh={ref}>
        <EmptyState
          title="No insights yet"
          description="Insights appear after the API has enough categorized activity."
        />
      </Screen>
    );
  return (
    <Screen
      title="Insights"
      scroll
      refreshing={dash.refreshing || cat.refreshing || trend.refreshing}
      onRefresh={ref}
    >
      {error ? <ErrorState message={error.message} onRetry={ref} /> : null}
      {Number.isFinite(score) ? (
        <Card style={styles.block}>
          <Text style={[styles.cap, { color: colors.textMuted }]}>
            Financial health score
          </Text>
          <Text style={[styles.score, { color: colors.primary }]}>
            {Math.round(score)}
          </Text>
          {factors.map((f, i) => (
            <View key={f?.id || i} style={styles.line}>
              <Text style={[styles.body, { color: colors.text }]}>
                {f?.name || f?.label || "Factor"}
              </Text>
              <Text style={[styles.strong, { color: colors.text }]}>
                {f?.score !== undefined
                  ? formatPercent(Number(f.score), 0)
                  : f?.status}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
      {cats.length ? (
        <DonutChartCard title="Spending by category" data={cats} />
      ) : null}
      {trends.length ? (
        <BarChartCard title="Month-over-month trend" data={trends} />
      ) : null}
      {insights.length ? (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Plain-language insights
          </Text>
          {insights.map((x, i) => (
            <Card key={x?.id || i} style={styles.mini}>
              <Text style={[styles.strong, { color: colors.text }]}>
                {x?.title || x?.heading || "Insight"}
              </Text>
              <Text style={[styles.cap, { color: colors.textMuted }]}>
                {x?.description || x?.message || x?.text}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}
      {merchants.length ? (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Top merchants
          </Text>
          {merchants.map((m, i) => (
            <View key={m?.id || i} style={styles.line}>
              <Text style={[styles.body, { color: colors.text }]}>
                {m?.name || m?.merchant || "Merchant"}
              </Text>
              <Text style={[styles.strong, { color: colors.text }]}>
                {formatMoney(amt(m, ["amount", "total", "value", "spent"]))}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {changes.length ? (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Biggest changes
          </Text>
          {changes.map((c, i) => {
            const v = amt(c, ["change", "amount", "delta"]);
            return (
              <View key={c?.id || i} style={styles.line}>
                <Text style={[styles.body, { color: colors.text }]}>
                  {titleCase(c?.category || c?.name || "Change")}
                </Text>
                <Text
                  style={[
                    styles.strong,
                    { color: v < 0 ? colors.success : colors.danger },
                  ]}
                >
                  {formatMoney(v, { signed: true })}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  block: { marginBottom: spacing.lg },
  cap: { ...typography.caption, marginTop: spacing.xs },
  score: { ...typography.display, marginTop: spacing.sm },
  line: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  body: { ...typography.body, flex: 1 },
  strong: { ...typography.bodyStrong },
  section: { marginTop: spacing.lg },
  heading: { ...typography.subheading, marginBottom: spacing.md },
  mini: { marginBottom: spacing.md },
});
