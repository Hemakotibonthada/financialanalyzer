import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { netWorthApi } from "../../api/endpoints";
import { useApi } from "../../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import { chartPalette, radii, spacing, typography } from "../../theme/tokens";
import {
  formatDate,
  formatMoney,
  formatPercent,
  titleCase,
} from "../../utils/format";
import {
  Card,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  SkeletonList,
} from "../../components/ui";
import { LineChartCard } from "../../components/charts";
const arr = (v) =>
  Array.isArray(v)
    ? v
    : Array.isArray(v?.items)
      ? v.items
      : Array.isArray(v?.data)
        ? v.data
        : Array.isArray(v?.history)
          ? v.history
          : [];
const amt = (o, ks) =>
  Number(o?.[ks.find((k) => Number.isFinite(Number(o?.[k])))] || 0);
const sum = (xs) =>
  xs.reduce((s, x) => s + amt(x, ["amount", "value", "balance"]), 0);
export default function NetWorthScreen() {
  const { colors } = useTheme();
  const cur = useApi(() => netWorthApi.current(), []);
  const hist = useApi(() => netWorthApi.history(), []);
  const data = cur.data?.netWorth || cur.data || {};
  const assets = arr(data.assets || data.assetBreakdown);
  const liabilities = arr(data.liabilities || data.liabilityBreakdown);
  const assetTotal = amt(data, ["totalAssets", "assetsTotal"]) || sum(assets);
  const liabilityTotal =
    amt(data, ["totalLiabilities", "liabilitiesTotal"]) || sum(liabilities);
  const net = amt(data, ["netWorth", "value"]) || assetTotal - liabilityTotal;
  const history = arr(hist.data);
  const trend = history
    .map((p) => ({
      label: p?.label || p?.month || formatDate(p?.date, "MMM"),
      value: amt(p, ["netWorth", "value", "amount"]),
    }))
    .filter((p) => p.label || p.value);
  const prev = trend[trend.length - 2]?.value;
  const diff = Number.isFinite(prev) ? net - prev : 0;
  const pct = prev ? (diff / Math.abs(prev)) * 100 : 0;
  const error = cur.error || hist.error;
  const empty = !assetTotal && !liabilityTotal && !trend.length;
  const retry = () => {
    cur.refetch().catch(() => {});
    hist.refetch().catch(() => {});
  };
  if (cur.loading || hist.loading)
    return (
      <Screen title="Net worth" scroll>
        <Skeleton height={148} radius={radii.lg} style={styles.block} />
        <Skeleton height={220} radius={radii.lg} style={styles.block} />
        <SkeletonList count={4} />
      </Screen>
    );
  if (error && empty)
    return (
      <Screen title="Net worth">
        <ErrorState message={error.message} onRetry={retry} />
      </Screen>
    );
  if (empty)
    return (
      <Screen title="Net worth" refreshing={cur.refreshing} onRefresh={retry}>
        <EmptyState
          title="No net worth data"
          description="Add assets and liabilities to track wealth over time."
        />
      </Screen>
    );
  const breakdown = (title, items, total, tone) => (
    <Card style={styles.block}>
      <View style={styles.between}>
        <Text style={[styles.heading, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.heading, { color: tone }]}>
          {formatMoney(total)}
        </Text>
      </View>
      {items.length ? (
        items.map((x, i) => (
          <View key={x?.id || x?._id || i} style={styles.line}>
            <Text style={[styles.body, { color: colors.text }]}>
              {titleCase(x?.name || x?.type || x?.category || "Item")}
            </Text>
            <Text style={[styles.strong, { color: colors.text }]}>
              {formatMoney(amt(x, ["amount", "value", "balance"]))}
            </Text>
          </View>
        ))
      ) : (
        <Text style={[styles.cap, { color: colors.textMuted }]}>
          No {title.toLowerCase()} listed.
        </Text>
      )}
    </Card>
  );
  return (
    <Screen
      title="Net worth"
      scroll
      refreshing={cur.refreshing || hist.refreshing}
      onRefresh={retry}
    >
      {error ? <ErrorState message={error.message} onRetry={retry} /> : null}
      <Card style={styles.block}>
        <Text style={[styles.cap, { color: colors.textMuted }]}>
          Assets minus liabilities
        </Text>
        <Text style={[styles.display, { color: colors.text }]}>
          {formatMoney(net)}
        </Text>
        <Text
          style={[
            styles.strong,
            { color: diff < 0 ? colors.danger : colors.success },
          ]}
        >
          {diff >= 0 ? "Up" : "Down"} {formatMoney(Math.abs(diff))} this month
          {prev ? ` (${formatPercent(pct)})` : ""}
        </Text>
      </Card>
      {trend.length ? (
        <LineChartCard
          title="Net worth trend"
          data={trend}
          color={chartPalette[0]}
        />
      ) : null}
      <View style={styles.tiles}>
        <Card style={styles.tile}>
          <Text style={[styles.cap, { color: colors.textMuted }]}>Assets</Text>
          <Text style={[styles.heading, { color: colors.success }]}>
            {formatMoney(assetTotal)}
          </Text>
        </Card>
        <Card style={styles.tile}>
          <Text style={[styles.cap, { color: colors.textMuted }]}>
            Liabilities
          </Text>
          <Text style={[styles.heading, { color: colors.danger }]}>
            {formatMoney(liabilityTotal)}
          </Text>
        </Card>
      </View>
      {breakdown("Assets", assets, assetTotal, colors.success)}
      {breakdown("Liabilities", liabilities, liabilityTotal, colors.danger)}
    </Screen>
  );
}
const styles = StyleSheet.create({
  block: { marginBottom: spacing.lg },
  cap: { ...typography.caption, marginTop: spacing.xs },
  display: { ...typography.display, marginTop: spacing.xs },
  strong: { ...typography.bodyStrong, marginTop: spacing.sm },
  heading: { ...typography.subheading },
  between: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tiles: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg },
  tile: { flex: 1 },
  line: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  body: { ...typography.body, flex: 1 },
});
