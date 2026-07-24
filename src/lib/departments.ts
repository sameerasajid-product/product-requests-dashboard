// Company email domain — signup is restricted to this domain.
export const COMPANY_EMAIL_DOMAIN = "numbers.pk";

export function isCompanyDomain(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${COMPANY_EMAIL_DOMAIN}`);
}

export const DEPARTMENTS: string[] = [
  "Sales",
  "Operations",
  "Finance",
  "Marketing",
  "Support",
  "Product",
  "Other",
];
