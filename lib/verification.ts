import type { ApplicationData, ExtractedLabel, FindingStatus, ReviewFinding } from "./types";

export const STANDARD_WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['".,()/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.92;

  const aWords = new Set(left.split(" "));
  const bWords = new Set(right.split(" "));
  const overlap = [...aWords].filter((word) => bWords.has(word)).length;
  return overlap / Math.max(aWords.size, bWords.size);
}

function statusForScore(score: number): FindingStatus {
  if (score >= 0.86) return "likely_match";
  if (score >= 0.55) return "needs_review";
  return "mismatch";
}

function compareField(field: string, expected: string, observed: string | null): ReviewFinding {
  if (!expected.trim()) {
    return {
      field,
      expected: "Not supplied",
      observed: observed || "Not found",
      status: "needs_review",
      note: "Application value was not supplied, so this item needs reviewer confirmation."
    };
  }

  if (!observed) {
    return {
      field,
      expected,
      observed: "Not found",
      status: "mismatch",
      note: "The label extraction did not find a visible value for this field."
    };
  }

  const score = similarity(expected, observed);
  const status = statusForScore(score);
  return {
    field,
    expected,
    observed,
    status,
    note:
      status === "likely_match"
        ? "Normalized label text appears to match the application."
        : status === "needs_review"
          ? "The values are similar but should be checked by a reviewer."
          : "The observed label text does not appear to match the application value."
  };
}

function warningFinding(warningText: string | null): ReviewFinding {
  if (!warningText) {
    return {
      field: "Government warning",
      expected: STANDARD_WARNING,
      observed: "Not found",
      status: "mismatch",
      note: "The mandatory warning statement was not found in the extracted label text."
    };
  }

  const exactText = warningText.replace(/\s+/g, " ").trim();
  const hasRequiredWording = normalize(exactText).includes(normalize(STANDARD_WARNING));
  const hasCapsPrefix = exactText.includes("GOVERNMENT WARNING:");

  if (hasRequiredWording && hasCapsPrefix) {
    return {
      field: "Government warning",
      expected: STANDARD_WARNING,
      observed: exactText,
      status: "likely_match",
      note: "Required warning wording and all-caps prefix were found."
    };
  }

  return {
    field: "Government warning",
    expected: STANDARD_WARNING,
    observed: exactText,
    status: "needs_review",
    note: "The warning appears present, but wording or the all-caps prefix needs human review."
  };
}

export function verifyLabel(application: ApplicationData, extracted: ExtractedLabel) {
  const findings = [
    compareField("Brand name", application.brandName, extracted.brand_name),
    compareField("Class/type", application.classType, extracted.class_type),
    compareField("Alcohol content", application.alcoholContent, extracted.alcohol_content),
    compareField("Net contents", application.netContents, extracted.net_contents),
    compareField("Producer/importer", application.producerOrImporter, extracted.producer_or_importer),
    warningFinding(extracted.government_warning_text)
  ];

  return {
    findings,
    summary: {
      likelyMatches: findings.filter((finding) => finding.status === "likely_match").length,
      needsReview: findings.filter((finding) => finding.status === "needs_review").length,
      mismatches: findings.filter((finding) => finding.status === "mismatch").length
    }
  };
}

export const demoExtraction: ExtractedLabel = {
  brand_name: "OLD TOM DISTILLERY",
  class_type: "Kentucky Straight Bourbon Whiskey",
  alcohol_content: "45% Alc./Vol. (90 Proof)",
  net_contents: "750 mL",
  producer_or_importer: "Old Tom Distillery, Louisville, KY",
  government_warning_text: STANDARD_WARNING,
  other_visible_text: ["Batch No. 17", "Straight bourbon whiskey"]
};
