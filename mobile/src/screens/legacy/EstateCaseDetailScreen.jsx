import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { estateApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import {
  formatDate,
  formatDateTime,
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
import { spacing, typography, radii } from '../../theme/tokens';

const TABS = ['Overview', 'Assets', 'Documents', 'Claimants', 'Timeline', 'Audit'];

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

function TabBar({ tabs, active, onSelect, colors }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabScroll}
      contentContainerStyle={styles.tabBar}
    >
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <TouchableOpacity
            key={tab}
            accessibilityLabel={tab}
            accessibilityRole="tab"
            onPress={() => onSelect(tab)}
            style={[
              styles.tab,
              isActive && {
                borderBottomColor: colors.primary,
                borderBottomWidth: 2,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: isActive ? colors.primary : colors.textMuted },
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function ApprovalBanner({ approval, colors }) {
  if (!approval) return null;
  const decision = approval.decision || 'none';

  if (decision === 'pending' && approval.proposedBy) {
    return (
      <View style={[styles.approvalBanner, { backgroundColor: colors.warningSoft }]}>
        <Text style={[styles.approvalTitle, { color: colors.warning }]}>
          Proposed — awaiting approval by a different officer
        </Text>
        <Text style={[styles.approvalSub, { color: colors.warning }]}>
          Proposed on {formatDate(approval.proposedAt)}. A different officer
          with estate_officer or compliance role must approve or reject.
        </Text>
      </View>
    );
  }

  if (decision === 'approved') {
    return (
      <View style={[styles.approvalBanner, { backgroundColor: colors.successSoft }]}>
        <Text style={[styles.approvalTitle, { color: colors.success }]}>
          Approved — death verified
        </Text>
        <Text style={[styles.approvalSub, { color: colors.success }]}>
          Approved on {formatDate(approval.approvedAt)} by{' '}
          {approval.approverRole || 'officer'}.
        </Text>
      </View>
    );
  }

  if (decision === 'rejected') {
    return (
      <View style={[styles.approvalBanner, { backgroundColor: colors.dangerSoft }]}>
        <Text style={[styles.approvalTitle, { color: colors.danger }]}>
          Rejected
        </Text>
        {approval.rejectionReason && (
          <Text style={[styles.approvalSub, { color: colors.danger }]}>
            Reason: {approval.rejectionReason}
          </Text>
        )}
      </View>
    );
  }

  return null;
}

function OverviewTab({ caseData, colors, actions }) {
  const totals = caseData?.totals || {};
  return (
    <View style={styles.tabContent}>
      <ApprovalBanner approval={caseData?.approval} colors={colors} />
      <Card style={styles.block}>
        <SectionHeader title="Case details" />
        <InfoRow label="Case number" value={caseData?.caseNumber} colors={colors} />
        <InfoRow
          label="Status"
          value={titleCase(caseData?.status)}
          colors={colors}
        />
        <InfoRow
          label="Priority"
          value={titleCase(caseData?.priority)}
          colors={colors}
        />
        <InfoRow
          label="SLA due"
          value={formatDate(caseData?.slaDueAt)}
          colors={colors}
        />
        <InfoRow
          label="Assigned to"
          value={caseData?.assignedTo || null}
          colors={colors}
        />
        {caseData?.disputeFlag && (
          <View style={[styles.disputeBox, { backgroundColor: colors.warningSoft }]}>
            <Text style={[styles.disputeText, { color: colors.warning }]}>
              ⚠ Dispute flag set:{' '}
              {caseData.disputeNotes || 'Nominee and legal heir may differ.'}
            </Text>
          </View>
        )}
      </Card>

      {caseData?.deceased?.reportedAt && (
        <Card style={styles.block}>
          <SectionHeader title="Death report" />
          <InfoRow
            label="Reported"
            value={formatDate(caseData.deceased.reportedAt)}
            colors={colors}
          />
          <InfoRow
            label="Date of death"
            value={formatDate(caseData.deceased.dateOfDeath)}
            colors={colors}
          />
          <InfoRow
            label="Place of death"
            value={caseData.deceased.placeOfDeath}
            colors={colors}
          />
          <InfoRow
            label="Reported via"
            value={titleCase(caseData.deceased.reportedVia)}
            colors={colors}
          />
        </Card>
      )}

      {(totals.discoveredAssetsInINR != null) && (
        <Card style={styles.block}>
          <SectionHeader title="Estate totals" />
          <InfoRow
            label="Discovered assets"
            value={formatMoney(totals.discoveredAssetsInINR)}
            colors={colors}
          />
          <InfoRow
            label="Discovered liabilities"
            value={formatMoney(totals.discoveredLiabilitiesInINR)}
            colors={colors}
          />
          <InfoRow
            label="Recovered"
            value={formatMoney(totals.recoveredInINR)}
            colors={colors}
          />
          <InfoRow
            label="Net estate"
            value={formatMoney(totals.netEstateInINR)}
            colors={colors}
          />
          <InfoRow
            label="Fee"
            value={formatMoney(totals.feeInINR)}
            colors={colors}
          />
        </Card>
      )}

      <Card style={styles.block}>
        <SectionHeader title="Actions" />
        <View style={styles.actions}>
          {actions.proposeDeceased && (
            <Button
              title="Propose as deceased"
              variant="danger"
              onPress={actions.proposeDeceased}
              accessibilityLabel="Propose this account holder as deceased"
            />
          )}
          {actions.approveDeceased && (
            <>
              <Button
                title="Approve deceased (different officer required)"
                onPress={actions.approveDeceased}
                accessibilityLabel="Approve deceased status"
              />
              {actions.rejectDeceasedAction && (
                <Button
                  title="Reject deceased proposal"
                  variant="secondary"
                  onPress={actions.rejectDeceasedAction}
                  accessibilityLabel="Reject deceased proposal"
                />
              )}
            </>
          )}
          {actions.discoverAssets && (
            <Button
              title="Discover assets"
              variant="secondary"
              onPress={actions.discoverAssets}
              accessibilityLabel="Run asset discovery scan"
            />
          )}
          {actions.close && (
            <Button
              title="Close case"
              variant="secondary"
              onPress={actions.close}
              accessibilityLabel="Close this estate case"
            />
          )}
          {actions.revoke && (
            <Button
              title="Revoke case"
              variant="danger"
              onPress={actions.revoke}
              accessibilityLabel="Revoke this estate case"
            />
          )}
        </View>
        {actions.mutationError && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {actions.mutationError}
          </Text>
        )}
      </Card>
    </View>
  );
}

function AssetsTab({ assets, liabilities, colors, onDiscoverAssets }) {
  const allAssets = Array.isArray(assets) ? assets : [];
  const allLiabilities = Array.isArray(liabilities) ? liabilities : [];

  if (allAssets.length === 0 && allLiabilities.length === 0) {
    return (
      <View style={styles.tabContent}>
        <EmptyState
          title="No assets discovered yet"
          description="Use 'Discover assets' on the Overview tab to scan this account."
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent}>
      {allAssets.length > 0 && (
        <Card style={styles.block} padded={false}>
          <View style={styles.blockHeader}>
            <Text style={[styles.blockTitle, { color: colors.text }]}>Assets</Text>
          </View>
          {allAssets.map((a, i) => (
            <View
              key={a?.id || a?._id || i}
              style={[styles.assetRow, { borderTopColor: colors.border }]}
            >
              <View style={styles.assetMain}>
                <Text style={[styles.assetTitle, { color: colors.text }]}>
                  {a?.title || titleCase(a?.category || 'Asset')}
                </Text>
                <Text style={[styles.assetSub, { color: colors.textMuted }]}>
                  {a?.institution || titleCase(a?.category || '')} ·{' '}
                  {titleCase(a?.status || '')}
                </Text>
              </View>
              <Text style={[styles.assetAmt, { color: colors.text }]}>
                {formatMoney(a?.estimatedValueInINR || a?.estimatedValue)}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {allLiabilities.length > 0 && (
        <Card style={styles.block} padded={false}>
          <View style={styles.blockHeader}>
            <Text style={[styles.blockTitle, { color: colors.text }]}>
              Liabilities
            </Text>
          </View>
          {allLiabilities.map((l, i) => (
            <View
              key={l?.id || l?._id || i}
              style={[styles.assetRow, { borderTopColor: colors.border }]}
            >
              <View style={styles.assetMain}>
                <Text style={[styles.assetTitle, { color: colors.text }]}>
                  {l?.title || titleCase(l?.category || 'Liability')}
                </Text>
                <Text style={[styles.assetSub, { color: colors.textMuted }]}>
                  {l?.institution || titleCase(l?.category || '')} ·{' '}
                  {titleCase(l?.status || '')}
                </Text>
              </View>
              <Text style={[styles.assetAmt, { color: colors.danger }]}>
                {formatMoney(l?.estimatedValueInINR || l?.estimatedValue)}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function DocumentsTab({
  estateCaseId, documents, onReview, onUpload, reviewMutation, colors,
}) {
  const docs = Array.isArray(documents)
    ? documents
    : Array.isArray(documents?.items)
    ? documents.items
    : [];

  return (
    <ScrollView style={styles.tabContent}>
      <View style={styles.uploadRow}>
        <Button
          title="Upload document"
          variant="secondary"
          size="sm"
          onPress={onUpload}
          accessibilityLabel="Upload a document to this estate case"
        />
      </View>
      {docs.length === 0 ? (
        <EmptyState
          title="No documents"
          description="No documents have been uploaded to this case yet."
        />
      ) : (
        <Card padded={false}>
          {docs.map((doc, i) => (
            <View
              key={doc?.id || doc?._id || i}
              style={[styles.docRow, { borderTopColor: colors.border }]}
            >
              <View style={styles.docMain}>
                <Text style={[styles.assetTitle, { color: colors.text }]}>
                  {titleCase(doc?.documentType || 'Document')}
                </Text>
                <Text style={[styles.assetSub, { color: colors.textMuted }]}>
                  {titleCase(doc?.status || '')} ·{' '}
                  {formatDate(doc?.uploadedAt)}
                </Text>
                {doc?.rejectionReason && (
                  <Text style={[styles.assetSub, { color: colors.danger }]}>
                    Rejected: {doc.rejectionReason}
                  </Text>
                )}
              </View>
              {['uploaded', 'under_review'].includes(doc?.status) && (
                <Button
                  title="Review"
                  size="sm"
                  variant="secondary"
                  onPress={() => onReview(doc?.id || doc?._id)}
                  accessibilityLabel={
                    `Review document ${titleCase(doc?.documentType || '')}`
                  }
                />
              )}
            </View>
          ))}
        </Card>
      )}
      {reviewMutation?.error && (
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {reviewMutation.error.message}
        </Text>
      )}
    </ScrollView>
  );
}

const ESTATE_DOC_TYPES = [
  'death_certificate',
  'legal_heir_certificate',
  'succession_certificate',
  'nominee_id_proof',
  'nominee_address_proof',
  'bank_passbook',
  'policy_document',
  'loan_agreement',
  'indemnity_bond',
  'affidavit',
  'court_order',
  'other',
];

function UploadEstateDocSheet({
  visible, onClose, onPickDocument, onPickPhoto, loading, error,
}) {
  const { colors } = useTheme();
  const [docType, setDocType] = useState('');
  return (
    <Sheet visible={visible} title="Upload document" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Input
          label={`Document type (e.g. ${ESTATE_DOC_TYPES.slice(0, 3).join(', ')} …)`}
          value={docType}
          onChangeText={setDocType}
          accessibilityLabel="Document type"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Choose PDF or file"
          loading={loading}
          disabled={!docType.trim()}
          onPress={() => onPickDocument(docType.trim())}
          accessibilityLabel="Choose a PDF or file from device"
        />
        <Button
          title="Choose photo from library"
          variant="secondary"
          loading={loading}
          disabled={!docType.trim()}
          onPress={() => onPickPhoto(docType.trim())}
          accessibilityLabel="Choose a photo of a document from gallery"
        />
      </View>
    </Sheet>
  );
}

function ClaimantsTab({ caseData, onAddClaimant, addLoading, addError, colors }) {
  const claimant = caseData?.claimant;
  return (
    <View style={styles.tabContent}>
      {claimant?.fullName ? (
        <Card style={styles.block}>
          <SectionHeader title="Primary claimant" />
          <InfoRow label="Name" value={claimant.fullName} colors={colors} />
          <InfoRow
            label="Relationship"
            value={titleCase(claimant.relationship)}
            colors={colors}
          />
          <InfoRow
            label="Legal heir"
            value={claimant.isLegalHeir ? 'Yes' : 'No'}
            colors={colors}
          />
          <InfoRow
            label="Verified"
            value={formatDate(claimant.verifiedAt)}
            colors={colors}
          />
        </Card>
      ) : (
        <EmptyState
          title="No claimant registered"
          description="Add a claimant to proceed with estate settlement."
          actionLabel="Add claimant"
          onAction={onAddClaimant}
        />
      )}
      {claimant?.fullName && (
        <Button
          title="Add / update claimant"
          variant="secondary"
          onPress={onAddClaimant}
          loading={addLoading}
          accessibilityLabel="Add or update claimant"
        />
      )}
      {addError && (
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {addError.message}
        </Text>
      )}
    </View>
  );
}

function TimelineTab({ timeline, colors }) {
  const entries = Array.isArray(timeline) ? timeline : [];
  if (entries.length === 0) {
    return (
      <View style={styles.tabContent}>
        <EmptyState title="No timeline entries" description="" />
      </View>
    );
  }
  return (
    <ScrollView style={styles.tabContent}>
      {entries.map((entry, i) => (
        <View
          key={i}
          style={[styles.timelineEntry, { borderLeftColor: colors.border }]}
        >
          <Text style={[styles.timelineTime, { color: colors.textMuted }]}>
            {formatDateTime(entry?.at || entry?.occurredAt)}
          </Text>
          <Text style={[styles.timelineAction, { color: colors.text }]}>
            {titleCase(entry?.action || '')}
          </Text>
          {entry?.detail && (
            <Text style={[styles.timelineDetail, { color: colors.textMuted }]}>
              {entry.detail}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

function AuditTab({ auditData, colors }) {
  const valid = auditData?.valid;
  const brokenAt = auditData?.brokenAtSequence;
  const events = Array.isArray(auditData?.events)
    ? auditData.events
    : Array.isArray(auditData?.items)
    ? auditData.items
    : Array.isArray(auditData)
    ? auditData
    : [];

  return (
    <ScrollView style={styles.tabContent}>
      {valid === false && (
        <View style={[styles.chainBroken, { backgroundColor: colors.dangerSoft }]}>
          <Text style={[styles.chainBrokenTitle, { color: colors.danger }]}>
            ⛔ AUDIT CHAIN INTEGRITY FAILURE
          </Text>
          <Text style={[styles.chainBrokenSub, { color: colors.danger }]}>
            The hash chain is broken at sequence {brokenAt ?? '(unknown)'}.
            This may indicate tampering. Do not rely on records after this
            point. Escalate to compliance immediately.
          </Text>
        </View>
      )}
      <Text style={[styles.auditNote, { color: colors.textMuted }]}>
        Audit trail is read-only and append-only. Records cannot be edited
        or deleted.
      </Text>
      {events.length === 0 ? (
        <EmptyState title="No audit events" description="" />
      ) : (
        events.map((ev, i) => (
          <View
            key={ev?.sequence != null ? ev.sequence : i}
            style={[
              styles.auditRow,
              { borderBottomColor: colors.border },
              brokenAt != null && ev?.sequence > brokenAt
                ? { backgroundColor: colors.dangerSoft }
                : null,
            ]}
          >
            <Text style={[styles.auditSeq, { color: colors.textMuted }]}>
              #{ev?.sequence ?? i + 1}
            </Text>
            <View style={styles.auditBody}>
              <Text style={[styles.timelineAction, { color: colors.text }]}>
                {titleCase(ev?.action || '')}
              </Text>
              <Text style={[styles.timelineTime, { color: colors.textMuted }]}>
                {formatDateTime(ev?.occurredAt)} · {ev?.actorRole || 'unknown role'}
              </Text>
              {ev?.reason && (
                <Text style={[styles.timelineDetail, { color: colors.textMuted }]}>
                  {ev.reason}
                </Text>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function AddClaimantSheet({ visible, onClose, onSubmit, loading, error }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [rel, setRel] = useState('');
  const [isLegalHeir, setIsLegalHeir] = useState(false);
  return (
    <Sheet visible={visible} title="Add claimant" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Input
          label="Full name"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Claimant full name"
        />
        <Input
          label="Relationship to deceased"
          value={rel}
          onChangeText={setRel}
          accessibilityLabel="Claimant relationship"
        />
        <TouchableOpacity
          accessibilityLabel="Toggle legal heir"
          accessibilityRole="checkbox"
          onPress={() => setIsLegalHeir((v) => !v)}
          style={styles.checkRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isLegalHeir ? colors.primary : 'transparent',
                borderColor: colors.border,
              },
            ]}
          />
          <Text style={[styles.checkLabel, { color: colors.text }]}>
            Is legal heir
          </Text>
        </TouchableOpacity>
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Add claimant"
          loading={loading}
          disabled={!name.trim() || !rel.trim()}
          onPress={() =>
            onSubmit({
              fullName: name.trim(),
              relationship: rel.trim(),
              isLegalHeir,
            })
          }
          accessibilityLabel="Confirm add claimant"
        />
      </View>
    </Sheet>
  );
}

function ProposeDeceasedSheet({ visible, onClose, onSubmit, loading, error }) {
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState('');
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} title="Propose as deceased" onClose={onClose}>
      <View style={styles.sheetBody}>
        <View style={[styles.warningBox, { backgroundColor: colors.dangerSoft }]}>
          <Text style={[styles.warningText, { color: colors.danger }]}>
            This is a serious, irreversible action. A different officer with
            estate_officer or compliance role must review and approve before
            any estate process begins. You will not be able to approve your
            own proposal.
          </Text>
        </View>
        <Input
          label="Verification method"
          value={method}
          onChangeText={setMethod}
          accessibilityLabel="Verification method"
        />
        <Input
          label="Notes (required)"
          value={notes}
          onChangeText={setNotes}
          multiline
          accessibilityLabel="Proposal notes"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Submit proposal"
          variant="danger"
          loading={loading}
          disabled={!notes.trim()}
          onPress={() =>
            onSubmit({ verificationMethod: method.trim(), notes: notes.trim() })
          }
          accessibilityLabel="Confirm submit deceased proposal"
        />
      </View>
    </Sheet>
  );
}

function RevokeSheet({ visible, onClose, onSubmit, loading, error }) {
  const [reason, setReason] = useState('');
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} title="Revoke estate case" onClose={onClose}>
      <View style={styles.sheetBody}>
        <View style={[styles.warningBox, { backgroundColor: colors.warningSoft }]}>
          <Text style={[styles.warningText, { color: colors.warning }]}>
            Revoking marks this case as a false alarm or error. This action is
            logged and cannot be undone. A mandatory reason is required.
          </Text>
        </View>
        <Input
          label="Reason for revocation (required)"
          value={reason}
          onChangeText={setReason}
          multiline
          accessibilityLabel="Revocation reason"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Revoke case"
          variant="danger"
          loading={loading}
          disabled={!reason.trim()}
          onPress={() => onSubmit({ reason: reason.trim() })}
          accessibilityLabel="Confirm revoke case"
        />
      </View>
    </Sheet>
  );
}

function ReviewDocumentSheet({
  visible, docId, onClose, onSubmit, loading, error,
}) {
  const [decision, setDecision] = useState('');
  const [notes, setNotes] = useState('');
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} title="Review document" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Input
          label="Decision (verified / rejected)"
          value={decision}
          onChangeText={setDecision}
          accessibilityLabel="Review decision"
        />
        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          accessibilityLabel="Review notes"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Submit review"
          loading={loading}
          disabled={!decision.trim()}
          onPress={() =>
            onSubmit(docId, {
              status: decision.trim(),
              notes: notes.trim(),
            })
          }
          accessibilityLabel="Confirm document review"
        />
      </View>
    </Sheet>
  );
}

export default function EstateCaseDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('Overview');
  const [proposeOpen, setProposeOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [claimantOpen, setClaimantOpen] = useState(false);
  const [reviewDocId, setReviewDocId] = useState(null);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);

  const detail = useApi(() => estateApi.detail(id), [id]);
  const timelineRes = useApi(() => estateApi.timeline(id), [id]);
  const assetsRes = useApi(() => estateApi.assets(id), [id]);
  const auditRes = useApi(() => estateApi.auditTrail(id), [id]);

  const propose = useMutation((body) => estateApi.proposeDeceased(id, body));
  const approve = useMutation((body) => estateApi.approveDeceased(id, body));
  const reject = useMutation((body) => estateApi.rejectDeceased(id, body));
  const revoke = useMutation((body) => estateApi.revoke(id, body));
  const addClaimant = useMutation((body) => estateApi.addClaimant(id, body));
  const discover = useMutation((body) => estateApi.discoverAssets(id, body));
  const reviewDoc = useMutation((docId, body) =>
    estateApi.reviewDocument(id, docId, body),
  );
  const uploadDoc = useMutation((asset, fields) =>
    estateApi.uploadDocument(id, asset, fields),
  );
  const closeCase = useMutation((body) => estateApi.close(id, body));

  if (detail.loading) {
    return (
      <Screen title="Estate Case">
        <SkeletonList count={10} />
      </Screen>
    );
  }

  if (detail.error) {
    return (
      <Screen title="Estate Case">
        <ErrorState message={detail.error.message} onRetry={detail.refetch} />
      </Screen>
    );
  }

  const c = detail.data || {};
  const approval = c.approval || {};
  const status = c.status || '';
  const isTerminal = ['closed', 'rejected', 'revoked'].includes(status);
  const awaitingApproval =
    approval.decision === 'pending' && approval.proposedBy;

  const assetsData = assetsRes.data || {};
  const assetsList = Array.isArray(assetsData)
    ? assetsData.filter((a) => a?.kind === 'asset')
    : Array.isArray(assetsData?.assets)
    ? assetsData.assets
    : [];
  const liabList = Array.isArray(assetsData)
    ? assetsData.filter((a) => a?.kind === 'liability')
    : Array.isArray(assetsData?.liabilities)
    ? assetsData.liabilities
    : [];

  const timeline = Array.isArray(timelineRes.data)
    ? timelineRes.data
    : Array.isArray(timelineRes.data?.timeline)
    ? timelineRes.data.timeline
    : [];

  const mutationError = [
    propose.error, approve.error, reject.error, revoke.error,
    addClaimant.error, discover.error, closeCase.error,
  ]
    .filter(Boolean)
    .map((e) => e.message)
    .join(' | ') || null;

  const handleApprove = () => {
    Alert.alert(
      'Approve deceased status',
      'You are approving the proposal that this account holder has passed away. ' +
      'This will advance the estate case. ' +
      'The API will refuse if you are the same officer who proposed this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approve.mutate({ approvedAt: new Date().toISOString() });
              detail.refetch();
            } catch (err) {
              Alert.alert('Refused', err?.message || 'Action failed.');
            }
          },
        },
      ],
    );
  };

  const handleRejectDeceased = () => {
    Alert.alert(
      'Reject deceased proposal',
      'This rejects the proposal and keeps the account active. Provide a reason if available.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject proposal',
          style: 'destructive',
          onPress: async () => {
            try {
              await reject.mutate({ rejectionReason: 'Rejected by reviewer' });
              detail.refetch();
            } catch (err) {
              Alert.alert('Refused', err?.message || 'Action failed.');
            }
          },
        },
      ],
    );
  };

  const handleDiscoverAssets = () => {
    Alert.alert(
      'Discover assets',
      'This will scan all financial accounts linked to this user and create ' +
      'estate asset records. This is idempotent — running it again is safe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run discovery',
          onPress: async () => {
            try {
              await discover.mutate({});
              assetsRes.refetch();
              detail.refetch();
            } catch (err) {
              Alert.alert('Failed', err?.message || 'Discovery failed.');
            }
          },
        },
      ],
    );
  };

  const handleClose = () => {
    Alert.alert(
      'Close estate case',
      'This closes the case. Only proceed once all assets have been disbursed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          onPress: async () => {
            try {
              await closeCase.mutate({ closedAt: new Date().toISOString() });
              navigation.goBack();
            } catch (err) {
              Alert.alert('Refused', err?.message || 'Close failed.');
            }
          },
        },
      ],
    );
  };

  const handlePickDocument = async (docType) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;
    try {
      await uploadDoc.mutate(asset, { documentType: docType });
      setUploadDocOpen(false);
      detail.refetch();
    } catch (_) {}
  };

  const handlePickPhoto = async (docType) => {
    let permResult;
    try {
      permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    } catch (_) {
      permResult = { granted: false };
    }
    if (!permResult.granted) {
      Alert.alert(
        'Permission needed',
        'Please allow access to your photo library in Settings.',
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });
    if (picked.canceled || !picked.assets?.length) return;
    const asset = picked.assets[0];
    try {
      await uploadDoc.mutate(asset, { documentType: docType });
      setUploadDocOpen(false);
      detail.refetch();
    } catch (_) {}
  };

  const overviewActions = {
    proposeDeceased: !isTerminal && !awaitingApproval && !approval.proposedBy
      ? () => setProposeOpen(true)
      : null,
    approveDeceased: awaitingApproval ? handleApprove : null,
    rejectDeceasedAction: awaitingApproval ? handleRejectDeceased : null,
    discoverAssets: ['verified', 'asset_discovery'].includes(status)
      ? handleDiscoverAssets
      : null,
    close: status === 'disbursed' ? handleClose : null,
    revoke: !isTerminal ? () => setRevokeOpen(true) : null,
    mutationError,
  };

  const refetchAll = () => {
    detail.refetch();
    assetsRes.refetch();
    timelineRes.refetch();
    auditRes.refetch();
  };

  return (
    <Screen
      title={c.caseNumber || 'Estate Case'}
      refreshing={detail.refreshing}
      onRefresh={refetchAll}
    >
      <TabBar
        tabs={TABS}
        active={activeTab}
        onSelect={setActiveTab}
        colors={colors}
      />

      {activeTab === 'Overview' && (
        <ScrollView contentContainerStyle={styles.tabPad}>
          <OverviewTab
            caseData={c}
            colors={colors}
            actions={overviewActions}
          />
        </ScrollView>
      )}

      {activeTab === 'Assets' && (
        <AssetsTab
          assets={assetsList}
          liabilities={liabList}
          colors={colors}
        />
      )}

      {activeTab === 'Documents' && (
        <DocumentsTab
          estateCaseId={id}
          documents={c.documents || []}
          onReview={(docId) => setReviewDocId(docId)}
          onUpload={() => setUploadDocOpen(true)}
          reviewMutation={reviewDoc}
          colors={colors}
        />
      )}

      {activeTab === 'Claimants' && (
        <ClaimantsTab
          caseData={c}
          onAddClaimant={() => setClaimantOpen(true)}
          addLoading={addClaimant.loading}
          addError={addClaimant.error}
          colors={colors}
        />
      )}

      {activeTab === 'Timeline' && (
        <TimelineTab timeline={timeline} colors={colors} />
      )}

      {activeTab === 'Audit' && (
        <AuditTab auditData={auditRes.data} colors={colors} />
      )}

      <ProposeDeceasedSheet
        visible={proposeOpen}
        onClose={() => setProposeOpen(false)}
        loading={propose.loading}
        error={propose.error}
        onSubmit={async (body) => {
          try {
            await propose.mutate(body);
            setProposeOpen(false);
            detail.refetch();
          } catch (_) {}
        }}
      />
      <RevokeSheet
        visible={revokeOpen}
        onClose={() => setRevokeOpen(false)}
        loading={revoke.loading}
        error={revoke.error}
        onSubmit={async (body) => {
          try {
            await revoke.mutate(body);
            setRevokeOpen(false);
            navigation.goBack();
          } catch (_) {}
        }}
      />
      <AddClaimantSheet
        visible={claimantOpen}
        onClose={() => setClaimantOpen(false)}
        loading={addClaimant.loading}
        error={addClaimant.error}
        onSubmit={async (body) => {
          try {
            await addClaimant.mutate(body);
            setClaimantOpen(false);
            detail.refetch();
          } catch (_) {}
        }}
      />
      <ReviewDocumentSheet
        visible={reviewDocId != null}
        docId={reviewDocId}
        onClose={() => setReviewDocId(null)}
        loading={reviewDoc.loading}
        error={reviewDoc.error}
        onSubmit={async (docId, body) => {
          try {
            await reviewDoc.mutate(docId, body);
            setReviewDocId(null);
            detail.refetch();
          } catch (_) {}
        }}
      />
      <UploadEstateDocSheet
        visible={uploadDocOpen}
        onClose={() => setUploadDocOpen(false)}
        loading={uploadDoc.loading}
        error={uploadDoc.error}
        onPickDocument={handlePickDocument}
        onPickPhoto={handlePickPhoto}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabScroll: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minWidth: 72,
    alignItems: 'center',
  },
  tabText: {
    ...typography.caption,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: spacing.lg,
  },
  uploadRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  tabPad: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  block: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  blockHeader: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  blockTitle: {
    ...typography.subheading,
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
    marginTop: spacing.xs,
  },
  sheetBody: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  warningBox: {
    borderRadius: 8,
    padding: spacing.md,
  },
  warningText: {
    ...typography.caption,
    lineHeight: 20,
  },
  approvalBanner: {
    borderRadius: 8,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  approvalTitle: {
    ...typography.bodyStrong,
  },
  approvalSub: {
    ...typography.caption,
    lineHeight: 18,
  },
  disputeBox: {
    borderRadius: 8,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  disputeText: {
    ...typography.caption,
  },
  assetRow: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  assetMain: {
    flex: 1,
    gap: spacing.xs,
  },
  assetTitle: {
    ...typography.bodyStrong,
  },
  assetSub: {
    ...typography.caption,
  },
  assetAmt: {
    ...typography.bodyStrong,
  },
  docRow: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  docMain: {
    flex: 1,
    gap: spacing.xs,
  },
  timelineEntry: {
    borderLeftWidth: 2,
    gap: spacing.xs,
    marginBottom: spacing.md,
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
  chainBroken: {
    borderRadius: 8,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  chainBrokenTitle: {
    ...typography.bodyStrong,
  },
  chainBrokenSub: {
    ...typography.caption,
    lineHeight: 20,
  },
  auditNote: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  auditRow: {
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  auditSeq: {
    ...typography.micro,
    width: 36,
  },
  auditBody: {
    flex: 1,
    gap: spacing.xs,
  },
  checkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
  },
  checkbox: {
    borderRadius: 4,
    borderWidth: 1.5,
    height: 20,
    width: 20,
  },
  checkLabel: {
    ...typography.body,
  },
});
