import { describe, expect, it } from "vitest";
import { STANDARD_WARNING, verifyLabel } from "./verification";
import type { ApplicationData, ExtractedLabel } from "./types";

const application: ApplicationData = {
  brandName: "Stone's Throw",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
  producerOrImporter: "Old Tom Distillery, Louisville, KY"
};

function extracted(overrides: Partial<ExtractedLabel> = {}): ExtractedLabel {
  return {
    brand_name: "STONE'S THROW",
    class_type: "Kentucky Straight Bourbon Whiskey",
    alcohol_content: "45% Alc./Vol. (90 Proof)",
    net_contents: "750 mL",
    producer_or_importer: "Old Tom Distillery, Louisville, KY",
    government_warning_text: STANDARD_WARNING,
    other_visible_text: [],
    ...overrides
  };
}

describe("verifyLabel", () => {
  it("treats obvious casing differences as a likely match", () => {
    const result = verifyLabel(application, extracted());
    const brand = result.findings.find((finding) => finding.field === "Brand name");

    expect(brand?.status).toBe("likely_match");
  });

  it("flags missing required warning text as a mismatch", () => {
    const result = verifyLabel(application, extracted({ government_warning_text: null }));
    const warning = result.findings.find((finding) => finding.field === "Government warning");

    expect(warning?.status).toBe("mismatch");
  });

  it("flags altered warning capitalization for human review", () => {
    const result = verifyLabel(
      application,
      extracted({ government_warning_text: STANDARD_WARNING.replace("GOVERNMENT WARNING:", "Government Warning:") })
    );
    const warning = result.findings.find((finding) => finding.field === "Government warning");

    expect(warning?.status).toBe("needs_review");
  });

  it("summarizes review outcomes for the UI", () => {
    const result = verifyLabel(application, extracted({ net_contents: "375 mL" }));

    expect(result.summary.likelyMatches).toBeGreaterThan(0);
    expect(result.summary.mismatches).toBeGreaterThan(0);
  });
});
