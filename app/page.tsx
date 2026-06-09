"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileImage,
  Loader2,
  Sparkles,
  RotateCcw,
  Search,
  XCircle
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { VerificationResult, FindingStatus } from "@/lib/types";

const presets = {
  brandName: "OLD TOM DISTILLERY",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
  producerOrImporter: "Old Tom Distillery, Louisville, KY"
};

function labelForStatus(status: FindingStatus) {
  if (status === "likely_match") return "Likely Match";
  if (status === "needs_review") return "Needs Review";
  return "Mismatch Detected";
}

function iconForStatus(status: FindingStatus) {
  if (status === "likely_match") return <CheckCircle2 aria-hidden />;
  if (status === "needs_review") return <AlertTriangle aria-hidden />;
  return <XCircle aria-hidden />;
}

export default function Home() {
  const formRef = useRef<HTMLFormElement>(null);
  const [results, setResults] = useState<Array<{ fileName: string; result: VerificationResult }>>([]);
  const [files, setFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overallStatus = useMemo(() => {
    if (results.length === 0) return null;
    const hasMismatch = results.some(({ result }) => result.summary.mismatches > 0);
    const hasReview = results.some(({ result }) => result.summary.needsReview > 0);
    if (hasMismatch) return "Mismatch Detected";
    if (hasReview) return "Needs Review";
    return "Likely Match";
  }, [results]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) {
      setError("Please upload at least one label image.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const formElement = event.currentTarget;
      const completed: Array<{ fileName: string; result: VerificationResult }> = [];

      for (const selected of files) {
        const form = new FormData(formElement);
        form.delete("labelImage");
        form.append("labelImage", selected.file);

        const response = await fetch("/api/verify", { method: "POST", body: form });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || `Unable to verify ${selected.file.name}.`);

        completed.push({ fileName: selected.file.name, result: payload });
        setResults([...completed]);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to verify this label.");
    } finally {
      setIsLoading(false);
    }
  }

  function clearWorkspace() {
    files.forEach(({ preview }) => URL.revokeObjectURL(preview));
    setFiles([]);
    setResults([]);
    setError(null);
    formRef.current?.reset();
  }

  function loadSampleApplication() {
    const form = formRef.current;
    if (!form) return;

    (form.elements.namedItem("brandName") as HTMLInputElement).value = presets.brandName;
    (form.elements.namedItem("classType") as HTMLInputElement).value = presets.classType;
    (form.elements.namedItem("alcoholContent") as HTMLInputElement).value = presets.alcoholContent;
    (form.elements.namedItem("netContents") as HTMLInputElement).value = presets.netContents;
    (form.elements.namedItem("producerOrImporter") as HTMLInputElement).value = presets.producerOrImporter;
    setResults([]);
    setError(null);
  }

  return (
    <main className="shell">
      <section className="workspace">
        <div className="intro">
          <div className="mark">
            <ClipboardCheck aria-hidden />
          </div>
          <div>
            <p className="eyebrow">TTB proof of concept</p>
            <h1>Label Review Assistant</h1>
            <p>
              Upload label artwork, enter the application values, and generate reviewer findings for routine label
              verification.
            </p>
          </div>
        </div>

        <form className="review-form" ref={formRef} onSubmit={onSubmit}>
          <label className="upload-zone">
            <input
              multiple
              type="file"
              name="labelImage"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                files.forEach(({ preview }) => URL.revokeObjectURL(preview));
                const selected = Array.from(event.target.files || []).map((file) => ({
                  file,
                  preview: URL.createObjectURL(file)
                }));
                setFiles(selected);
                setResults([]);
                setError(null);
              }}
            />
            {files.length > 0 ? (
              <div className="preview-grid">
                {files.map(({ file, preview }) => (
                  <figure key={`${file.name}-${file.lastModified}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt={`${file.name} preview`} />
                    <figcaption>{file.name}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <span>
                <FileImage aria-hidden />
                Select label image or batch
              </span>
            )}
          </label>

          <div className="fields">
            <label>
              Brand name
              <input name="brandName" placeholder="Example: Old Tom Distillery" />
            </label>
            <label>
              Class/type
              <input name="classType" placeholder="Example: Kentucky Straight Bourbon Whiskey" />
            </label>
            <label>
              Alcohol content
              <input name="alcoholContent" placeholder="Example: 45% Alc./Vol. (90 Proof)" />
            </label>
            <label>
              Net contents
              <input name="netContents" placeholder="Example: 750 mL" />
            </label>
            <label className="wide">
              Producer/importer
              <input name="producerOrImporter" placeholder="Example: Old Tom Distillery, Louisville, KY" />
            </label>
          </div>

          <div className="actions">
            <button className="primary" type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="spin" aria-hidden /> : <Search aria-hidden />}
              {files.length > 1 ? `Review ${files.length} Labels` : "Generate Review Findings"}
            </button>
            <button className="secondary" type="button" onClick={clearWorkspace} disabled={isLoading}>
              <RotateCcw aria-hidden />
              Clear
            </button>
            <button className="secondary" type="button" onClick={loadSampleApplication} disabled={isLoading}>
              <Sparkles aria-hidden />
              Load Sample
            </button>
          </div>
        </form>
      </section>

      <section className="results" aria-live="polite">
        {error && <div className="error">{error}</div>}

        {results.length === 0 && !error && (
          <div className="empty">
            <Search aria-hidden />
            <h2>Reviewer findings will appear here</h2>
            <p>Select one label or a batch. Results are intended to assist human review, not replace final compliance judgment.</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="summary">
              <div>
                <p className="eyebrow">{results.length > 1 ? "Batch review" : "Single label review"}</p>
                <h2>{overallStatus}</h2>
              </div>
              <span>{results.length} label{results.length === 1 ? "" : "s"}</span>
            </div>

            <div className="counters">
              <span>{results.reduce((total, item) => total + item.result.summary.likelyMatches, 0)} likely matches</span>
              <span>{results.reduce((total, item) => total + item.result.summary.needsReview, 0)} need review</span>
              <span>{results.reduce((total, item) => total + item.result.summary.mismatches, 0)} mismatches</span>
            </div>

            <div className="batch-list">
              {results.map(({ fileName, result }) => (
                <section className="label-result" key={fileName}>
                  <div className="label-result-head">
                    <div>
                      <p className="eyebrow">{result.mode === "live_ai" ? "Live AI extraction" : "Demo extraction"}</p>
                      <h3>{fileName}</h3>
                    </div>
                    <span>{(result.elapsedMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="findings">
                    {result.findings.map((finding) => (
                      <article className={`finding ${finding.status}`} key={`${fileName}-${finding.field}`}>
                        <div className="finding-head">
                          {iconForStatus(finding.status)}
                          <div>
                            <h3>{finding.field}</h3>
                            <p>{labelForStatus(finding.status)}</p>
                          </div>
                        </div>
                        <dl>
                          <div>
                            <dt>Application</dt>
                            <dd>{finding.expected}</dd>
                          </div>
                          <div>
                            <dt>Label artwork</dt>
                            <dd>{finding.observed}</dd>
                          </div>
                        </dl>
                        <p className="note">{finding.note}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
