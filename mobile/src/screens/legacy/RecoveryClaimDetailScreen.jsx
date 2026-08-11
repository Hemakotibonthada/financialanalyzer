import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { claimsApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import {
  formatDate,
  formatMoney,
  titleCase,
} from '../../utils/format';
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
import { spacing, typography } from '../../theme/tokens';
import { CLAIM_STATUS_TRANSITIONS } from '../../constants/legacyTransitions';

function InfoRow({ label, value, colors }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>
        {value != null && value !== '' ? value : '—'}
      </Text>
    </View>
  );
}

function PlaybookCard({ playbook, colors }) {
  if (!playbook) return null;
  const required = Array.isArray(playbook.requiredDocuments)
    ? playbook.requiredDocuments
    : [];
  const optional = Array.isArray(playbook.optionalDocuments)
    ? playbook.optionalDocuments
    : [];
  return (
    <Card style={styles.block}>
      <SectionHeader title={playbook.label || 'Claim guidance'} />
      {playbook.guidance && (
        <Text style={[styles.guidance, { color: colors.text }]}>
          {playbook.guidance}
        </Text>
      )}
      {playbook.slaDays != null && (
        <Text style={[styles.slaNote, { color: colors.textMuted }]}>
          Target: {playbook.slaDays} days from submission.
        </Text>
      )}
      {required.length > 0 && (
        <View style={styles.docSection}>
          <Text style={[styles.docHead, { color: colors.text }]}>
            Required documents
          </Text>
          {required.map((d) => (
            <Text key={d} style={[styles.docItem, { color: colors.text }]}>
              • {titleCase(d)}
            </Text>
          ))}
        </View>
      )}
      {optional.length > 0 && (
        <View style={styles.docSection}>
          <Text style={[styles.docHead, { color: colors.textMuted }]}>
            Optional documents
          </Text>
          {optional.map((d) => (
            <Text key={d} style={[styles.docItem, { color: colors.textMuted }]}>
              • {titleCase(d)}
            </Text>
          ))}
        </View>
      )}
    </Card>
  );
}

function TransitionSheet({ visible, status, onClose, onSubmit, loading, error }) {
  const { colors } = useTheme();
  const [toStatus, setToStatus] = useState('');
  const [note, setNote] = useState('');
  const allowed = CLAIM_STATUS_TRANSITIONS[status] || [];

  return (
    <Sheet visible={visible} title="Move claim to next status" onClose={onClose}>
      <View style={styles.sheetBody}>
        {allowed.length === 0 ? (
          <Text style={[styles.guidance, { color: colors.textMuted }]}>
            No transitions are available from status "{titleCase(status)}".
          </Text>
        ) : (
          <>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Allowed next statuses: {allowed.map(titleCase).join(', ')}
            </Text>
            <Input
              label="New status"
              value={toStatus}
              onChangeText={setToStatus}
              accessibilityLabel="New claim status"
            />
            <Input
              label="Note (optional)"
              value={note}
              onChangeText={setNote}
              multiline
              accessibilityLabel="Transition note"
            />
          </>
        )}
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        {allowed.length > 0 && (
          <Button
            title="Apply transition"
            loading={loading}
            disabled={!allowed.includes(toStatus.trim())}
            onPress={() =>
              onSubmit({
                status: toStatus.trim(),
                note: note.trim(),
              })
            }
            accessibilityLabel="Confirm status transition"
          />
        )}
      </View>
    </Sheet>
  );
}

