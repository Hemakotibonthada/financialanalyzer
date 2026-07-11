import React from 'react';
import LegalLayout, { LegalSection } from '../components/legal/LegalLayout';

const Privacy = () => {
  return (
    <LegalLayout title="Privacy Policy" updated="10 July 2026">
      <p className="italic">
        This is a general template and does not constitute legal advice. Please have it reviewed by qualified
        counsel and tailored to your actual data-processing practices before production use.
      </p>

      <LegalSection heading="1. Overview">
        <p>
          This Privacy Policy explains how Financial Analyzer (“we”, “us”) collects, uses, and protects your
          information when you use our personal-finance service. We are committed to data minimisation: we only
          process what we need to run the Service.
        </p>
      </LegalSection>

      <LegalSection heading="2. Information we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data:</strong> name, email address, and hashed password.</li>
          <li><strong>Financial data you provide:</strong> transactions, budgets, debts, EMIs, goals, and related notes.</li>
          <li><strong>Billing data:</strong> subscription plan and status. Card details are handled by our payment
            processor and are never stored on our servers.</li>
          <li><strong>Technical data:</strong> log data, device/browser information, and a per-request correlation
            identifier used for debugging and security.</li>
          <li><strong>Optional integrations:</strong> if you connect email or account-aggregation services, we
            process only the data needed for the feature you enabled.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. How we use your information">
        <ul className="list-disc pl-5 space-y-1">
          <li>To provide, maintain, and improve the Service.</li>
          <li>To generate the analytics, insights, and reports you request.</li>
          <li>To process subscriptions and send transactional messages (for example email verification and
            billing notices).</li>
          <li>To secure the Service, prevent abuse, and comply with legal obligations.</li>
        </ul>
        <p>We do <strong>not</strong> sell your personal data.</p>
      </LegalSection>

      <LegalSection heading="4. Legal bases (GDPR)">
        <p>
          Where the GDPR applies, we rely on: performance of a contract (to provide the Service), your consent
          (for optional integrations), our legitimate interests (security and product improvement), and legal
          obligations (accounting and compliance).
        </p>
      </LegalSection>

      <LegalSection heading="5. Data security">
        <p>
          Passwords are hashed with bcrypt, sensitive fields are encrypted at rest, and access is restricted and
          logged. Transport is protected with TLS in production. No system is perfectly secure, but we work to
          protect your data using industry-standard measures.
        </p>
      </LegalSection>

      <LegalSection heading="6. Data retention">
        <p>
          We retain your data for as long as your account is active. When you delete your account, we delete or
          anonymise your personal data within a reasonable period, except where retention is required for legal,
          accounting, or fraud-prevention purposes.
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <p>
          Depending on your location, you may have the right to access, correct, export, or delete your personal
          data, to object to or restrict certain processing, and to withdraw consent. To exercise these rights,
          contact us using the details below. You may also lodge a complaint with your local data-protection
          authority.
        </p>
      </LegalSection>

      <LegalSection heading="8. Cookies and local storage">
        <p>
          We use cookies and browser storage to keep you signed in and remember preferences. We do not use them
          for third-party advertising. You can clear this storage from your browser at any time.
        </p>
      </LegalSection>

      <LegalSection heading="9. International transfers">
        <p>
          If data is processed outside your country, we use appropriate safeguards (such as standard contractual
          clauses) where required by law.
        </p>
      </LegalSection>

      <LegalSection heading="10. Children">
        <p>The Service is not directed to individuals under 18, and we do not knowingly collect their data.</p>
      </LegalSection>

      <LegalSection heading="11. Changes to this policy">
        <p>
          We may update this policy periodically. We will notify you of material changes in-app or by email, and
          update the “Last updated” date above.
        </p>
      </LegalSection>

      <LegalSection heading="12. Contact">
        <p>
          For privacy questions or requests, contact our data team at
          <span className="text-teal-600"> privacy@financialanalyzer.app</span>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
};

export default Privacy;
