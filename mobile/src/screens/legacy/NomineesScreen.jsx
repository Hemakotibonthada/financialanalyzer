import React, { useMemo, useState, useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { nomineesApi } from "../../api/endpoints";
import { useApi, useMutation } from "../../hooks/useApi";
import { useTheme } from "../../contexts/ThemeContext";
import { radii, spacing, typography } from "../../theme/tokens";
import {
  formatDate,
  formatPercent,
  maskValue,
  titleCase,
} from "../../utils/format";
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
const arr = (v) =>
  Array.isArray(v)
    ? v
    : Array.isArray(v?.items)
      ? v.items
      : Array.isArray(v?.nominees)
        ? v.nominees
        : Array.isArray(v?.data)
          ? v.data
          : [];
const active = (n) =>
  !["inactive", "deleted", "removed"].includes(
    String(n?.status || "active").toLowerCase(),
  );
const share = (n) =>
  Number(n?.sharePercentage ?? n?.share ?? n?.percentage ?? 0) || 0;
export function isShareTotalValid(total) {
  return Math.round(Number(total || 0) * 100) / 100 === 100;
}
const minor = (dob) => {
  const d = new Date(dob);
  if (!dob || Number.isNaN(d.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (
    now.getMonth() < d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())
  )
    age--;
  return age < 18;
};
function NomineeSheet({
  visible,
  nominee,
  nominees,
  onClose,
  onSubmit,
  loading,
}) {
  const { colors } = useTheme();
  const [form, setForm] = useState({
    name: "",
    rel: "",
    share: "",
    phone: "",
    email: "",
    dob: "",
    gname: "",
    grel: "",
    gphone: "",
  });
  useEffect(() => {
    if (visible)
      setForm({
        name: nominee?.name || "",
        rel: nominee?.relationship || "",
        share: String(share(nominee) || ""),
        phone: nominee?.phone || "",
        email: nominee?.email || "",
        dob: nominee?.dateOfBirth || nominee?.dob || "",
        gname: nominee?.guardianName || nominee?.guardian?.name || "",
        grel:
          nominee?.guardianRelationship ||
          nominee?.guardian?.relationship ||
          "",
        gphone: nominee?.guardianPhone || nominee?.guardian?.phone || "",
      });
  }, [visible, nominee]);
  const set = (k, v) => setForm((x) => ({ ...x, [k]: v }));
  const others = nominees.filter(
    (n) => (n?.id || n?._id) !== (nominee?.id || nominee?._id),
  );
  const total =
    others.filter(active).reduce((s, n) => s + share(n), 0) +
    Number(form.share || 0);
  const valid = isShareTotalValid(total);
  const isMinor = minor(form.dob);
  const save = () =>
    onSubmit(nominee, {
      name: form.name.trim(),
      relationship: form.rel.trim(),
      sharePercentage: Number(form.share || 0),
      phone: form.phone.trim(),
      email: form.email.trim(),
      dateOfBirth: form.dob || null,
      guardian: isMinor
        ? {
            name: form.gname.trim(),
            relationship: form.grel.trim(),
            phone: form.gphone.trim(),
          }
        : null,
    });
  return (
    <Sheet
      visible={visible}
      title={nominee ? "Edit nominee" : "Add nominee"}
      onClose={onClose}
    >
      <View style={styles.fields}>
        <Text style={[styles.copy, { color: colors.text }]}>
          Under Indian law, a nominee is a trustee who receives funds. A nominee
          is not necessarily the legal heir entitled to keep those funds.
        </Text>
        <Input
          label="Name"
          value={form.name}
          onChangeText={(v) => set("name", v)}
        />
        <Input
          label="Relationship"
          value={form.rel}
          onChangeText={(v) => set("rel", v)}
        />
        <Input
          label="Share %"
          keyboardType="decimal-pad"
          value={form.share}
          onChangeText={(v) => set("share", v)}
          error={valid ? null : "Active nominees must total exactly 100%."}
        />
        <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: valid ? colors.success : colors.warning,
                width: `${Math.min(total, 100)}%`,
              },
            ]}
          />
        </View>
        <Text
          style={[
            styles.cap,
            { color: valid ? colors.success : colors.warning },
          ]}
        >
          Running active share total: {formatPercent(total)}
        </Text>
        <Input
          label="Phone"
          value={form.phone}
          onChangeText={(v) => set("phone", v)}
        />
        <Input
          label="Email"
          value={form.email}
          onChangeText={(v) => set("email", v)}
        />
        <Input
          label="Date of birth"
          placeholder="YYYY-MM-DD"
          value={form.dob}
          onChangeText={(v) => set("dob", v)}
        />
        {isMinor ? (
          <View style={styles.fields}>
            <Input
              label="Guardian name"
              value={form.gname}
              onChangeText={(v) => set("gname", v)}
            />
            <Input
              label="Guardian relationship"
              value={form.grel}
              onChangeText={(v) => set("grel", v)}
            />
            <Input
              label="Guardian phone"
              value={form.gphone}
              onChangeText={(v) => set("gphone", v)}
            />
          </View>
        ) : null}
        <Button
          accessibilityLabel="Save nominee"
          disabled={!form.name.trim() || !form.rel.trim() || !valid}
          loading={loading}
          onPress={save}
          title="Save nominee"
        />
      </View>
    </Sheet>
  );
}
export default function NomineesScreen() {
  const { colors } = useTheme();
  const state = useApi(() => nomineesApi.list(), []);
  const val = useApi(() => nomineesApi.shareValidation(), []);
  const save = useMutation((n, b) =>
    n?.id || n?._id
      ? nomineesApi.update(n.id || n._id, b)
      : nomineesApi.create(b),
  );
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const nominees = useMemo(() => arr(state.data), [state.data]);
  const total = nominees.filter(active).reduce((s, n) => s + share(n), 0);
  const valid = val.data?.valid ?? isShareTotalValid(total);
  const contacts = nominees.filter(active).every((n) => n.phone && n.email);
  const error = state.error || val.error || save.error;
  const empty = !nominees.length;
  const ref = () => {
    state.refetch().catch(() => {});
    val.refetch().catch(() => {});
  };
  const saveNom = async (n, b) => {
    await save.mutate(n, b);
    setOpen(false);
    ref();
  };
  if (state.loading || val.loading)
    return (
      <Screen title="Nominees" scroll>
        <Skeleton height={154} radius={radii.lg} style={styles.block} />
        <SkeletonList count={4} />
      </Screen>
    );
  if (error && empty)
    return (
      <Screen title="Nominees">
        <ErrorState message={error.message} onRetry={ref} />
      </Screen>
    );
  const sheet = (
    <NomineeSheet
      visible={open}
      nominee={edit}
      nominees={nominees}
      onClose={() => setOpen(false)}
      onSubmit={saveNom}
      loading={save.loading}
    />
  );
  if (empty)
    return (
      <Screen title="Nominees" refreshing={state.refreshing} onRefresh={ref}>
        <Card style={styles.block}>
          <Text style={[styles.critical, { color: colors.text }]}>
            Under Indian law, a nominee is a trustee who receives funds. A
            nominee is not necessarily the legal heir.
          </Text>
        </Card>
        <EmptyState
          title="No nominees added"
          description="Add nominees and split active shares to exactly 100%."
          actionLabel="Add nominee"
          onAction={() => {
            setEdit(null);
            setOpen(true);
          }}
        />
        {sheet}
      </Screen>
    );
  return (
    <Screen
      title="Nominees"
      scroll
      refreshing={state.refreshing || val.refreshing}
      onRefresh={ref}
    >
      {error ? <ErrorState message={error.message} onRetry={ref} /> : null}
      <Card style={styles.block}>
        <Text style={[styles.critical, { color: colors.text }]}>
          Under Indian law, a nominee is a trustee who receives funds, not
          necessarily the legal heir. Legal heirs may still be entitled to the
          money.
        </Text>
      </Card>
      <Card style={styles.block}>
        <View style={styles.between}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Active share total
          </Text>
          <Text
            style={[
              styles.heading,
              { color: valid ? colors.success : colors.warning },
            ]}
          >
            {formatPercent(total)}
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.surfaceAlt }]}>
          <View
            style={[
              styles.fill,
              {
                backgroundColor: valid ? colors.success : colors.warning,
                width: `${Math.min(total, 100)}%`,
              },
            ]}
          />
        </View>
        {!valid ? (
          <Text style={[styles.warn, { color: colors.warning }]}>
            Save is blocked until active nominee shares total exactly 100%.
          </Text>
        ) : null}
      </Card>
      <Card style={styles.block}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Legacy readiness
        </Text>
        {[
          ["Nominees present", nominees.filter(active).length > 0],
          ["Shares valid", valid],
          ["Contact details complete", contacts],
        ].map(([t, d]) => (
          <View key={t} style={styles.check}>
            <Text style={[styles.body, { color: colors.text }]}>{t}</Text>
            <Text
              style={[
                styles.strong,
                { color: d ? colors.success : colors.warning },
              ]}
            >
              {d ? "Done" : "Needs attention"}
            </Text>
          </View>
        ))}
      </Card>
      <View style={styles.right}>
        <Button
          accessibilityLabel="Add nominee"
          onPress={() => {
            setEdit(null);
            setOpen(true);
          }}
          title="Add nominee"
          variant="secondary"
        />
      </View>
      <View style={styles.list}>
        {nominees.map((n, i) => (
          <Card key={n?.id || n?._id || i}>
            <View style={styles.between}>
              <View style={styles.flex}>
                <Text style={[styles.heading, { color: colors.text }]}>
                  {n?.name || "Unnamed nominee"}
                </Text>
                <Text style={[styles.cap, { color: colors.textMuted }]}>
                  {titleCase(n?.relationship)} · {formatPercent(share(n))}
                </Text>
              </View>
              <Text
                style={[
                  styles.strong,
                  {
                    color:
                      String(n?.verificationStatus || "").toLowerCase() ===
                      "verified"
                        ? colors.success
                        : colors.warning,
                  },
                ]}
              >
                {titleCase(n?.verificationStatus || n?.kycStatus || "pending")}
              </Text>
            </View>
            <Text style={[styles.cap, { color: colors.textMuted }]}>
              Phone {maskValue(n?.phone)} · Email {maskValue(n?.email)}
            </Text>
            <Text style={[styles.cap, { color: colors.textMuted }]}>
              Date of birth {formatDate(n?.dateOfBirth || n?.dob)}
            </Text>
            <Button
              accessibilityLabel={`Edit nominee ${n?.name || ""}`}
              onPress={() => {
                setEdit(n);
                setOpen(true);
              }}
              title="Edit nominee"
              variant="ghost"
            />
          </Card>
        ))}
      </View>
      {sheet}
    </Screen>
  );
}
const styles = StyleSheet.create({
  block: { marginBottom: spacing.lg },
  fields: { gap: spacing.md },
  copy: { ...typography.body, lineHeight: 22 },
  critical: { ...typography.bodyStrong, lineHeight: 22 },
  heading: { ...typography.subheading },
  between: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  track: {
    borderRadius: radii.pill,
    height: 12,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  fill: { borderRadius: radii.pill, height: "100%" },
  cap: { ...typography.caption, marginTop: spacing.xs },
  warn: { ...typography.caption, fontWeight: "700", marginTop: spacing.sm },
  check: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  body: { ...typography.body, flex: 1 },
  strong: { ...typography.bodyStrong },
  right: { alignItems: "flex-end", marginBottom: spacing.md },
  list: { gap: spacing.md },
  flex: { flex: 1 },
});
