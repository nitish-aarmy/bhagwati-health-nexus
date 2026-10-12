import { describe, it, expect } from "vitest";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { buildPatientName, generateUniquePatientId } from "@/lib/store";
import { normalizePhone, buildSmsOtpResponse } from "@/lib/sms-otp";
import { buildSummaryQueueItem, doctorDisplayName } from "@/routes/_authenticated/referrals";
import { RootContent } from "@/routes/__root";

describe("patient registration", () => {
  it("should build a full name from first, middle and last name", () => {
    expect(buildPatientName("Asha", "Kumari", "Singh")).toBe("Asha Kumari Singh");
    expect(buildPatientName("Asha", "", "Singh")).toBe("Asha Singh");
  });

  it("should generate a unique patient ID", () => {
    const first = generateUniquePatientId(["BH-2026-0001", "BH-2026-0002"]);
    const second = generateUniquePatientId(["BH-2026-0001", "BH-2026-0002", first]);

    expect(first).toMatch(/^BH-2026-\d{4}$/);
    expect(first).not.toBe("BH-2026-0001");
    expect(first).not.toBe(second);
  });

  it("should include the doctor specialty in discharge summary labels", () => {
    const doctor = {
      id: "d1",
      name: "DR ANUP KUMAR",
      degree: "MS",
      speciality: "GENERAL SURGERY",
      details: "CONSULTANT",
    } as any;

    expect(doctorDisplayName(doctor)).toContain("GENERAL SURGERY");
  });

  it("should keep the patient draft snapshot inside the saved discharge summary queue item", () => {
    const item = buildSummaryQueueItem({
      patientId: "p-1",
      patientName: "Asha singh",
      summaryMode: "discharge_summary",
      status: "saved",
      draft: {
        chiefComplaints: ["Fever"],
        diagnosis: ["Typhoid"],
        patientConditionDuringDischarge: "Stable on discharge",
      },
    });

    expect(item.patientName).toBe("ASHA SINGH");
    expect(item.draftSnapshot?.chiefComplaints).toEqual(["Fever"]);
    expect(item.draftSnapshot?.diagnosis).toEqual(["Typhoid"]);
    expect(item.draftSnapshot?.patientConditionDuringDischarge).toBe("Stable on discharge");
  });

  it("should normalize and validate the SMS OTP payload contract", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizePhone("12345")).toBeNull();

    const response = buildSmsOtpResponse({ mobile: "9876543210", otp: "123456" }, undefined);
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(false);
    expect(response.body.notConfigured).toBe(true);
  });

  it("should render the app shell without an empty white-screen gate", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(
        createElement(RootContent, {
          queryClient: new QueryClient(),
          outletContent: createElement("div", null, "App shell visible"),
        }),
      );
    });

    expect(container.textContent).toContain("App shell visible");
    root.unmount();
    container.remove();
  });
});
