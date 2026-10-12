import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { DOCTORS, TEST_CATEGORIES, Patient, TestReport, TestResult } from "@/lib/data";
import { getPatients, savePatient, saveReport, generateId } from "@/lib/store";
import { toast } from "@/hooks/use-toast";

export default function NewTest() {
  const navigate = useNavigate();
  const patients = getPatients();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Patient
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [newPatient, setNewPatient] = useState(false);
  const [patientForm, setPatientForm] = useState({
    name: "",
    age: "",
    gender: "Male" as "Male" | "Female" | "Other",
    phone: "",
    address: "",
  });

  // Test selection
  const [doctorId, setDoctorId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [testTypeFilter, setTestTypeFilter] = useState<"blood" | "urine" | "other">("blood");

  // Results
  const [results, setResults] = useState<Record<string, string>>({});

  const selectedCategory = TEST_CATEGORIES.find((c) => c.id === selectedCategoryId);
  const selectedDoctor = DOCTORS.find((d) => d.id === doctorId);
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  function handlePatientNext() {
    if (newPatient) {
      if (!patientForm.name || !patientForm.age || !patientForm.phone) {
        toast({ title: "Please fill all required patient fields", variant: "destructive" });
        return;
      }
      const p: Patient = {
        id: generateId(),
        name: patientForm.name,
        age: Number(patientForm.age),
        gender: patientForm.gender,
        phone: patientForm.phone,
        address: patientForm.address,
        createdAt: new Date().toISOString(),
      };
      savePatient(p);
      setSelectedPatientId(p.id);
    } else if (!selectedPatientId) {
      toast({ title: "Please select a patient", variant: "destructive" });
      return;
    }
    setStep(2);
  }

  function handleTestNext() {
    if (!doctorId || !selectedCategoryId) {
      toast({ title: "Please select doctor and test", variant: "destructive" });
      return;
    }
    setStep(3);
  }

  function handleSave(status: "pending" | "completed") {
    const patient = newPatient
      ? { id: selectedPatientId, name: patientForm.name }
      : patients.find((p) => p.id === selectedPatientId);

    if (!patient || !selectedCategory || !selectedDoctor) return;

    const testResults: TestResult[] = selectedCategory.subcategories.map((sub) => ({
      subCategoryId: sub.id,
      value: results[sub.id] || "",
    }));

    const report: TestReport = {
      id: generateId(),
      patientId: patient.id,
      patientName: patient.name,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      testCategoryId: selectedCategory.id,
      testCategoryName: selectedCategory.name,
      testType: selectedCategory.type,
      results: testResults,
      createdAt: new Date().toISOString(),
      status,
    };

    saveReport(report);
    toast({ title: `Report ${status === "completed" ? "saved" : "saved as pending"}!` });
    navigate("/reports");
  }

  const filteredCategories = TEST_CATEGORIES.filter((c) => c.type === testTypeFilter);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">New Test</h1>

        {/* Steps indicator */}
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-heading font-bold text-sm ${
                  step >= s ? "neo-pressed text-primary" : "neo-flat text-muted-foreground"
                }`}
              >
                {s}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {s === 1 ? "Patient" : s === 2 ? "Test" : "Results"}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Patient */}
        {step === 1 && (
          <div className="neo-flat p-6 space-y-4">
            <h2 className="font-heading font-semibold text-foreground">Patient Details</h2>

            <div className="flex gap-3">
              <button
                className={`neo-btn px-4 py-2 text-sm font-medium ${!newPatient ? "neo-pressed text-primary" : "text-muted-foreground"}`}
                onClick={() => setNewPatient(false)}
              >
                Existing Patient
              </button>
              <button
                className={`neo-btn px-4 py-2 text-sm font-medium ${newPatient ? "neo-pressed text-primary" : "text-muted-foreground"}`}
                onClick={() => setNewPatient(true)}
              >
                New Patient
              </button>
            </div>

            {!newPatient ? (
              <div className="space-y-3">
                {patients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No patients yet. Create a new one.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                          selectedPatientId === p.id
                            ? "neo-pressed text-primary font-medium"
                            : "neo-btn text-foreground"
                        }`}
                        onClick={() => setSelectedPatientId(p.id)}
                      >
                        {p.name} — {p.age}y, {p.gender}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  className="neo-input px-4 py-3 text-sm text-foreground"
                  placeholder="Patient Name *"
                  value={patientForm.name}
                  onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                />
                <input
                  className="neo-input px-4 py-3 text-sm text-foreground"
                  placeholder="Age *"
                  type="number"
                  value={patientForm.age}
                  onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                />
                <select
                  className="neo-input px-4 py-3 text-sm text-foreground"
                  value={patientForm.gender}
                  onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value as any })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <input
                  className="neo-input px-4 py-3 text-sm text-foreground"
                  placeholder="Phone *"
                  value={patientForm.phone}
                  onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                />
                <input
                  className="neo-input px-4 py-3 text-sm text-foreground col-span-full"
                  placeholder="Address"
                  value={patientForm.address}
                  onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
                />
              </div>
            )}

            <button
              className="neo-btn px-6 py-3 text-sm font-semibold text-primary"
              onClick={handlePatientNext}
            >
              Next →
            </button>
          </div>
        )}

        {/* Step 2: Test Selection */}
        {step === 2 && (
          <div className="neo-flat p-6 space-y-4">
            <h2 className="font-heading font-semibold text-foreground">Select Test</h2>

            {/* Doctor */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Referring Doctor</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DOCTORS.map((d) => (
                  <button
                    key={d.id}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      doctorId === d.id ? "neo-pressed text-primary" : "neo-btn text-muted-foreground"
                    }`}
                    onClick={() => setDoctorId(d.id)}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Test type filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Test Type</label>
              <div className="flex gap-2">
                {(["blood", "urine", "other"] as const).map((t) => (
                  <button
                    key={t}
                    className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                      testTypeFilter === t ? "neo-pressed text-primary" : "neo-btn text-muted-foreground"
                    }`}
                    onClick={() => { setTestTypeFilter(t); setSelectedCategoryId(""); }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="max-h-60 overflow-y-auto space-y-2">
              {filteredCategories.map((c) => (
                <button
                  key={c.id}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                    selectedCategoryId === c.id ? "neo-pressed text-primary font-medium" : "neo-btn text-foreground"
                  }`}
                  onClick={() => setSelectedCategoryId(c.id)}
                >
                  {c.name}
                  <span className="text-muted-foreground text-xs ml-2">({c.subcategories.length} params)</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button className="neo-btn px-6 py-3 text-sm font-semibold text-muted-foreground" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button className="neo-btn px-6 py-3 text-sm font-semibold text-primary" onClick={handleTestNext}>
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && selectedCategory && (
          <div className="neo-flat p-6 space-y-4">
            <h2 className="font-heading font-semibold text-foreground">
              Enter Results — {selectedCategory.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              Patient: {selectedPatient?.name || patientForm.name} | Doctor: {selectedDoctor?.name}
            </p>

            <div className="space-y-3">
              {selectedCategory.subcategories.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-foreground">{sub.name}</label>
                    {sub.normalRange && (
                      <span className="text-[10px] text-muted-foreground ml-2">
                        Normal: {sub.normalRange} {sub.unit}
                      </span>
                    )}
                  </div>
                  <input
                    className="neo-input px-3 py-2 text-sm text-foreground w-32"
                    placeholder={sub.unit || "Value"}
                    value={results[sub.id] || ""}
                    onChange={(e) => setResults({ ...results, [sub.id]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 flex-wrap">
              <button className="neo-btn px-6 py-3 text-sm font-semibold text-muted-foreground" onClick={() => setStep(2)}>
                ← Back
              </button>
              <button className="neo-btn px-6 py-3 text-sm font-semibold text-warning" onClick={() => handleSave("pending")}>
                Save as Pending
              </button>
              <button className="neo-btn px-6 py-3 text-sm font-semibold text-primary" onClick={() => handleSave("completed")}>
                Save & Complete ✓
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
