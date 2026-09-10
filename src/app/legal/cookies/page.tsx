import type { Metadata } from "next";
import { Article, Bullets, LegalPage } from "@/components/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "The cookies and local storage Gymly uses, and why none of them require a consent banner.",
};

const ROWS = [
  {
    name: "gymly_session",
    type: "Cookie — strictly necessary",
    purpose: "Keeps you signed in. Without it you would have to log in on every page.",
    life: "60 days, or until you sign out",
  },
  {
    name: "gymly.theme",
    type: "Local storage — strictly necessary",
    purpose: "Remembers whether you chose the light, dark or system appearance.",
    life: "Until you clear your browser data",
  },
  {
    name: "Service worker cache",
    type: "Cache storage — strictly necessary",
    purpose:
      "Stores the app shell so Gymly opens instantly and keeps working when the gym has no signal.",
    life: "Until replaced by a new version or you clear site data",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="This page lists everything Gymly stores on your device. It is provided under Article 122 of the Italian Codice Privacy, implementing the ePrivacy Directive 2002/58/EC, and follows the Garante's Guidelines on cookies of 10 June 2021."
    >
      <Article heading="1. Why there is no cookie banner">
        <p>
          Gymly uses only <strong className="text-text">technical</strong> cookies and equivalent
          storage — the kind that is strictly necessary to deliver a service you have explicitly
          asked for. Under Article 122(1) of the Codice Privacy and the Garante&apos;s 2021
          guidelines, those do not require your prior consent, and a banner asking for it would
          be meaningless.
        </p>
        <p>
          We use <strong className="text-text">no</strong> profiling cookies, no advertising
          cookies, no social media pixels and no third-party trackers.
        </p>
      </Article>

      <Article heading="2. What we store">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-left text-[12px] uppercase tracking-wide text-faint">
                <th className="py-2 pr-3 font-semibold">Name</th>
                <th className="py-2 pr-3 font-semibold">Type</th>
                <th className="py-2 pr-3 font-semibold">Purpose</th>
                <th className="py-2 font-semibold">Duration</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.name} className="border-b border-line align-top">
                  <td className="py-3 pr-3 font-mono text-[12.5px] text-text">{row.name}</td>
                  <td className="py-3 pr-3">{row.type}</td>
                  <td className="py-3 pr-3">{row.purpose}</td>
                  <td className="py-3">{row.life}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Article>

      <Article heading="3. Optional analytics">
        <p>
          Settings contains a switch for anonymous usage analytics. It is{" "}
          <strong className="text-text">off by default</strong> and nothing is collected unless
          you turn it on, which constitutes your consent under Article 6(1)(a) GDPR. Turning it
          off again withdraws that consent immediately.
        </p>
      </Article>

      <Article heading="4. Push notifications">
        <p>
          If you enable training reminders, your browser creates a push subscription and we store
          the endpoint and encryption keys it gives us. This is not a cookie and is not used for
          tracking — it exists only so a reminder you asked for can reach your device. Turn
          reminders off in Settings and the subscription is deleted.
        </p>
      </Article>

      <Article heading="5. Managing storage yourself">
        <Bullets
          items={[
            "You can delete cookies and site data for Gymly at any time in your browser settings.",
            "Blocking the session cookie will sign you out and prevent you from signing in again.",
            "Clearing the service worker cache only means the app has to download itself again.",
          ]}
        />
      </Article>

      <Article heading="6. Contact">
        <p>
          Questions about this policy can be sent to{" "}
          <a href={`mailto:${OPERATOR.email}`} className="font-medium text-text underline">
            {OPERATOR.email}
          </a>
          . For how we handle personal data more generally, see the Privacy Policy.
        </p>
      </Article>
    </LegalPage>
  );
}
