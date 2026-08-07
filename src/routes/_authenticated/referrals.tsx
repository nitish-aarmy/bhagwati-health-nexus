import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FileText,
  HeartPulse,
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
import { EMPTY_MEDICATION_ROW, useReferralDraft } from "@/features/referral-summary/useReferralDraft";
import type {
  FollowUpPreset,
  InvestigationRecord,
  MedicationRow,
  SummaryMode,
  SurgicalProcedureEntry,
} from "@/features/referral-summary/types";
import { patientsQuery } from "@/lib/queries";
import { guardModuleAccess } from "@/lib/route-guards";
import { useQuery } from "@tanstack/react-query";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

function createId() {
  if (typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function joinOrDash(items: string[]) {
  return items.length > 0 ? items.join("; ") : "-";
}

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function joinNonEmpty(items: string[]) {
  return items.map((item) => item.trim()).filter((item) => item.length > 0).join("; ");
}

function toUpper(value: string) {
  return value.toUpperCase();
}

const DIAGNOSIS_USER_LIBRARY_KEY = "bhagwati:referral-diagnosis-library";
const COMPLAINTS_USER_LIBRARY_KEY = "bhagwati:referral-complaints-library";
const TREATMENT_USER_LIBRARY_KEY = "bhagwati:referral-treatment-library";
const DIET_USER_LIBRARY_KEY = "bhagwati:referral-diet-library";
const DOS_USER_LIBRARY_KEY = "bhagwati:referral-dos-library";
const DONTS_USER_LIBRARY_KEY = "bhagwati:referral-donts-library";
const EMERGENCY_WARNING_USER_LIBRARY_KEY = "bhagwati:referral-emergency-warning-library";
const SURGICAL_PROCEDURE_LIBRARY_KEY = "bhagwati:referral-surgical-procedure-library";
const MEDICINE_LIBRARY_KEY = "bhagwati:referral-medicine-library";
const INVESTIGATION_CUSTOM_LIBRARY_KEY = "bhagwati:referral-investigation-library";

const MEDICINE_TYPES: Array<NonNullable<MedicationRow["medicineType"]>> = [
  "TAB",
  "CAPSULE",
  "SYP",
  "INJ",
  "IV",
  "FLUID",
  "OINTMENT",
];

const DR_ARCHANA = "DR ARCHANA TIWARI PANDEY, MBBS (HONS) DGO, CONSULTANT GYNECOLOGIST & OBSTETRICIAN";
const DR_SUSHIL = "DR SUSHIL KUMAR PANDEY, MBBS, MS DNB (GEN SURGERY)";
const DR_ARCHANA_SUSHIL = "DR ARCHANA + DR SUSHIL";
const ALL_REPORTS_ATTACHED_TEST_ID = "all_reports_attached";
const ALL_REPORTS_ATTACHED_LABEL = "ALL REPORTS ATTACHED";

const DOCTOR_OPTIONS = [
  DR_ARCHANA,
  DR_SUSHIL,
  DR_ARCHANA_SUSHIL,
];

function doctorPrintValue(doctorName: string) {
  if (doctorName === DR_ARCHANA || doctorName === DR_ARCHANA_SUSHIL) {
    return `${DR_ARCHANA}\n${DR_SUSHIL}`;
  }
  return doctorName || "-";
}

function doctorPrintHtml(doctorName: string) {
  return escapeHtml(doctorPrintValue(doctorName)).replaceAll("\n", "<br />");
}

type MedicineLibraryItem = {
  id: string;
  type: NonNullable<MedicationRow["medicineType"]>;
  name: string;
  suggestedDose?: string;
};

const PRESET_MEDICINE_LIBRARY: MedicineLibraryItem[] = [
  { id: "preset-paracetamol-650", type: "TAB", name: "PARACETAMOL", suggestedDose: "650 MG" },
  { id: "preset-pantoprazole-40", type: "TAB", name: "PANTOPRAZOLE", suggestedDose: "40 MG" },
  { id: "preset-ondansetron-4", type: "TAB", name: "ONDANSETRON", suggestedDose: "4 MG" },
  { id: "preset-azithromycin-500", type: "TAB", name: "AZITHROMYCIN", suggestedDose: "500 MG" },
  { id: "preset-cefixime-200", type: "TAB", name: "CEFIXIME", suggestedDose: "200 MG" },
  { id: "preset-amoxiclav-625", type: "TAB", name: "AMOXICLAV", suggestedDose: "625 MG" },
  { id: "preset-metronidazole-400", type: "TAB", name: "METRONIDAZOLE", suggestedDose: "400 MG" },
  { id: "preset-domperidone-10", type: "TAB", name: "DOMPERIDONE", suggestedDose: "10 MG" },
  { id: "preset-ibuprofen-400", type: "TAB", name: "IBUPROFEN", suggestedDose: "400 MG" },
  { id: "preset-diclofenac-50", type: "TAB", name: "DICLOFENAC", suggestedDose: "50 MG" },
  { id: "preset-levocetirizine-5", type: "TAB", name: "LEVOCETIRIZINE", suggestedDose: "5 MG" },
  { id: "preset-ambroxol-syp", type: "SYP", name: "AMBROXOL SYRUP", suggestedDose: "5 ML" },
  { id: "preset-lactulose-syp", type: "SYP", name: "LACTULOSE SYRUP", suggestedDose: "15 ML" },
  { id: "preset-vitb12-inj", type: "INJ", name: "METHYLCOBALAMIN", suggestedDose: "1 AMP" },
  { id: "preset-ondansetron-inj", type: "INJ", name: "ONDANSETRON", suggestedDose: "2 ML" },
];

function toInvestigationId(prefix: string, name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${prefix}_${slug || "test"}`;
}

function normalizeDetail(value: string) {
  return value.toUpperCase();
}

function foodTimingLabel(value: MedicationRow["foodTiming"]) {
  const labels: Record<MedicationRow["foodTiming"], string> = {
    empty_stomach: "1 EMPTY STOMACH",
    after_meal: "2 AFTER MEAL",
    hs: "3 HS",
    sos: "4 SOS",
    before_breakfast: "5 BEFORE BREAKFAST",
    after_breakfast: "6 AFTER BREAKFAST",
    after_lunch: "7 AFTER LUNCH",
    after_lunch_2: "8 AFTER LUNCH",
  };
  return labels[value];
}

function foodTimingPrintLabel(value: MedicationRow["foodTiming"]) {
  const labels: Record<MedicationRow["foodTiming"], string> = {
    empty_stomach: "EMPTY STOMACH",
    after_meal: "AFTER MEAL",
    hs: "HS",
    sos: "SOS",
    before_breakfast: "BEFORE BREAKFAST",
    after_breakfast: "AFTER BREAKFAST",
    after_lunch: "AFTER LUNCH",
    after_lunch_2: "AFTER LUNCH",
  };
  return labels[value];
}

function medicationSchedulePrintBlock(row: MedicationRow) {
  const line1 = `${row.medicineType ? `${row.medicineType} ` : ""}${row.medicineName || "DRUG"}`.trim();
  const quantityDose = [row.strength?.trim(), row.dose?.trim()].filter(Boolean).join(" ");
  const timeParts = [row.morning ? "MORNING" : "", row.afternoon ? "AFTERNOON" : "", row.night ? "NIGHT" : ""]
    .filter(Boolean)
    .join(" ");
  const line2 = `${quantityDose || "DOSE"}${timeParts ? ` ${timeParts}` : ""}`;
  const line3 = foodTimingPrintLabel(row.foodTiming);
  return `${line1}\n${line2}\n${line3}`;
}

function formatInvestigationRecord(record: InvestigationRecord) {
  if (record.reportAttached) {
    return `${record.testName} (Report attached)`;
  }

  const parameterBits = record.parameters
    .filter((item) => item.result.trim().length > 0)
    .map((item) => `${item.name}: ${item.result}${item.unit ? ` ${item.unit}` : ""}`);

  if (parameterBits.length === 0) return record.testName;
  return `${record.testName} (${parameterBits.join(", ")})`;
}

function formatInvestigationsForDocument(investigations: InvestigationRecord[]) {
  if (investigations.length === 0) return "-";
  if (investigations.some((investigation) => investigation.testId === ALL_REPORTS_ATTACHED_TEST_ID)) {
    return ALL_REPORTS_ATTACHED_LABEL;
  }
  const withInlineReportTag = investigations.map(formatInvestigationRecord).join("; ");
  const anyReportAttached = investigations.some((investigation) => investigation.reportAttached);
  if (!anyReportAttached) return withInlineReportTag;

  // Keep report-attached marker only once in printed output.
  const cleaned = investigations
    .map((record) => {
      const parameterBits = record.parameters
        .filter((item) => item.result.trim().length > 0)
        .map((item) => `${item.name}: ${item.result}${item.unit ? ` ${item.unit}` : ""}`);
      if (parameterBits.length === 0) return record.testName;
      return `${record.testName} (${parameterBits.join(", ")})`;
    })
    .join("; ");
  return `${cleaned} (Report attached)`;
}

function formatSurgicalProceduresForDocument(surgicalProcedures: SurgicalProcedureEntry[]) {
  if (surgicalProcedures.length === 0) return "-";
  return surgicalProcedures
    .map((entry) => `${entry.procedure}${entry.finding.trim() ? `: ${entry.finding.trim()}` : ""}`)
    .join("; ");
}

function createReferralHtml({
  patientName,
  ageGender,
  draft,
}: {
  patientName: string;
  ageGender: string;
  draft: {
    admissionDate: string;
    dischargeDate: string;
    doctorName: string;
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
    patientStatusDuringDischarge: string;
    medication: MedicationRow[];
  };
}) {
  const medicationLines = draft.medication
    .filter((m) => m.medicineName.trim().length > 0)
    .map(medicationSchedulePrintBlock);
  const summaryLabel = draft.summaryMode === "referral_summary" ? "REFERRAL SUMMARY" : "DISCHARGE SUMMARY";

  const patientDetailRows = [
    `<div><strong>Patient Name:</strong> ${escapeHtml(patientName)}</div>`,
    hasText(ageGender) ? `<div><strong>Age/Sex:</strong> ${escapeHtml(ageGender)}</div>` : "",
    hasText(draft.admissionDate) ? `<div><strong>Admission Date:</strong> ${escapeHtml(formatDateDMY(draft.admissionDate))}</div>` : "",
    hasText(draft.dischargeDate) ? `<div><strong>Discharge Date:</strong> ${escapeHtml(formatDateDMY(draft.dischargeDate))}</div>` : "",
    hasText(draft.doctorName)
      ? `<div style="grid-column: 1 / -1;"><strong>Doctor Name:</strong> ${doctorPrintHtml(draft.doctorName)}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const clinicalRows = [
    draft.chiefComplaints.length > 0
      ? `<div class="row"><strong>Chief Complaints:</strong> ${escapeHtml(joinNonEmpty(draft.chiefComplaints))}</div>`
      : "",
    hasText(draft.patientHistory) ? `<div class="row"><strong>History:</strong> ${escapeHtml(draft.patientHistory)}</div>` : "",
    draft.diagnosis.length > 0
      ? `<div class="row"><strong>Diagnosis:</strong> ${escapeHtml(joinNonEmpty(draft.diagnosis))}</div>`
      : "",
    draft.investigations.length > 0
      ? `<div class="row"><strong>Investigations:</strong> ${escapeHtml(formatInvestigationsForDocument(draft.investigations))}</div>`
      : "",
    draft.surgicalProcedures.length > 0
      ? `<div class="row"><strong>Surgical Procedure:</strong> ${escapeHtml(formatSurgicalProceduresForDocument(draft.surgicalProcedures))}</div>`
      : "",
    draft.treatmentGiven.length > 0
      ? `<div class="row"><strong>Medical Management:</strong> ${escapeHtml(joinNonEmpty(draft.treatmentGiven))}</div>`
      : "",
    hasText(draft.doctorNotes) ? `<div class="row"><strong>Other Advice:</strong> ${escapeHtml(draft.doctorNotes)}</div>` : "",
  ]
    .filter(Boolean)
    .join("");

  const referralRows = [
    hasText(draft.referralReason) ? `<div class="row"><strong>Reason:</strong> ${escapeHtml(draft.referralReason)}</div>` : "",
    hasText(draft.referredHospital)
      ? `<div class="row"><strong>Referred Hospital:</strong> ${escapeHtml(draft.referredHospital)}</div>`
      : "",
    hasText(draft.referredDepartment)
      ? `<div class="row"><strong>Department:</strong> ${escapeHtml(draft.referredDepartment)}</div>`
      : "",
    hasText(draft.referredDoctor)
      ? `<div class="row"><strong>Referred Doctor:</strong> ${escapeHtml(draft.referredDoctor)}</div>`
      : "",
    hasText(draft.urgency) ? `<div class="row"><strong>Urgency:</strong> ${escapeHtml(draft.urgency)}</div>` : "",
    hasText(draft.transferMode)
      ? `<div class="row"><strong>Transfer Mode:</strong> ${escapeHtml(draft.transferMode)}</div>`
      : "",
    hasText(draft.referralSummary)
      ? `<div class="row"><strong>${summaryLabel}:</strong> ${escapeHtml(draft.referralSummary)}</div>`
      : "",
    draft.dischargedToHome ? `<div class="row"><strong>Discharge Status:</strong> PATIENT DISCHARGED TO HOME</div>` : "",
    hasText(draft.patientStatusDuringDischarge)
      ? `<div class="row"><strong>Patient Status During Discharge:</strong> ${escapeHtml(draft.patientStatusDuringDischarge)}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const adviceRows = [
    draft.dietAdvice.length > 0 ? `<div class="row"><strong>Diet:</strong> ${escapeHtml(joinNonEmpty(draft.dietAdvice))}</div>` : "",
    draft.dos.length > 0 ? `<div class="row"><strong>Do's:</strong> ${escapeHtml(joinNonEmpty(draft.dos))}</div>` : "",
    draft.donts.length > 0 ? `<div class="row"><strong>Don'ts:</strong> ${escapeHtml(joinNonEmpty(draft.donts))}</div>` : "",
    draft.emergencyWarnings.length > 0
      ? `<div class="row"><strong>Emergency Warnings:</strong> ${escapeHtml(joinNonEmpty(draft.emergencyWarnings))}</div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${summaryLabel}</title>
    <style>
      @page { size: A4; margin: 2in 14mm 1in 14mm; }
      body { font-family: Arial, sans-serif; color: #111; font-size: 11.5px; line-height: 1.35; }
      h1, h2 { margin: 0; }
      h1 { font-size: 16px; }
      h2 { font-size: 12.5px; margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
      .muted { color: #444; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-top: 8px; }
      .card { border: 1px solid #ddd; border-radius: 8px; padding: 8px; margin-top: 8px; }
      .split { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
      .panel { border: 1px solid #ddd; border-radius: 8px; padding: 8px; }
      ul { margin: 6px 0 0 18px; padding: 0; }
      li { white-space: pre-line; margin-bottom: 5px; }
      .row { margin-top: 5px; }
      .footer { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    </style>
  </head>
  <body>
    <h1>Bhagwati Hospital ERP · ${summaryLabel}</h1>
    <div class="muted">Generated on ${formatDateTimeDMY(new Date())}</div>

    <div class="card">
      <div class="grid">
        ${patientDetailRows}
      </div>
    </div>

    <div class="split">
      <div class="panel">
        <h2>Clinical Summary</h2>
        ${clinicalRows}

        ${medicationLines.length > 0 ? `<h2 style="margin-top: 10px;">Medications and Advice</h2><ul>${medicationLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : ""}
      </div>

      <div class="panel">
        <h2>Referral Details</h2>
        ${referralRows}

        ${adviceRows ? `<h2 style="margin-top: 10px;">Advice</h2>${adviceRows}` : ""}

        <div class="footer">
          <div>
            <p>Doctor Signature: ____________________</p>
          </div>
          <div>
            <p>Hospital Seal: ____________________</p>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

export const Route = createFileRoute("/_authenticated/referrals")({
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
  const [newMedicineType, setNewMedicineType] = useState<NonNullable<MedicationRow["medicineType"]>>("TAB");
  const [newMedicineName, setNewMedicineName] = useState("");
  const [newMedicineDose, setNewMedicineDose] = useState("");
  const [isAddMedicineDialogOpen, setIsAddMedicineDialogOpen] = useState(false);

  const patients = useQuery(patientsQuery(search));
  const selectedPatient = useMemo(
    () => (patients.data ?? []).find((p) => p.id === patientId),
    [patientId, patients.data],
  );

  const { draft, setDraft, lastSavedAt } = useReferralDraft(patientId);

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

  const addMedicineForFutureUse = () => {
    const name = normalizeDetail(newMedicineName.trim());
    const suggestedDose = normalizeDetail(newMedicineDose.trim());
    if (!name) {
      toast.error("Enter medicine name");
      return false;
    }

    const duplicate = medicineLibrary.some(
      (item) => item.type === newMedicineType && item.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      const existing = medicineLibrary.find(
        (item) => item.type === newMedicineType && item.name.trim().toLowerCase() === name.toLowerCase(),
      );
      // If duplicate exists, still try to auto-fill current empty row for faster workflow.
      setDraft((prev) => {
        const emptyRow = prev.medication.find((row) => !hasText(row.medicineName));
        if (!emptyRow) return prev;
        return {
          ...prev,
          medication: prev.medication.map((row) =>
            row.id === emptyRow.id
              ? {
                  ...row,
                  medicineType: newMedicineType,
                  medicineName: name,
                  dose: existing?.suggestedDose || row.dose,
                }
              : row,
          ),
        };
      });
      toast.success("Medicine already exists in saved list");
      return true;
    }

    const nextItem: MedicineLibraryItem = {
      id: createId(),
      type: newMedicineType,
      name,
      suggestedDose,
    };
    const nextLibrary = [...medicineLibrary, nextItem];
    setMedicineLibrary(nextLibrary);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(MEDICINE_LIBRARY_KEY, JSON.stringify(nextLibrary));
    }

    setDraft((prev) => {
      const emptyRow = prev.medication.find((row) => !hasText(row.medicineName));
      if (!emptyRow) return prev;
      return {
        ...prev,
        medication: prev.medication.map((row) =>
          row.id === emptyRow.id
            ? {
                ...row,
                medicineType: newMedicineType,
                medicineName: name,
                dose: suggestedDose || row.dose,
              }
            : row,
        ),
      };
    });

    setNewMedicineName("");
    setNewMedicineDose("");
    toast.success("Medicine saved for future use and applied");
    return true;
  };

  const handleSaveMedicineFromDialog = () => {
    const saved = addMedicineForFutureUse();
    if (!saved) return;
    setIsAddMedicineDialogOpen(false);
  };

  const removeMedicineFromLibrary = (id: string) => {
    const nextLibrary = medicineLibrary.filter((item) => item.id !== id);
    setMedicineLibrary(nextLibrary);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MEDICINE_LIBRARY_KEY, JSON.stringify(nextLibrary));
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

    const fromDraft = draft.medication
      .filter((item) => item.medicineName.trim().length > 0)
      .map((item) => ({
        name: item.medicineName,
        type: item.medicineType ?? "TAB",
        suggestedDose: item.dose,
      }));

    return Array.from(new Map([...fromLibrary, ...fromDraft].map((item) => [`${item.type}:${item.name}`, item])).values());
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
    }

    setDraft((prev) => {
      const hasEmptyRow = prev.medication.some((item) => !hasText(item.medicineName));
      if (hasEmptyRow) return prev;
      return {
        ...prev,
        medication: [...prev.medication, { ...EMPTY_MEDICATION_ROW, id: createId() }],
      };
    });

    toast.success("Medication entry saved. New blank entry added.");
  };

  const printReferral = () => {
    if (typeof window === "undefined") return;
    if (!selectedPatient) {
      toast.error("Select a patient before printing referral");
      return;
    }

    const html = createReferralHtml({
      patientName: selectedPatient.full_name,
      ageGender: `${selectedPatient.age ?? "-"} / ${selectedPatient.gender ?? "-"}`,
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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    const summaryLabel = draft.summaryMode === "referral_summary" ? "REFERRAL SUMMARY" : "DISCHARGE SUMMARY";
    doc.text(`Bhagwati Hospital ERP - ${summaryLabel}`, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated: ${formatDateTimeDMY(new Date())}`, margin, y);
    y += 7;

    writeBlock("Patient Name", selectedPatient.full_name);
    writeBlockIfValue("Age/Sex", `${selectedPatient.age ?? ""} / ${selectedPatient.gender ?? ""}`.replace(/^\s*\/\s*$/, ""));
    writeBlockIfValue("Admission Date", formatDateDMY(draft.admissionDate));
    writeBlockIfValue("Discharge Date", formatDateDMY(draft.dischargeDate));
    writeBlockIfValue("Doctor Name", doctorPrintValue(draft.doctorName));
    writeBlockIfValue("Chief Complaints", joinNonEmpty(draft.chiefComplaints));
    writeBlockIfValue("History", draft.patientHistory);
    writeBlockIfValue("Diagnosis", joinNonEmpty(draft.diagnosis));
    if (draft.investigations.length > 0) writeBlock("Investigations", formatInvestigationsForDocument(draft.investigations));
    if (draft.surgicalProcedures.length > 0) writeBlock("Surgical Procedure", formatSurgicalProceduresForDocument(draft.surgicalProcedures));
    writeBlockIfValue("Medical Management", joinNonEmpty(draft.treatmentGiven));
    writeBlockIfValue("Other Advice", draft.doctorNotes);

    const medicationText = draft.medication
      .filter((med) => med.medicineName.trim().length > 0)
      .map(medicationSchedulePrintBlock)
      .join("\n\n");
    writeBlockIfValue("Medications and Advice", medicationText);

    writeBlockIfValue("Referral Reason", draft.referralReason);
    writeBlockIfValue(summaryLabel, draft.referralSummary);
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
    writeBlockIfValue("Patient Status During Discharge", draft.patientStatusDuringDischarge);
    writeBlockIfValue("Diet Advice", joinNonEmpty(draft.dietAdvice));
    writeBlockIfValue("Do's", joinNonEmpty(draft.dos));
    writeBlockIfValue("Don'ts", joinNonEmpty(draft.donts));
    writeBlockIfValue("Emergency Warnings", joinNonEmpty(draft.emergencyWarnings));

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

      <section className="neo mb-5 grid gap-3 p-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="patient-search">Search patient</Label>
          <div className="neo-inset flex items-center gap-2 rounded-xl px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              id="patient-search"
              className="w-full bg-transparent py-2 text-sm outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by UHID, name or mobile"
            />
          </div>
          <Select value={patientId} onValueChange={setPatientId}>
            <SelectTrigger>
              <SelectValue placeholder="Select patient to start draft" />
            </SelectTrigger>
            <SelectContent>
              {(patients.data ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name} · {p.uhid} · {p.phone}
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
              {REFERRAL_TEMPLATES.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Auto-saved every 4 seconds{lastSavedAt ? ` · last save ${new Date(lastSavedAt).toLocaleTimeString()}` : ""}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
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
            doctorName={draft.doctorName}
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
                onChange={(e) => setDraft((prev) => ({ ...prev, dischargeDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Doctor Name</Label>
            <Select
              value={draft.doctorName}
              onValueChange={(value) => setDraft((prev) => ({ ...prev, doctorName: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="SELECT DOCTOR" />
              </SelectTrigger>
              <SelectContent>
                {DOCTOR_OPTIONS.map((doctor) => (
                  <SelectItem key={doctor} value={doctor}>
                    {doctor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <p className="text-sm font-medium">History</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="secondary" size="sm">Open History Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Patient History</DialogTitle>
                    <DialogDescription>Enter patient history details.</DialogDescription>
                  </DialogHeader>
                  <Textarea
                    rows={8}
                    value={draft.patientHistory}
                    onChange={(e) => setDraft((prev) => ({ ...prev, patientHistory: normalizeDetail(e.target.value) }))}
                    placeholder="PATIENT HISTORY"
                  />
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-xs text-muted-foreground">{draft.patientHistory || "No history added yet."}</p>
          </div>

          <SmartMultiPicker
            title="Provisional Diagnosis"
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
                      Fill medicine details and save for future use.
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
                          {MEDICINE_TYPES.map((type) => (
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
                        onChange={(e) => setNewMedicineName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveMedicineFromDialog();
                          }
                        }}
                        placeholder="Enter medicine name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-medicine-dose">Suggested Dose</Label>
                      <Input
                        id="new-medicine-dose"
                        value={newMedicineDose}
                        onChange={(e) => setNewMedicineDose(e.target.value)}
                        placeholder="e.g. 500 MG, 5 ML"
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

              <div className="max-h-40 space-y-1 overflow-auto rounded-xl border border-border/70 p-2">
                {medicineLibrary.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No saved medicines yet.</p>
                ) : (
                  medicineLibrary.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1 text-xs">
                      <span>
                        {item.type} - {item.name}
                        {hasText(item.suggestedDose || "") ? ` (${item.suggestedDose})` : ""}
                      </span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => removeMedicineFromLibrary(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {draft.medication.map((row) => (
              <article key={row.id} className="neo-inset rounded-2xl p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Medicine entry</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => saveMedicationEntry(row)}
                    >
                      Save Entry
                    </Button>
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
                      {MEDICINE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={row.medicineName || undefined}
                    onValueChange={(value) => {
                      const selected = medicineOptions.find(
                        (item) => item.type === (row.medicineType ?? "TAB") && item.name === value,
                      );
                      updateMedication(row.id, {
                        medicineName: value,
                        dose: selected?.suggestedDose || row.dose,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Medicine" />
                    </SelectTrigger>
                    <SelectContent>
                      {medicineOptions
                        .filter((item) => item.type === (row.medicineType ?? "TAB"))
                        .map((item) => (
                          <SelectItem key={`${item.type}-${item.name}`} value={item.name}>
                            {item.name}{item.suggestedDose ? ` (${item.suggestedDose})` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Drug quantity"
                    value={row.strength}
                    onChange={(e) => updateMedication(row.id, { strength: toUpper(e.target.value) })}
                  />
                  <Input
                    placeholder="Dose"
                    value={row.dose}
                    onChange={(e) => updateMedication(row.id, { dose: toUpper(e.target.value) })}
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Duration days"
                    value={row.durationDays}
                    onChange={(e) => updateMedication(row.id, { durationDays: Number(e.target.value) || 1 })}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <Tick
                    label="OD"
                    checked={row.morning}
                    onCheckedChange={(checked) => updateMedication(row.id, { morning: checked })}
                  />
                  <Tick
                    label="BD"
                    checked={row.afternoon}
                    onCheckedChange={(checked) => updateMedication(row.id, { afternoon: checked })}
                  />
                  <Tick
                    label="NIGHT"
                    checked={row.night}
                    onCheckedChange={(checked) => updateMedication(row.id, { night: checked })}
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
                      <SelectItem value="empty_stomach">1 EMPTY STOMACH</SelectItem>
                      <SelectItem value="after_meal">2 AFTER MEAL</SelectItem>
                      <SelectItem value="hs">3 HS</SelectItem>
                      <SelectItem value="sos">4 SOS</SelectItem>
                      <SelectItem value="before_breakfast">5 BEFORE BREAKFAST</SelectItem>
                      <SelectItem value="after_breakfast">6 AFTER BREAKFAST</SelectItem>
                      <SelectItem value="after_lunch">7 AFTER LUNCH</SelectItem>
                      <SelectItem value="after_lunch_2">8 AFTER LUNCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  className="mt-2"
                  placeholder="Special instruction"
                  value={row.specialInstruction}
                  onChange={(e) => updateMedication(row.id, { specialInstruction: toUpper(e.target.value) })}
                />
              </article>
            ))}

            <Button variant="secondary" className="w-full" onClick={addMedicationRow}>
              Add medicine row
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doctorNotes">Other Advice</Label>
            <Textarea
              id="doctorNotes"
              rows={6}
              value={draft.doctorNotes}
              onChange={(e) => setDraft((prev) => ({ ...prev, doctorNotes: toUpper(e.target.value) }))}
              placeholder="OTHER ADVICE"
            />
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
                    Tick to confirm the patient is discharged to home.
                  </DialogDescription>
                </DialogHeader>

                <label className="inline-flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.dischargedToHome}
                    onCheckedChange={(checked) =>
                      setDraft((prev) => ({ ...prev, dischargedToHome: Boolean(checked) }))
                    }
                  />
                  PATIENT DISCHARGED TO HOME
                </label>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <div className="space-y-2">
              <Label htmlFor="patientStatusDuringDischarge">Patient Status During Discharge</Label>
              <Textarea
                id="patientStatusDuringDischarge"
                rows={3}
                value={draft.patientStatusDuringDischarge}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, patientStatusDuringDischarge: normalizeDetail(e.target.value) }))
                }
                placeholder="PATIENT STATUS DURING DISCHARGE"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Follow Ups Advice</Label>
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

          <SmartMultiPicker
            title="Diet Advice"
            allItems={DIET_LIBRARY}
            value={draft.dietAdvice}
            onChange={(next) => setDraft((prev) => ({ ...prev, dietAdvice: next }))}
            persistKey={DIET_USER_LIBRARY_KEY}
            addLabel="Add"
          />

          <SmartMultiPicker
            title="Do's"
            allItems={DOS_LIBRARY}
            value={draft.dos}
            onChange={(next) => setDraft((prev) => ({ ...prev, dos: next }))}
            persistKey={DOS_USER_LIBRARY_KEY}
            addLabel="Add"
          />

          <SmartMultiPicker
            title="Don'ts"
            allItems={DONTS_LIBRARY}
            value={draft.donts}
            onChange={(next) => setDraft((prev) => ({ ...prev, donts: next }))}
            persistKey={DONTS_USER_LIBRARY_KEY}
            addLabel="Add"
          />
        </SectionCard>

        <SectionCard
          title={draft.summaryMode === "referral_summary" ? "Referral Summary" : "Discharge Summary"}
          description="New column for transfer-ready referral document"
          icon={FileText}
        >
          <div className="space-y-2">
            <Label htmlFor="referralReason">Reason for referral</Label>
            <Input
              id="referralReason"
              placeholder="Need higher center ICU support"
              value={draft.referralReason}
              onChange={(e) => setDraft((prev) => ({ ...prev, referralReason: toUpper(e.target.value) }))}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Referred hospital"
              value={draft.referredHospital}
              onChange={(e) => setDraft((prev) => ({ ...prev, referredHospital: toUpper(e.target.value) }))}
            />
            <Input
              placeholder="Department"
              value={draft.referredDepartment}
              onChange={(e) => setDraft((prev) => ({ ...prev, referredDepartment: toUpper(e.target.value) }))}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Referred doctor"
              value={draft.referredDoctor}
              onChange={(e) => setDraft((prev) => ({ ...prev, referredDoctor: toUpper(e.target.value) }))}
            />
            <Input
              placeholder="Transfer mode"
              value={draft.transferMode}
              onChange={(e) => setDraft((prev) => ({ ...prev, transferMode: toUpper(e.target.value) }))}
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
                <SelectItem value="routine">Routine</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="emergency">Emergency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="referralSummary">
              {draft.summaryMode === "referral_summary" ? "Referral Summary" : "Discharge Summary"}
            </Label>
            <Textarea
              id="referralSummary"
              rows={7}
              value={draft.referralSummary}
              onChange={(e) => setDraft((prev) => ({ ...prev, referralSummary: toUpper(e.target.value) }))}
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

          <div className="flex gap-2">
            <Button type="button" className="flex-1" onClick={printReferral}>Print Referral</Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={exportPdf}>
              Export PDF
            </Button>
          </div>
        </SectionCard>

      </section>

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(SURGICAL_PROCEDURE_LIBRARY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      if (!Array.isArray(parsed)) return;

      const normalizedStored = parsed
        .map((item) => normalizeDetail(String(item)))
        .filter((item) => item.trim().length > 0);

      if (normalizedStored.length === 0) return;
      setLibraryItems((prev) => Array.from(new Set([...prev, ...normalizedStored])));
    } catch {
      // Ignore malformed local storage values.
    }
  }, []);

  const addProcedureToDraft = () => {
    const procedure = normalizeDetail(selectedProcedure.trim());
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
    const procedure = normalizeDetail(newProcedure.trim());
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
            {libraryItems.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={newProcedure}
          onChange={(e) => setNewProcedure(normalizeDetail(e.target.value))}
          placeholder="Add new surgical procedure"
          className="max-w-sm"
        />
        <Button type="button" variant="outline" onClick={addNewProcedureToLibrary}>
          Add New Surgical Procedure
        </Button>
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
                  onChange={(e) => setEditingFinding(normalizeDetail(e.target.value))}
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
  const [reportAttached, setReportAttached] = useState(false);
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
    return Array.from(uniqueByName.values());
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
      setReportAttached(false);
      return;
    }

    const next: Record<string, string> = {};
    selectedTest.parameters.forEach((parameter) => {
      next[parameter.id] = "";
    });
    setResultsByParameter(next);
    setReportAttached(false);
  }, [selectedTest]);

  const buildInvestigationRecord = (): InvestigationRecord | null => {
    if (!selectedTest) return;
    return {
      id: createId(),
      testId: selectedTest.id,
      testName: selectedTest.name,
      reportAttached,
      parameters: selectedTest.parameters.map((parameter) => ({
        ...parameter,
        result: reportAttached ? "" : (resultsByParameter[parameter.id] ?? "").trim(),
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
      setReportAttached(false);
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

  const updateReportAttached = (id: string, checked: boolean) => {
    onChange(
      value.map((item) =>
        item.id === id
          ? {
              ...item,
              reportAttached: checked,
            }
          : item,
      ),
    );
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

            <div className="flex items-center gap-2 rounded-xl border border-border/70 p-3">
              <Checkbox
                checked={reportAttached}
                onCheckedChange={(checked) => setReportAttached(Boolean(checked))}
              />
              <p className="text-sm text-foreground">Report attached</p>
            </div>

            {queuedInvestigations.length > 0 && (
              <div className="space-y-2 rounded-xl border border-border/70 p-3">
                <p className="text-xs font-medium text-muted-foreground">Queued tests ({queuedInvestigations.length})</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {queuedInvestigations.map((item) => (
                    <p key={item.id}>{item.testName}{item.reportAttached ? " (Report attached)" : ""}</p>
                  ))}
                </div>
              </div>
            )}

            {selectedTest && (
              <div className="space-y-2 rounded-xl border border-border/70 p-3">
                <p className="text-xs font-medium text-muted-foreground">Parameters</p>
                {reportAttached && (
                  <p className="text-xs text-muted-foreground">
                    Manual parameter entry skipped because report is attached.
                  </p>
                )}
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
                        disabled={reportAttached}
                        onChange={(e) =>
                          setResultsByParameter((prev) => ({
                            ...prev,
                            [parameter.id]: normalizeDetail(e.target.value),
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
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="font-medium text-foreground">{investigation.testName}</p>
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
              ) : (
                <label className="mb-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Checkbox
                    checked={investigation.reportAttached}
                    onCheckedChange={(checked) => updateReportAttached(investigation.id, Boolean(checked))}
                  />
                  Report attached
                </label>
              )}
              {investigation.reportAttached && investigation.testId !== ALL_REPORTS_ATTACHED_TEST_ID && (
                <p className="mb-1 text-xs text-muted-foreground">Report attached</p>
              )}
              <div className="space-y-1 text-muted-foreground">
                {investigation.parameters
                  .filter((parameter) => parameter.result.trim().length > 0)
                  .map((parameter) => (
                    <p key={parameter.id}>
                      {parameter.name}: {parameter.result}
                      {parameter.unit ? ` ${parameter.unit}` : ""}
                    </p>
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
}: {
  title: string;
  allItems: string[];
  value: string[];
  onChange: (next: string[]) => void;
  persistKey?: string;
  addLabel?: string;
}) {
  const [term, setTerm] = useState("");
  const [customItem, setCustomItem] = useState("");
  const [storedItems, setStoredItems] = useState<string[]>([]);

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
    () => Array.from(new Set([...allItems, ...storedItems])),
    [allItems, storedItems],
  );

  const normalized = term.trim().toLowerCase();
  const visibleItems = mergedItems.filter((item) => item.toLowerCase().includes(normalized));

  const toggle = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((v) => v !== item));
      return;
    }
    onChange([...value, item]);
  };

  const addCustomItem = () => {
    const next = normalizeDetail(customItem.trim());
    if (!next) return;
    if (!value.includes(next)) onChange([...value, next]);

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
      <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} />
      {addLabel && (
        <div className="flex items-center gap-2">
          <Input
            value={customItem}
            onChange={(e) => setCustomItem(normalizeDetail(e.target.value))}
            placeholder="Enter new item"
          />
          <Button type="button" variant="secondary" className="shrink-0" onClick={addCustomItem}>
            {addLabel}
          </Button>
        </div>
      )}
      <div className="max-h-40 space-y-1 overflow-auto pr-1">
        {visibleItems.map((item) => (
          <div key={item} className="flex items-center gap-2">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg bg-muted/40 px-2 py-1 text-left text-xs hover:bg-muted"
              onClick={() => toggle(item)}
            >
              <span>{item}</span>
              {value.includes(item) ? <span className="text-primary">Selected</span> : <span className="text-muted-foreground">Add</span>}
            </button>
            {persistKey && storedItems.includes(item) && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => deleteCustomDiagnosis(item)}
              >
                Delete
              </Button>
            )}
          </div>
        ))}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((item) => (
            <Badge key={item} variant="outline" className="cursor-pointer" onClick={() => toggle(item)}>
              {item}
            </Badge>
          ))}
        </div>
      )}
    </div>
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
  doctorName,
}: {
  name: string;
  age: string;
  gender: string;
  admissionDate: string;
  dischargeDate: string;
  doctorName: string;
}) {
  return (
    <div className="neo-inset rounded-2xl p-3 text-xs text-muted-foreground">
      <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldAlert className="size-4 text-primary" /> PATIENT DETAILS
      </p>
      <div className="grid gap-1 sm:grid-cols-2">
        <p>PATIENT NAME: <span className="font-medium text-foreground">{name}</span></p>
        <p>AGE/SEX: <span className="font-medium text-foreground">{age} / {gender}</span></p>
        <p>ADMISSION DATE: <span className="font-medium text-foreground">{formatDateDMY(admissionDate) || "-"}</span></p>
        <p>DISCHARGE DATE: <span className="font-medium text-foreground">{formatDateDMY(dischargeDate) || "-"}</span></p>
      </div>
      <p className="mt-1">DOCTOR NAME: <span className="font-medium text-foreground">{doctorName || "-"}</span></p>
    </div>
  );
}
