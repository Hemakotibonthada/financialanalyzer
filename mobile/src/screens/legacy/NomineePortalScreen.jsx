import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { nomineePortalApi } from '../../api/endpoints';
import { useApi, useMutation } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import {
  formatDate,
  formatDateTime,
  titleCase,
} from '../../utils/format';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  ListRow,
  Screen,
  SectionHeader,
  Sheet,
  SkeletonList,
} from '../../components/ui';
import { spacing, typography } from '../../theme/tokens';

const DOCUMENT_TYPES = [
  'death_certificate',
  'legal_heir_certificate',
  'nominee_id_proof',
  'nominee_address_proof',
  'bank_passbook',
  'succession_certificate',
  'indemnity_bond',
  'affidavit',
  'other',
];

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

function RegisterClaimantSheet({ visible, onClose, onSubmit, loading, error }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [rel, setRel] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  return (
    <Sheet visible={visible} title="Register as claimant" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Text style={[styles.gentle, { color: colors.textMuted }]}>
          Please provide your details so we can register you as the claimant
          for this estate. All information is kept private and secure.
        </Text>
        <Input
          label="Your full name"
          value={name}
          onChangeText={setName}
          accessibilityLabel="Your full name"
        />
        <Input
          label="Your relationship to the deceased"
          value={rel}
          onChangeText={setRel}
          accessibilityLabel="Relationship to the deceased"
        />
        <Input
          label="Phone number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          accessibilityLabel="Your phone number"
        />
        <Input
          label="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="Your email address"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Register"
          loading={loading}
          disabled={!name.trim() || !rel.trim()}
          onPress={() =>
            onSubmit({
              fullName: name.trim(),
              relationship: rel.trim(),
              contact: {
                phone: phone.trim(),
                email: email.trim(),
              },
            })
          }
          accessibilityLabel="Confirm claimant registration"
        />
      </View>
    </Sheet>
  );
}