function CorrespondenceSheet({ visible, onClose, onSubmit, loading, error }) {
  const { colors } = useTheme();
  const [channel, setChannel] = useState('');
  const [direction, setDirection] = useState('');
  const [summary, setSummary] = useState('');
  return (
    <Sheet visible={visible} title="Add correspondence" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Input
          label="Channel (e.g. email, phone_call)"
          value={channel}
          onChangeText={setChannel}
          accessibilityLabel="Correspondence channel"
        />
        <Input
          label="Direction (inbound / outbound)"
          value={direction}
          onChangeText={setDirection}
          accessibilityLabel="Correspondence direction"
        />
        <Input
          label="Summary"
          value={summary}
          onChangeText={setSummary}
          multiline
          accessibilityLabel="Correspondence summary"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Save"
          loading={loading}
          disabled={!channel.trim() || !summary.trim()}
          onPress={() =>
            onSubmit({
              channel: channel.trim(),
              direction: direction.trim() || 'outbound',
              summary: summary.trim(),
              at: new Date().toISOString(),
            })
          }
          accessibilityLabel="Confirm add correspondence"
        />
      </View>
    </Sheet>
  );
}

function SettlementSheet({ visible, onClose, onSubmit, loading, error }) {
  const { colors } = useTheme();
  const [received, setReceived] = useState('');
  const [reference, setReference] = useState('');
  return (
    <Sheet visible={visible} title="Record settlement" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Input
          label="Amount received (₹)"
          value={received}
          onChangeText={setReceived}
          keyboardType="decimal-pad"
          accessibilityLabel="Amount received"
        />
        <Input
          label="Reference / transaction number"
          value={reference}
          onChangeText={setReference}
          accessibilityLabel="Settlement reference"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Record settlement"
          loading={loading}
          disabled={!received.trim()}
          onPress={() =>
            onSubmit({
              receivedAmountInINR: Number(received),
              reference: reference.trim(),
              settledAt: new Date().toISOString(),
            })
          }
          accessibilityLabel="Confirm record settlement"
        />
      </View>
    </Sheet>
  );
}

