import React, { useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import * as Sharing from 'expo-sharing';

import { downloadFile } from '../../api/client';

import { reportsApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { formatDate, formatMoney, titleCase } from '../../utils/format';
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
  StatTile
} from '../../components/ui';
import { HIT_TARGET, radii, spacing, typography } from '../../theme/tokens';

function getId(item) {
  return item?.id || item?._id || item?.templateId;
}

function TemplateCard({ template, colors, onSelect }) {
  return (
    <TouchableOpacity
      accessibilityLabel={`Select template ${template?.name}`}
      accessibilityRole="button"
      onPress={() => onSelect(template)}
      style={[styles.templateCard, { borderColor: colors.border }]}
    >
      <Text style={[styles.subheading, { color: colors.text }]}>
        {template?.name || '—'}
      </Text>
      {template?.description ? (
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {template.description}
        </Text>
      ) : null}
      {template?.type ? (
        <Text style={[styles.chip, { color: colors.primary }]}>
          {titleCase(template.type)}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

function GenerateSheet({ visible, template, onClose, onSubmit, loading, colors }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(monthAgoStr);
  const [endDate, setEndDate] = useState(todayStr);

  function submit() {
    if (!startDate || !endDate) return;
    onSubmit({
      templateId: getId(template),
      format: 'json',
      dateRange: { startDate, endDate }
    });
  }

  function handleClose() {
    onClose();
  }

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={`Generate: ${template?.name || 'Report'}`}
    >
      <View style={styles.sheetContent}>
        <Input
          label="Start date (YYYY-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
          accessibilityLabel="Start date"
        />
        <Input
          label="End date (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
          accessibilityLabel="End date"
        />
        <Button
          title={loading ? 'Generating…' : 'Generate report'}
          onPress={submit}
          accessibilityLabel="Generate report"
          accessibilityRole="button"
        />
        <TouchableOpacity
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          onPress={handleClose}
          style={[styles.cancelButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

function ScheduleSheet({ visible, template, onClose, onSubmit, loading, colors }) {
  const [frequency, setFrequency] = useState('monthly');
  const [email, setEmail] = useState('');

  function submit() {
    if (!getId(template)) return;
    onSubmit({
      templateId: getId(template),
      schedule: { frequency, email: email.trim() }
    });
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={`Schedule: ${template?.name || 'Report'}`}
    >
      <View style={styles.sheetContent}>
        <Input
          label="Frequency (daily / weekly / monthly)"
          value={frequency}
          onChangeText={setFrequency}
          accessibilityLabel="Schedule frequency"
        />
        <Input
          label="Delivery email (optional)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          accessibilityLabel="Delivery email"
        />
        <Button
          title={loading ? 'Scheduling…' : 'Schedule report'}
          onPress={submit}
          accessibilityLabel="Schedule report"
          accessibilityRole="button"
        />
        <TouchableOpacity
          accessibilityLabel="Cancel"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.cancelButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
}

export default function ReportsScreen() {
  const { colors } = useTheme();
  const [generateTemplate, setGenerateTemplate] = useState(null);
  const [scheduleTemplate, setScheduleTemplate] = useState(null);
  const [exportStatus, setExportStatus] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [emiLoading, setEmiLoading] = useState(false);
  const [allLoading, setAllLoading] = useState(false);

  const { data: templatesData, loading: tLoading, error: tError,
    refetch: tRefetch, refreshing, onRefresh } =
    useApi(() => reportsApi.templates(), []);

  const { data: summaryData, loading: sLoading } =
    useApi(() => reportsApi.summary(), []);

  const generateMut = useMutation((body) => reportsApi.generate(body));
  const scheduleMut = useMutation((body) => reportsApi.schedule(body));

  const templates =
    templatesData?.templates ||
    templatesData?.data?.templates ||
    (Array.isArray(templatesData) ? templatesData : []);

  const summary = summaryData?.summary || summaryData?.data || summaryData || {};

  async function handleGenerate(body) {
    try {
      await generateMut.mutate(body);
      setGenerateTemplate(null);
      Alert.alert('Report generated', 'Your report has been generated successfully.');
    } catch {
      // generateMut.error surfaces
    }
  }

  async function handleSchedule(body) {
    try {
      await scheduleMut.mutate(body);
      setScheduleTemplate(null);
      Alert.alert('Scheduled', 'Your report has been scheduled.');
    } catch {
      // scheduleMut.error surfaces
    }
  }

  async function handleExport(path, method, body, setLoading) {
    setExportStatus(null);
    setLoading(true);
    try {
      const result = await downloadFile(path, { method, body });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Save or share the exported file'
        });
      }
      setExportStatus({
        ok: true,
        filename: result.name,
        password: result.documentPassword || null,
        shared: canShare
      });
    } catch (err) {
      setExportStatus({ ok: false, msg: err?.message || 'Export failed.' });
    } finally {
      setLoading(false);
    }
  }

  if (tLoading || sLoading) {
    return <Screen><SkeletonList count={5} /></Screen>;
  }

  if (tError) {
    return (
      <Screen>
        <ErrorState message={tError?.message} onRetry={tRefetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.title, { color: colors.text }]}>Reports</Text>

        {/* Summary */}
        {Object.keys(summary).length > 0 && (
          <Card style={styles.cardGap}>
            <SectionHeader title="Quick summary" />
            <View style={styles.statsRow}>
              {summary?.income != null && (
                <StatTile label="Income" value={formatMoney(summary.income)} />
              )}
              {summary?.expenses != null && (
                <StatTile label="Expenses" value={formatMoney(summary.expenses)} />
              )}
              {summary?.savings != null && (
                <StatTile label="Savings" value={formatMoney(summary.savings)} />
              )}
              {summary?.period ? (
                <StatTile label="Period" value={titleCase(summary.period)} />
              ) : null}
            </View>
          </Card>
        )}

        {/* Export status / password banner */}
        {exportStatus ? (
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: exportStatus.ok
                  ? colors.successSoft
                  : colors.dangerSoft,
                borderColor: exportStatus.ok ? colors.success : colors.danger
              }
            ]}
          >
            {exportStatus.ok ? (
              <>
                <Text style={[styles.statusText, { color: colors.success }]}>
                  {exportStatus.shared
                    ? `✓ ${exportStatus.filename} — shared successfully.`
                    : `✓ ${exportStatus.filename} — saved (sharing not available).`}
                </Text>
                {exportStatus.password ? (
                  <View style={styles.passwordWrap}>
                    <Text style={[styles.passwordLabel, { color: colors.success }]}>
                      🔒 File password (required to open):
                    </Text>
                    <Text
                      selectable
                      style={[styles.passwordValue, { color: colors.text }]}
                    >
                      {exportStatus.password}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>
                      Long-press the password above to copy it.
                    </Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={[styles.statusText, { color: colors.danger }]}>
                {exportStatus.msg}
              </Text>
            )}
          </View>
        ) : null}

        {/* Mutation errors */}
        {(generateMut.error || scheduleMut.error) ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {(generateMut.error || scheduleMut.error)?.message}
          </Text>
        ) : null}

        {/* Export section */}
        <View style={styles.section}>
          <SectionHeader title="Export data" />
          <TouchableOpacity
            accessibilityLabel="Export transactions to Excel"
            accessibilityRole="button"
            disabled={txLoading}
            onPress={() => {
              const endDate = new Date().toISOString();
              const startDate = new Date(
                Date.now() - 90 * 86400000
              ).toISOString();
              handleExport(
                '/export/transactions/excel',
                'POST',
                { startDate, endDate },
                setTxLoading
              );
            }}
            style={[styles.exportBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.exportBtnText, { color: colors.text }]}>
              {txLoading ? 'Exporting…' : '📊 Export transactions (Excel)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Export EMI schedule to Excel"
            accessibilityRole="button"
            disabled={emiLoading}
            onPress={() =>
              handleExport(
                '/export/emi/excel',
                'GET',
                null,
                setEmiLoading
              )
            }
            style={[styles.exportBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.exportBtnText, { color: colors.text }]}>
              {emiLoading ? 'Exporting…' : '🗓 Export EMI schedule (Excel)'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Export all data to Excel"
            accessibilityRole="button"
            disabled={allLoading}
            onPress={() =>
              handleExport(
                '/export/all/excel',
                'GET',
                null,
                setAllLoading
              )
            }
            style={[styles.exportBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.exportBtnText, { color: colors.text }]}>
              {allLoading ? 'Exporting…' : '📁 Export all data (Excel)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Templates */}
        <View style={styles.section}>
          <SectionHeader title="Report templates" />
          {!templates.length ? (
            <EmptyState
              title="No templates available"
              message="Report templates will appear here when configured."
            />
          ) : (
            templates.map((t) => (
              <TemplateCard
                key={getId(t)}
                template={t}
                colors={colors}
                onSelect={(tmpl) => setGenerateTemplate(tmpl)}
              />
            ))
          )}
        </View>

        {/* Schedule buttons for each template */}
        {templates.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Schedule a report" />
            {templates.map((t) => (
              <TouchableOpacity
                key={`sched-${getId(t)}`}
                accessibilityLabel={`Schedule ${t?.name}`}
                accessibilityRole="button"
                onPress={() => setScheduleTemplate(t)}
                style={[styles.scheduleBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.bodyStrong, { color: colors.text }]}>
                  🔄 Schedule: {t?.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Generate sheet */}
      <GenerateSheet
        visible={Boolean(generateTemplate)}
        template={generateTemplate}
        onClose={() => setGenerateTemplate(null)}
        onSubmit={handleGenerate}
        loading={generateMut.loading}
        colors={colors}
      />

      {/* Schedule sheet */}
      <ScheduleSheet
        visible={Boolean(scheduleTemplate)}
        template={scheduleTemplate}
        onClose={() => setScheduleTemplate(null)}
        onSubmit={handleSchedule}
        loading={scheduleMut.loading}
        colors={colors}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl
  },
  title: {
    ...typography.title
  },
  cardGap: {
    gap: spacing.md
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  section: {
    gap: spacing.md
  },
  templateCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs
  },
  exportBtn: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    justifyContent: 'center'
  },
  exportBtnText: {
    ...typography.bodyStrong
  },
  scheduleBtn: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    justifyContent: 'center'
  },
  statusText: {
    ...typography.body
  },
  statusBanner: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md
  },
  passwordWrap: {
    gap: spacing.sm,
    paddingTop: spacing.xs
  },
  passwordLabel: {
    ...typography.bodyStrong
  },
  passwordValue: {
    ...typography.heading,
    letterSpacing: 1
  },
  errorText: {
    ...typography.caption,
    textAlign: 'center'
  },
  sheetContent: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  cancelButton: {
    minHeight: HIT_TARGET,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelText: {
    ...typography.bodyStrong
  },
  subheading: {
    ...typography.subheading
  },
  bodyStrong: {
    ...typography.bodyStrong
  },
  meta: {
    ...typography.caption
  },
  chip: {
    ...typography.micro
  }
});
