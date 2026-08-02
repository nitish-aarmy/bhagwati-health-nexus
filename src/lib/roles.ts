export const APP_ROLES = [
  "super_admin",
  "owner",
  "admin",
  "receptionist",
  "doctor",
  "pathologist",
  "lab_technician",
  "radiologist",
  "nurse",
  "pharmacist",
  "billing",
  "accountant",
  "telecaller",
  "marketing",
  "followup",
  "patient",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  owner: "Hospital Owner",
  admin: "Administrator",
  receptionist: "Receptionist",
  doctor: "Doctor",
  pathologist: "Pathologist",
  lab_technician: "Lab Technician",
  radiologist: "Radiologist",
  nurse: "Nurse",
  pharmacist: "Pharmacist",
  billing: "Billing Executive",
  accountant: "Accountant",
  telecaller: "Telecaller",
  marketing: "Marketing Executive",
  followup: "Follow-up Executive",
  patient: "Patient",
};

export const ADMIN_ROLES: AppRole[] = ["super_admin", "owner", "admin"];

/** Module keys used across navigation and permission checks. */
export type ModuleKey =
  | "dashboard"
  | "patients"
  | "appointments"
  | "laboratory"
  | "billing"
  | "followups"
  | "calls"
  | "administration"
  | "portal";

const CLINICAL: AppRole[] = ["doctor", "nurse", "radiologist", "pathologist", "lab_technician"];
const FRONT_DESK: AppRole[] = ["receptionist", "telecaller", "followup", "marketing"];
const FINANCE: AppRole[] = ["billing", "accountant", "pharmacist"];

export const MODULE_ACCESS: Record<ModuleKey, AppRole[]> = {
  dashboard: [...ADMIN_ROLES, ...CLINICAL, ...FRONT_DESK, ...FINANCE],
  patients: [...ADMIN_ROLES, ...CLINICAL, ...FRONT_DESK, ...FINANCE],
  appointments: [...ADMIN_ROLES, ...CLINICAL, ...FRONT_DESK],
  laboratory: [...ADMIN_ROLES, "doctor", "pathologist", "lab_technician", "radiologist", "nurse"],
  billing: [...ADMIN_ROLES, ...FINANCE, "receptionist"],
  followups: [...ADMIN_ROLES, ...FRONT_DESK, "nurse"],
  calls: [...ADMIN_ROLES, ...FRONT_DESK],
  administration: ADMIN_ROLES,
  portal: ["patient"],
};

export function canAccess(module: ModuleKey, roles: AppRole[]): boolean {
  return roles.some((role) => MODULE_ACCESS[module].includes(role));
}

export function isStaff(roles: AppRole[]): boolean {
  return roles.some((role) => role !== "patient");
}

export function isAdmin(roles: AppRole[]): boolean {
  return roles.some((role) => ADMIN_ROLES.includes(role));
}

export function primaryRoleLabel(roles: AppRole[]): string {
  if (roles.length === 0) return "No role assigned";
  const ordered = [...roles].sort(
    (a, b) => APP_ROLES.indexOf(a) - APP_ROLES.indexOf(b),
  );
  return ROLE_LABELS[ordered[0]!];
}