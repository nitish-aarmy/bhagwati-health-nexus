export const HOSPITAL_INFO = {
  name: "Bhagwati Hospital",
  tagline: "Pathology & Diagnostic Centre",
  address: "Daltonganj, Jharkhand - 822101",
  phone: "+91-XXXXXXXXXX",
};

export const DOCTORS = [
  { id: "d1", name: "Dr. Sushil Pander" },
  { id: "d2", name: "Dr. Gautam" },
  { id: "d3", name: "Dr. Ram Kinker Trivedi" },
  { id: "d4", name: "Dr. Archana Pandey" },
  { id: "d5", name: "Dr. Pranav" },
];

export interface TestSubCategory {
  id: string;
  name: string;
  unit?: string;
  normalRange?: string;
}

export interface TestCategory {
  id: string;
  name: string;
  type: "blood" | "urine" | "other";
  subcategories: TestSubCategory[];
}

export const TEST_CATEGORIES: TestCategory[] = [
  // BLOOD TESTS
  {
    id: "cbc",
    name: "Complete Blood Count (CBC)",
    type: "blood",
    subcategories: [
      { id: "hb", name: "Haemoglobin (Hb)", unit: "g/dL", normalRange: "12-17" },
      { id: "rbc", name: "RBC Count", unit: "million/μL", normalRange: "4.5-5.5" },
      { id: "wbc", name: "WBC Count (TLC)", unit: "/μL", normalRange: "4000-11000" },
      { id: "platelet", name: "Platelet Count", unit: "/μL", normalRange: "150000-400000" },
      { id: "pcv", name: "PCV / Hematocrit", unit: "%", normalRange: "36-54" },
      { id: "mcv", name: "MCV", unit: "fL", normalRange: "80-100" },
      { id: "mch", name: "MCH", unit: "pg", normalRange: "27-33" },
      { id: "mchc", name: "MCHC", unit: "g/dL", normalRange: "32-36" },
      { id: "neutrophils", name: "Neutrophils", unit: "%", normalRange: "40-70" },
      { id: "lymphocytes", name: "Lymphocytes", unit: "%", normalRange: "20-40" },
      { id: "monocytes", name: "Monocytes", unit: "%", normalRange: "2-8" },
      { id: "eosinophils", name: "Eosinophils", unit: "%", normalRange: "1-4" },
      { id: "basophils", name: "Basophils", unit: "%", normalRange: "0-1" },
      { id: "esr", name: "ESR", unit: "mm/hr", normalRange: "0-20" },
    ],
  },
  {
    id: "blood_sugar",
    name: "Blood Sugar",
    type: "blood",
    subcategories: [
      { id: "fbs", name: "Fasting Blood Sugar", unit: "mg/dL", normalRange: "70-100" },
      { id: "ppbs", name: "Post Prandial Blood Sugar", unit: "mg/dL", normalRange: "< 140" },
      { id: "rbs", name: "Random Blood Sugar", unit: "mg/dL", normalRange: "70-140" },
      { id: "hba1c", name: "HbA1c", unit: "%", normalRange: "< 5.7" },
      { id: "gtt", name: "Glucose Tolerance Test (GTT)", unit: "mg/dL", normalRange: "Varies" },
    ],
  },
  {
    id: "lipid",
    name: "Lipid Profile",
    type: "blood",
    subcategories: [
      { id: "total_chol", name: "Total Cholesterol", unit: "mg/dL", normalRange: "< 200" },
      { id: "hdl", name: "HDL Cholesterol", unit: "mg/dL", normalRange: "> 40" },
      { id: "ldl", name: "LDL Cholesterol", unit: "mg/dL", normalRange: "< 100" },
      { id: "vldl", name: "VLDL Cholesterol", unit: "mg/dL", normalRange: "< 30" },
      { id: "triglycerides", name: "Triglycerides", unit: "mg/dL", normalRange: "< 150" },
    ],
  },
  {
    id: "lft",
    name: "Liver Function Test (LFT)",
    type: "blood",
    subcategories: [
      { id: "bilirubin_total", name: "Total Bilirubin", unit: "mg/dL", normalRange: "0.1-1.2" },
      { id: "bilirubin_direct", name: "Direct Bilirubin", unit: "mg/dL", normalRange: "0-0.3" },
      { id: "bilirubin_indirect", name: "Indirect Bilirubin", unit: "mg/dL", normalRange: "0.1-0.9" },
      { id: "sgot", name: "SGOT (AST)", unit: "U/L", normalRange: "8-45" },
      { id: "sgpt", name: "SGPT (ALT)", unit: "U/L", normalRange: "7-56" },
      { id: "alp", name: "Alkaline Phosphatase", unit: "U/L", normalRange: "44-147" },
      { id: "total_protein", name: "Total Protein", unit: "g/dL", normalRange: "6-8.3" },
      { id: "albumin", name: "Albumin", unit: "g/dL", normalRange: "3.5-5" },
      { id: "globulin", name: "Globulin", unit: "g/dL", normalRange: "2-3.5" },
      { id: "ag_ratio", name: "A/G Ratio", unit: "", normalRange: "1.1-2.5" },
    ],
  },
  {
    id: "kft",
    name: "Kidney Function Test (KFT/RFT)",
    type: "blood",
    subcategories: [
      { id: "urea", name: "Blood Urea", unit: "mg/dL", normalRange: "15-40" },
      { id: "bun", name: "BUN", unit: "mg/dL", normalRange: "7-20" },
      { id: "creatinine", name: "Serum Creatinine", unit: "mg/dL", normalRange: "0.7-1.3" },
      { id: "uric_acid", name: "Uric Acid", unit: "mg/dL", normalRange: "3.5-7.2" },
      { id: "sodium", name: "Sodium", unit: "mEq/L", normalRange: "136-145" },
      { id: "potassium", name: "Potassium", unit: "mEq/L", normalRange: "3.5-5" },
      { id: "chloride", name: "Chloride", unit: "mEq/L", normalRange: "98-106" },
      { id: "calcium", name: "Calcium", unit: "mg/dL", normalRange: "8.5-10.5" },
      { id: "phosphorus", name: "Phosphorus", unit: "mg/dL", normalRange: "2.5-4.5" },
    ],
  },
  {
    id: "thyroid",
    name: "Thyroid Profile",
    type: "blood",
    subcategories: [
      { id: "t3", name: "T3", unit: "ng/dL", normalRange: "80-200" },
      { id: "t4", name: "T4", unit: "μg/dL", normalRange: "5.1-14.1" },
      { id: "tsh", name: "TSH", unit: "mIU/L", normalRange: "0.4-4.0" },
      { id: "ft3", name: "Free T3", unit: "pg/mL", normalRange: "2.3-4.2" },
      { id: "ft4", name: "Free T4", unit: "ng/dL", normalRange: "0.8-1.8" },
    ],
  },
  {
    id: "blood_group",
    name: "Blood Grouping & Typing",
    type: "blood",
    subcategories: [
      { id: "abo", name: "ABO Group", unit: "", normalRange: "A/B/AB/O" },
      { id: "rh", name: "Rh Factor", unit: "", normalRange: "Positive/Negative" },
    ],
  },
  {
    id: "widal",
    name: "Widal Test",
    type: "blood",
    subcategories: [
      { id: "to", name: "S. Typhi O", unit: "", normalRange: "< 1:80" },
      { id: "th", name: "S. Typhi H", unit: "", normalRange: "< 1:80" },
      { id: "ato", name: "S. Paratyphi AO", unit: "", normalRange: "< 1:80" },
      { id: "ath", name: "S. Paratyphi AH", unit: "", normalRange: "< 1:80" },
      { id: "bto", name: "S. Paratyphi BO", unit: "", normalRange: "< 1:80" },
      { id: "bth", name: "S. Paratyphi BH", unit: "", normalRange: "< 1:80" },
    ],
  },
  {
    id: "coagulation",
    name: "Coagulation Profile",
    type: "blood",
    subcategories: [
      { id: "pt", name: "Prothrombin Time (PT)", unit: "sec", normalRange: "11-13.5" },
      { id: "inr", name: "INR", unit: "", normalRange: "0.8-1.2" },
      { id: "aptt", name: "aPTT", unit: "sec", normalRange: "25-35" },
      { id: "bt", name: "Bleeding Time", unit: "min", normalRange: "1-6" },
      { id: "ct", name: "Clotting Time", unit: "min", normalRange: "4-9" },
    ],
  },
  {
    id: "serology",
    name: "Serology / Immunology",
    type: "blood",
    subcategories: [
      { id: "hiv", name: "HIV I & II", unit: "", normalRange: "Non-Reactive" },
      { id: "hbsag", name: "HBsAg (Hepatitis B)", unit: "", normalRange: "Non-Reactive" },
      { id: "hcv", name: "HCV (Hepatitis C)", unit: "", normalRange: "Non-Reactive" },
      { id: "vdrl", name: "VDRL", unit: "", normalRange: "Non-Reactive" },
      { id: "ra_factor", name: "RA Factor", unit: "IU/mL", normalRange: "< 14" },
      { id: "aso", name: "ASO Titre", unit: "IU/mL", normalRange: "< 200" },
      { id: "crp", name: "CRP", unit: "mg/L", normalRange: "< 6" },
      { id: "dengue_ns1", name: "Dengue NS1 Antigen", unit: "", normalRange: "Negative" },
      { id: "dengue_igg_igm", name: "Dengue IgG/IgM", unit: "", normalRange: "Negative" },
      { id: "malaria", name: "Malaria Antigen (Rapid)", unit: "", normalRange: "Negative" },
    ],
  },
  // URINE TESTS
  {
    id: "urine_routine",
    name: "Urine Routine & Microscopy",
    type: "urine",
    subcategories: [
      { id: "color", name: "Colour", unit: "", normalRange: "Pale Yellow" },
      { id: "appearance", name: "Appearance", unit: "", normalRange: "Clear" },
      { id: "ph", name: "pH", unit: "", normalRange: "4.6-8" },
      { id: "sp_gravity", name: "Specific Gravity", unit: "", normalRange: "1.005-1.030" },
      { id: "protein_u", name: "Protein", unit: "", normalRange: "Nil" },
      { id: "glucose_u", name: "Glucose", unit: "", normalRange: "Nil" },
      { id: "ketone", name: "Ketone Bodies", unit: "", normalRange: "Nil" },
      { id: "blood_u", name: "Blood", unit: "", normalRange: "Nil" },
      { id: "bilirubin_u", name: "Bilirubin", unit: "", normalRange: "Nil" },
      { id: "urobilinogen", name: "Urobilinogen", unit: "mg/dL", normalRange: "0.1-1" },
      { id: "nitrite", name: "Nitrite", unit: "", normalRange: "Negative" },
      { id: "leukocyte_esterase", name: "Leukocyte Esterase", unit: "", normalRange: "Negative" },
      { id: "pus_cells", name: "Pus Cells", unit: "/hpf", normalRange: "0-5" },
      { id: "rbc_u", name: "RBC", unit: "/hpf", normalRange: "0-2" },
      { id: "epithelial", name: "Epithelial Cells", unit: "/hpf", normalRange: "Few" },
      { id: "casts", name: "Casts", unit: "", normalRange: "Nil" },
      { id: "crystals", name: "Crystals", unit: "", normalRange: "Nil" },
      { id: "bacteria", name: "Bacteria", unit: "", normalRange: "Nil" },
    ],
  },
  {
    id: "urine_culture",
    name: "Urine Culture & Sensitivity",
    type: "urine",
    subcategories: [
      { id: "organism", name: "Organism Isolated", unit: "", normalRange: "No Growth" },
      { id: "colony_count", name: "Colony Count", unit: "CFU/mL", normalRange: "< 10,000" },
      { id: "sensitivity", name: "Antibiotic Sensitivity", unit: "", normalRange: "Report" },
    ],
  },
  {
    id: "urine_pregnancy",
    name: "Urine Pregnancy Test (UPT)",
    type: "urine",
    subcategories: [
      { id: "upt", name: "hCG (Urine)", unit: "", normalRange: "Negative" },
    ],
  },
  {
    id: "urine_microalbumin",
    name: "Urine Microalbumin",
    type: "urine",
    subcategories: [
      { id: "microalbumin", name: "Microalbumin", unit: "mg/L", normalRange: "< 30" },
      { id: "acr", name: "Albumin/Creatinine Ratio", unit: "mg/g", normalRange: "< 30" },
    ],
  },
  {
    id: "urine_24hr",
    name: "24-Hour Urine",
    type: "urine",
    subcategories: [
      { id: "volume_24", name: "Volume", unit: "mL/24hr", normalRange: "800-2000" },
      { id: "protein_24", name: "Protein", unit: "mg/24hr", normalRange: "< 150" },
      { id: "creatinine_24", name: "Creatinine", unit: "mg/24hr", normalRange: "800-2000" },
      { id: "calcium_24", name: "Calcium", unit: "mg/24hr", normalRange: "100-300" },
      { id: "uric_acid_24", name: "Uric Acid", unit: "mg/24hr", normalRange: "250-750" },
    ],
  },
  {
    id: "urine_sugar",
    name: "Urine Sugar (Benedict's Test)",
    type: "urine",
    subcategories: [
      { id: "urine_sugar_val", name: "Urine Sugar", unit: "", normalRange: "Nil" },
    ],
  },
  // OTHER TESTS
  {
    id: "stool",
    name: "Stool Examination",
    type: "other",
    subcategories: [
      { id: "stool_color", name: "Colour", unit: "", normalRange: "Brown" },
      { id: "stool_consistency", name: "Consistency", unit: "", normalRange: "Formed" },
      { id: "stool_occult", name: "Occult Blood", unit: "", normalRange: "Negative" },
      { id: "stool_ova", name: "Ova / Cyst", unit: "", normalRange: "Not Seen" },
      { id: "stool_rbc", name: "RBC", unit: "", normalRange: "Nil" },
      { id: "stool_pus", name: "Pus Cells", unit: "", normalRange: "Nil" },
    ],
  },
  {
    id: "semen",
    name: "Semen Analysis",
    type: "other",
    subcategories: [
      { id: "semen_volume", name: "Volume", unit: "mL", normalRange: "> 1.5" },
      { id: "sperm_count", name: "Sperm Count", unit: "million/mL", normalRange: "> 15" },
      { id: "motility", name: "Motility", unit: "%", normalRange: "> 40" },
      { id: "morphology", name: "Morphology (Normal Forms)", unit: "%", normalRange: "> 4" },
    ],
  },
];

export interface Patient {
  id: string;
  patientId?: string;
  name: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  age: number;
  dob?: string;
  gender: "Male" | "Female" | "Other";
  phone: string;
  email?: string;
  guardianName?: string;
  guardianRelation?: string;
  addressLine1?: string;
  addressLine2?: string;
  locality?: string;
  landmark?: string;
  city?: string;
  district?: string;
  pincode?: string;
  state?: string;
  address?: string;
  createdAt: string;
}

export interface TestResult {
  subCategoryId: string;
  value: string;
}

export interface TestReport {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  testCategoryId: string;
  testCategoryName: string;
  testType: "blood" | "urine" | "other";
  results: TestResult[];
  createdAt: string;
  status: "pending" | "completed";
}