export default function RecoveryClaimDetailScreen({ route }) {
  const { id } = route.params;
  const { colors } = useTheme();

  const [transitionOpen, setTransitionOpen] = useState(false);
  const [corrOpen, setCorrOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);

  const detail = useApi(() => claimsApi.detail(id), [id]);

  const claimType = detail.data?.claimType;
  const playbook = useApi(
    () => claimType ? claimsApi.playbook(claimType) : Promise.resolve(null),
    [claimType],
  );

  const transition = useMutation((body) => claimsApi.transition(id, body));
  const addCorr = useMutation((body) => claimsApi.addCorrespondence(id, body));
  const recordSettlement = useMutation((body) =>
    claimsApi.recordSettlement(id, body),
  );

  if (detail.loading) {
    return (
      <Screen title="Recovery Claim">
        <SkeletonList count={8} />
      </Screen>
    );
  }

  if (detail.error) {
    return (
      <Screen title="Recovery Claim">
        <ErrorState message={detail.error.message} onRetry={detail.refetch} />
      </Screen>
    );
  }

  const c = detail.data || {};
  const status = c.status || 'draft';
  const allowedTransitions = CLAIM_STATUS_TRANSITIONS[status] || [];
  const correspondence = Array.isArray(c.correspondence)
    ? c.correspondence
    : [];

  return (
    <Screen
      title={c.claimNumber || 'Claim Detail'}
      scroll
      refreshing={detail.refreshing}
      onRefresh={detail.onRefresh}
    >
      <Card style={styles.block}>
        <SectionHeader title="Claim details" />
        <InfoRow label="Claim number" value={c.claimNumber} colors={colors} />
        <InfoRow
          label="Type"
          value={titleCase(c.claimType)}
          colors={colors}
        />
        <InfoRow
          label="Status"
          value={titleCase(c.status)}
          colors={colors}
        />
        <InfoRow
          label="Institution"
          value={c.institution?.name}
          colors={colors}
        />
        <InfoRow
          label="Claimed amount"
          value={c.claimedAmountInINR != null
            ? formatMoney(c.claimedAmountInINR)
            : null}
          colors={colors}
        />
        <InfoRow
          label="Approved amount"
          value={c.approvedAmountInINR != null
            ? formatMoney(c.approvedAmountInINR)
            : null}
          colors={colors}
        />
        <InfoRow
          label="Received amount"
          value={c.receivedAmountInINR != null
            ? formatMoney(c.receivedAmountInINR)
            : null}
          colors={colors}
        />
        <InfoRow
          label="Submitted"
          value={formatDate(c.submittedAt)}
          colors={colors}
        />
        <InfoRow
          label="SLA due"
          value={formatDate(c.slaDueAt)}
          colors={colors}
        />
        {c.rejectionReason && (
          <View style={[styles.rejectBox, { backgroundColor: colors.dangerSoft }]}>
            <Text style={[styles.rejectText, { color: colors.danger }]}>
              Rejection reason: {c.rejectionReason}
            </Text>
          </View>
        )}
      </Card>

      {playbook.data && (
        <PlaybookCard playbook={playbook.data} colors={colors} />
      )}

      <Card style={styles.block}>
        <SectionHeader title="Actions" />
        <View style={styles.actions}>
          <Button
            title={
              allowedTransitions.length > 0
                ? `Move status (${allowedTransitions.map(titleCase).join(', ')})`
                : 'No transitions available'
            }
            variant="secondary"
            disabled={allowedTransitions.length === 0}
            onPress={() => setTransitionOpen(true)}
            accessibilityLabel="Transition claim status"
          />
          {transition.error && (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {transition.error.message}
            </Text>
          )}
          <Button
            title="Add correspondence"
            variant="secondary"
            onPress={() => setCorrOpen(true)}
            accessibilityLabel="Add correspondence record"
          />
          {status === 'approved' && (
            <Button
              title="Record settlement"
              onPress={() => setSettlementOpen(true)}
              accessibilityLabel="Record settlement payment"
            />
          )}
          {recordSettlement.error && (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {recordSettlement.error.message}
            </Text>
          )}
        </View>
      </Card>

      {correspondence.length > 0 && (
        <Card style={styles.block}>
          <SectionHeader title="Correspondence" />
          {correspondence.map((entry, i) => (
            <View
              key={i}
              style={[styles.corrEntry, { borderTopColor: colors.border }]}
            >
              <Text style={[styles.corrMeta, { color: colors.textMuted }]}>
                {formatDate(entry?.at)} · {titleCase(entry?.channel || '')} ·{' '}
                {entry?.direction || ''}
              </Text>
              <Text style={[styles.corrSummary, { color: colors.text }]}>
                {entry?.summary || '—'}
              </Text>
            </View>
          ))}
        </Card>
      )}

      <TransitionSheet
        visible={transitionOpen}
        status={status}
        onClose={() => setTransitionOpen(false)}
        loading={transition.loading}
        error={transition.error}
        onSubmit={async (body) => {
          try {
            await transition.mutate(body);
            setTransitionOpen(false);
            detail.refetch();
          } catch (_) {}
        }}
      />
      <CorrespondenceSheet
        visible={corrOpen}
        onClose={() => setCorrOpen(false)}
        loading={addCorr.loading}
        error={addCorr.error}
        onSubmit={async (body) => {
          try {
            await addCorr.mutate(body);
            setCorrOpen(false);
            detail.refetch();
          } catch (_) {}
        }}
      />
      <SettlementSheet
        visible={settlementOpen}
        onClose={() => setSettlementOpen(false)}
        loading={recordSettlement.loading}
        error={recordSettlement.error}
        onSubmit={async (body) => {
          try {
            await recordSettlement.mutate(body);
            setSettlementOpen(false);
            detail.refetch();
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
  guidance: {
    ...typography.body,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  slaNote: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  docSection: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  docHead: {
    ...typography.bodyStrong,
    marginBottom: spacing.xs,
  },
  docItem: {
    ...typography.caption,
    lineHeight: 20,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    fontWeight: '600',
  },
  rejectBox: {
    borderRadius: 8,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  rejectText: {
    ...typography.caption,
    fontWeight: '600',
  },
  corrEntry: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    paddingTop: spacing.md,
    marginTop: spacing.md,
  },
  corrMeta: {
    ...typography.micro,
  },
  corrSummary: {
    ...typography.caption,
    lineHeight: 20,
  },
  sheetBody: {
    gap: spacing.md,
    padding: spacing.lg,
  },
});
