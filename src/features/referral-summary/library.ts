import type { SmartTemplate } from "@/features/referral-summary/types";

export const DIAGNOSIS_LIBRARY = [
  "Pneumonia",
  "Dengue Fever",
  "Typhoid",
  "Urinary Tract Infection",
  "Hypertension",
  "Type 2 Diabetes Mellitus",
  "Acute Appendicitis",
  "Cholelithiasis - Acute",
  "Cholelithiasis - Chronic",
  "Chronic Kidney Disease",
];

export const COMPLAINTS_LIBRARY = [
  "Fever",
  "Pain Abdomen",
  "Vomiting",
  "Breathlessness",
  "Chest pain",
  "Headache",
  "Burning micturition",
  "Cold and Cough",
  "Loss of appetite",
];

export const TREATMENT_LIBRARY = [
  "IV fluids",
  "IV antibiotics",
  "Analgesics and antipyretics",
  "Nebulization and oxygen support",
  "Wound care and dressing",
];

export const SURGICAL_PROCEDURE_LIBRARY = [
  "Laparoscopic Appendectomy",
  "Laparoscopic Cholecystectomy",
  "Exploratory Laparotomy",
  "Incision and Drainage",
  "Hernia Repair",
  "LSCS",
  "Debridement",
];

export type InvestigationParameterTemplate = {
  id: string;
  name: string;
  unit?: string;
  normalRange?: string;
};

export type InvestigationTestTemplate = {
  id: string;
  name: string;
  parameters: InvestigationParameterTemplate[];
};

export const INVESTIGATION_TEST_LIBRARY: InvestigationTestTemplate[] = [
  {
    id: "cbc",
    name: "Complete Blood Count (CBC)",
    parameters: [
      { id: "hb", name: "Haemoglobin (Hb)", unit: "g/dL", normalRange: "12-17" },
      { id: "wbc", name: "WBC Count (TLC)", unit: "/uL", normalRange: "4000-11000" },
      { id: "platelet", name: "Platelet Count", unit: "/uL", normalRange: "150000-400000" },
      { id: "esr", name: "ESR", unit: "mm/hr", normalRange: "0-20" },
    ],
  },
  {
    id: "lft",
    name: "Liver Function Test (LFT)",
    parameters: [
      { id: "bilirubin_total", name: "Total Bilirubin", unit: "mg/dL", normalRange: "0.1-1.2" },
      { id: "sgot", name: "SGOT (AST)", unit: "U/L", normalRange: "8-45" },
      { id: "sgpt", name: "SGPT (ALT)", unit: "U/L", normalRange: "7-56" },
      { id: "alp", name: "Alkaline Phosphatase", unit: "U/L", normalRange: "44-147" },
    ],
  },
  {
    id: "rft",
    name: "Kidney Function Test (KFT/RFT)",
    parameters: [
      { id: "urea", name: "Blood Urea", unit: "mg/dL", normalRange: "15-40" },
      { id: "creatinine", name: "Serum Creatinine", unit: "mg/dL", normalRange: "0.7-1.3" },
      { id: "sodium", name: "Sodium", unit: "mEq/L", normalRange: "136-145" },
      { id: "potassium", name: "Potassium", unit: "mEq/L", normalRange: "3.5-5" },
    ],
  },
  {
    id: "crp",
    name: "CRP",
    parameters: [{ id: "crp", name: "CRP", unit: "mg/L", normalRange: "< 6" }],
  },
  {
    id: "hba1c",
    name: "HbA1c",
    parameters: [{ id: "hba1c", name: "HbA1c", unit: "%", normalRange: "< 5.7" }],
  },
  {
    id: "urine_routine",
    name: "Urine Routine & Microscopy",
    parameters: [
      { id: "urine_ph", name: "pH", normalRange: "4.6-8" },
      { id: "pus_cells", name: "Pus Cells", unit: "/hpf", normalRange: "0-5" },
      { id: "urine_rbc", name: "RBC", unit: "/hpf", normalRange: "0-2" },
      { id: "urine_protein", name: "Protein", normalRange: "Nil" },
    ],
  },
  {
    id: "ecg",
    name: "ECG",
    parameters: [
      { id: "heart_rate", name: "Heart Rate", unit: "bpm", normalRange: "60-100" },
      { id: "rhythm", name: "Rhythm" },
      { id: "st_t_changes", name: "ST-T Changes" },
      { id: "impression", name: "Impression" },
    ],
  },
  {
    id: "chest_xray",
    name: "X-ray",
    parameters: [
      { id: "xray_finding", name: "Finding" },
      { id: "xray_impression", name: "Impression" },
    ],
  },
  {
    id: "usg_abdomen",
    name: "Ultrasound",
    parameters: [
      { id: "liver", name: "Liver" },
      { id: "gallbladder", name: "Gallbladder" },
      { id: "kidneys", name: "Kidneys" },
      { id: "usg_impression", name: "Impression" },
    ],
  },
  {
    id: "ct_abdomen",
    name: "CECT",
    parameters: [
      { id: "ct_finding", name: "Finding" },
      { id: "ct_impression", name: "Impression" },
    ],
  },
  {
    id: "mri",
    name: "MRI",
    parameters: [
      { id: "mri_finding", name: "Finding" },
      { id: "mri_impression", name: "Impression" },
    ],
  },
];

