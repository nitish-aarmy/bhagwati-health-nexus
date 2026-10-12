import { Patient, TestReport } from "./data";

const PATIENTS_KEY = "bhagwati_patients";
const REPORTS_KEY = "bhagwati_reports";

export function getPatients(): Patient[] {
  const data = localStorage.getItem(PATIENTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function savePatient(patient: Patient): void {
  const patients = getPatients();
  const idx = patients.findIndex((p) => p.id === patient.id);
  if (idx >= 0) patients[idx] = patient;
  else patients.push(patient);
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

export function deletePatient(id: string): void {
  const patients = getPatients().filter((p) => p.id !== id);
  localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
}

export function getReports(): TestReport[] {
  const data = localStorage.getItem(REPORTS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveReport(report: TestReport): void {
  const reports = getReports();
  const idx = reports.findIndex((r) => r.id === report.id);
  if (idx >= 0) reports[idx] = report;
  else reports.push(report);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function deleteReport(id: string): void {
  const reports = getReports().filter((r) => r.id !== id);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function getReportsByPatient(patientId: string): TestReport[] {
  return getReports().filter((r) => r.patientId === patientId);
}

export function buildPatientName(firstName: string, middleName = "", lastName = "") {
  return [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
}

export function generateUniquePatientId(existingIds: string[] = []): string {
  const year = new Date().getFullYear();
  const prefix = `BH-${year}-`;
  const used = new Set(existingIds.map((id) => id.toUpperCase()));
  let counter = 1;

  while (counter <= 9999) {
    const candidate = `${prefix}${String(counter).padStart(4, "0")}`;
    if (!used.has(candidate)) {
      return candidate;
    }
    counter += 1;
  }

  return `${prefix}${String(counter).padStart(4, "0")}`;
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
