import { useState } from "react";
import Layout from "@/components/Layout";
import { getReports, deleteReport } from "@/lib/store";
import { TEST_CATEGORIES } from "@/lib/data";
import { toast } from "@/hooks/use-toast";
import { Trash2, Search, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { HOSPITAL_INFO } from "@/lib/data";

export default function Reports() {
  const [reports, setReports] = useState(getReports());
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "blood" | "urine" | "other">("all");

  const filtered = reports
    .filter((r) => filterType === "all" || r.testType === filterType)
    .filter(
      (r) =>
        r.patientName.toLowerCase().includes(search.toLowerCase()) ||
        r.testCategoryName.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function handleDelete(id: string) {
    deleteReport(id);
    setReports(getReports());
    toast({ title: "Report deleted" });
  }

  function handlePrint(reportId: string) {
    const report = reports.find((r) => r.id === reportId);
    if (!report) return;
    const category = TEST_CATEGORIES.find((c) => c.id === report.testCategoryId);
    if (!category) return;

    const printContent = `
      <html><head><title>Report - ${report.patientName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { text-align: center; margin-bottom: 5px; }
        .subtitle { text-align: center; color: #666; font-size: 14px; margin-bottom: 30px; }
        .info { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 13px; }
        th { background: #f5f5f5; }
        .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; }
      </style></head><body>
        <h1>${HOSPITAL_INFO.name}</h1>
        <div class="subtitle">${HOSPITAL_INFO.tagline} — ${HOSPITAL_INFO.address}</div>
        <div class="info">
          <div><b>Patient:</b> ${report.patientName}</div>
          <div><b>Doctor:</b> ${report.doctorName}</div>
          <div><b>Date:</b> ${new Date(report.createdAt).toLocaleDateString("en-IN")}</div>
        </div>
        <h3>${report.testCategoryName}</h3>
        <table>
          <tr><th>Parameter</th><th>Result</th><th>Unit</th><th>Normal Range</th></tr>
          ${report.results.map((r) => {
            const sub = category.subcategories.find((s) => s.id === r.subCategoryId);
            return `<tr><td>${sub?.name || r.subCategoryId}</td><td><b>${r.value || "-"}</b></td><td>${sub?.unit || ""}</td><td>${sub?.normalRange || ""}</td></tr>`;
          }).join("")}
        </table>
        <div class="footer">This is a computer-generated report from ${HOSPITAL_INFO.name} Pathology System</div>
      </body></html>
    `;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(printContent);
      w.document.close();
      w.print();
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold text-foreground">Reports</h1>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              className="neo-input w-full pl-10 pr-4 py-3 text-sm text-foreground"
              placeholder="Search patient or test..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(["all", "blood", "urine", "other"] as const).map((t) => (
              <button
                key={t}
                className={`px-4 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                  filterType === t ? "neo-pressed text-primary" : "neo-btn text-muted-foreground"
                }`}
                onClick={() => setFilterType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="neo-concave p-8 text-center text-muted-foreground text-sm">
              No reports found
            </div>
          ) : (
            filtered.map((report) => {
              const expanded = expandedId === report.id;
              const category = TEST_CATEGORIES.find((c) => c.id === report.testCategoryId);
              return (
                <div key={report.id} className="neo-flat p-4 space-y-3">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(expanded ? null : report.id)}>
                    <div className={`w-2 h-2 rounded-full ${report.status === "completed" ? "bg-success" : "bg-warning"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {report.patientName} — {report.testCategoryName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {report.doctorName} • {new Date(report.createdAt).toLocaleDateString("en-IN")}
                        <span className={`ml-2 text-[10px] font-medium ${report.status === "completed" ? "text-success" : "text-warning"}`}>
                          {report.status.toUpperCase()}
                        </span>
                      </p>
                    </div>
                    {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>

                  {expanded && category && (
                    <div className="space-y-3">
                      <div className="neo-concave p-4 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="text-left py-1 pr-4">Parameter</th>
                              <th className="text-left py-1 pr-4">Result</th>
                              <th className="text-left py-1 pr-4">Unit</th>
                              <th className="text-left py-1">Normal Range</th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.results.map((r) => {
                              const sub = category.subcategories.find((s) => s.id === r.subCategoryId);
                              return (
                                <tr key={r.subCategoryId} className="border-t border-border/50">
                                  <td className="py-2 pr-4 text-foreground font-medium">{sub?.name}</td>
                                  <td className="py-2 pr-4 text-foreground font-bold">{r.value || "-"}</td>
                                  <td className="py-2 pr-4 text-muted-foreground">{sub?.unit}</td>
                                  <td className="py-2 text-muted-foreground">{sub?.normalRange}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex gap-2">
                        <button className="neo-btn px-4 py-2 text-xs font-medium text-primary flex items-center gap-1" onClick={() => handlePrint(report.id)}>
                          <Printer size={14} /> Print
                        </button>
                        <button className="neo-btn px-4 py-2 text-xs font-medium text-destructive flex items-center gap-1" onClick={() => handleDelete(report.id)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
