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
  morning: false,
  afternoon: true,
  night: false,
  tds: false,
  hs: false,
  sos: false,
  foodTiming: "none",
  durationDays: 0,
  specialInstruction: "",
};

export const createEmptyDraft = (): ReferralDraft => ({
  patientId: "",
  templateId: "",
  summaryMode: "discharge_summary",
  admissionDate: "",
  dischargeDate: "",
  doctorName: "DR ARCHANA TIWARI PANDEY, MBBS (HONS) DGO",
  doctors: [],
  chiefComplaints: [],
  patientHistory: "",
  allergies: "",
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
  dischargedWithoutConsent: false,
  patientConditionDuringDischarge: "",
  provisionalDiagnosisText: "",
  followUpDays: 7,
  customFollowUpDays: 0,
  medication: [{ ...EMPTY_MEDICATION_ROW }],
  savedMedicationEntries: [],
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
      doctorName: String(parsed.doctorName ?? "DR ARCHANA TIWARI PANDEY, MBBS (HONS) DGO").split(", CONSULTANT")[0],
      doctors: Array.isArray(parsed.doctors)
        ? parsed.doctors.filter((doctor): doctor is DoctorProfile => Boolean(doctor?.id && doctor?.name)).map((doctor) => {
            const isDefaultDoctor = doctor.name.toUpperCase().includes("ARCHANA TIWARI PANDEY");
            return isDefaultDoctor
              ? { id: "default-archana-tiwari-pandey", name: "DR ARCHANA TIWARI PANDEY, MBBS (HONS) DGO", degree: "", details: "" }
              : {
                  id: doctor.id,
                  name: doctor.name,
                  degree: doctor.degree ?? "",
                  details: doctor.details ?? "",
                };
          })
        : [],
      patientHistory: String(parsed.patientHistory ?? "").toUpperCase(),
      allergies: String(parsed.allergies ?? "").toUpperCase(),
      dischargedToHome: Boolean(parsed.dischargedToHome),
      dischargedWithoutConsent: Boolean(parsed.dischargedWithoutConsent),
      patientConditionDuringDischarge: String(parsed.patientConditionDuringDischarge ?? "").toUpperCase(),
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
                    : item.foodTiming === "sos"
                      ? "none"
                      : (item.foodTiming ?? "none"),
              tds: Boolean(item.tds),
              hs: Boolean(item.hs),
              sos: item.foodTiming === "sos" ? true : Boolean(item.sos),
            }))
          : [{ ...EMPTY_MEDICATION_ROW, id: createId() }],
      savedMedicationEntries: Array.isArray(parsed.savedMedicationEntries)
        ? parsed.savedMedicationEntries.map((item) => ({
            ...item,
            medicineType: item.medicineType ?? "TAB",
            foodTiming:
              item.foodTiming === "before_food"
                ? "empty_stomach"
                : item.foodTiming === "after_food"
                  ? "after_meal"
                  : item.foodTiming === "sos"
                    ? "none"
                    : (item.foodTiming ?? "none"),
            tds: Boolean(item.tds),
            hs: Boolean(item.hs),
            sos: item.foodTiming === "sos" ? true : Boolean(item.sos),
          }))
        : [],
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
