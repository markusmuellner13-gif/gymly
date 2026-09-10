import type { Metadata } from "next";
import { Article, Bullets, LegalPage } from "@/components/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of Gymly, under Italian and EU law.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms form the contract between you and the operator of Gymly. They are governed by Italian law, including Legislative Decree 70/2003 on information society services and, where you are a consumer, Legislative Decree 206/2005 (Codice del Consumo)."
    >
      <Article heading="1. Who you are contracting with">
        <p>
          Gymly is operated by {OPERATOR.name}, {OPERATOR.address}, {OPERATOR.country} — VAT /
          tax code {OPERATOR.vat}. Contact:{" "}
          <a href={`mailto:${OPERATOR.email}`} className="font-medium text-text underline">
            {OPERATOR.email}
          </a>
          . These details are published in accordance with Article 7 of Legislative Decree
          70/2003.
        </p>
      </Article>

      <Article heading="2. The service">
        <p>
          Gymly is a personal training log. It lets you build a weekly plan, choose exercises
          from a public-domain catalogue, record the weight, sets and repetitions you perform,
          time your sessions, and review your own statistics.
        </p>
        <p>
          The service is currently provided free of charge. If paid features are introduced, the
          price and terms will be presented clearly before you commit to anything, and these
          terms will be updated.
        </p>
      </Article>

      <Article heading="3. Your account">
        <Bullets
          items={[
            "You must be at least 14 years old to create an account.",
            "You must provide a valid email address and keep your password confidential.",
            "You are responsible for activity carried out through your account. Tell us immediately if you believe it has been compromised.",
            "One person, one account. Do not share credentials.",
          ]}
        />
      </Article>

      <Article heading="4. Acceptable use">
        <p>You agree not to:</p>
        <Bullets
          items={[
            "interfere with, overload or attempt to gain unauthorised access to the service or its infrastructure;",
            "use automated means to extract data beyond ordinary personal use;",
            "upload content that is unlawful, or that infringes someone else's rights;",
            "resell or redistribute the service without our written permission.",
          ]}
        />
        <p>
          We may suspend or close an account that seriously or repeatedly breaches these terms.
          Where practicable we will warn you first and give you a chance to put things right.
        </p>
      </Article>

      <Article heading="5. Health and safety — please read">
        <p>
          <strong className="text-text">
            Gymly is a logging tool, not medical advice and not a coaching service.
          </strong>{" "}
          Exercise descriptions come from a public-domain dataset and are general information
          only. They are not tailored to you, your health, your injuries or your experience.
        </p>
        <p>
          Consult a doctor before starting or significantly changing a training programme,
          particularly if you have a medical condition, are pregnant, are recovering from injury,
          or are unsure whether an exercise is safe for you. Train within your ability, use a
          spotter for heavy lifts, and stop if something hurts.
        </p>
        <p>
          Nothing in these terms excludes liability for death or personal injury caused by our
          negligence, for fraud, or for anything else that cannot lawfully be excluded.
        </p>
      </Article>

      <Article heading="6. Your content">
        <p>
          Your plan and training records are yours. You grant us only the limited licence needed
          to host, back up and display that data so that we can operate the service for you. We
          do not use it for advertising and we do not sell it. You can export or delete it at any
          time from Settings.
        </p>
      </Article>

      <Article heading="7. Our content and third-party data">
        <p>
          The Gymly name, design and software are protected by copyright and remain the property
          of the operator. The exercise catalogue is derived from{" "}
          <a
            href="https://github.com/yuhonas/free-exercise-db"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-text underline"
          >
            free-exercise-db
          </a>
          , released into the public domain under the Unlicense, and is used on that basis.
        </p>
      </Article>

      <Article heading="8. Availability, and no warranty beyond the law">
        <p>
          We work to keep Gymly available and your data safe, but the service is provided &ldquo;as
          is&rdquo;. We do not warrant that it will be uninterrupted or error-free, and we may
          change or discontinue features. Where you are a consumer, the statutory guarantees under
          the Codice del Consumo and Legislative Decree 170/2005 apply and are not affected by
          this clause.
        </p>
        <p>
          Keep your own copy of anything you cannot afford to lose. The export function in
          Settings produces a complete machine-readable backup.
        </p>
      </Article>

      <Article heading="9. Liability">
        <p>
          To the maximum extent permitted by Italian law, and except as stated in clause 5, we
          are not liable for indirect or consequential loss, for lost profits, or for loss of
          data where you had a reasonable opportunity to export it. Nothing here limits rights
          that a consumer has under mandatory Italian or EU law.
        </p>
      </Article>

      <Article heading="10. Ending the contract">
        <p>
          You may stop using Gymly and delete your account at any time from Settings, with no
          notice and no cost. Because the service is supplied free of charge and immediately, the
          14-day right of withdrawal under Articles 52 to 59 of the Codice del Consumo does not
          apply in practice — but deleting your account achieves the same result at any moment.
        </p>
        <p>
          We may terminate this contract on reasonable notice, or immediately in the case of a
          serious breach. If we close the service entirely we will give you advance notice and a
          reasonable window to export your data.
        </p>
      </Article>

      <Article heading="11. Changes to these terms">
        <p>
          We may update these terms — for example to reflect new features or new legal
          requirements. Material changes will be announced in the app at least 15 days before
          they take effect. Continuing to use Gymly after that date means you accept the new
          terms; if you do not, you can delete your account.
        </p>
      </Article>

      <Article heading="12. Governing law and disputes">
        <p>
          These terms are governed by Italian law. If you are a consumer resident in the European
          Union, you also keep the protection of any mandatory provisions of the law of your
          country of residence, and proceedings may be brought before the court of the place
          where you live (Article 66-bis of the Codice del Consumo).
        </p>
        <p>
          You may also use the European Commission&apos;s online dispute resolution platform at{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-text underline"
          >
            ec.europa.eu/consumers/odr
          </a>
          , or an accredited Italian ADR body. For users who are not consumers, the courts of the
          operator&apos;s registered seat have exclusive jurisdiction.
        </p>
      </Article>
    </LegalPage>
  );
}