function UploadDocSheet({
  visible, onClose, onPickDocument, onPickPhoto, loading, error,
}) {
  const { colors } = useTheme();
  const [docType, setDocType] = useState('');
  return (
    <Sheet visible={visible} title="Upload a document" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Text style={[styles.gentle, { color: colors.textMuted }]}>
          You can upload a PDF, scan, or photo of your document. PDFs and
          scanned images are preferred for certificates and legal documents.
        </Text>
        <Input
          label={`Document type (e.g. ${DOCUMENT_TYPES.slice(0, 3).join(', ')} …)`}
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

function ConsentSheet({ visible, onClose, onSubmit, loading, error }) {
  const { colors } = useTheme();
  const [agreed, setAgreed] = useState(false);
  return (
    <Sheet visible={visible} title="Give consent" onClose={onClose}>
      <View style={styles.sheetBody}>
        <Text style={[styles.consentText, { color: colors.text }]}>
          By giving consent, you confirm that you are the nominated person for
          this account and that you authorise us to proceed with the estate
          settlement process on your behalf. This consent is recorded with a
          timestamp and is part of the legal process.
        </Text>
        <Button
          title={agreed ? '✓ I agree' : 'I agree to proceed'}
          variant={agreed ? 'secondary' : 'primary'}
          onPress={() => setAgreed((v) => !v)}
          accessibilityLabel="Agree to consent"
        />
        {error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {error.message}
          </Text>
        )}
        <Button
          title="Submit consent"
          loading={loading}
          disabled={!agreed}
          onPress={() =>
            onSubmit({ given: true, givenAt: new Date().toISOString() })
          }
          accessibilityLabel="Submit consent"
        />
      </View>
    </Sheet>
  );
}

export default function NomineePortalScreen() {
  const { colors } = useTheme();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);

  const caseRes = useApi(() => nomineePortalApi.case(), []);
  const docsRes = useApi(() => nomineePortalApi.documents(), []);
  const timelineRes = useApi(() => nomineePortalApi.timeline(), []);

  const registerClaimant = useMutation((body) =>
    nomineePortalApi.registerClaimant(body),
  );
  const uploadDoc = useMutation((asset, fields) =>
    nomineePortalApi.uploadDocument(asset, fields),
  );
  const giveConsent = useMutation((body) => nomineePortalApi.giveConsent(body));

  const refetchAll = () => {
    caseRes.refetch();
    docsRes.refetch();
    timelineRes.refetch();
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
      setUploadOpen(false);
      docsRes.refetch();
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
      setUploadOpen(false);
      docsRes.refetch();
    } catch (_) {}
  };

  if (caseRes.loading) {
    return (
      <Screen title="Your Estate Case">
        <SkeletonList count={6} />
      </Screen>
    );
  }

  if (caseRes.error) {
    return (
      <Screen title="Your Estate Case">
        <ErrorState
          message={caseRes.error.message}
          onRetry={refetchAll}
        />
      </Screen>
    );
  }

  const caseData = caseRes.data;

  if (!caseData || (!caseData.caseNumber && !caseData.status)) {
    return (
      <Screen title="Your Estate Case">
        <EmptyState
          title="No active case for you right now"
          description={
            "We don't see an active estate case connected to your details. " +
            'If you believe this is a mistake, or if you have recently been ' +
            'asked to visit this portal, please contact our support team — ' +
            "we're here to help."
          }
        />
      </Screen>
    );
  }

  const docs = Array.isArray(docsRes.data)
    ? docsRes.data
    : Array.isArray(docsRes.data?.items)
    ? docsRes.data.items
    : Array.isArray(docsRes.data?.documents)
    ? docsRes.data.documents
    : [];

  const timeline = Array.isArray(timelineRes.data)
    ? timelineRes.data
    : Array.isArray(timelineRes.data?.timeline)
    ? timelineRes.data.timeline
    : [];

  const consent = caseData?.consent;
  const hasConsent = consent?.given === true;

  return (
    <Screen
      title="Your Estate Case"
      scroll
      refreshing={caseRes.refreshing}
      onRefresh={refetchAll}
    >
      <Card style={styles.block}>
        <Text style={[styles.welcomeText, { color: colors.text }]}>
          We are here to help you through this process. Below is the current
          status of the estate case. You can upload documents, register as a
          claimant, and track progress from this screen.
        </Text>
      </Card>

      <Card style={styles.block}>
        <SectionHeader title="Case status" />
        <InfoRow
          label="Case reference"
          value={caseData?.caseNumber}
          colors={colors}
        />
        <InfoRow
          label="Current status"
          value={titleCase(caseData?.status)}
          colors={colors}
        />
        <InfoRow
          label="Last updated"
          value={formatDate(caseData?.updatedAt)}
          colors={colors}
        />
        {caseData?.slaDueAt && (
          <InfoRow
            label="Expected completion by"
            value={formatDate(caseData.slaDueAt)}
            colors={colors}
          />
        )}
      </Card>

      {docs.length > 0 && (
        <Card style={styles.block}>
          <SectionHeader
            title="Your documents"
            actionLabel="Upload"
            onAction={() => setUploadOpen(true)}
          />
          {docs.map((doc, i) => (
            <ListRow
              key={doc?.id || doc?._id || i}
              title={titleCase(doc?.documentType || 'Document')}
              subtitle={
                titleCase(doc?.status || '') +
                (doc?.uploadedAt ? ` · Uploaded ${formatDate(doc.uploadedAt)}` : '')
              }
              right={
                doc?.status === 'rejected' && doc?.rejectionReason
                  ? 'Rejected'
                  : ''
              }
              accessibilityLabel={titleCase(doc?.documentType || 'Document')}
            />
          ))}
          {docs.some((d) => d?.status === 'rejected') && (
            <View
              style={[styles.docWarning, { backgroundColor: colors.dangerSoft }]}
            >
              {docs
                .filter((d) => d?.status === 'rejected')
                .map((d, i) => (
                  <Text
                    key={i}
                    style={[styles.docWarnText, { color: colors.danger }]}
                  >
                    {titleCase(d?.documentType || 'Document')} was rejected
                    {d?.rejectionReason ? `: ${d.rejectionReason}` : '.'}
                  </Text>
                ))}
            </View>
          )}
        </Card>
      )}

      {docs.length === 0 && (
        <Card style={styles.block}>
          <SectionHeader title="Documents" />
          <Text style={[styles.gentle, { color: colors.textMuted }]}>
            No documents have been uploaded yet. Please upload any documents
            the estate officer has requested.
          </Text>
          <Button
            title="Upload a document"
            variant="secondary"
            onPress={() => setUploadOpen(true)}
            accessibilityLabel="Upload a document"
            style={styles.btnTop}
          />
        </Card>
      )}

      {timeline.length > 0 && (
        <Card style={styles.block}>
          <SectionHeader title="Case progress" />
          {timeline.map((entry, i) => (
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
                <Text
                  style={[styles.timelineDetail, { color: colors.textMuted }]}
                >
                  {entry.detail}
                </Text>
              )}
            </View>
          ))}
        </Card>
      )}

      <Card style={styles.block}>
        <SectionHeader title="What you can do" />
        <View style={styles.actions}>
          <Button
            title="Register as claimant"
            variant="secondary"
            onPress={() => setRegisterOpen(true)}
            accessibilityLabel="Register as the estate claimant"
          />
          <Button
            title="Upload a document"
            variant="secondary"
            onPress={() => setUploadOpen(true)}
            accessibilityLabel="Upload a supporting document"
          />
          {!hasConsent && (
            <Button
              title="Give consent to proceed"
              onPress={() => setConsentOpen(true)}
              accessibilityLabel="Give consent for estate settlement"
            />
          )}
          {hasConsent && (
            <View
              style={[styles.consentGiven, { backgroundColor: colors.successSoft }]}
            >
              <Text style={[styles.consentGivenText, { color: colors.success }]}>
                ✓ Consent given on {formatDate(consent?.givenAt)}
              </Text>
            </View>
          )}
        </View>
        {registerClaimant.error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {registerClaimant.error.message}
          </Text>
        )}
        {giveConsent.error && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {giveConsent.error.message}
          </Text>
        )}
      </Card>

      <RegisterClaimantSheet
        visible={registerOpen}
        onClose={() => setRegisterOpen(false)}
        loading={registerClaimant.loading}
        error={registerClaimant.error}
        onSubmit={async (body) => {
          try {
            await registerClaimant.mutate(body);
            setRegisterOpen(false);
            caseRes.refetch();
          } catch (_) {}
        }}
      />
      <UploadDocSheet
        visible={uploadOpen}
        onClose={() => setUploadOpen(false)}
        loading={uploadDoc.loading}
        error={uploadDoc.error}
        onPickDocument={handlePickDocument}
        onPickPhoto={handlePickPhoto}
      />
      <ConsentSheet
        visible={consentOpen}
        onClose={() => setConsentOpen(false)}
        loading={giveConsent.loading}
        error={giveConsent.error}
        onSubmit={async (body) => {
          try {
            await giveConsent.mutate(body);
            setConsentOpen(false);
            caseRes.refetch();
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
  welcomeText: {
    ...typography.body,
    lineHeight: 22,
  },
  gentle: {
    ...typography.caption,
    lineHeight: 20,
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
  consentText: {
    ...typography.body,
    lineHeight: 22,
  },
  consentGiven: {
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  consentGivenText: {
    ...typography.bodyStrong,
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
  docWarning: {
    borderRadius: 8,
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  docWarnText: {
    ...typography.caption,
    lineHeight: 20,
  },
  btnTop: {
    marginTop: spacing.sm,
  },
});