export const DIET_LIBRARY = [
  "High Protein Diet",
  "Low Salt Diet",
  "Diabetic Diet",
  "Soft Diet",
  "Liquid Diet",
  "Renal Diet",
  "Liver Diet",
  "High Fibre Diet",
  "Low Fat Diet",
  "Protein Supplement",
];

export const DOS_LIBRARY = [
  "Walk daily for 20-30 minutes",
  "Drink 2-3 liters water daily",
  "Take medicines regularly",
  "Maintain wound hygiene",
  "Deep breathing exercise",
  "Monitor BP and sugar at home",
  "Follow diabetic diet",
  "Attend scheduled follow-up",
];

export const DONTS_LIBRARY = [
  "Lift heavy weight",
  "Smoke",
  "Alcohol",
  "Spicy or oily food",
  "Outside food",
  "Driving until review",
  "Skip medicines",
  "Self-medication",
];

export const EMERGENCY_WARNING_LIBRARY = [
  "Bleeding",
  "High fever",
  "Chest pain",
  "Repeated vomiting",
  "Breathing difficulty",
  "Loss of consciousness",
  "Severe pain",
  "Sudden swelling",
];

export const REFERRAL_TEMPLATES: SmartTemplate[] = [
  {
    id: "normal-delivery",
    label: "Normal Delivery",
    diagnosis: ["Postpartum status after normal vaginal delivery"],
    treatmentGiven: ["Postnatal monitoring", "Iron and calcium supplementation"],
    dietAdvice: ["High Protein Diet", "High Fibre Diet"],
    dos: ["Maintain hygiene", "Drink 2-3 liters water daily"],
    donts: ["Lift heavy weight"],
    emergencyWarnings: ["High fever", "Bleeding"],
  },
  {
    id: "lscs",
    label: "LSCS",
    diagnosis: ["Post-operative LSCS status"],
    treatmentGiven: ["Post-op pain control", "Wound care and dressing"],
    dietAdvice: ["High Protein Diet", "Soft Diet"],
    dos: ["Walk daily for 20-30 minutes", "Maintain wound hygiene"],
    donts: ["Lift heavy weight", "Driving until review"],
    emergencyWarnings: ["Bleeding", "High fever", "Severe pain"],
  },
  {
    id: "appendectomy",
    label: "Appendectomy",
    diagnosis: ["Acute appendicitis status post appendectomy"],
    treatmentGiven: ["IV antibiotics", "Analgesics and antipyretics"],
    dietAdvice: ["Soft Diet", "Low Fat Diet"],
    dos: ["Maintain wound hygiene", "Attend scheduled follow-up"],
    donts: ["Outside food", "Lift heavy weight"],
    emergencyWarnings: ["High fever", "Severe pain", "Repeated vomiting"],
  },
  {
    id: "diabetes-htn",
    label: "Diabetic + Hypertension",
    diagnosis: ["Type 2 Diabetes Mellitus", "Hypertension"],
    treatmentGiven: ["Insulin sliding scale monitoring", "BP monitoring"],
    dietAdvice: ["Diabetic Diet", "Low Salt Diet"],
    dos: ["Monitor BP and sugar at home", "Take medicines regularly"],
    donts: ["Skip medicines", "Self-medication"],
    emergencyWarnings: ["Chest pain", "Loss of consciousness"],
  },
];
