import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileText,
  HeartPulse,
  Plus,
  Search,
  ShieldAlert,
  Stethoscope,
} from "lucide-react";

import { PageHeader } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatDateDMY, formatDateTimeDMY } from "@/lib/utils";
import { guardModuleAccess } from "@/lib/route-guards";
import {
  COMPLAINTS_LIBRARY,
  DIAGNOSIS_LIBRARY,
  DIET_LIBRARY,
  DONTS_LIBRARY,
  DOS_LIBRARY,
  EMERGENCY_WARNING_LIBRARY,
  INVESTIGATION_TEST_LIBRARY,
  SURGICAL_PROCEDURE_LIBRARY,
  type InvestigationTestTemplate,
  REFERRAL_TEMPLATES,
  TREATMENT_LIBRARY,
} from "@/features/referral-summary/library";
import { patientsQuery } from "@/lib/queries";
import { EMPTY_MEDICATION_ROW, useReferralDraft } from "@/features/referral-summary/useReferralDraft";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

// Local helpers and constants (kept minimal to avoid SSR mismatches)
const MEDICINE_LIBRARY_KEY = "bhagwati:medicine-library";
const PATIENT_MEDICINE_LIBRARY_KEY_BASE = "bhagwati:medicine-library:";
const COMPLAINTS_USER_LIBRARY_KEY = "bhagwati:user:complaints";
const DIAGNOSIS_USER_LIBRARY_KEY = "bhagwati:user:diagnosis";
const TREATMENT_USER_LIBRARY_KEY = "bhagwati:user:treatment";
const SURGICAL_PROCEDURE_LIBRARY_KEY = "bhagwati:user:surgical-procedures";
const INVESTIGATION_CUSTOM_LIBRARY_KEY = "bhagwati:user:investigation-tests";
const DIET_USER_LIBRARY_KEY = "bhagwati:user:diet";
const DOS_USER_LIBRARY_KEY = "bhagwati:user:dos";
const DONTS_USER_LIBRARY_KEY = "bhagwati:user:donots";
const EMERGENCY_WARNING_USER_LIBRARY_KEY = "bhagwati:user:emergency-warnings";
const DOCTOR_LIBRARY_KEY = "bhagwati:user:doctors";
const DISCHARGE_SUMMARY_QUEUE_KEY = "bhagwati:discharge-summary-queue";
const SUMMARY_SEQUENCE_KEY = "bhagwati:summary-sequence";

const PRESET_MEDICINE_LIBRARY: MedicineLibraryItem[] = [];
const MEDICINE_TYPES: MedicationRow["medicineType"][] = ["TAB", "CAP", "SYP", "INJ", "IV", "OINTMENT", "OIL"];

const DEFAULT_DOCTOR_PROFILE: DoctorProfile = {
  id: "default-sushil-kr-pandey",
  name: "DR SUSHIL KR PANDEY MBBS, MS, DNB(GENERAL SURGERY) REG.NO. JMC/2257",
  degree: "",
  speciality: "GENERAL SURGERY",
  details: "",
};

const ALL_REPORTS_ATTACHED_TEST_ID = "all_reports_attached";
const ALL_REPORTS_ATTACHED_LABEL = "ALL REPORTS ATTACHED";

function createId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;
}

function normalizeDetail(value?: string) {
  return String(value ?? "").trim();
}

function toUpper(value: string) {
  return String(value ?? "").toUpperCase();
}

function hasText(value?: string) {
  return String(value ?? "").trim().length > 0;
}

export function doctorDisplayName(doctor: DoctorProfile) {
  return [doctor.name, doctor.degree, doctor.speciality || doctor.details, doctor.details].filter((part, index, array) => {
    const value = hasText(part) ? part.trim() : "";
    return value.length > 0 && array.indexOf(part) === index;
  }).join(", ");
}

