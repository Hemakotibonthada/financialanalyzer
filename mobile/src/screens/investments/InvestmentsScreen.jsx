import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { investmentsApi } from "../../api/endpoints";
import { useApi, useMutation } from "../../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import {
  chartPalette,
  HIT_TARGET,
  radii,
  spacing,
  typography,
} from "../../theme/tokens";
import { formatMoney, formatPercent, titleCase } from "../../utils/format";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  Sheet,
  Skeleton,
  SkeletonList,
} from "../../components/ui";
import { DonutChartCard } from "../../components/charts";
const arr = (v) =>
  Array.isArray(v)
    ? v
    : Array.isArray(v?.items)
      ? v.items
      : Array.isArray(v?.holdings)
        ? v.holdings
        : Array.isArray(v?.data)
          ? v.data
          : [];
const amt = (o, ks) =>
  Number(o?.[ks.find((k) => Number.isFinite(Number(o?.[k])))] || 0);
const met = (h) => {
  const invested = amt(h, [
    "invested",
    "investedValue",
    "totalInvested",
    "costBasis",
  ]);
  const current = amt(h, ["current", "currentValue", "marketValue", "value"]);
  const gain = Number.isFinite(Number(h?.gainLoss))
    ? Number(h.gainLoss)
    : current - invested;
  return {
    invested,
    current,
    gain,
    returnPercent: invested
      ? (gain / invested) * 100
      : Number(h?.returnPercent || 0),
  };
};
function HoldingSheet({ visible, onClose, onSubmit, loading }) {
  const [form, setForm] = useState({
    name: "",
    type: "",
    units: "",
    invested: "",
    current: "",
  });
  const set = (k, v) => setForm((x) => ({ ...x, [k]: v }));
  const save = () =>
    onSubmit({
      name: form.name.trim(),
      type: form.type.trim(),
      units: Number(form.units || 0),
      invested: Number(form.invested || 0),
      currentValue: Number(form.current || 0),
    }).then(() =>
      setForm({ name: "", type: "", units: "", invested: "", current: "" }),
    );
  return (
    <Sheet visible={visible} title="Add holding" onClose={onClose}>
      <View style={styles.fields}>
        <Input
          label="Name"
          value={form.name}
          onChangeText={(v) => set("name", v)}
        />
        <Input
          label="Type"
          value={form.type}
          onChangeText={(v) => set("type", v)}
        />
        <Input
          label="Units"
          keyboardType="decimal-pad"
          value={form.units}
          onChangeText={(v) => set("units", v)}
        />
        <Input
          label="Invested"
          keyboardType="decimal-pad"
          value={form.invested}
          onChangeText={(v) => set("invested", v)}
        />
        <Input
          label="Current value"
          keyboardType="decimal-pad"
          value={form.current}
          onChangeText={(v) => set("current", v)}
        />
        <Button
          accessibilityLabel="Save holding"
          disabled={!form.name.trim() || !form.type.trim()}
          loading={loading}
          onPress={save}
          title="Save holding"
        />
      </View>
    </Sheet>
  );
}
export default function InvestmentsScreen() {
  const { colors } = useTheme();
  const [sort, setSort] = useState("current");
  const [open, setOpen] = useState(false);
  const p = useApi(() => investmentsApi.portfolio(), []);
  const l = useApi(() => investmentsApi.list(), []);
  const sync = useMutation(() => investmentsApi.syncPrices());
  const create = useMutation((b) => investmentsApi.create(b));
  const holdings = useMemo(
    () =>
      [...arr(l.data)].sort((a, b) =>
        sort === "name"
          ? String(a?.name || "").localeCompare(String(b?.name || ""))
          : sort === "gain"
            ? met(b).gain - met(a).gain
            : met(b).current - met(a).current,
      ),
    [l.data, sort],
  );
  const portfolio = p.data?.portfolio || p.data || {};
  const totalInvested =
    amt(portfolio, ["totalInvested", "invested"]) ||
    holdings.reduce((s, h) => s + met(h).invested, 0);
  const currentValue =
    amt(portfolio, ["currentValue", "totalValue", "marketValue"]) ||
    holdings.reduce((s, h) => s + met(h).current, 0);
  const gain = Number.isFinite(Number(portfolio.gainLoss))
    ? Number(portfolio.gainLoss)
    : currentValue - totalInvested;
  const ret = totalInvested ? (gain / totalInvested) * 100 : 0;
  const allocation = (
    arr(portfolio.allocation || portfolio.assetAllocation).length
      ? arr(portfolio.allocation || portfolio.assetAllocation)
      : holdings
  )
    .map((x, i) => ({
      label: titleCase(x?.type || x?.assetType || x?.name || "Asset"),
      value: amt(x, ["value", "currentValue", "marketValue"]),
      color: chartPalette[i % chartPalette.length],
    }))
    .filter((x) => x.value > 0);
  const error = p.error || l.error || sync.error || create.error;
  const empty = !holdings.length && !currentValue && !totalInvested;
  const ref = () => {
    p.refetch().catch(() => {});
    l.refetch().catch(() => {});
  };
  const add = async (b) => {
    await create.mutate(b);
    setOpen(false);
    ref();
  };
  if (p.loading || l.loading)
    return (
      <Screen title="Investments" scroll>
        <Skeleton height={148} radius={radii.lg} style={styles.block} />
        <SkeletonList count={4} />
      </Screen>
    );
  if (error && empty)
    return (
      <Screen title="Investments">
        <ErrorState message={error.message} onRetry={ref} />
      </Screen>
    );
  if (empty)
    return (
      <Screen
        title="Investments"
        refreshing={l.refreshing}
        onRefresh={l.onRefresh}
      >
        <EmptyState
          title="No investments yet"
          description="Add your first holding to track allocation and returns."
          actionLabel="Add holding"
          onAction={() => setOpen(true)}
        />
        <HoldingSheet
          visible={open}
          onClose={() => setOpen(false)}
          onSubmit={add}
          loading={create.loading}
        />
      </Screen>
    );
  return (
    <Screen
      title="Investments"
      scroll
      refreshing={l.refreshing || p.refreshing}
      onRefresh={ref}
    >
      {error ? <ErrorState message={error.message} onRetry={ref} /> : null}
      <Card style={styles.block}>
        <Text style={[styles.cap, { color: colors.textMuted }]}>
          Portfolio value
        </Text>
        <Text style={[styles.display, { color: colors.text }]}>
          {formatMoney(currentValue)}
        </Text>
        <View style={styles.row}>
          <View>
            <Text style={[styles.cap, { color: colors.textMuted }]}>
              Invested
            </Text>
            <Text style={[styles.strong, { color: colors.text }]}>
              {formatMoney(totalInvested)}
            </Text>
          </View>
          <View>
            <Text style={[styles.cap, { color: colors.textMuted }]}>
              Gain / loss
            </Text>
            <Text
              style={[
                styles.strong,
                { color: gain < 0 ? colors.danger : colors.success },
              ]}
            >
              {formatMoney(gain, { signed: true })} · {formatPercent(ret)}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Button
            accessibilityLabel="Refresh investment prices"
            loading={sync.loading}
            onPress={() =>
              sync
                .mutate()
                .then(ref)
                .catch(() => {})
            }
            title="Refresh prices"
            variant="secondary"
          />
          <Button
            accessibilityLabel="Add investment holding"
            onPress={() => setOpen(true)}
            title="Add holding"
          />
        </View>
      </Card>
      {allocation.length ? (
        <DonutChartCard title="Asset allocation" data={allocation} />
      ) : null}
      <View style={styles.chips}>
        {[
          ["name", "Name"],
          ["current", "Value"],
          ["gain", "Gain"],
        ].map(([k, v]) => (
          <Pressable
            key={k}
            accessibilityLabel={`Sort holdings by ${v}`}
            accessibilityRole="button"
            onPress={() => setSort(k)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  sort === k ? colors.primary : colors.surfaceAlt,
                borderColor: sort === k ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: sort === k ? colors.onPrimary : colors.text },
              ]}
            >
              {v}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.list}>
        {holdings.map((h, i) => {
          const m = met(h);
          return (
            <Card key={h?.id || h?._id || i}>
              <View style={styles.between}>
                <View style={styles.flex}>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {h?.name || h?.symbol || "Unnamed holding"}
                  </Text>
                  <Text style={[styles.cap, { color: colors.textMuted }]}>
                    {titleCase(h?.type || h?.assetType)} ·{" "}
                    {Number(h?.units || 0)} units
                  </Text>
                </View>
                <Text style={[styles.strong, { color: colors.text }]}>
                  {formatMoney(m.current)}
                </Text>
              </View>
              <View style={styles.between}>
                <Text style={[styles.cap, { color: colors.textMuted }]}>
                  Invested {formatMoney(m.invested)}
                </Text>
                <Text
                  style={[
                    styles.strong,
                    { color: m.gain < 0 ? colors.danger : colors.success },
                  ]}
                >
                  {formatMoney(m.gain, { signed: true })} ·{" "}
                  {formatPercent(m.returnPercent)}
                </Text>
              </View>
            </Card>
          );
        })}
      </View>
      <HoldingSheet
        visible={open}
        onClose={() => setOpen(false)}
        onSubmit={add}
        loading={create.loading}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({
  block: { marginBottom: spacing.lg },
  fields: { gap: spacing.md },
  cap: { ...typography.caption, marginTop: spacing.xs },
  display: { ...typography.display, marginTop: spacing.xs },
  row: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.lg },
  strong: { ...typography.bodyStrong },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  chips: { flexDirection: "row", gap: spacing.sm, marginVertical: spacing.lg },
  chip: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: HIT_TARGET,
    paddingHorizontal: spacing.md,
  },
  chipText: { ...typography.caption, fontWeight: "700" },
  list: { gap: spacing.md },
  between: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  flex: { flex: 1 },
  title: { ...typography.subheading },
});
