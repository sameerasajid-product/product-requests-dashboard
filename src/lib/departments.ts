// One shared login per department. To add a new department, add its
// email here (must be on the numbers.pk domain) — that's the only
// place you need to edit.
export const DEPARTMENT_EMAIL_DOMAIN = "numbers.pk";

export const DEPARTMENT_EMAILS: Record<string, string> = {
  "operations@numbers.pk": "Operations",
  "sales@numbers.pk": "Sales",
  "finance@numbers.pk": "Finance",
  "marketing@numbers.pk": "Marketing",
  "support@numbers.pk": "Support",
  "product@numbers.pk": "Product",
};

export function getDepartmentForEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  return DEPARTMENT_EMAILS[normalized] ?? null;
}

export function isCompanyDomain(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${DEPARTMENT_EMAIL_DOMAIN}`);
}