function doctorSignatureLines(doctor: DoctorProfile) {
  const rawName = String(doctor?.name ?? "").trim();
  const cleanedName = rawName
    .replace(/\s+(MBBS|MS|MD|MDS|DNB|DM|MCH|FRCS|MRCS|MHA|DGO|BAMS|BHMS|BDS)\b.*$/gi, "")
    .replace(/\s+REG(?:ISTRATION)?\.?\s*NO\.?\s*.*$/gi, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const formattedName = cleanedName
    ? cleanedName.replace(/\bKR\b/gi, "KUMAR").replace(/\bDR\b/gi, "DR").toUpperCase()
    : "DR";

  const degreeLine = String(doctor?.degree ?? "").trim();
  return {
    nameLine: formattedName,
    degreeLine: degreeLine ? degreeLine.toUpperCase() : "",
  };
}

function joinNonEmpty(items: string[]) {
  return items.filter((s) => hasText(s)).join(", ");
}

function escapeHtml(unsafe: string) {
  return String(unsafe)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function doctorPrintHtml(name: string) {
  return escapeHtml(name || "").replace(/,\s*/g, "<br>");
}

function doctorPrintRows(doctors: DoctorProfile[], fallbackDoctorName: string) {
  const printableDoctors = doctors.length > 0 ? doctors : [{ id: "fallback", name: fallbackDoctorName, degree: "", speciality: "", details: "" }];
  return printableDoctors
    .map((doctor, index) => {
      const nameParts = String(doctor.name || "-").split(",");
      const name = escapeHtml(nameParts.shift()?.trim() || "-");
      const printedDetails = [doctor.degree, doctor.speciality || doctor.details, doctor.details]
        .map((detail) => detail?.trim() ?? "")
        .filter((detail, detailIndex, array) => Boolean(detail) && array.indexOf(detail) === detailIndex)
        .map((detail) => `<div class="doctor-degree">${escapeHtml(detail)}</div>`)
        .join("");
      const label = index === 0 ? "Treating Doctor" : "Other Doctor";
      const isFirstRow = index === 0;
      const rowClass = isFirstRow ? "doctor-full-row" : "";
      return `
        <div class="label ${rowClass}">${label}</div>
        <div class="colon ${rowClass}">:</div>
        <div class="value doctor-value ${isFirstRow ? "doctor-full-width" : ""}">
          <span class="doctor-colon">:</span>
          <div class="doctor-details"><div>${name}</div>${printedDetails}</div>
        </div>
      `;
    })
    .join("");
}

function doctorPrintValue(name: string) {
  return String(name || "");
}

function toInvestigationId(prefix: string, name: string) {
  return `${prefix}_${String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

function financialYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
}

export function readSummaryQueue() {
  if (typeof window === "undefined") return [] as DischargeSummaryQueueItem[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DISCHARGE_SUMMARY_QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is DischargeSummaryQueueItem => Boolean(item?.patientName && item?.preparedAt)) : [];
  } catch {
    return [] as DischargeSummaryQueueItem[];
  }
}

export function buildSummaryQueueItem({
  patientId,
  patientName,
  summaryMode,
  status,
  draft,
}: {
  patientId: string;
  patientName: string;
  summaryMode: SummaryMode;
  status: DischargeSummaryQueueItem["status"];
  draft: Partial<ReferralDraft>;
}): DischargeSummaryQueueItem {
  const summaryId = nextSummaryId(summaryMode);
  return {
    id: createId(),
    summaryId,
    patientId,
    patientName: toUpper(patientName),
    summaryMode,
    preparedAt: new Date().toISOString(),
    status,
    draftSnapshot: draft,
  };
}

function nextSummaryId(summaryMode: SummaryMode) {
  const prefix = summaryMode === "referral_summary" ? "REF" : "DIS";
  const year = financialYear();
  const key = `${prefix}-${year}`;
  let sequence = 0;
  try {
    const stored = JSON.parse(window.localStorage.getItem(SUMMARY_SEQUENCE_KEY) || "{}") as Record<string, number>;
    sequence = Number(stored[key] || 0) + 1;
    window.localStorage.setItem(SUMMARY_SEQUENCE_KEY, JSON.stringify({ ...stored, [key]: sequence }));
  } catch {
    sequence = Date.now() % 100000;
  }
  return `BH/${prefix}/${year}${String(sequence).padStart(3, "0")}`;
}
import type {
  DischargeSummaryQueueItem,
  DoctorProfile,
  FollowUpPreset,
  InvestigationRecord,
  MedicationRow,
  SummaryMode,
  SurgicalProcedureEntry,
} from "@/features/referral-summary/types";

type MedicineLibraryItem = {
  id: string;
  type: MedicationRow["medicineType"];
  name: string;
  suggestedDose?: string;
};

// cleaned stray insertion removed above; helper functions and the main createReferralHtml
// implementation follow later in this file.


function foodTimingPrintLabel(value?: string) {
  if (!value) return "";
  const labels: Record<string, string> = {
    empty_stomach: "EMPTY STOMACH",
    after_meal: "AFTER MEAL",
    before_breakfast: "BEFORE BREAKFAST",
    after_breakfast: "AFTER BREAKFAST",
    after_lunch: "AFTER LUNCH",
    after_lunch_2: "AFTER LUNCH",
    none: "",
  };
  return labels[value] ?? "";
}

function medicationSchedulePrintBlock(row: MedicationRow) {
  const line1 = `${row.medicineType ? `${row.medicineType} ` : ""}${row.medicineName || "DRUG"}`.trim();
  const foodLabel = foodTimingPrintLabel(row.foodTiming);
  const doseToken = row.dose?.trim() || "1";
  const doseLine = [doseToken, row.medicineType || "TAB", foodLabel].filter(Boolean).join(" ");
  const timeParts = [
    row.morning ? "OD" : "",
    row.afternoon ? "BD" : "",
    row.tds ? "TDS" : "",
    row.hs ? "HS" : "",
    row.sos ? "SOS" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const duration = row.durationDays ? `${row.durationDays} DAYS` : "";
  const scheduleLine = [timeParts || "", duration ? `FOR ${duration}` : ""].filter(Boolean).join(" ");
  return `${line1}\n${doseLine}${scheduleLine ? `\n${scheduleLine}` : ""}`;
}

function getMedicationScheduleLabel(row: MedicationRow) {
  if (row.morning) return "OD";
  if (row.afternoon) return "BD";
  if (row.tds) return "TDS";
  if (row.hs) return "HS";
  if (row.sos) return "SOS";
  return row.dose?.trim() || "Dose";
}

function applySingleMedicationSchedule(rowId: string, schedule: "OD" | "BD" | "TDS" | "HS" | "SOS", updateMedication: (id: string, patch: Partial<MedicationRow>) => void) {
  updateMedication(rowId, {
    morning: schedule === "OD",
    afternoon: schedule === "BD",
    tds: schedule === "TDS",
    hs: schedule === "HS",
    sos: schedule === "SOS",
  });
}

function formatFollowUpAfterLabel(days: number | 0, customDays: number) {
  const resolvedDays = Number(days) > 0 ? Number(days) : Number(customDays) || 0;
  if (!resolvedDays) return "";
  return `FOLLOW UP AFTER ${resolvedDays} DAYS`;
}

function formatInvestigationRecord(record: InvestigationRecord) {
  const parameterBits = record.parameters
    .filter((item) => item.result.trim().length > 0)
    .map((item) => `${item.name}: ${item.result}${item.unit ? ` ${item.unit}` : ""}`);

  if (parameterBits.length === 0) return record.testName;
  return `${record.testName} (${parameterBits.join(", ")})`;
}

function formatInvestigationsForDocument(investigations: InvestigationRecord[]) {
  if (investigations.length === 0) return "-";
  if (investigations.some((investigation) => investigation.testId === ALL_REPORTS_ATTACHED_TEST_ID)) {
    return ALL_REPORTS_ATTACHED_LABEL.replace(/ALL\s*/i, "");
  }
  const withInlineReportTag = investigations.map(formatInvestigationRecord).join(", ");
  return withInlineReportTag;
}

function formatSurgicalProceduresForDocument(surgicalProcedures: SurgicalProcedureEntry[]) {
  if (surgicalProcedures.length === 0) return "-";
  return surgicalProcedures
    .map((entry) => `${entry.procedure}${entry.finding.trim() ? `: ${entry.finding.trim()}` : ""}`)
    .join("; ");
}

function createReferralHtml({
  patientName,
  patientRegistrationId,
  ageGender,
  summaryId,
  draft,
}: {
  patientName: string;
  patientRegistrationId: string;
  ageGender: string;
  summaryId: string;
  draft: {
    admissionDate: string;
    dischargeDate: string;
    doctorName: string;
    doctors: DoctorProfile[];
    diagnosis: string[];
    chiefComplaints: string[];
    patientHistory: string;
    treatmentGiven: string[];
    investigations: InvestigationRecord[];
    surgicalProcedures: SurgicalProcedureEntry[];
    dietAdvice: string[];
    dos: string[];
    donts: string[];
    emergencyWarnings: string[];
    doctorNotes: string;
    referralReason: string;
    referredHospital: string;
    referredDepartment: string;
    referredDoctor: string;
    urgency: string;
    transferMode: string;
    referralSummary: string;
    summaryMode: SummaryMode;
    dischargedToHome: boolean;
    dischargedWithoutConsent: boolean;
    patientConditionDuringDischarge: string;
    provisionalDiagnosisText?: string;
    medication: MedicationRow[];
    savedMedicationEntries: MedicationRow[];
  };
}) {
  const medicationLines = [...draft.savedMedicationEntries, ...draft.medication]
    .filter((m) => m.medicineName.trim().length > 0)
      .map(medicationSchedulePrintBlock);

  const summaryLabel = draft.summaryMode === "referral_summary" ? "REFERRAL SUMMARY" : "DISCHARGE SUMMARY";
  const summaryIdLabel = draft.summaryMode === "referral_summary" ? "Referral ID" : "Discharge ID";
  const treatingDoctors = draft.doctors.length > 0 ? draft.doctors.map(doctorDisplayName) : [draft.doctorName || "-"];

  // Keep primary patient identifiers on the left and admission details on the right.
  const patientDetailRows = `
    <div class="patient-details-columns">
      <div class="details-grid">
        <div class="label">${summaryIdLabel}</div><div class="colon">:</div><div class="value">${escapeHtml(summaryId)}</div>
        <div class="label">Patient Registration ID</div><div class="colon">:</div><div class="value">${escapeHtml(patientRegistrationId)}</div>
        <div class="label">Patient Name</div><div class="colon">:</div><div class="value">${escapeHtml(patientName || "-")}</div>
        <div class="label">Age/Gender</div><div class="colon">:</div><div class="value">${escapeHtml(ageGender || "-")}</div>
      </div>
      <div class="details-grid">
        <div class="label">Admission Date</div><div class="colon">:</div><div class="value">${escapeHtml(hasText(draft.admissionDate) ? formatDateDMY(draft.admissionDate) : "-")}</div>
        <div class="label">Discharge Date</div><div class="colon">:</div><div class="value">${escapeHtml(hasText(draft.dischargeDate) ? formatDateDMY(draft.dischargeDate) : "-")}</div>
        ${doctorPrintRows(draft.doctors, draft.doctorName || "-")}
      </div>
    </div>
  `;

  const clinicalPairs: Array<[string, string]> = [];
  if (draft.chiefComplaints.length > 0) clinicalPairs.push(["Chief Complaints", joinNonEmpty(draft.chiefComplaints)]);
  if (hasText(draft.patientHistory)) clinicalPairs.push(["Past Medical History", draft.patientHistory.toUpperCase()]);
  if (hasText(draft.allergies)) clinicalPairs.push(["Allergies", draft.allergies.toUpperCase()]);
  if (draft.provisionalDiagnosisText && draft.provisionalDiagnosisText.trim().length > 0)
    clinicalPairs.push(["Discharge Diagnosis", draft.provisionalDiagnosisText.toUpperCase()]);
  else if (draft.diagnosis.length > 0) clinicalPairs.push(["Discharge Diagnosis", joinNonEmpty(draft.diagnosis)]);
  if (draft.investigations.length > 0) clinicalPairs.push(["IPD Investigations", formatInvestigationsForDocument(draft.investigations)]);
  if (draft.surgicalProcedures.length > 0) clinicalPairs.push(["Surgical Procedure", formatSurgicalProceduresForDocument(draft.surgicalProcedures)]);
  if (draft.treatmentGiven.length > 0) clinicalPairs.push(["Medical Management", joinNonEmpty(draft.treatmentGiven)]);
  const medicalManagementIndex = clinicalPairs.findIndex(([label]) => label === "Medical Management");
  const initialClinicalPairs = medicalManagementIndex >= 0 ? clinicalPairs.slice(0, medicalManagementIndex) : clinicalPairs;
  const postManagementPairs = medicalManagementIndex >= 0 ? clinicalPairs.slice(medicalManagementIndex) : [];
  const detailsGrid = (pairs: Array<[string, string]>, className = "") => pairs.length
    ? `
      <div class="details-grid ${className}">
        ${pairs
          .map((p) => `<div class="label">${escapeHtml(p[0])}</div><div class="colon">:</div><div class="value">${escapeHtml(p[1])}</div>`)
          .join("")}
      </div>
    `
    : "";
  const clinicalRows = detailsGrid(initialClinicalPairs);
  const postManagementRows = detailsGrid(postManagementPairs, "flow-details-grid");

  const summaryRows = hasText(draft.referralSummary) && draft.summaryMode === "referral_summary"
    ? `<h2>Discharge Summary</h2><div class="summary-text">${escapeHtml(draft.referralSummary)}</div>`
    : "";
  const doctorCommentsRows = hasText(draft.doctorNotes)
    ? `<div class="details-grid"><div class="label">Doctor's Comments</div><div class="colon">:</div><div class="value">${escapeHtml(draft.doctorNotes)}</div></div>`
    : "";

  const referralPairs: Array<[string, string]> = [];
  if (hasText(draft.referralReason)) referralPairs.push(["Reason", draft.referralReason]);
  if (hasText(draft.referredHospital)) referralPairs.push(["Referred Hospital", draft.referredHospital]);
  if (hasText(draft.referredDepartment)) referralPairs.push(["Referred Department", draft.referredDepartment]);
  if (hasText(draft.referredDoctor)) referralPairs.push(["Referred Doctor", draft.referredDoctor]);
  if (hasText(draft.urgency)) referralPairs.push(["Urgency", draft.urgency]);
  if (hasText(draft.transferMode)) referralPairs.push(["Transfer Mode", draft.transferMode]);
  if (hasText(draft.referralSummary)) referralPairs.push([summaryLabel, draft.referralSummary]);
  const referralRows = referralPairs.length
    ? `
      <div class="details-grid">
        ${referralPairs
          .map((p) => `<div class="label">${escapeHtml(p[0])}</div><div class="colon">:</div><div class="value">${escapeHtml(p[1])}</div>`)
          .join("")}
      </div>
    `
    : "";

  const dischargePairs: Array<[string, string]> = [];
  if (draft.dischargedToHome) dischargePairs.push(["Discharge Status", "PATIENT DISCHARGED TO HOME"]);
  if (hasText(draft.patientConditionDuringDischarge)) dischargePairs.push(["Patient Condition During Discharge", draft.patientConditionDuringDischarge.toUpperCase()]);
  if (draft.dischargedWithoutConsent) dischargePairs.push(["Discharge Status", "PATIENT DISCHARGED WITHOUT DOCTOR CONSENT"]);
  const dischargeOnlyRows = dischargePairs.length
    ? `
      <div class="details-grid">
        ${dischargePairs
          .map((p) => `<div class="label">${escapeHtml(p[0])}</div><div class="colon">:</div><div class="value discharge-value"><div class="discharge-details">${escapeHtml(p[1])}</div></div>`)
          .join("")}
      </div>
    `
    : "";

  const advicePairs: Array<[string, string]> = [];
  const followUpLabelText = formatFollowUpAfterLabel(draft.followUpDays, draft.customFollowUpDays);
  if (followUpLabelText) advicePairs.push(["Follow Ups After", followUpLabelText]);
  if (draft.dietAdvice.length > 0) advicePairs.push(["Post Operative Precautionary Advice", joinNonEmpty(draft.dietAdvice)]);
  if (draft.dos.length > 0) advicePairs.push(["Do's", joinNonEmpty(draft.dos)]);
  if (draft.donts.length > 0) advicePairs.push(["Don'ts", joinNonEmpty(draft.donts)]);
  if (draft.emergencyWarnings.length > 0) advicePairs.push(["Emergency Warnings", joinNonEmpty(draft.emergencyWarnings)]);
  const adviceRows = advicePairs.length
    ? `
      <div class="details-grid">
        ${advicePairs
          .map((p) => `<div class="label">${escapeHtml(p[0])}</div><div class="colon">:</div><div class="value">${escapeHtml(p[1])}</div>`)
          .join("")}
      </div>
    `
    : "";

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${summaryLabel}</title>
      <style>
        @page { size: A4; margin: 2in 14mm 1in 14mm; }
        body { font-family: Arial, sans-serif; color: #111; font-size: 11.5px; line-height: 1.35; position: relative; min-height: 297mm; }
        h1, h2 { margin: 0; }
        h1 { font-size: 16px; text-align: center; }
        .print-header h1 { grid-column: 2; }
        .print-header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; }
        .print-header .muted { grid-column: 3; text-align: right; }
        .doctor-value { display: grid; grid-template-columns: 6px minmax(0, 1fr); column-gap: 0; text-align: left; }
        .doctor-details { min-width: 0; }
        .doctor-degree { margin-left: 0; }
        .discharge-value { display: grid; grid-template-columns: 6px minmax(0, 1fr); column-gap: 0; text-align: left; }
        .discharge-details { min-width: 0; }
        .signature-name { margin-top: 4px; font-weight: 700; }
        h2 { font-size: 12.5px; margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
        .muted { color: #444; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-top: 8px; }
        .details-grid { display: grid; grid-template-columns: 160px 8px 1fr; gap: 2px 8px; align-items: start; }
        .details-grid .doctor-full-row {
          grid-column: 1 / -1;
        }
        .details-grid .doctor-full-width {
          grid-column: 1 / -1;
          width: 100%;
          max-width: 100%;
        }
        .details-grid .doctor-full-width .doctor-details {
          width: 100%;
          max-width: 100%;
        }
        .flow-columns { column-count: 2; column-gap: 10px; column-fill: auto; margin-top: 10px; }
        .flow-columns > * { break-inside: avoid; page-break-inside: avoid; }
        .flow-columns .wide-panel { column-span: all; }
        .flow-details-grid { margin-top: 0; }
        .patient-details-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .patient-details-columns .details-grid { grid-template-columns: 120px 8px minmax(0, 1fr); }
        .details-grid .label { font-weight: 700; font-size: 11px; }
        .details-grid .value { font-size: 11px; }
        .summary-text { white-space: pre-line; font-size: 11px; margin-top: 6px; }
        .card { border: 1px solid #ddd; border-radius: 8px; padding: 8px; margin-top: 8px; }
        .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
        .panel { border: 1px solid #ddd; border-radius: 8px; padding: 8px; }
        ul { margin: 6px 0 0 18px; padding: 0; }
        li { white-space: pre-line; margin-bottom: 5px; }
        .row { margin-top: 5px; }
        .footer {
          position: fixed;
          left: 12mm;
          right: 12mm;
          bottom: 6mm;
          display: flex;
          justify-content: center;
          width: auto;
          z-index: 1;
          pointer-events: none;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: end;
          column-gap: 22px;
          width: 100%;
          max-width: 520px;
          pointer-events: auto;
        }
        .footer-cell {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: stretch;
          text-align: left;
          min-width: 0;
          min-height: 60px;
          width: 100%;
        }
        .footer-line { margin: 0; }
        .footer-label { margin: 0 0 3px; font-size: 10px; font-weight: 700; }
        .footer-underline {
          margin: 0;
          width: 100%;
          min-height: 16px;
          border-bottom: 1px solid #111;
        }
        .signature-name {
          margin-top: 6px;
          margin-bottom: 0;
          font-weight: 700;
          font-size: 10.5px;
          white-space: normal;
          word-break: break-word;
          max-width: 180px;
          min-height: 12px;
        }
        .signature-degree {
          margin: 2px 0 0;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.02em;
          white-space: normal;
          word-break: break-word;
          max-width: 180px;
        }
        .doctor-signature-block { margin-top: 6px; }
        .hospital-seal { margin-left: 0; }
        .hospital-placeholder {
          visibility: hidden;
          pointer-events: none;
        }
      </style>
    </head>
    <body>
      <header class="print-header"><h1>${summaryLabel}</h1><div class="muted">Generated on ${formatDateTimeDMY(new Date())}</div></header>

      <div class="card">
        ${patientDetailRows}
      </div>

      ${clinicalRows ? `<div class="panel full-width-clinical">${clinicalRows}</div>` : ""}

      <div class="flow-columns">
        ${postManagementRows ? `<div class="panel">${postManagementRows}</div>` : ""}
        ${medicationLines.length > 0 ? `<div class="panel wide-panel"><h2>Medications and Advice</h2><ul>${medicationLines.map((line) => `<li>${escapeHtml(String(line).toUpperCase())}</li>`).join("")}</ul></div>` : ""}
        ${doctorCommentsRows ? `<div class="panel wide-panel"><h2>Doctor's Comments</h2>${doctorCommentsRows}</div>` : ""}
        ${draft.summaryMode === "referral_summary" && (referralRows || adviceRows) ? `<div class="panel">${draft.summaryMode === "referral_summary" ? "<h2>Referral Details</h2>" : ""}${referralRows}${adviceRows ? `<h2 style="margin-top: 10px;">Advice</h2>${adviceRows}` : ""}</div>` : ""}
        ${draft.summaryMode !== "referral_summary" && (dischargeOnlyRows || adviceRows) ? `<div class="panel wide-panel">${dischargeOnlyRows}${adviceRows ? `<h2 style="margin-top: 10px;">Advice</h2>${adviceRows}` : ""}</div>` : ""}
      </div>
      <div class="footer">
        <div class="footer-grid">
          <div class="footer-cell doctor-signature-block">
            <p class="footer-label">Doctor Signature</p>
            <p class="footer-underline"></p>
            ${(() => {
              const doctor = draft.doctors[0] || { name: draft.doctorName || "-", degree: "", speciality: "", details: "" };
              const signature = doctorSignatureLines(doctor);
              return `<p class="signature-name">${escapeHtml(signature.nameLine)}</p>${signature.degreeLine ? `<p class="signature-degree">${escapeHtml(signature.degreeLine)}</p>` : ""}`;
            })()}
          </div>
          <div class="footer-cell hospital-seal">
            <p class="footer-label">Hospital Seal</p>
            <p class="footer-underline"></p>
            <p class="signature-name hospital-placeholder" aria-hidden="true">&nbsp;</p>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

export const Route = createFileRoute("/_authenticated/referrals")({
  ssr: false,
  beforeLoad: guardModuleAccess("referrals"),
  component: ReferralsPage,
});

const FOLLOW_UP_OPTIONS: Array<{ label: string; value: FollowUpPreset | 0 }> = [
  { label: "5 DAYS", value: 5 },
  { label: "7 DAYS", value: 7 },
  { label: "15 DAYS", value: 15 },
  { label: "Custom", value: 0 },
];

function ReferralsPage() {
  const [search, setSearch] = useState("");
  const [patientId, setPatientId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [medicineLibrary, setMedicineLibrary] = useState<MedicineLibraryItem[]>([]);
  const [patientMedicineLibrary, setPatientMedicineLibrary] = useState<MedicineLibraryItem[]>([]);
  const [newMedicineType, setNewMedicineType] = useState<NonNullable<MedicationRow["medicineType"]>>("TAB");
  const [newMedicineName, setNewMedicineName] = useState("");
  const [isAddMedicineDialogOpen, setIsAddMedicineDialogOpen] = useState(false);
  const [medicineSectionRefreshKey, setMedicineSectionRefreshKey] = useState(0);
  const [savedMedicationIds, setSavedMedicationIds] = useState<string[]>([]);
  const [savedSummaryDialogOpen, setSavedSummaryDialogOpen] = useState(false);
  const [savedSummaryItems, setSavedSummaryItems] = useState<DischargeSummaryQueueItem[]>([]);

  const patients = useQuery(patientsQuery(search));
  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients.data ?? [];

    return (patients.data ?? []).filter((patient) => {
      const searchableText = [
        patient.first_name,
        patient.last_name,
        patient.full_name,
        patient.locality,
        patient.city,
        patient.phone,
        patient.email,
        patient.uhid,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [patients.data, search]);

  const selectedPatient = useMemo(
    () => filteredPatients.find((p) => p.id === patientId) ?? (patients.data ?? []).find((p) => p.id === patientId),
    [patientId, filteredPatients, patients.data],
  );

  const { draft, setDraft, lastSavedAt } = useReferralDraft(patientId);

  useEffect(() => {
    if (draft.doctors.length > 0 || !draft.doctorName) return;
    setDraft((prev) => ({
      ...prev,
      doctors: [{ id: createId(), name: toUpper(prev.doctorName), degree: "", speciality: "", details: "" }],
    }));
  }, [draft.doctorName, draft.doctors.length, setDraft]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MEDICINE_LIBRARY_KEY);
      const parsed = raw ? (JSON.parse(raw) as MedicineLibraryItem[]) : [];
      const normalized = (Array.isArray(parsed) ? parsed : [])
        .map((item) => {
          const name = normalizeDetail(String(item?.name ?? "").trim());
          const type = MEDICINE_TYPES.includes(item?.type as NonNullable<MedicationRow["medicineType"]>)
            ? (item.type as NonNullable<MedicationRow["medicineType"]>)
            : "TAB";
          return {
            id: String(item?.id ?? createId()),
            type,
            name,
            suggestedDose: normalizeDetail(String(item?.suggestedDose ?? "").trim()),
          };
        })
        .filter((item) => item.name.length > 0);

      const unique = Array.from(
        new Map(
          [...PRESET_MEDICINE_LIBRARY, ...normalized].map((item) => [
            `${item.type}:${item.name}`,
            {
              ...item,
              suggestedDose: normalizeDetail(String(item.suggestedDose ?? "").trim()),
            },
          ]),
        ).values(),
      );
      setMedicineLibrary(unique);

      window.localStorage.setItem(MEDICINE_LIBRARY_KEY, JSON.stringify(unique));
    } catch {
      setMedicineLibrary(PRESET_MEDICINE_LIBRARY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!patientId) {
      setPatientMedicineLibrary([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(`${PATIENT_MEDICINE_LIBRARY_KEY_BASE}${patientId}`);
      const parsed = raw ? (JSON.parse(raw) as MedicineLibraryItem[]) : [];
      const normalized = (Array.isArray(parsed) ? parsed : [])
        .map((item) => ({
          id: String(item?.id ?? createId()),
          type: MEDICINE_TYPES.includes(item?.type as any) ? (item.type as MedicationRow["medicineType"]) : "TAB",
          name: normalizeDetail(String(item?.name ?? "").trim()),
          suggestedDose: normalizeDetail(String(item?.suggestedDose ?? "").trim()),
        }))
        .filter((item) => item.name.length > 0);

      setPatientMedicineLibrary(normalized);
    } catch {
      setPatientMedicineLibrary([]);
    }
  }, [patientId]);

  const applyTemplate = (nextTemplateId: string) => {
    setTemplateId(nextTemplateId);
    const template = REFERRAL_TEMPLATES.find((item) => item.id === nextTemplateId);
    if (!template) return;
    setDraft((prev) => ({
      ...prev,
      templateId: template.id,
      diagnosis: template.diagnosis,
      treatmentGiven: template.treatmentGiven,
      dietAdvice: template.dietAdvice,
      dos: template.dos,
      donts: template.donts,
      emergencyWarnings: template.emergencyWarnings,
    }));
  };

  const addMedicationRow = () => {
    setDraft((prev) => ({
      ...prev,
      medication: [...prev.medication, { ...EMPTY_MEDICATION_ROW, id: createId() }],
    }));
  };

  const removeMedicationRow = (id: string) => {
    setDraft((prev) => {
      const nextMedication = prev.medication.filter((item) => item.id !== id);
      return {
        ...prev,
        medication: nextMedication.length > 0 ? nextMedication : [{ ...EMPTY_MEDICATION_ROW, id: createId() }],
      };
    });
  };

  const addMedicineToDraft = () => {
    const name = toUpper(normalizeDetail(newMedicineName.trim()));
    if (!name) {
      toast.error("Enter medicine name");
      return false;
    }
    setDraft((prev) => {
      const index = prev.medication.findIndex((row) => !hasText(row.medicineName));
      const targetIndex = index >= 0 ? index : prev.medication.length;
      return {
        ...prev,
        medication:
          index >= 0
            ? prev.medication.map((row, rowIndex) =>
                rowIndex === targetIndex ? { ...row, medicineName: name, medicineType: newMedicineType } : row,
              )
            : [...prev.medication, { ...EMPTY_MEDICATION_ROW, id: createId(), medicineName: name, medicineType: newMedicineType }],
      };
    });

    setNewMedicineName("");
    toast.success("Medicine added to the draft");
    return true;
  };

  const handleSaveMedicineFromDialog = () => {
    const saved = addMedicineToDraft();
    if (!saved) return;
    setIsAddMedicineDialogOpen(false);
  };

  const removeMedicineFromLibrary = (id: string) => {
    const nextLibrary = medicineLibrary.filter((item) => item.id !== id);
    setMedicineLibrary(nextLibrary);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MEDICINE_LIBRARY_KEY, JSON.stringify(nextLibrary));
    }
    // remove from patient-specific library if present
    if (patientId && typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(`${PATIENT_MEDICINE_LIBRARY_KEY_BASE}${patientId}`);
        const parsed = raw ? (JSON.parse(raw) as MedicineLibraryItem[]) : [];
        const nextP = (Array.isArray(parsed) ? parsed : []).filter((it) => it.id !== id && `${it.type}:${it.name}` !== id);
        window.localStorage.setItem(`${PATIENT_MEDICINE_LIBRARY_KEY_BASE}${patientId}`, JSON.stringify(nextP));
        setPatientMedicineLibrary(nextP);
      } catch {
        // ignore
      }
    }

    toast.success("Medicine removed from saved list");
  };

  const medicineOptions = useMemo(() => {
    const fromLibrary = medicineLibrary
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({
        name: item.name,
        type: item.type,
        suggestedDose: item.suggestedDose,
      }));

    const unique = Array.from(new Map(fromLibrary.map((item) => [`${item.type}:${item.name}`, item])).values());
    unique.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return unique;
  }, [medicineLibrary, draft.medication]);

  const updateMedication = (id: string, patch: Partial<MedicationRow>) => {
    setDraft((prev) => ({
      ...prev,
      medication: prev.medication.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const persistMedicineLibrary = (nextLibrary: MedicineLibraryItem[]) => {
    setMedicineLibrary(nextLibrary);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MEDICINE_LIBRARY_KEY, JSON.stringify(nextLibrary));
    }
  };

  const persistPatientMedicineLibrary = (nextLibrary: MedicineLibraryItem[]) => {
    setPatientMedicineLibrary(nextLibrary);
    if (typeof window !== "undefined" && patientId) {
      window.localStorage.setItem(`${PATIENT_MEDICINE_LIBRARY_KEY_BASE}${patientId}`, JSON.stringify(nextLibrary));
    }
  };

  const saveMedicationEntry = (row: MedicationRow) => {
    const medicineName = normalizeDetail(row.medicineName.trim());
    if (!medicineName) {
      toast.error("Select or enter medicine name before saving entry");
      return;
    }

    const medicineType = row.medicineType ?? "TAB";
    const suggestedDose = normalizeDetail((row.dose || "").trim());
    const existingIndex = medicineLibrary.findIndex(
      (item) => item.type === medicineType && item.name.trim().toLowerCase() === medicineName.toLowerCase(),
    );

    if (existingIndex >= 0) {
      const updated = [...medicineLibrary];
      if (suggestedDose && !hasText(updated[existingIndex].suggestedDose || "")) {
        updated[existingIndex] = { ...updated[existingIndex], suggestedDose };
        persistMedicineLibrary(updated);
      }
      // also persist to patient library if present
      if (patientId) {
        try {
          const raw = window.localStorage.getItem(`${PATIENT_MEDICINE_LIBRARY_KEY_BASE}${patientId}`);
          const parsed = raw ? (JSON.parse(raw) as MedicineLibraryItem[]) : [];
          const pNext = Array.from(
            new Map(
              [...(Array.isArray(parsed) ? parsed : []), updated[existingIndex]].map((it) => [`${it.type}:${it.name}`, it]),
            ).values(),
          );
          persistPatientMedicineLibrary(pNext);
        } catch {
          // ignore
        }
      }
    } else {
      persistMedicineLibrary([
        ...medicineLibrary,
        {
          id: createId(),
          type: medicineType,
          name: medicineName,
          suggestedDose,
        },
      ]);
      // Also add to patient-specific library if a patient is selected
      if (patientId) {
        try {
          const raw = window.localStorage.getItem(`${PATIENT_MEDICINE_LIBRARY_KEY_BASE}${patientId}`);
          const parsed = raw ? (JSON.parse(raw) as MedicineLibraryItem[]) : [];
          const nextP = Array.from(
            new Map(
              [...(Array.isArray(parsed) ? parsed : []), { id: createId(), type: medicineType, name: medicineName, suggestedDose }].map(
                (it) => [`${it.type}:${it.name}`, it],
              ),
            ).values(),
          );
          persistPatientMedicineLibrary(nextP);
        } catch {
          // ignore
        }
      }
    }

    setDraft((prev) => {
      return {
        ...prev,
        medication: [{ ...EMPTY_MEDICATION_ROW, id: createId() }],
        savedMedicationEntries: [...prev.savedMedicationEntries, row],
      };
    });
    setMedicineSectionRefreshKey((previous) => previous + 1);
    setSavedMedicationIds((previous) => (previous.includes(row.id) ? previous : [...previous, row.id]));

    toast.success("Medication entry saved and section refreshed.");
  };

  const printReferral = () => {
    if (typeof window === "undefined") return;
    if (!selectedPatient) {
      toast.error("Select a patient before printing referral");
      return;
    }

    const summaryId = nextSummaryId(draft.summaryMode);
    const html = createReferralHtml({
      patientName: selectedPatient.full_name,
      patientRegistrationId: selectedPatient.uhid,
      ageGender: `${selectedPatient.age ?? "-"} / ${selectedPatient.gender ?? "-"}`,
      summaryId,
      draft,
    });

    // Primary flow: open popup immediately in click handler so browsers keep print allowed.
    const printWindow = window.open("", "referral-print", "width=1000,height=1100");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();

      const triggerPrint = () => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch {
          // Fall through to iframe fallback if printing fails.
        }
      };

      if (printWindow.document.readyState === "complete") {
        window.setTimeout(triggerPrint, 200);
      } else {
        printWindow.onload = () => {
          window.setTimeout(triggerPrint, 200);
        };
      }

      // Safety net: some browsers never fire onload for document.write windows.
      window.setTimeout(triggerPrint, 900);
      return;
    }

    // Fallback flow: hidden iframe for environments where popup creation fails.
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";

    document.body.appendChild(iframe);
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      toast.error("Print did not start. Please use Export PDF instead.");
      return;
    }

    frameWindow.document.open();
    frameWindow.document.write(html);
    frameWindow.document.close();
    window.setTimeout(() => {
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1500);
    }, 250);
  };

  const openSavedSummaryDialog = () => {
    if (!selectedPatient) {
      toast.error("Select a patient before viewing saved summaries");
      return;
    }
    const patientSummaries = readSummaryQueue().filter((item) => item.patientId === selectedPatient.id);
    setSavedSummaryItems(patientSummaries);
    setSavedSummaryDialogOpen(true);
  };

  const loadSavedSummary = (item: DischargeSummaryQueueItem) => {
    if (!selectedPatient) return;
    const draftSnapshot = item.draftSnapshot ?? {
      ...draft,
      patientId: selectedPatient.id,
      summaryMode: item.summaryMode,
      doctorName: draft.doctorName,
      doctors: draft.doctors,
    };
    setDraft((prev) => ({
      ...createEmptyDraft(),
      ...prev,
      ...draftSnapshot,
      patientId: selectedPatient.id,
      updatedAt: new Date().toISOString(),
    }));
    setSavedSummaryDialogOpen(false);
    toast.success(`Loaded saved ${item.summaryMode === "referral_summary" ? "referral" : "discharge"} summary`);
  };

  const saveSummaryToQueue = (status: DischargeSummaryQueueItem["status"]) => {
    if (!selectedPatient) {
      toast.error("Select a patient before saving the summary");
      return;
    }
    const item = buildSummaryQueueItem({
      patientId: selectedPatient.id,
      patientName: selectedPatient.full_name,
      summaryMode: draft.summaryMode,
      status,
      draft: {
        ...draft,
        patientId: selectedPatient.id,
        summaryMode: draft.summaryMode,
        updatedAt: new Date().toISOString(),
      },
    });
    try {
      const existing = readSummaryQueue();
      const next = [item, ...existing].slice(0, 100);
      window.localStorage.setItem(DISCHARGE_SUMMARY_QUEUE_KEY, JSON.stringify(next));
      toast.success(status === "draft" ? "Summary saved as draft" : "Summary saved");
    } catch {
      toast.error("Summary could not be saved");
    }
  };

  const exportPdf = () => {
    if (!selectedPatient) {
      toast.error("Select a patient before exporting PDF");
      return;
    }

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const margin = 12;
    const lineWidth = pageWidth - margin * 2;
    let y = 14;

    const writeBlock = (title: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title, margin, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(value || "-", lineWidth);
      lines.forEach((line: string) => {
        if (y > 285) {
          doc.addPage();
          y = 14;
        }
        doc.text(line, margin, y);
        y += 4.8;
      });
      y += 2;
    };

    const writeBlockIfValue = (title: string, value: string) => {
      if (!hasText(value)) return;
      writeBlock(title, value);
    };

    const writeInlineBlock = (title: string, value: string) => {
      const values = value.split("\n");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`${title}:`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(values[0] || "-", margin + 38, y);
      values.slice(1).forEach((line) => {
        y += 4.8;
        doc.text(line, margin + 38, y);
      });
      y += 7;
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    const summaryLabel = draft.summaryMode === "referral_summary" ? "REFERRAL SUMMARY" : "DISCHARGE SUMMARY";
    const summaryId = nextSummaryId(draft.summaryMode);
    doc.text(summaryLabel, pageWidth / 2, y, { align: "center" });
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${formatDateTimeDMY(new Date())}`, pageWidth - margin, y, { align: "right" });
    y += 7;

    writeBlock(draft.summaryMode === "referral_summary" ? "Referral ID" : "Discharge ID", summaryId);
    writeBlock("Patient Registration ID", selectedPatient.uhid);
    writeBlock("Patient Name", selectedPatient.full_name);
    writeBlockIfValue("Age/Gender", `${selectedPatient.age ?? ""} / ${selectedPatient.gender ?? ""}`.replace(/^\s*\/\s*$/, ""));
    writeBlockIfValue("Admission Date", formatDateDMY(draft.admissionDate));
    writeBlockIfValue("Discharge Date", formatDateDMY(draft.dischargeDate));
    const printableDoctors = draft.doctors.length > 0
      ? draft.doctors
      : [{ id: "fallback", name: draft.doctorName, degree: "", speciality: "", details: "" }];
    printableDoctors.forEach((doctor, index) => {
      const doctorMeta = [doctor.name, doctor.degree, doctor.speciality || doctor.details, doctor.details].filter(hasText).join("\n");
      writeInlineBlock(index === 0 ? "Treating Doctor" : "Co-surgeon", doctorMeta);
    });
    writeBlockIfValue(draft.summaryMode === "referral_summary" ? "Referral Summary" : "Discharge Summary", draft.referralSummary);
    writeBlockIfValue("Chief Complaints", joinNonEmpty(draft.chiefComplaints));
    writeBlockIfValue("Past Medical History", draft.patientHistory.toUpperCase());
    writeBlockIfValue("Allergies", draft.allergies.toUpperCase());
    writeBlockIfValue("Discharge Diagnosis", String(draft.provisionalDiagnosisText ?? "").toUpperCase());
    writeBlockIfValue("Diagnosis", joinNonEmpty(draft.diagnosis));
    if (draft.investigations.length > 0) writeBlock("Investigations", formatInvestigationsForDocument(draft.investigations));
    if (draft.surgicalProcedures.length > 0) writeBlock("Surgical Procedure", formatSurgicalProceduresForDocument(draft.surgicalProcedures));
    writeBlockIfValue("Medical Management", joinNonEmpty(draft.treatmentGiven));
    writeBlockIfValue("Other Advice", draft.doctorNotes);

    const followUpPrintLabel = formatFollowUpAfterLabel(draft.followUpDays, draft.customFollowUpDays);
    if (followUpPrintLabel) writeBlock("Follow Ups After", followUpPrintLabel);

    const medicationText = [...draft.savedMedicationEntries, ...draft.medication]
      .filter((med) => med.medicineName.trim().length > 0)
      .map(medicationSchedulePrintBlock)
      .join("\n\n");
    writeBlockIfValue("Medications and Advice", medicationText);

    writeBlockIfValue("Referral Reason", draft.referralReason);
    writeBlockIfValue(
      "Referred To",
      [
        hasText(draft.referredHospital) ? draft.referredHospital : "",
        hasText(draft.referredDepartment) ? draft.referredDepartment : "",
        hasText(draft.referredDoctor) ? `Dr. ${draft.referredDoctor}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    );
    writeBlockIfValue("Urgency", draft.urgency);
    writeBlockIfValue("Transfer Mode", draft.transferMode);
    if (draft.dischargedToHome) writeBlock("Discharge Status", "PATIENT DISCHARGED TO HOME");
    writeBlockIfValue("Patient Condition During Discharge", draft.patientConditionDuringDischarge.toUpperCase());
    if (draft.dischargedWithoutConsent) writeBlock("Discharge Status", "PATIENT DISCHARGED WITHOUT DOCTOR CONSENT");
    writeBlockIfValue("Post Operative Precautionary Advice", joinNonEmpty(draft.dietAdvice));
    writeBlockIfValue("Do's", joinNonEmpty(draft.dos));
    writeBlockIfValue("Don'ts", joinNonEmpty(draft.donts));
    writeBlockIfValue("Emergency Warnings", joinNonEmpty(draft.emergencyWarnings));

    const footerY = pageHeight - 26;
    const doctorFooterX = pageWidth - margin - 130;
    const hospitalFooterX = pageWidth - margin - 35;
    const signatureLineWidth = 62;
    const alignedLabelY = footerY + 2;
    const alignedLineY = alignedLabelY + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Doctor Signature", doctorFooterX - 8, alignedLabelY);
    doc.line(doctorFooterX - 8, alignedLineY, doctorFooterX + signatureLineWidth, alignedLineY);
    doc.text("Hospital Seal", hospitalFooterX + 14, alignedLabelY);
    doc.line(hospitalFooterX + 10, alignedLineY, hospitalFooterX + signatureLineWidth + 10, alignedLineY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const signatureDoctor = draft.doctors[0] || { name: draft.doctorName || "-", degree: "", speciality: "", details: "" };
    const signatureLine = doctorSignatureLines(signatureDoctor);
    doc.text(signatureLine.nameLine, doctorFooterX - 8, alignedLineY + 9);
    if (signatureLine.degreeLine) {
      doc.text(signatureLine.degreeLine, doctorFooterX - 8, alignedLineY + 16);
    }

    const fileSafeName = selectedPatient.full_name.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    doc.save(`referral-summary-${fileSafeName || "patient"}-${selectedPatient.uhid}.pdf`);
    toast.success("Referral PDF exported");
  };

  return (
    <div>
      <PageHeader
        title="IPD Discharge & Referral Workspace"
        description="Complete discharge plus referral summary with searchable master libraries, reusable templates and autosave drafts."
      />

      <section className="neo mb-5 grid gap-3 p-4 lg:grid-cols-2">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="patient-search">Search patient</Label>
          <div className="neo-inset flex items-center gap-2 rounded-xl px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              id="patient-search"
              className="w-full bg-transparent py-2 text-sm outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by first name, last name, locality, city, phone, email or UHID"
            />
          </div>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger>
              <SelectValue placeholder="Select patient to start draft" />
            </SelectTrigger>
            <SelectContent>
              {filteredPatients.slice().sort((a, b) => String(a.full_name).localeCompare(String(b.full_name))).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name} · {p.uhid} · {p.phone || p.email || p.locality || p.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Smart template</Label>
          <Select value={templateId} onValueChange={applyTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Apply one-click template" />
            </SelectTrigger>
            <SelectContent>
              {[...REFERRAL_TEMPLATES].slice().sort((a, b) => String(a.label).localeCompare(String(b.label))).map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Auto-saved every 4 seconds{lastSavedAt ? ` · last save ${formatDateTimeDMY(lastSavedAt)}` : ""}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Discharge Summary"
          description="Clinical narrative and ready-made master pickers"
          icon={Stethoscope}
        >
          <div className="space-y-2">
            <Label>Document Type (Referral/Discharge)</Label>
            <Select
              value={draft.summaryMode}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, summaryMode: value as SummaryMode }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discharge_summary">DISCHARGE</SelectItem>
                <SelectItem value="referral_summary">REFERRAL</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select DISCHARGE when patient is discharged; select REFERRAL only when patient is referred.
            </p>
          </div>

          <PatientInfoBanner
            name={selectedPatient?.full_name || "Not selected"}
            age={selectedPatient?.age ? String(selectedPatient.age) : "-"}
            gender={selectedPatient?.gender || "-"}
            admissionDate={draft.admissionDate}
            dischargeDate={draft.dischargeDate}
            doctors={draft.doctors}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="admissionDate">Admission Date</Label>
              <Input
                id="admissionDate"
                type="date"
                value={draft.admissionDate}
                onChange={(e) => setDraft((prev) => ({ ...prev, admissionDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dischargeDate">Discharge Date</Label>
              <Input
                id="dischargeDate"
                type="date"
                value={draft.dischargeDate}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    dischargeDate: e.target.value,
                    dischargedToHome: e.target.value ? true : prev.dischargedToHome,
                  }))
                }
              />
            </div>
          </div>

          <DoctorPicker
            value={draft.doctors}
            onChange={(doctors) =>
              setDraft((prev) => ({
                ...prev,
                doctors,
                doctorName: doctors[0]?.name ? doctorDisplayName(doctors[0]) : "",
              }))
            }
          />

          <SmartMultiPicker
            title="Chief Complaints"
            allItems={COMPLAINTS_LIBRARY}
            value={draft.chiefComplaints}
            onChange={(next) => setDraft((prev) => ({ ...prev, chiefComplaints: next }))}
            persistKey={COMPLAINTS_USER_LIBRARY_KEY}
            addLabel="Add"
          />

          <div className="space-y-2 rounded-2xl border border-border/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Past Medical History</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="secondary" size="sm">Open History Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Past Medical History</DialogTitle>
                    <DialogDescription>Enter patient past medical history details.</DialogDescription>
                  </DialogHeader>
                  <Textarea
                    rows={8}
                    value={draft.patientHistory}
                    onChange={(e) => setDraft((prev) => ({ ...prev, patientHistory: e.target.value }))}
                    className="uppercase"
                    placeholder="PAST MEDICAL HISTORY"
                  />
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-xs uppercase text-muted-foreground">{draft.patientHistory || "No past medical history added yet."}</p>
          </div>

          <div className="space-y-2 rounded-2xl border border-border/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Allergies</p>
            </div>
            <Textarea
              rows={3}
              value={draft.allergies}
              onChange={(e) => setDraft((prev) => ({ ...prev, allergies: e.target.value }))}
              className="uppercase"
              placeholder="ALLERGIES"
            />
          </div>

          <SmartMultiPicker
            title="Discharge Diagnosis"
            allItems={DIAGNOSIS_LIBRARY}
            value={draft.diagnosis}
            onChange={(next) => setDraft((prev) => ({ ...prev, diagnosis: next }))}
            persistKey={DIAGNOSIS_USER_LIBRARY_KEY}
            addLabel="Add Diagnosis"
          />

          <InvestigationEditor
            value={draft.investigations}
            onChange={(next) => setDraft((prev) => ({ ...prev, investigations: next }))}
          />

          <SurgicalProcedureEditor
            value={draft.surgicalProcedures}
            onChange={(next) => setDraft((prev) => ({ ...prev, surgicalProcedures: next }))}
          />

          <SmartMultiPicker
            title="Medical Management"
            allItems={TREATMENT_LIBRARY}
            value={draft.treatmentGiven}
            onChange={(next) => setDraft((prev) => ({ ...prev, treatmentGiven: next }))}
            persistKey={TREATMENT_USER_LIBRARY_KEY}
            addLabel="Add"
          />

        </SectionCard>

        <SectionCard
          key={medicineSectionRefreshKey}
          title="Medications and Advice"
          description="Pharmacy linked structure with schedule-ready data"
          icon={HeartPulse}
        >
          <div className="space-y-3">
            <div className="space-y-2 rounded-2xl border border-border/70 p-3">
              <p className="text-sm font-medium">Medicine Listing</p>
              <p className="text-xs text-muted-foreground">Save medicine once for future use, then pick it from dropdown.</p>
              <Dialog open={isAddMedicineDialogOpen} onOpenChange={setIsAddMedicineDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">Add New Medicine</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Medicine</DialogTitle>
                    <DialogDescription>
                      Fill medicine details to add it to this draft.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Medicine Type</Label>
                      <Select
                        value={newMedicineType}
                        onValueChange={(value) => setNewMedicineType(value as NonNullable<MedicationRow["medicineType"]>)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                                  {[...MEDICINE_TYPES].slice().sort((a, b) => String(a).localeCompare(String(b))).map((type) => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-medicine-name">Medicine Name</Label>
                      <Input
                        id="new-medicine-name"
                        value={newMedicineName}
                        onChange={(e) => setNewMedicineName(String(e.target.value ?? "").toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveMedicineFromDialog();
                          }
                        }}
                        placeholder="Enter medicine name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddMedicineDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={handleSaveMedicineFromDialog}>
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

            </div>

            {draft.medication.map((row) => (
              <article key={row.id} className="neo-inset rounded-2xl p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Medicine entry</p>
                  <div className="flex items-center gap-2">
                    {!savedMedicationIds.includes(row.id) && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => saveMedicationEntry(row)}
                      >
                        Save Entry
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => removeMedicationRow(row.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={row.medicineType ?? "TAB"}
                    onValueChange={(value) =>
                      updateMedication(row.id, { medicineType: value as NonNullable<MedicationRow["medicineType"]> })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Medicine Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDICINE_TYPES.slice().sort((a, b) => String(a).localeCompare(String(b))).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Medicine name"
                    value={row.medicineName}
                    onChange={(e) => updateMedication(row.id, { medicineName: String(e.target.value ?? "").toUpperCase() })}
                  />
                  <Input
                    type="number"
                    min={0}
                    className="no-spinner"
                    placeholder="days"
                    value={row.durationDays || ""}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => updateMedication(row.id, { durationDays: Number(e.target.value) || 0 })}
                  />
                  <Input
                    placeholder="Dose"
                    value={row.dose}
                    onChange={(e) => updateMedication(row.id, { dose: e.target.value })}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <ScheduleRadio
                    label="OD"
                    selected={Boolean(row.morning)}
                    onChange={() => applySingleMedicationSchedule(row.id, "OD", updateMedication)}
                  />
                  <ScheduleRadio
                    label="BD"
                    selected={Boolean(row.afternoon)}
                    onChange={() => applySingleMedicationSchedule(row.id, "BD", updateMedication)}
                  />
                  <ScheduleRadio
                    label="TDS"
                    selected={Boolean(row.tds)}
                    onChange={() => applySingleMedicationSchedule(row.id, "TDS", updateMedication)}
                  />
                  <ScheduleRadio
                    label="HS"
                    selected={Boolean(row.hs)}
                    onChange={() => applySingleMedicationSchedule(row.id, "HS", updateMedication)}
                  />
                  <ScheduleRadio
                    label="SOS"
                    selected={Boolean(row.sos)}
                    onChange={() => applySingleMedicationSchedule(row.id, "SOS", updateMedication)}
                  />
                  <Select
                    value={row.foodTiming}
                    onValueChange={(value) =>
                      updateMedication(row.id, { foodTiming: value as MedicationRow["foodTiming"] })
                    }
                  >
                    <SelectTrigger className="h-8 w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="before_breakfast">BEFORE BREAKFAST</SelectItem>
                      <SelectItem value="after_breakfast">AFTER BREAKFAST</SelectItem>
                      <SelectItem value="after_lunch">AFTER LUNCH</SelectItem>
                      <SelectItem value="after_lunch_2">AFTER LUNCH</SelectItem>
                      <SelectItem value="after_meal">AFTER MEAL</SelectItem>
                      <SelectItem value="empty_stomach">EMPTY STOMACH</SelectItem>
                      <SelectItem value="none">NONE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </article>
            ))}

          </div>

          <div className="space-y-2">
            <Label>Saved Medicines</Label>
            {patientMedicineLibrary.length === 0 ? (
              <p className="text-xs text-muted-foreground">No saved medicines for this patient</p>
            ) : (
              <div className="space-y-2">
                {patientMedicineLibrary
                  .slice()
                  .sort((a, b) => String(a.name).localeCompare(String(b.name)))
                  .map((item) => {
                    const prescribed = [...draft.savedMedicationEntries, ...draft.medication].some(
                      (row) => hasText(row.medicineName) && row.medicineName.trim().toLowerCase() === item.name.trim().toLowerCase() && (row.medicineType ?? "TAB") === item.type,
                    );
                    const [editMode, setEditMode] = useState(false);
                    const [editedName, setEditedName] = useState(item.name);
                    const [editedType, setEditedType] = useState<MedicationRow["medicineType"]>(item.type);
                    const [editedDose, setEditedDose] = useState(item.suggestedDose ?? "");

                    const saveEditedMedicine = () => {
                      const nextItem = {
                        ...item,
                        name: normalizeDetail(editedName.trim()).toUpperCase(),
                        type: editedType,
                        suggestedDose: normalizeDetail(editedDose.trim()),
                      };

                      if (!nextItem.name) return;

                      const nextLibrary = patientMedicineLibrary.map((entry) => (entry.id === item.id ? nextItem : entry));
                      persistPatientMedicineLibrary(nextLibrary);
                      const globalLibrary = medicineLibrary.map((entry) => (entry.id === item.id ? nextItem : entry));
                      persistMedicineLibrary(globalLibrary);
                      setEditMode(false);
                    };

                    return (
                      <div key={item.id} className="rounded-lg border border-border/50 p-2 text-xs">
                        {editMode ? (
                          <div className="space-y-2">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Select value={editedType} onValueChange={(value) => setEditedType(value as MedicationRow["medicineType"])}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MEDICINE_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} />
                            </div>
                            <Input value={editedDose} onChange={(e) => setEditedDose(e.target.value)} placeholder="Dose (OD / BD / SOS)" />
                            <div className="flex gap-2">
                              <Button type="button" size="sm" variant="secondary" onClick={saveEditedMedicine}>Save</Button>
                              <Button type="button" size="sm" variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-medium">{item.type} - {item.name}</div>
                              {item.suggestedDose ? <div className="text-[11px] text-muted-foreground">Dose: {item.suggestedDose}</div> : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditMode(true)}>Edit</Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  const newRow = { ...EMPTY_MEDICATION_ROW, id: createId(), medicineName: item.name, medicineType: item.type, dose: item.suggestedDose };
                                  setDraft((prev) => ({
                                    ...prev,
                                    medication: [...prev.medication, newRow],
                                  }));
                                }}
                                disabled={prescribed}
                              >
                                {prescribed ? "PRESCRIBED" : "ADD"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctorNotes">Doctor's Comments</Label>
            <Textarea
              id="doctorNotes"
              rows={6}
              value={draft.doctorNotes}
              onChange={(e) => setDraft((prev) => ({ ...prev, doctorNotes: e.target.value }))}
              placeholder="DOCTOR'S COMMENTS"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Follow Ups After</Label>
              <Select
                value={String(draft.followUpDays)}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, followUpDays: Number(value) as FollowUpPreset | 0 }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {draft.followUpDays === 0 && (
              <div className="space-y-2">
                <Label htmlFor="customFollowUp">Custom days</Label>
                <Input
                  id="customFollowUp"
                  type="number"
                  min={1}
                  value={draft.customFollowUpDays || ""}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, customFollowUpDays: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border/70 p-3">
            <p className="text-sm font-medium">Patient Discharge</p>
            <p className="text-sm text-muted-foreground">
              Current status: {draft.dischargedToHome ? "PATIENT DISCHARGED TO HOME" : "Not marked"}
            </p>

            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="secondary">Open Discharge Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Patient Discharge Confirmation</DialogTitle>
                  <DialogDescription>
                    Tick to confirm the discharge status.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.dischargedToHome}
                      onCheckedChange={(checked) =>
                        setDraft((prev) => ({ ...prev, dischargedToHome: Boolean(checked) }))
                      }
                    />
                    PATIENT DISCHARGED TO HOME
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={draft.dischargedWithoutConsent}
                      onCheckedChange={(checked) =>
                        setDraft((prev) => ({ ...prev, dischargedWithoutConsent: Boolean(checked) }))
                      }
                    />
                    PATIENT DISCHARGED WITHOUT DOCTOR CONSENT
                  </label>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="space-y-2 rounded-2xl border border-border/70 p-3">
              <Label htmlFor="patientConditionDuringDischarge">Patient Condition During Discharge</Label>
              <Textarea
                id="patientConditionDuringDischarge"
                rows={8}
                value={draft.patientConditionDuringDischarge}
                onChange={(e) => setDraft((prev) => ({ ...prev, patientConditionDuringDischarge: e.target.value }))}
                className="uppercase"
                placeholder="PATIENT CONDITION DURING DISCHARGE"
              />
            </div>
          </div>

          <SmartMultiPicker
            title="Post Operative Precautionary Advice"
            allItems={DIET_LIBRARY}
            value={draft.dietAdvice}
            onChange={(next) => setDraft((prev) => ({ ...prev, dietAdvice: next }))}
            persistKey={DIET_USER_LIBRARY_KEY}
            addLabel="Add"
            disabled
          />

          <SmartMultiPicker
            title="Do's"
            allItems={DOS_LIBRARY}
            value={draft.dos}
            onChange={(next) => setDraft((prev) => ({ ...prev, dos: next }))}
            persistKey={DOS_USER_LIBRARY_KEY}
            addLabel="Add"
            disabled
          />

          <SmartMultiPicker
            title="Don'ts"
            allItems={DONTS_LIBRARY}
            value={draft.donts}
            onChange={(next) => setDraft((prev) => ({ ...prev, donts: next }))}
            persistKey={DONTS_USER_LIBRARY_KEY}
            addLabel="Add"
            disabled
          />
        </SectionCard>

        {draft.summaryMode === "referral_summary" && (
          <SectionCard
            title="Referral Summary"
            description="New column for transfer-ready referral document"
            icon={FileText}
          >
            <div className="space-y-2">
              <Label htmlFor="referralReason">Reason for referral</Label>
              <Input
                id="referralReason"
                placeholder="Need higher center ICU support"
                value={draft.referralReason}
                onChange={(e) => setDraft((prev) => ({ ...prev, referralReason: e.target.value }))}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Referred hospital"
                value={draft.referredHospital}
                onChange={(e) => setDraft((prev) => ({ ...prev, referredHospital: e.target.value }))}
              />
              <Input
                placeholder="Department"
                value={draft.referredDepartment}
                onChange={(e) => setDraft((prev) => ({ ...prev, referredDepartment: e.target.value }))}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Referred doctor"
                value={draft.referredDoctor}
                onChange={(e) => setDraft((prev) => ({ ...prev, referredDoctor: e.target.value }))}
              />
              <Input
                placeholder="Transfer mode"
                value={draft.transferMode}
                onChange={(e) => setDraft((prev) => ({ ...prev, transferMode: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select
                value={draft.urgency}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, urgency: value as "routine" | "priority" | "emergency" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="routine">Routine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralSummary">Referral Summary</Label>
              <Textarea
                id="referralSummary"
                rows={7}
                value={draft.referralSummary}
                onChange={(e) => setDraft((prev) => ({ ...prev, referralSummary: e.target.value }))}
                placeholder="History, key findings, treatment done and reason for transfer"
              />
            </div>

            <SmartMultiPicker
              title="Emergency Warning"
              allItems={EMERGENCY_WARNING_LIBRARY}
              value={draft.emergencyWarnings}
              onChange={(next) => setDraft((prev) => ({ ...prev, emergencyWarnings: next }))}
              persistKey={EMERGENCY_WARNING_USER_LIBRARY_KEY}
              addLabel="Add"
            />

            <div className="neo-inset rounded-2xl p-3 text-xs text-muted-foreground">
              <p className="mb-1 flex items-center gap-1 font-medium text-foreground">
                <AlertTriangle className="size-4 text-amber-500" /> Referral ready preview
              </p>
              <p>
                {selectedPatient?.full_name || "Patient"} is referred to {draft.referredHospital || "_____"} ({draft.referredDepartment || "_____"})
                {draft.referredDoctor ? ` under Dr. ${draft.referredDoctor}` : ""} as {draft.urgency} priority.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-4">
              <Button type="button" variant="outline" onClick={() => saveSummaryToQueue("draft")}>Save as draft</Button>
              <Button type="button" onClick={printReferral}>Print</Button>
              <Button type="button" variant="secondary" onClick={() => saveSummaryToQueue("saved")}>Save</Button>
              <Button type="button" variant="secondary" onClick={openSavedSummaryDialog}>View Saved Patient</Button>
            </div>
          </SectionCard>
        )}

        {draft.summaryMode === "discharge_summary" && (
          <div className="neo space-y-4 p-4">
            <header>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <FileText className="size-4 text-primary" /> Discharge Summary
              </h2>
              <p className="text-xs text-muted-foreground">Discharge summary is included in the clinical record.</p>
            </header>
            <div className="grid gap-2 sm:grid-cols-4">
              <Button type="button" variant="outline" onClick={() => saveSummaryToQueue("draft")}>Save as draft</Button>
              <Button type="button" onClick={printReferral}>Print</Button>
              <Button type="button" variant="secondary" onClick={() => saveSummaryToQueue("saved")}>Save</Button>
              <Button type="button" variant="secondary" onClick={openSavedSummaryDialog}>View Saved Patient</Button>
            </div>
          </div>
        )}

      </section>

      <Dialog open={savedSummaryDialogOpen} onOpenChange={setSavedSummaryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Saved patient summaries</DialogTitle>
            <DialogDescription>Open a saved discharge or referral draft to review the completed patient details.</DialogDescription>
          </DialogHeader>
          {savedSummaryItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved summaries found for this patient yet.</p>
          ) : (
            <div className="space-y-3">
              {savedSummaryItems.slice(0, 12).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full rounded-xl border border-border bg-muted/30 p-3 text-left transition hover:border-primary/70 hover:bg-muted/50"
                  onClick={() => loadSavedSummary(item)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.summaryMode === "referral_summary" ? "Referral" : "Discharge"} · {item.summaryId}
                      </p>
                    </div>
                    <Badge variant={item.status === "draft" ? "outline" : "secondary"}>{item.status.toUpperCase()}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Saved: {new Date(item.preparedAt).toLocaleString()}</p>
                  <p className="mt-3 line-clamp-3 text-xs text-foreground/90">
                    {item.draftSnapshot?.referralSummary || item.draftSnapshot?.patientConditionDuringDischarge || item.draftSnapshot?.doctorNotes || "No summary text stored in this saved record."}
                  </p>
                </button>
              ))}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="neo mt-5 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Architecture readiness highlights</p>
        <p>
          This module is split into reusable libraries, strongly typed draft models, and autosave hooks so AI suggestion services, version history,
          digital signature, and print schema can be plugged in without redesigning this UI.
        </p>
      </section>
    </div>
  );
}

function SectionCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof FileText;
  children: ReactNode;
}) {
  return (
    <section className="neo space-y-4 p-4">
      <header>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Icon className="size-4 text-primary" /> {title}
        </h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

function SurgicalProcedureEditor({
  value,
  onChange,
}: {
  value: SurgicalProcedureEntry[];
  onChange: (next: SurgicalProcedureEntry[]) => void;
}) {
  const [libraryItems, setLibraryItems] = useState<string[]>(() =>
    Array.from(new Set(SURGICAL_PROCEDURE_LIBRARY.map(normalizeDetail))),
  );
  const [selectedProcedure, setSelectedProcedure] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingFinding, setEditingFinding] = useState("");
  const [newProcedure, setNewProcedure] = useState("");
  const [isAddProcedureDialogOpen, setIsAddProcedureDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SURGICAL_PROCEDURE_LIBRARY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (!Array.isArray(parsed)) return;

      const normalizedStored = parsed
        .map((item) => toUpper(normalizeDetail(String(item))))
        .filter((item) => item.trim().length > 0);

      if (normalizedStored.length === 0) return;
      setLibraryItems((prev) => Array.from(new Set([...prev, ...normalizedStored])));
    } catch {
      // Ignore malformed local storage values.
    }
  }, []);

  const addProcedureToDraft = () => {
    const procedure = toUpper(normalizeDetail(selectedProcedure.trim()));
    if (!procedure) return;
    onChange([
      ...value,
      {
        id: createId(),
        procedure,
        finding: "",
      },
    ]);
    setSelectedProcedure("");
  };

  const removeProcedureEntry = (id: string) => {
    onChange(value.filter((entry) => entry.id !== id));
  };

  const startEditEntry = (entry: SurgicalProcedureEntry) => {
    setEditingEntryId(entry.id);
    setEditingFinding(normalizeDetail(entry.finding));
  };

  const saveEntryEdit = () => {
    if (!editingEntryId) return;
    onChange(
      value.map((entry) =>
        entry.id === editingEntryId
          ? {
              ...entry,
              finding: editingFinding,
            }
          : entry,
      ),
    );
    setEditingEntryId(null);
    setEditingFinding("");
  };

  const addNewProcedureToLibrary = () => {
    const procedure = toUpper(normalizeDetail(newProcedure.trim()));
    if (!procedure) return;

    const alreadyExists = libraryItems.some((item) => item.toLowerCase() === procedure.toLowerCase());
    if (alreadyExists) {
      setSelectedProcedure(procedure);
      setNewProcedure("");
      toast.success("Procedure already available in list");
      return;
    }

    const nextLibrary = [...libraryItems, procedure];
    setLibraryItems(nextLibrary);
    setSelectedProcedure(procedure);
    setNewProcedure("");

    if (typeof window !== "undefined") {
      window.localStorage.setItem(SURGICAL_PROCEDURE_LIBRARY_KEY, JSON.stringify(nextLibrary));
    }

    toast.success("New surgical procedure saved for future use");
  };

  return (
    <div className="space-y-2 rounded-2xl border border-border/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Surgical Procedure</p>
        <Badge variant="secondary">{value.length} added</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={selectedProcedure} onValueChange={setSelectedProcedure}>
          <SelectTrigger>
            <SelectValue placeholder="Select procedure" />
          </SelectTrigger>
          <SelectContent>
            {libraryItems.slice().sort((a, b) => a.localeCompare(b)).map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={isAddProcedureDialogOpen} onOpenChange={setIsAddProcedureDialogOpen}>
          <Button type="button" variant="outline" onClick={() => setIsAddProcedureDialogOpen(true)}>
            Add New Surgical Procedure
          </Button>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Surgical Procedure</DialogTitle>
              <DialogDescription>Enter the complete procedure name and save it for future referrals.</DialogDescription>
            </DialogHeader>
            <Textarea
              autoFocus
              rows={8}
              value={newProcedure}
              onChange={(e) => setNewProcedure(e.target.value)}
              placeholder="ENTER SURGICAL PROCEDURE"
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="button" onClick={() => { addNewProcedureToLibrary(); setIsAddProcedureDialogOpen(false); }}>
                Save Procedure
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={addProcedureToDraft}>
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {value.length === 0 ? (
          <p className="text-xs text-muted-foreground">No surgical procedure entries yet.</p>
        ) : (
          value.map((entry) => (
            <div key={entry.id} className="rounded-xl bg-muted/40 p-2 text-xs">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{entry.procedure}</p>
                <div className="flex items-center gap-2">
                  {editingEntryId === entry.id ? (
                    <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={saveEntryEdit}>
                      Save
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => startEditEntry(entry)}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => removeProcedureEntry(entry.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              {editingEntryId === entry.id ? (
                <Textarea
                  rows={3}
                  value={editingFinding}
                  onChange={(e) => setEditingFinding(e.target.value)}
                  placeholder="Write unusual finding or surgeon note"
                />
              ) : (
                <p className="text-muted-foreground">{entry.finding.trim() || "No finding note added."}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function InvestigationEditor({
  value,
  onChange,
}: {
  value: InvestigationRecord[];
  onChange: (next: InvestigationRecord[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [testId, setTestId] = useState(INVESTIGATION_TEST_LIBRARY[0]?.id ?? "");
  const [resultsByParameter, setResultsByParameter] = useState<Record<string, string>>({});
  const [queuedInvestigations, setQueuedInvestigations] = useState<InvestigationRecord[]>([]);
  const [customLibrary, setCustomLibrary] = useState<InvestigationTestTemplate[]>([]);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [customTestName, setCustomTestName] = useState("");
  const [customParamName, setCustomParamName] = useState("");
  const [customParamUnit, setCustomParamUnit] = useState("");
  const [customParamRange, setCustomParamRange] = useState("");
  const [customParameters, setCustomParameters] = useState<Array<{ name: string; unit: string; normalRange: string }>>([]);

  const labTestNames = useQuery({
    queryKey: ["lab-investigation-test-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lab_orders")
        .select("test_name, category")
        .in("category", ["pathology", "radiology", "cardiology"])
        .order("test_name", { ascending: true })
        .limit(2000);

      if (error) throw error;
      return (data ?? [])
        .map((item) => item.test_name?.trim() ?? "")
        .filter((name) => name.length > 0);
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(INVESTIGATION_CUSTOM_LIBRARY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as InvestigationTestTemplate[];
      if (!Array.isArray(parsed)) return;
      setCustomLibrary(
        parsed
          .filter((item) => item && typeof item.name === "string")
          .map((item, index) => ({
            id: item.id || `custom_${index}`,
            name: item.name,
            parameters: Array.isArray(item.parameters)
              ? item.parameters.map((parameter, pIndex) => ({
                  id: parameter.id || `${item.id || "custom"}_${pIndex}`,
                  name: parameter.name || "Result",
                  unit: parameter.unit,
                  normalRange: parameter.normalRange,
                }))
              : [],
          })),
      );
    } catch {
      setCustomLibrary([]);
    }
  }, []);

  const labLibrary = useMemo<InvestigationTestTemplate[]>(() => {
    return Array.from(new Set(labTestNames.data ?? [])).map((testName) => ({
      id: toInvestigationId("lab", testName),
      name: testName,
      parameters: [],
    }));
  }, [labTestNames.data]);

  const investigationLibrary = useMemo<InvestigationTestTemplate[]>(() => {
    const merged = [...INVESTIGATION_TEST_LIBRARY, ...labLibrary, ...customLibrary];
    const uniqueByName = new Map<string, InvestigationTestTemplate>();
    merged.forEach((item) => {
      const key = item.name.trim().toLowerCase();
      if (!key) return;
      if (!uniqueByName.has(key)) uniqueByName.set(key, item);
    });
    return Array.from(uniqueByName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [labLibrary, customLibrary]);

  useEffect(() => {
    if (investigationLibrary.length === 0) {
      setTestId("");
      return;
    }
    if (!investigationLibrary.some((item) => item.id === testId)) {
      setTestId(investigationLibrary[0].id);
    }
  }, [investigationLibrary, testId]);

  const selectedTest = useMemo<InvestigationTestTemplate | undefined>(
    () => investigationLibrary.find((item) => item.id === testId),
    [testId, investigationLibrary],
  );

  useEffect(() => {
    if (!selectedTest) {
      setResultsByParameter({});
      return;
    }

    const next: Record<string, string> = {};
    selectedTest.parameters.forEach((parameter) => {
      next[parameter.id] = "";
    });
    setResultsByParameter(next);
  }, [selectedTest]);

  const buildInvestigationRecord = (): InvestigationRecord | null => {
    if (!selectedTest) return;
    return {
      id: createId(),
      testId: selectedTest.id,
      testName: selectedTest.name,
      reportAttached: false,
      parameters: selectedTest.parameters.map((parameter) => ({
        ...parameter,
        result: (resultsByParameter[parameter.id] ?? "").trim().toUpperCase(),
      })),
    };
  };

  const addInvestigationToQueue = () => {
    const nextRecord = buildInvestigationRecord();
    if (!nextRecord) return;

    setQueuedInvestigations((prev) => [...prev, nextRecord]);

    if (selectedTest) {
      const next: Record<string, string> = {};
      selectedTest.parameters.forEach((parameter) => {
        next[parameter.id] = "";
      });
      setResultsByParameter(next);
    }
  };

  const saveAllInvestigations = () => {
    const nextRecord = buildInvestigationRecord();
    const nextQueue = nextRecord ? [...queuedInvestigations, nextRecord] : queuedInvestigations;
    if (nextQueue.length === 0) return;

    onChange([...value, ...nextQueue]);
    setQueuedInvestigations([]);
    setIsOpen(false);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setQueuedInvestigations([]);
  };

  const addCustomParameter = () => {
    const name = customParamName.trim();
    if (!name) return;
    setCustomParameters((prev) => [...prev, { name, unit: customParamUnit.trim(), normalRange: customParamRange.trim() }]);
    setCustomParamName("");
    setCustomParamUnit("");
    setCustomParamRange("");
  };

  const removeCustomParameter = (index: number) => {
    setCustomParameters((prev) => prev.filter((_, i) => i !== index));
  };

  const saveCustomTest = () => {
    const name = customTestName.trim();
    if (name.length < 2) {
      toast.error("Enter a valid test name");
      return;
    }

    const existing = investigationLibrary.find((item) => item.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      setTestId(existing.id);
      setIsCustomDialogOpen(false);
      toast.success("Test already exists and is now selected");
      return;
    }

    const test: InvestigationTestTemplate = {
      id: `${toInvestigationId("custom", name)}_${Date.now().toString(36)}`,
      name,
      parameters:
        customParameters.length > 0
          ? customParameters.map((parameter, index) => ({
              id: `${toInvestigationId("p", parameter.name)}_${index}`,
              name: parameter.name,
              unit: parameter.unit || undefined,
              normalRange: parameter.normalRange || undefined,
            }))
          : [{ id: "result", name: "Result" }],
    };

    const nextLibrary = [...customLibrary, test];
    setCustomLibrary(nextLibrary);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(INVESTIGATION_CUSTOM_LIBRARY_KEY, JSON.stringify(nextLibrary));
    }

    setTestId(test.id);
    setCustomTestName("");
    setCustomParamName("");
    setCustomParamUnit("");
    setCustomParamRange("");
    setCustomParameters([]);
    setIsCustomDialogOpen(false);
    toast.success("New investigation test added for future use");
  };

  const removeInvestigation = (id: string) => {
    onChange(value.filter((item) => item.id !== id));
  };

  const addAllReportsAttached = () => {
    const alreadyAdded = value.some((item) => item.testId === ALL_REPORTS_ATTACHED_TEST_ID);
    if (alreadyAdded) {
      toast.success("All reports attached is already added");
      return;
    }

    onChange([
      ...value,
      {
        id: createId(),
        testId: ALL_REPORTS_ATTACHED_TEST_ID,
        testName: ALL_REPORTS_ATTACHED_LABEL,
        reportAttached: true,
        parameters: [],
      },
    ]);
    toast.success("All reports attached added");
  };

  return (
    <div className="space-y-2 rounded-2xl border border-border/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Investigations</p>
        <Badge variant="secondary">{value.length} added</Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Library includes built-in tests, Bhagwati Pathology Nexus tests, and your saved custom tests.
      </p>

      <Button type="button" variant="outline" onClick={addAllReportsAttached}>
        All Reports Attached
      </Button>

      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <Button type="button" variant="outline" onClick={() => setIsCustomDialogOpen(true)}>
          List a New Test
        </Button>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>List a New Test</DialogTitle>
            <DialogDescription>
              Add a test that is missing from the list. It will be saved for future use.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="custom-test-name">Test name</Label>
              <Input
                id="custom-test-name"
                value={customTestName}
                onChange={(e) => setCustomTestName(e.target.value)}
                placeholder="Enter test name"
              />
            </div>

            <div className="space-y-2 rounded-xl border border-border/70 p-3">
              <p className="text-xs font-medium text-muted-foreground">Optional parameters</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  value={customParamName}
                  onChange={(e) => setCustomParamName(e.target.value)}
                  placeholder="Parameter name"
                />
                <Input
                  value={customParamUnit}
                  onChange={(e) => setCustomParamUnit(e.target.value)}
                  placeholder="Unit"
                />
                <Input
                  value={customParamRange}
                  onChange={(e) => setCustomParamRange(e.target.value)}
                  placeholder="Normal range"
                />
              </div>
              <Button type="button" variant="secondary" onClick={addCustomParameter}>
                Add Parameter
              </Button>

              {customParameters.length > 0 && (
                <div className="space-y-1 text-xs text-muted-foreground">
                  {customParameters.map((parameter, index) => (
                    <div key={`${parameter.name}-${index}`} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1">
                      <span>
                        {parameter.name}
                        {parameter.unit ? ` · ${parameter.unit}` : ""}
                        {parameter.normalRange ? ` · Normal: ${parameter.normalRange}` : ""}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => removeCustomParameter(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCustomDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveCustomTest}>
              Save Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Button type="button" variant="secondary" onClick={() => setIsOpen(true)}>
          Add Investigation
        </Button>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Investigation</DialogTitle>
            <DialogDescription>
              Select a test and feed each parameter result.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Test</Label>
              <Select value={testId} onValueChange={setTestId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investigation" />
                </SelectTrigger>
                <SelectContent>
                  {investigationLibrary.map((test) => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {queuedInvestigations.length > 0 && (
              <div className="space-y-2 rounded-xl border border-border/70 p-3">
                <p className="text-xs font-medium text-muted-foreground">Queued tests ({queuedInvestigations.length})</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {queuedInvestigations.map((item) => (
                    <p key={item.id}>{item.testName}</p>
                  ))}
                </div>
              </div>
            )}

            {selectedTest && (
              <div className="space-y-2 rounded-xl border border-border/70 p-3">
                <p className="text-xs font-medium text-muted-foreground">Parameters</p>
                <div className="space-y-2">
                  {selectedTest.parameters.map((parameter) => (
                    <div key={parameter.id} className="grid gap-2 sm:grid-cols-3">
                      <div className="text-xs text-foreground">{parameter.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {parameter.normalRange ? `Normal: ${parameter.normalRange}` : "Normal: -"}
                        {parameter.unit ? ` · Unit: ${parameter.unit}` : ""}
                      </div>
                      <Input
                        value={resultsByParameter[parameter.id] ?? ""}
                        onChange={(e) =>
                          setResultsByParameter((prev) => ({
                            ...prev,
                            [parameter.id]: e.target.value,
                          }))
                        }
                        placeholder="Enter result"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={addInvestigationToQueue}>
              Add Test
            </Button>
            <Button type="button" onClick={saveAllInvestigations}>
              Save All Investigations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {value.length === 0 ? (
          <p className="text-xs text-muted-foreground">No investigations added yet.</p>
        ) : (
          value.map((investigation) => (
            <div key={investigation.id} className="rounded-xl bg-muted/40 p-2 text-xs">
              <div className="mb-2 flex items-center justify-between gap-2">
                <input
                  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                  value={investigation.testName}
                  onChange={(e) =>
                    onChange(
                      value.map((item) =>
                        item.id === investigation.id ? { ...item, testName: e.target.value } : item,
                      ),
                    )
                  }
                  disabled={investigation.testId === ALL_REPORTS_ATTACHED_TEST_ID}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => removeInvestigation(investigation.id)}
                >
                  Delete
                </Button>
              </div>
              {investigation.testId === ALL_REPORTS_ATTACHED_TEST_ID ? (
                <p className="mb-1 text-xs text-muted-foreground">This will print as: ALL REPORTS ATTACHED</p>
              ) : null}
              <div className="space-y-2 text-muted-foreground">
                {investigation.parameters.map((parameter) => (
                  <div key={parameter.id} className="grid gap-1.5 sm:grid-cols-[1.2fr_1fr_1.5fr]">
                    <input
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                      value={parameter.name}
                      onChange={(e) =>
                        onChange(
                          value.map((item) =>
                            item.id === investigation.id
                              ? {
                                  ...item,
                                  parameters: item.parameters.map((entry) =>
                                    entry.id === parameter.id ? { ...entry, name: e.target.value } : entry,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                    <input
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                      value={parameter.normalRange ?? ""}
                      onChange={(e) =>
                        onChange(
                          value.map((item) =>
                            item.id === investigation.id
                              ? {
                                  ...item,
                                  parameters: item.parameters.map((entry) =>
                                    entry.id === parameter.id ? { ...entry, normalRange: e.target.value } : entry,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                      placeholder="Range"
                    />
                    <input
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                      value={parameter.unit ?? ""}
                      onChange={(e) =>
                        onChange(
                          value.map((item) =>
                            item.id === investigation.id
                              ? {
                                  ...item,
                                  parameters: item.parameters.map((entry) =>
                                    entry.id === parameter.id ? { ...entry, unit: e.target.value } : entry,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                      placeholder="Unit"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SmartMultiPicker({
  title,
  allItems,
  value,
  onChange,
  persistKey,
  addLabel,
  disabled = false,
}: {
  title: string;
  allItems: string[];
  value: string[];
  onChange: (next: string[]) => void;
  persistKey?: string;
  addLabel?: string;
  disabled?: boolean;
}) {
  const [selectedItem, setSelectedItem] = useState("");
  const [customItem, setCustomItem] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [storedItems, setStoredItems] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    if (!persistKey || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(persistKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed)) setStoredItems(parsed);
    } catch {
      setStoredItems([]);
    }
  }, [persistKey]);

  const mergedItems = useMemo(
    () => Array.from(new Set([...allItems, ...storedItems])).sort((a, b) => a.localeCompare(b)),
    [allItems, storedItems],
  );

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return mergedItems;
    return mergedItems.filter((item) => item.toLowerCase().includes(term));
  }, [mergedItems, searchTerm]);

  const toggle = (item: string) => {
    const normalizedItem = toUpper(item);
    const normalizedValue = value.map(toUpper);
    if (normalizedValue.includes(normalizedItem)) {
      onChange(normalizedValue.filter((v) => v !== normalizedItem));
      return;
    }
    onChange([...normalizedValue, normalizedItem]);
  };

  const addSelectedItem = () => {
    if (!selectedItem) return;
    toggle(selectedItem);
    setSelectedItem("");
  };

  const addCustomItem = () => {
    const next = toUpper(normalizeDetail(customItem.trim()));
    if (!next) return;
    if (!value.map(toUpper).includes(next)) onChange([...value.map(toUpper), next]);

    if (persistKey && typeof window !== "undefined") {
      const nextStored = Array.from(new Set([...storedItems, next]));
      setStoredItems(nextStored);
      window.localStorage.setItem(persistKey, JSON.stringify(nextStored));
    }

    setCustomItem("");
  };

  const deleteCustomDiagnosis = (item: string) => {
    if (!persistKey || typeof window === "undefined") return;

    const nextStored = storedItems.filter((entry) => entry !== item);
    setStoredItems(nextStored);
    window.localStorage.setItem(persistKey, JSON.stringify(nextStored));

    if (value.includes(item)) {
      onChange(value.filter((entry) => entry !== item));
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-border/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{title}</p>
        <Badge variant="secondary">{value.length} selected</Badge>
      </div>
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedItem(e.target.value);
            }}
            placeholder={`Search or type ${title.toLowerCase()}`}
            disabled={disabled}
          />
          <Button type="button" variant="secondary" onClick={() => { const next = normalizeDetail(searchTerm.trim()); if (next) { toggle(next); setSearchTerm(""); setSelectedItem(""); } }} disabled={disabled || !searchTerm.trim()}>
            Add
          </Button>
        </div>
        {filteredItems.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-md border border-border/70 bg-background p-2 text-xs">
            {filteredItems.map((item) => (
              <button
                key={item}
                type="button"
                className="block w-full rounded-md px-2 py-1 text-left hover:bg-muted"
                onClick={() => {
                  toggle(item);
                  setSearchTerm("");
                  setSelectedItem("");
                }}
              >
                {toUpper(item)}
              </button>
            ))}
          </div>
        )}
      </div>
      {addLabel && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" disabled={disabled}>Add New {title}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New {title}</DialogTitle>
              <DialogDescription>Save an option for use in future referrals.</DialogDescription>
            </DialogHeader>
            <Textarea
              autoFocus
              rows={4}
              value={customItem}
              onChange={(e) => setCustomItem(e.target.value)}
              placeholder={`ENTER ${title.toUpperCase()}`}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="button" onClick={() => { addCustomItem(); setIsAddDialogOpen(false); }} disabled={!customItem.trim()}>
                Save and Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((item) => (
            <Badge key={item} variant="outline" className={disabled ? "" : "cursor-pointer"} onClick={() => !disabled && toggle(item)}>
              {item}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleRadio({
  label,
  selected,
  onChange,
}: {
  label: string;
  selected: boolean;
  onChange: () => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs">
      <input type="radio" checked={selected} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function Tick({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
      <span>{label}</span>
    </label>
  );
}

function PatientInfoBanner({
  name,
  age,
  gender,
  admissionDate,
  dischargeDate,
  doctors,
}: {
  name: string;
  age: string;
  gender: string;
  admissionDate: string;
  dischargeDate: string;
  doctors: DoctorProfile[];
}) {
  return (
    <div className="neo-inset rounded-2xl p-3 text-xs text-muted-foreground">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldAlert className="size-4 text-primary" /> PATIENT DETAILS
      </p>
      <div className="grid gap-1 sm:grid-cols-2">
        <p>PATIENT NAME: <span className="font-medium text-foreground">{name}</span></p>
        <p>AGE/GENDER: <span className="font-medium text-foreground">{age} / {gender}</span></p>
        <p>ADMISSION DATE: <span className="font-medium text-foreground">{formatDateDMY(admissionDate) || "-"}</span></p>
        <p>DISCHARGE DATE: <span className="font-medium text-foreground">{formatDateDMY(dischargeDate) || "-"}</span></p>
      </div>
      <p className="mt-1">DOCTORS: <span className="font-medium text-foreground">{doctors.length > 0 ? doctors.map(doctorDisplayName).join("; ") : "-"}</span></p>
    </div>
  );
}

function DoctorPicker({
  value,
  onChange,
}: {
  value: DoctorProfile[];
  onChange: (doctors: DoctorProfile[]) => void;
}) {
  const [directory, setDirectory] = useState<DoctorProfile[]>([DEFAULT_DOCTOR_PROFILE]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [degree, setDegree] = useState("");
  const [speciality, setSpeciality] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(DOCTOR_LIBRARY_KEY) || "null") as DoctorProfile[] | null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        setDirectory(
          parsed
            .filter((doctor) => doctor?.id && doctor?.name)
            .map((doctor) =>
              doctor.id === DEFAULT_DOCTOR_PROFILE.id || doctor.name.toUpperCase().includes("SUSHIL KR PANDEY")
                ? { ...DEFAULT_DOCTOR_PROFILE, speciality: DEFAULT_DOCTOR_PROFILE.speciality }
                : {
                    ...doctor,
                    speciality: doctor.speciality || doctor.details || "",
                    details: doctor.details || "",
                  },
            ),
        );
      }
    } catch {
      // Ignore malformed local directory data.
    }
  }, []);

  const saveDirectory = (next: DoctorProfile[]) => {
    setDirectory(next);
    window.localStorage.setItem(DOCTOR_LIBRARY_KEY, JSON.stringify(next));
  };

  const addDoctor = () => {
    const nextDoctor: DoctorProfile = {
      id: createId(),
      name: toUpper(name.trim()),
      degree: toUpper(degree.trim()),
      speciality: toUpper(speciality.trim()),
      details: toUpper(details.trim()),
    };
    if (!nextDoctor.name) {
      toast.error("Enter the doctor's name");
      return;
    }
    const nextDirectory = [nextDoctor, ...directory.filter((doctor) => doctorDisplayName(doctor) !== doctorDisplayName(nextDoctor))];
    saveDirectory(nextDirectory);
    onChange([...value, nextDoctor]);
    setName("");
    setDegree("");
    setSpeciality("");
    setDetails("");
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Doctors / Surgeons</Label>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="secondary" size="sm">
              <Plus className="size-4" /> Add doctor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Doctor</DialogTitle>
              <DialogDescription>Save the doctor in the directory and add them to this patient record.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Doctor name</Label><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="DR FULL NAME" /></div>
              <div className="space-y-1"><Label>Degree</Label><Input value={degree} onChange={(event) => setDegree(event.target.value)} placeholder="MBBS, MS, MD" /></div>
              <div className="space-y-1"><Label>Speciality</Label><Input value={speciality} onChange={(event) => setSpeciality(event.target.value)} placeholder="GENERAL SURGERY, ORTHOPAEDICS, GYNAECOLOGY" /></div>
              <div className="space-y-1"><Label>Other details</Label><Input value={details} onChange={(event) => setDetails(event.target.value)} placeholder="CONSULTANT / REG.NO./ ROLE" /></div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="button" onClick={addDoctor}>Save and add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Select
        value=""
        onValueChange={(doctorId) => {
          const doctor = directory.find((item) => item.id === doctorId);
          if (doctor && !value.some((item) => item.id === doctor.id)) onChange([...value, doctor]);
        }}
      >
        <SelectTrigger><SelectValue placeholder="SELECT A SAVED DOCTOR / SURGEON" /></SelectTrigger>
        <SelectContent>
          {directory.slice().sort((a, b) => doctorDisplayName(a).localeCompare(doctorDisplayName(b))).map((doctor) => (
            <SelectItem key={doctor.id} value={doctor.id}>{doctorDisplayName(doctor)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="space-y-1">
        {value.map((doctor, index) => (
          <div key={doctor.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 text-sm">
            <span><span className="font-medium">{index === 0 ? "Treating: " : "Co-surgeon: "}</span>{doctorDisplayName(doctor)}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(value.filter((item) => item.id !== doctor.id))}>Remove</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
