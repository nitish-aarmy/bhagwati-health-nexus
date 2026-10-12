import Layout from "@/components/Layout";
import { getPatients, getReports } from "@/lib/store";
import { DOCTORS, TEST_CATEGORIES } from "@/lib/data";
import { Link } from "react-router-dom";
import {
  Users,
  FileText,
  FlaskConical,
  Droplets,
  TestTube,
  Activity,
  ArrowRight,
} from "lucide-react";

export default function Index() {
  const patients = getPatients();
  const reports = getReports();
  const bloodReports = reports.filter((r) => r.testType === "blood");
  const urineReports = reports.filter((r) => r.testType === "urine");
  const pendingReports = reports.filter((r) => r.status === "pending");
  const todayReports = reports.filter(
    (r) =>
      new Date(r.createdAt).toDateString() === new Date().toDateString()
  );

  const stats = [
    { label: "Total Patients", value: patients.length, icon: Users, color: "text-primary" },
    { label: "Total Reports", value: reports.length, icon: FileText, color: "text-accent" },
    { label: "Blood Tests", value: bloodReports.length, icon: Droplets, color: "text-destructive" },
    { label: "Urine Tests", value: urineReports.length, icon: TestTube, color: "text-warning" },
    { label: "Pending", value: pendingReports.length, icon: Activity, color: "text-muted-foreground" },
    { label: "Today", value: todayReports.length, icon: FlaskConical, color: "text-success" },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Welcome */}
        <div className="neo-convex p-6 lg:p-8">
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Welcome to Bhagwati Hospital
          </h1>
          <p className="text-muted-foreground text-sm">
            Pathology & Diagnostic Centre — Daltonganj, Jharkhand
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {stats.map((s) => (
            <div key={s.label} className="neo-flat p-5 flex flex-col items-center text-center gap-2">
              <s.icon className={s.color} size={28} />
              <span className="font-heading text-2xl font-bold text-foreground">{s.value}</span>
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Link to="/new-test" className="neo-btn p-6 flex items-center gap-4 group">
            <div className="neo-concave p-3">
              <FlaskConical className="text-primary" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-foreground">New Test</h3>
              <p className="text-xs text-muted-foreground">Register a new pathology test</p>
            </div>
            <ArrowRight className="text-muted-foreground group-hover:text-primary transition-colors" size={20} />
          </Link>

          <Link to="/patients" className="neo-btn p-6 flex items-center gap-4 group">
            <div className="neo-concave p-3">
              <Users className="text-accent" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-foreground">Patients</h3>
              <p className="text-xs text-muted-foreground">View & manage patients</p>
            </div>
            <ArrowRight className="text-muted-foreground group-hover:text-accent transition-colors" size={20} />
          </Link>
        </div>

        {/* Doctors */}
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Our Doctors</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {DOCTORS.map((doc) => (
              <div key={doc.id} className="neo-flat p-4 text-center">
                <div className="neo-concave w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                  <span className="font-heading font-bold text-primary text-lg">
                    {doc.name.split(" ").pop()?.[0]}
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground">{doc.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Available Tests */}
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Available Tests</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="neo-flat p-5">
              <div className="flex items-center gap-2 mb-3">
                <Droplets className="text-destructive" size={20} />
                <h3 className="font-heading font-semibold text-sm text-foreground">Blood Tests</h3>
              </div>
              <div className="space-y-2">
                {TEST_CATEGORIES.filter((c) => c.type === "blood").map((c) => (
                  <div key={c.id} className="neo-concave px-3 py-2 text-xs text-muted-foreground">
                    {c.name} ({c.subcategories.length} parameters)
                  </div>
                ))}
              </div>
            </div>
            <div className="neo-flat p-5">
              <div className="flex items-center gap-2 mb-3">
                <TestTube className="text-warning" size={20} />
                <h3 className="font-heading font-semibold text-sm text-foreground">Urine & Other Tests</h3>
              </div>
              <div className="space-y-2">
                {TEST_CATEGORIES.filter((c) => c.type !== "blood").map((c) => (
                  <div key={c.id} className="neo-concave px-3 py-2 text-xs text-muted-foreground">
                    {c.name} ({c.subcategories.length} parameters)
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
