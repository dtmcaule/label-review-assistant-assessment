export type ApplicationData = {
  brandName: string;
  classType: string;
  alcoholContent: string;
  netContents: string;
  producerOrImporter: string;
};

export type ExtractedLabel = {
  brand_name: string | null;
  class_type: string | null;
  alcohol_content: string | null;
  net_contents: string | null;
  producer_or_importer: string | null;
  government_warning_text: string | null;
  other_visible_text: string[];
};

export type FindingStatus = "likely_match" | "needs_review" | "mismatch";

export type ReviewFinding = {
  field: string;
  expected: string;
  observed: string;
  status: FindingStatus;
  note: string;
};

export type VerificationResult = {
  mode: "live_ai" | "demo";
  elapsedMs: number;
  extracted: ExtractedLabel;
  findings: ReviewFinding[];
  summary: {
    likelyMatches: number;
    needsReview: number;
    mismatches: number;
  };
};
