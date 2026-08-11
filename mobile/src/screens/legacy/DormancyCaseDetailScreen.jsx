import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { dormancyApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import {
  formatDate,
  formatDateTime,
  relativeTime,
  titleCase,
} from '../../utils/format';
import {
  Button,
  Card,
  ErrorState,
  Input,
  Screen,
  Sheet,
  SectionHeader,
  SkeletonList,
} from '../../components/ui';
import { spacing, typography } from '../../theme/tokens';

const OUTREACH_CHANNELS = [
  'email', 'sms', 'phone_call', 'whatsapp',
  'postal', 'in_app', 'nominee_contact', 'emergency_contact',
];

const OUTREACH_OUTCOMES = [
  'no_answer', 'reached_user', 'reached_family', 'wrong_number',
  'number_invalid', 'mailbox_full', 'bounced', 'callback_requested',
  'refused', 'confirmed_alive', 'death_reported', 'other',
];

function InfoRow({ label, value, colors }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value || '—'}</Text>
    </View>
  );
}

function AssignSheet({ visible, onClose, onSubmit, loading, error }) {
  const { colors } = useTheme();
  const [assignedTo, setAssignedTo] = useState('');
  return (
    <Sheet visible={visible} title="Assign case" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Input
          label="Assign to (user ID or name)"
          value={assignedTo}
          onChangeText={setAssignedTo}
          accessibilityLabel="Assignee"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Assign"
          loading={loading}
          disabled={!assignedTo.trim()}
          onPress={() => onSubmit({ assignedTo: assignedTo.trim() })}
          accessibilityLabel="Confirm assign"
        />
      </View>
    </Sheet>
  );
}

function OutreachSheet({ visible, onClose, onSubmit, loading, error }) {
  const { colors } = useTheme();
  const [channel, setChannel] = useState('');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <Sheet visible={visible} title="Record outreach attempt" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Input
          label={`Channel (${OUTREACH_CHANNELS.join(', ')})`}
          value={channel}
          onChangeText={setChannel}
          accessibilityLabel="Outreach channel"
        />
        <Input
          label={`Outcome (${OUTREACH_OUTCOMES.join(', ')})`}
          value={outcome}
          onChangeText={setOutcome}
          accessibilityLabel="Outreach outcome"
        />
        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          accessibilityLabel="Outreach notes"
          multiline
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Record outreach"
          loading={loading}
          disabled={!channel.trim() || !outcome.trim()}
          onPress={() =>
            onSubmit({
              channel: channel.trim(),
              outcome: outcome.trim(),
              notes: notes.trim(),
              occurredAt: new Date().toISOString(),
            })
          }
          accessibilityLabel="Confirm record outreach"
        />
      </View>
    </Sheet>
  );
}

