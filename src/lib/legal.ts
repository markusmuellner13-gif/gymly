/**
 * Identity of the data controller / service operator.
 *
 * Italian and EU law require these details to be published verbatim
 * (art. 13 GDPR, art. 7 D.Lgs. 70/2003, art. 49 Codice del Consumo).
 * Fill them in via environment variables before going live — the fallbacks
 * below are placeholders and are shown as such in the UI.
 */
export const OPERATOR = {
  name: process.env.NEXT_PUBLIC_OPERATOR_NAME ?? "[Operator legal name]",
  address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS ?? "[Registered address, Italy]",
  vat: process.env.NEXT_PUBLIC_OPERATOR_VAT ?? "[P. IVA / Codice Fiscale]",
  email: process.env.NEXT_PUBLIC_OPERATOR_EMAIL ?? "privacy@gymly.app",
  country: "Italy",
} as const;

export const LEGAL_UPDATED = "10 September 2026";

export const isPlaceholder = (value: string) => value.startsWith("[");
