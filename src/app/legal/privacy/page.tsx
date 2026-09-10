import type { Metadata } from "next";
import { Article, Bullets, LegalPage } from "@/components/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Gymly collects, uses and protects your personal data under the GDPR and Italian law.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This notice explains what personal data Gymly processes, why, and what rights you have. It is provided under Articles 13 and 14 of Regulation (EU) 2016/679 (GDPR) and Legislative Decree 196/2003 as amended by Legislative Decree 101/2018 (Codice in materia di protezione dei dati personali)."
    >
      <Article heading="1. Data controller">
        <p>
          The data controller (<em>titolare del trattamento</em>) is {OPERATOR.name},{" "}
          {OPERATOR.address}, {OPERATOR.country} — VAT / tax code {OPERATOR.vat}.
        </p>
        <p>
          For any question about this notice or to exercise your rights, write to{" "}
          <a href={`mailto:${OPERATOR.email}`} className="font-medium text-text underline">
            {OPERATOR.email}
          </a>
          . No Data Protection Officer has been appointed, as the conditions of Article 37 GDPR
          do not apply to this service.
        </p>
      </Article>

      <Article heading="2. What data we process">
        <Bullets
          items={[
            <>
              <strong className="text-text">Account data</strong> — your email address, an
              optional display name, and a cryptographic hash of your password. We never store
              your password itself.
            </>,
            <>
              <strong className="text-text">Training data</strong> — the days and exercises in
              your plan, the weights, sets and repetitions you record, and the start and end
              time of each session.
            </>,
            <>
              <strong className="text-text">Preferences</strong> — unit of measurement, time
              zone, appearance, and your notification settings.
            </>,
            <>
              <strong className="text-text">Push subscriptions</strong> — if you enable
              reminders, the endpoint your browser issues plus the two keys required to encrypt
              a message to your device.
            </>,
            <>
              <strong className="text-text">Technical data</strong> — a session cookie, and the
              browser user agent recorded with each session so you can recognise your own
              devices. Our hosting provider processes IP addresses and request logs for security
              and to deliver the service.
            </>,
          ]}
        />
        <p>
          Gymly is not a medical service. Please do not record health information, injuries or
          diagnoses in the free-text fields: we do not intend to process special categories of
          data under Article 9 GDPR.
        </p>
      </Article>

      <Article heading="3. Why we process it, and on what legal basis">
        <Bullets
          items={[
            <>
              <strong className="text-text">To provide the service</strong> — creating your
              account, storing your plan and your training history, and syncing them across your
              devices. Legal basis: performance of a contract, Article 6(1)(b) GDPR.
            </>,
            <>
              <strong className="text-text">To keep the service secure</strong> — authentication,
              abuse prevention and troubleshooting. Legal basis: legitimate interest, Article
              6(1)(f) GDPR.
            </>,
            <>
              <strong className="text-text">To send training reminders</strong> — only if you
              switch them on. Legal basis: consent, Article 6(1)(a) GDPR, withdrawable at any
              time in Settings.
            </>,
            <>
              <strong className="text-text">Anonymous usage analytics</strong> — off by default
              and only ever active if you switch it on. Legal basis: consent, Article 6(1)(a)
              GDPR.
            </>,
            <>
              <strong className="text-text">To comply with the law</strong> — where we must
              respond to a lawful request. Legal basis: legal obligation, Article 6(1)(c) GDPR.
            </>,
          ]}
        />
        <p>
          Providing account and training data is necessary to use Gymly; without it the service
          cannot function. Reminders and analytics are entirely optional.
        </p>
      </Article>

      <Article heading="4. Who else sees your data">
        <p>
          We do not sell your data and we do not share it for advertising. Your data is processed
          on our behalf by the following providers, each appointed as a data processor under
          Article 28 GDPR:
        </p>
        <Bullets
          items={[
            <>
              <strong className="text-text">Vercel Inc.</strong> — application hosting and
              delivery.
            </>,
            <>
              <strong className="text-text">Turso (ChiselStrike Inc.)</strong> — the database in
              which your account and training data are stored.
            </>,
            <>
              <strong className="text-text">Your browser vendor&apos;s push service</strong> (for
              example Google, Apple or Mozilla) — only if you enable reminders, and only to
              deliver an already-encrypted message to your device.
            </>,
          ]}
        />
        <p>
          Where a provider processes data outside the European Economic Area, the transfer is
          covered by the European Commission&apos;s Standard Contractual Clauses under Article 46
          GDPR, together with supplementary technical measures such as encryption in transit and
          at rest.
        </p>
      </Article>

      <Article heading="5. How long we keep it">
        <Bullets
          items={[
            "Account and training data: for as long as your account exists.",
            "After you request deletion: 14 days, so that signing in again can cancel an accidental request. After that window the data is erased permanently and cannot be restored. You can also choose immediate, permanent deletion.",
            "Sessions: 60 days from creation, or until you sign out.",
            "Push subscriptions: until you turn reminders off, or until your browser invalidates them.",
          ]}
        />
      </Article>

      <Article heading="6. Your rights">
        <p>Under Articles 15 to 22 GDPR you have the right to:</p>
        <Bullets
          items={[
            "access the personal data we hold about you;",
            "have inaccurate data corrected;",
            "have your data erased — available directly in Settings → Delete my account;",
            "restrict or object to processing based on our legitimate interest;",
            "receive your data in a structured, machine-readable format — available directly in Settings → Export my data;",
            "withdraw consent at any time, without affecting processing carried out beforehand.",
          ]}
        />
        <p>
          To exercise a right that is not already available in the app, email{" "}
          <a href={`mailto:${OPERATOR.email}`} className="font-medium text-text underline">
            {OPERATOR.email}
          </a>
          . We answer within one month, extendable by two further months for complex requests
          (Article 12(3) GDPR).
        </p>
        <p>
          If you believe your data has been handled unlawfully you may lodge a complaint with the
          Italian supervisory authority, the{" "}
          <a
            href="https://www.garanteprivacy.it"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-text underline"
          >
            Garante per la protezione dei dati personali
          </a>
          , Piazza Venezia 11, 00187 Roma, or with the authority of the EU member state where you
          live (Article 77 GDPR). You may also bring proceedings before the ordinary courts.
        </p>
      </Article>

      <Article heading="7. Security">
        <p>
          Passwords are stored only as salted scrypt hashes. Session tokens are held as SHA-256
          digests, so a copy of our database does not let anyone sign in as you. All traffic is
          served over HTTPS. These measures are appropriate to the risk under Article 32 GDPR,
          but no online service can promise absolute security.
        </p>
      </Article>

      <Article heading="8. Children">
        <p>
          Gymly is not directed at children under 14, the age of digital consent set by Article
          2-quinquies of the Italian Codice Privacy. If you believe a child has created an
          account, contact us and we will delete it.
        </p>
      </Article>

      <Article heading="9. Automated decision-making">
        <p>
          Gymly does not carry out automated decision-making or profiling that produces legal
          effects concerning you, within the meaning of Article 22 GDPR. Statistics shown in the
          app are simple arithmetic on the data you entered.
        </p>
      </Article>

      <Article heading="10. Changes to this notice">
        <p>
          If we make a material change we will notify you in the app before it takes effect. The
          date at the top of this page always reflects the current version.
        </p>
      </Article>
    </LegalPage>
  );
}