export default function DormancyCaseDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { colors } = useTheme();

  const { data, loading, error, refetch } = useApi(
    () => dormancyApi.detail(id),
    [id],
  );

  const [assignOpen, setAssignOpen] = useState(false);
  const [outreachOpen, setOutreachOpen] = useState(false);

  const assign = useMutation((body) => dormancyApi.assign(id, body));
  const outreach = useMutation((body) => dormancyApi.recordOutreach(id, body));
  const resolveAlive = useMutation((body) => dormancyApi.resolveAlive(id, body));
  const escalate = useMutation((body) => dormancyApi.escalate(id, body));

  if (loading) {
    return (
      <Screen title="Dormancy Case">
        <SkeletonList count={8} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Dormancy Case">
        <ErrorState message={error.message} onRetry={refetch} />
      </Screen>
    );
  }

  const c = data || {};
  const timeline = Array.isArray(c.timeline) ? c.timeline : [];
  const isTerminal = ['closed_alive', 'closed_deceased', 'closed_false_alarm',
    'cancelled', 'resolved_alive', 'escalated_estate'].includes(
    c.stage || c.status,
  );

  const handleResolveAlive = () => {
    Alert.alert(
      'Confirm: Account Holder Is Alive',
      'This confirms that you have made direct contact with the account holder ' +
      'and they have confirmed they are alive and well. ' +
      'The dormancy case will be closed and their account status will be reset. ' +
      'Only proceed if you have personally verified this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes — They Are Alive',
          onPress: async () => {
            try {
              await resolveAlive.mutate({ resolvedAt: new Date().toISOString() });
              refetch();
            } catch (err) {
              Alert.alert('Error', err?.message || 'Action failed.');
            }
          },
        },
      ],
    );
  };

  const handleEscalate = () => {
    Alert.alert(
      'Escalate to Death Investigation',
      'WARNING: This opens an Estate Case on the premise that the account holder ' +
      'may have died. This is a serious and consequential step. ' +
      'A different officer will be required to approve the estate case before ' +
      'any assets are touched. Only proceed if you have received a credible, ' +
      'independent report of death that cannot be resolved as a false alarm.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate to Estate',
          style: 'destructive',
          onPress: async () => {
            try {
              await escalate.mutate({ escalatedAt: new Date().toISOString() });
              navigation.goBack();
            } catch (err) {
              Alert.alert('Action Refused', err?.message || 'Escalation failed.');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen
      title={c.caseNumber || 'Case Detail'}
      scroll
      refreshing={false}
    >
      <Card style={styles.block}>
        <InfoRow label="Case number" value={c.caseNumber} colors={colors} />
        <InfoRow
          label="Stage"
          value={titleCase(c.stage || c.status)}
          colors={colors}
        />
        <InfoRow
          label="Priority"
          value={titleCase(c.priority)}
          colors={colors}
        />
        <InfoRow
          label="Detected"
          value={formatDate(c.detectedAt)}
          colors={colors}
        />
        <InfoRow
          label="Days inactive at detection"
          value={c.daysInactiveAtDetection != null
            ? String(c.daysInactiveAtDetection)
            : null}
          colors={colors}
        />
        <InfoRow
          label="SLA due"
          value={formatDate(c.slaDueAt)}
          colors={colors}
        />
        <InfoRow
          label="Assigned to"
          value={c.assignedTo || null}
          colors={colors}
        />
        <InfoRow
          label="Outreach attempts"
          value={c.outreachAttempts != null
            ? String(c.outreachAttempts)
            : null}
          colors={colors}
        />
        <InfoRow
          label="Last outreach"
          value={formatDate(c.lastOutreachAt)}
          colors={colors}
        />
        {c.resolution?.outcome && (
          <InfoRow
            label="Resolution"
            value={titleCase(c.resolution.outcome)}
            colors={colors}
          />
        )}
      </Card>

      {!isTerminal && (
        <Card style={styles.block}>
          <SectionHeader title="Actions" />
          <View style={styles.actions}>
            <Button
              title="Assign"
              variant="secondary"
              onPress={() => setAssignOpen(true)}
              accessibilityLabel="Assign this case"
            />
            <Button
              title="Record outreach"
              variant="secondary"
              onPress={() => setOutreachOpen(true)}
              accessibilityLabel="Record an outreach attempt"
            />
            <Button
              title="Resolve — They Are Alive"
              variant="secondary"
              loading={resolveAlive.loading}
              onPress={handleResolveAlive}
              accessibilityLabel="Resolve case as alive"
            />
            {resolveAlive.error && (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {resolveAlive.error.message}
              </Text>
            )}
            <Button
              title="Escalate to Estate Investigation"
              variant="danger"
              loading={escalate.loading}
              onPress={handleEscalate}
              accessibilityLabel="Escalate to estate investigation"
            />
            {escalate.error && (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {escalate.error.message}
              </Text>
            )}
          </View>
        </Card>
      )}

      {timeline.length > 0 && (
        <Card style={styles.block}>
          <SectionHeader title="Timeline" />
          {timeline.map((entry, i) => (
            <View
              key={i}
              style={[
                styles.timelineEntry,
                { borderLeftColor: colors.border },
              ]}
            >
              <Text style={[styles.timelineTime, { color: colors.textMuted }]}>
                {formatDateTime(entry.at || entry.occurredAt)}
              </Text>
              <Text style={[styles.timelineAction, { color: colors.text }]}>
                {titleCase(entry.action || '')}
              </Text>
              {entry.detail && (
                <Text style={[styles.timelineDetail, { color: colors.textMuted }]}>
                  {entry.detail}
                </Text>
              )}
            </View>
          ))}
        </Card>
      )}

      <AssignSheet
        visible={assignOpen}
        onClose={() => setAssignOpen(false)}
        loading={assign.loading}
        error={assign.error}
        onSubmit={async (body) => {
          try {
            await assign.mutate(body);
            setAssignOpen(false);
            refetch();
          } catch (_) {}
        }}
      />
      <OutreachSheet
        visible={outreachOpen}
        onClose={() => setOutreachOpen(false)}
        loading={outreach.loading}
        error={outreach.error}
        onSubmit={async (body) => {
          try {
            await outreach.mutate(body);
            setOutreachOpen(false);
            refetch();
          } catch (_) {}
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  label: {
    ...typography.caption,
    flex: 1,
  },
  value: {
    ...typography.caption,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    fontWeight: '600',
  },
  sheetBody: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  timelineEntry: {
    borderLeftWidth: 2,
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingLeft: spacing.md,
  },
  timelineTime: {
    ...typography.micro,
  },
  timelineAction: {
    ...typography.bodyStrong,
  },
  timelineDetail: {
    ...typography.caption,
  },
});
