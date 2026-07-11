import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout, { LegalSection } from '../components/legal/LegalLayout';

const Terms = () => {
  return (
    <LegalLayout title="Terms of Service" updated="10 July 2026">
      <p className="italic">
        This is a general template provided for a subscription software product and does not constitute
        legal advice. Please have it reviewed by qualified counsel before relying on it in production.
      </p>

      <LegalSection heading="1. Acceptance of terms">
        <p>
          By creating an account or using Financial Analyzer (the “Service”), you agree to be bound by these
          Terms of Service and our <Link to="/privacy" className="text-teal-600 hover:underline">Privacy Policy</Link>.
          If you do not agree, do not use the Service.
        </p>
      </LegalSection>

      <LegalSection heading="2. The Service">
        <p>
          Financial Analyzer provides personal-finance tracking, budgeting, debt management, and analytics
          tools. The Service is provided for informational purposes only and is <strong>not</strong> financial,
          investment, tax, or legal advice. You are solely responsible for decisions you make based on it.
        </p>
      </LegalSection>

      <LegalSection heading="3. Accounts and eligibility">
        <p>
          You must be at least 18 years old and provide accurate information. You are responsible for
          safeguarding your credentials and for all activity under your account. Notify us immediately of any
          unauthorised use.
        </p>
      </LegalSection>

      <LegalSection heading="4. Subscriptions, billing, and renewals">
        <p>
          Paid plans (Pro and Premium) are billed in advance on a monthly or yearly basis through our payment
          processor. Subscriptions renew automatically at the end of each billing period unless cancelled
          before the renewal date. You can cancel at any time from the Billing page; access continues until the
          end of the current paid period.
        </p>
        <p>
          Prices are shown inclusive of applicable taxes where required. We may change plan pricing with prior
          notice; changes take effect on your next renewal.
        </p>
      </LegalSection>

      <LegalSection heading="5. Refunds">
        <p>
          Except where required by applicable law, payments are non-refundable. If you believe you were billed
          in error, contact support within 14 days and we will review the charge in good faith.
        </p>
      </LegalSection>

      <LegalSection heading="6. Acceptable use">
        <p>You agree not to: (a) reverse engineer or disrupt the Service; (b) access it using automated means
          except through documented APIs; (c) upload unlawful, infringing, or malicious content; or (d) use the
          Service to violate the rights of others.</p>
      </LegalSection>

      <LegalSection heading="7. Your data">
        <p>
          You retain ownership of the financial data you submit. You grant us a limited licence to process it
          solely to operate and improve the Service, as described in the Privacy Policy. You are responsible for
          the accuracy of the data you enter.
        </p>
      </LegalSection>

      <LegalSection heading="8. Third-party integrations">
        <p>
          The Service may connect to third-party providers (for example email, payment, or account-aggregation
          services). Your use of those integrations is subject to the respective third party’s terms, and we are
          not responsible for their acts or omissions.
        </p>
      </LegalSection>

      <LegalSection heading="9. Disclaimers">
        <p>
          The Service is provided “as is” and “as available” without warranties of any kind, whether express or
          implied, including merchantability, fitness for a particular purpose, and non-infringement. We do not
          warrant that the Service will be uninterrupted, error-free, or secure.
        </p>
      </LegalSection>

      <LegalSection heading="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Financial Analyzer and its affiliates will not be liable for
          any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or
          goodwill. Our aggregate liability for any claim will not exceed the amount you paid us in the twelve
          months preceding the event giving rise to the claim.
        </p>
      </LegalSection>

      <LegalSection heading="11. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate your access if you breach these
          Terms or where required to comply with law. Upon termination, your right to use the Service ceases; we
          may retain and delete data as described in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection heading="12. Governing law">
        <p>
          These Terms are governed by the laws of India, without regard to conflict-of-laws principles, and the
          courts located in India will have exclusive jurisdiction, unless a mandatory local law provides
          otherwise for you as a consumer.
        </p>
      </LegalSection>

      <LegalSection heading="13. Changes to these terms">
        <p>
          We may update these Terms from time to time. Material changes will be notified in-app or by email. Your
          continued use after changes take effect constitutes acceptance.
        </p>
      </LegalSection>

      <LegalSection heading="14. Contact">
        <p>Questions about these Terms? Contact us at <span className="text-teal-600">support@financialanalyzer.app</span>.</p>
      </LegalSection>
    </LegalLayout>
  );
};

export default Terms;
