export const APP_ROLES = ["customer", "dealer", "service_engineer", "admin"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  customer: "Customer",
  dealer: "Dealer",
  service_engineer: "Service Engineer",
  admin: "Administrator",
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  customer: "Tractor owners and farmers seeking product help, service, and recommendations.",
  dealer: "Authorised Escorts Kubota dealers managing inventory, leads, and customer service.",
  service_engineer: "Field engineers handling diagnostics, complaints, and on-ground service tickets.",
  admin: "Platform administrators — knowledge base, users, analytics, audit trail.",
};

export function roleHome(role: AppRole): string {
  switch (role) {
    case "admin":
      return "/dashboard/admin";
    case "dealer":
      return "/dashboard/dealer";
    case "service_engineer":
      return "/dashboard/engineer";
    default:
      return "/dashboard/customer";
  }
}
