export type ReferralUrgency = "routine" | "priority" | "emergency";
export type SummaryMode = "discharge_summary" | "referral_summary";

export type FollowUpPreset = 3 | 5 | 7 | 10 | 15 | 30;

export type MedicationRow = {
  id: string;
  medicineName: string;
  medicineType?: "TAB" | "CAPSULE" | "SYP" | "INJ" | "IV" | "FLUID" | "OINTMENT";
  strength: string;
  dose: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  tds?: boolean;
  hs?: boolean;
  sos?: boolean;
  foodTiming:
    | "none"
    | "empty_stomach"
    | "after_meal"
    | "before_breakfast"
    | "after_breakfast"
    | "after_lunch"
    | "after_lunch_2";
  durationDays: number;
  specialInstruction: string;
};

export type InvestigationParameter = {
  id: string;
  name: string;
  unit?: string;
  normalRange?: string;
  result: string;
};

export type InvestigationRecord = {
  id: string;
  testId: string;
  testName: string;
  reportAttached: boolean;
  parameters: InvestigationParameter[];
};

export type SurgicalProcedureEntry = {
  id: string;
  procedure: string;
  finding: string;
};

export type DoctorProfile = {
  id: string;
  name: string;
  degree: string;
  details: string;
};

export type ReferralDraft = {
  patientId: string;
  templateId: string;
  summaryMode: SummaryMode;
  admissionDate: string;
  dischargeDate: string;
  doctorName: string;
  doctors: DoctorProfile[];
  chiefComplaints: string[];
  patientHistory: string;
  allergies: string;
  diagnosis: string[];
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
  urgency: ReferralUrgency;
  transferMode: string;
  referralSummary: string;
  dischargedToHome: boolean;
  dischargedWithoutConsent: boolean;
  patientConditionDuringDischarge: string;
  provisionalDiagnosisText?: string;
  followUpDays: FollowUpPreset | 0;
  customFollowUpDays: number;
  medication: MedicationRow[];
  savedMedicationEntries: MedicationRow[];
  updatedAt: string;
};

export type DischargeSummaryQueueItem = {
  id: string;
  patientId: string;
  patientName: string;
  summaryMode: SummaryMode;
  preparedAt: string;
  status: "draft" | "saved";
  summaryId: string;
};

export type SmartTemplate = {
  id: string;
  label: string;
  diagnosis: string[];
  treatmentGiven: string[];
  dietAdvice: string[];
  dos: string[];
  donts: string[];
  emergencyWarnings: string[];
};
