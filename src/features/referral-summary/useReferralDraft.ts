import { useEffect, useMemo, useState } from "react";

import type { DoctorProfile, InvestigationRecord, MedicationRow, ReferralDraft } from "@/features/referral-summary/types";

function createId() {
  // Avoid non-deterministic ID generation during SSR to prevent hydration mismatches.
  if (typeof window === "undefined") return "";
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const EMPTY_MEDICATION_ROW: MedicationRow = {
  id: "empty-medication-row",
  medicineName: "",
  medicineType: "TAB",
  strength: "",
  dose: "",
  morning: true,
  afternoon: false,
  night: true,
  tds: false,
  hs: false,
  foodTiming: "after_meal",
  durationDays: 5,
  specialInstruction: "",
};

export const createEmptyDraft = (): ReferralDraft => ({
  patientId: "",
  templateId: "",
  summaryMode: "discharge_summary",
  admissionDate: "",
  dischargeDate: "",
  doctorName: "DR ARCHANA TIWARI PANDEY, MBBS (HONS) DGO, CONSULTANT GYNECOLOGIST & OBSTETRICIAN",
  doctors: [],
  chiefComplaints: [],
  patientHistory: "",
  diagnosis: [],
  treatmentGiven: [],
  investigations: [],
  surgicalProcedures: [],
  dietAdvice: [],
  dos: [],
  donts: [],
  emergencyWarnings: [],
  doctorNotes: "",
  referralReason: "",
  referredHospital: "",
  referredDepartment: "",
  referredDoctor: "",
  urgency: "routine",
  transferMode: "Ambulance",
  referralSummary: "",
  dischargedToHome: false,
  patientStatusDuringDischarge: "",
  provisionalDiagnosisText: "",
  followUpDays: 7,
  customFollowUpDays: 0,
  medication: [{ ...EMPTY_MEDICATION_ROW }],
  // Leave empty so server/client render the same initial value; client will populate when saving.
  updatedAt: "",
});

const STORAGE_NAMESPACE = "bhagwati:referral-draft";

function readDraftFromStorage(key: string): ReferralDraft | null {
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ReferralDraft>;
    const legacyInvestigationSummary = (parsed as unknown as { investigationSummary?: string[] }).investigationSummary;
    const migratedInvestigations = Array.isArray(legacyInvestigationSummary)
      ? legacyInvestigationSummary.map((testName) => ({
          id: createId(),
          testId: testName.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
          testName,
          parameters: [],
        }))
      : [];

    const normalizedInvestigations: InvestigationRecord[] = Array.isArray(parsed.investigations)
      ? parsed.investigations.map((entry) => ({
          ...entry,
          reportAttached: Boolean(entry.reportAttached),
          parameters: Array.isArray(entry.parameters)
            ? entry.parameters.map((parameter) => ({
                ...parameter,
                result: parameter.result ?? "",
              }))
            : [],
        }))
      : migratedInvestigations.map((entry) => ({
          ...entry,
          reportAttached: false,
        }));

    const normalized: ReferralDraft = {
      ...createEmptyDraft(),
      ...parsed,
      summaryMode:
        parsed.summaryMode === "referral_summary" || parsed.summaryMode === "discharge_summary"
          ? parsed.summaryMode
          : "discharge_summary",
      admissionDate: parsed.admissionDate ?? "",
      dischargeDate: parsed.dischargeDate ?? "",
      doctorName: parsed.doctorName ?? "DR ARCHANA TIWARI PANDEY, MBBS (HONS) DGO, CONSULTANT GYNECOLOGIST & OBSTETRICIAN",
      doctors: Array.isArray(parsed.doctors)
        ? parsed.doctors.filter((doctor): doctor is DoctorProfile => Boolean(doctor?.id && doctor?.name)).map((doctor) => ({
            id: doctor.id,
            name: doctor.name,
            degree: doctor.degree ?? "",
            details: doctor.details ?? "",
          }))
        : [],
      patientHistory: String(parsed.patientHistory ?? "").toUpperCase(),
      dischargedToHome: Boolean(parsed.dischargedToHome),
      patientStatusDuringDischarge: String(parsed.patientStatusDuringDischarge ?? "").toUpperCase(),
      investigations: normalizedInvestigations,
      surgicalProcedures: Array.isArray(parsed.surgicalProcedures)
        ? parsed.surgicalProcedures.map((entry) => ({
            id: entry.id,
            procedure: entry.procedure ?? "",
            finding: entry.finding ?? "",
          }))
        : [],
      medication:
        Array.isArray(parsed.medication) && parsed.medication.length > 0
          ? parsed.medication.map((item) => ({
              ...item,
              medicineType: item.medicineType ?? "TAB",
              foodTiming:
                item.foodTiming === "before_food"
                  ? "empty_stomach"
                  : item.foodTiming === "after_food"
                    ? "after_meal"
                    : (item.foodTiming ?? "after_meal"),
              tds: Boolean(item.tds),
              hs: Boolean(item.hs),
            }))
          : [{ ...EMPTY_MEDICATION_ROW, id: createId() }],
      provisionalDiagnosisText: String(parsed.provisionalDiagnosisText ?? "").toUpperCase(),
    };
    return normalized;
  } catch {
    return null;
  }
}

export function useReferralDraft(patientId: string) {
  const storageKey = useMemo(
    () => `${STORAGE_NAMESPACE}:${patientId || "new"}`,
    [patientId],
  );

  const [draft, setDraft] = useState<ReferralDraft>(createEmptyDraft);
  const [lastSavedAt, setLastSavedAt] = useState<string>("");

  useEffect(() => {
    if (!patientId) {
      setDraft((prev) => ({ ...createEmptyDraft(), patientId: "", templateId: prev.templateId }));
      setLastSavedAt("");
      return;
    }
    const fromStorage = readDraftFromStorage(storageKey);
    if (fromStorage) {
      setDraft(fromStorage);
      setLastSavedAt(fromStorage.updatedAt);
      return;
    }
    setDraft((prev) => ({ ...createEmptyDraft(), patientId, templateId: prev.templateId }));
    setLastSavedAt("");
  }, [patientId, storageKey]);

  useEffect(() => {
    if (!patientId) return;
    const interval = window.setInterval(() => {
      const next: ReferralDraft = { ...draft, patientId, updatedAt: new Date().toISOString() };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setLastSavedAt(next.updatedAt);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [draft, patientId, storageKey]);

  return {
    draft,
    setDraft,
    lastSavedAt,
  };
}
