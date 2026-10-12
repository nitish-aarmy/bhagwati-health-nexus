import { useState } from "react";
import Layout from "@/components/Layout";
import { getPatients, savePatient, deletePatient, generateId, getReportsByPatient, buildPatientName, generateUniquePatientId } from "@/lib/store";
import { Patient } from "@/lib/data";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus, Search } from "lucide-react";

const DISTRICTS = [
  "Bokaro",
  "Chatra",
  "Deoghar",
  "Dhanbad",
  "Dumka",
  "East Singhbhum",
  "Garhwa",
  "Giridih",
  "Godda",
  "Gumla",
  "Hazaribagh",
  "Jamtara",
  "Khunti",
  "Koderma",
  "Latehar",
  "Lohardaga",
  "Pakur",
  "Palamu",
  "Ramgarh",
  "Ranchi",
  "Sahibganj",
  "Seraikela Kharsawan",
  "Simdega",
  "West Singhbhum",
];

export default function Patients() {
  const [patients, setPatients] = useState(getPatients());
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    age: "",
    dob: "",
    gender: "Male" as const,
    phone: "",
    email: "",
    guardianName: "",
    guardianRelation: "Father",
    addressLine1: "",
    addressLine2: "",
    locality: "",
    landmark: "",
    city: "Daltonganj",
    district: "Palamu",
    pincode: "",
    state: "Jharkhand",
  });

  const filtered = patients.filter((p) =>
    (p.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  );

  function handleAdd() {
    if (!form.firstName || !form.lastName || !form.phone || (!form.age && !form.dob)) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }

    const name = buildPatientName(form.firstName, form.middleName, form.lastName);
    const existingIds = getPatients().map((p) => p.patientId || p.id);
    const p: Patient = {
      id: generateId(),
      patientId: generateUniquePatientId(existingIds),
      name,
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      age: Number(form.age || 0),
      dob: form.dob || undefined,
      gender: form.gender,
      phone: form.phone,
      email: form.email,
      guardianName: form.guardianName,
      guardianRelation: form.guardianRelation,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2,
      locality: form.locality,
      landmark: form.landmark,
      city: form.city,
      district: form.district,
      pincode: form.pincode,
      state: form.state,
      address: [form.addressLine1, form.addressLine2, form.locality, form.landmark, form.city, form.district, form.pincode, form.state].filter(Boolean).join(", "),
      createdAt: new Date().toISOString(),
    };
    savePatient(p);
    setPatients(getPatients());
    setForm({
      firstName: "",
      middleName: "",
      lastName: "",
      age: "",
      dob: "",
      gender: "Male",
      phone: "",
      email: "",
      guardianName: "",
      guardianRelation: "Father",
      addressLine1: "",
      addressLine2: "",
      locality: "",
      landmark: "",
      city: "Daltonganj",
      district: "Palamu",
      pincode: "",
      state: "Jharkhand",
    });
    setShowAdd(false);
    toast({ title: `Patient added! ID: ${p.patientId}` });
  }

  function handleDelete(id: string) {
    deletePatient(id);
    setPatients(getPatients());
    toast({ title: "Patient deleted" });
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="font-heading text-2xl font-bold text-foreground">Patients</h1>
          <button className="neo-btn px-4 py-2 text-sm font-semibold text-primary flex items-center gap-2" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} /> Add Patient
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            className="neo-input w-full pl-10 pr-4 py-3 text-sm text-foreground"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="neo-flat p-6 space-y-4">
            <h2 className="font-heading font-semibold text-foreground text-sm">New Patient</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="First name *" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="Middle name" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} />
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="Last name *" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="DOB" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="Age" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
              <select className="neo-input px-4 py-3 text-sm text-foreground" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as any })}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="Guardian name" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
              <select className="neo-input px-4 py-3 text-sm text-foreground" value={form.guardianRelation} onChange={(e) => setForm({ ...form, guardianRelation: e.target.value })}>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Husband">Husband</option>
                <option value="Wife">Wife</option>
                <option value="Brother">Brother</option>
                <option value="Sister">Sister</option>
                <option value="Guardian">Guardian</option>
                <option value="Other">Other</option>
              </select>
              <input className="neo-input px-4 py-3 text-sm text-foreground col-span-full" placeholder="Address line 1" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
              <input className="neo-input px-4 py-3 text-sm text-foreground col-span-full" placeholder="Address line 2" value={form.addressLine2} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="Locality / Village" value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} />
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <select className="neo-input px-4 py-3 text-sm text-foreground" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}>
                {DISTRICTS.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
              <input className="neo-input px-4 py-3 text-sm text-foreground" placeholder="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
              <select className="neo-input px-4 py-3 text-sm text-foreground" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                <option value="Jharkhand">Jharkhand</option>
              </select>
            </div>
            <button className="neo-btn px-6 py-3 text-sm font-semibold text-primary" onClick={handleAdd}>
              Save Patient
            </button>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="neo-concave p-8 text-center text-muted-foreground text-sm">
              No patients found
            </div>
          ) : (
            filtered.map((p) => {
              const reportCount = getReportsByPatient(p.id).length;
              return (
                <div key={p.id} className="neo-flat p-4 flex items-center gap-4">
                  <div className="neo-concave w-12 h-12 flex items-center justify-center shrink-0">
                    <span className="font-heading font-bold text-primary text-lg">{p.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.age}y, {p.gender} • {p.phone}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{reportCount} report(s)</p>
                  </div>
                  <button className="neo-btn p-2 text-destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
