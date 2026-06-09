# Label Review Assistant

AI-assisted proof of concept for alcohol label verification. The app reads alcohol label artwork, compares visible label text against expected application values, and presents reviewer findings for routine checks.

Live app: https://label-review-assistant-assessment.vercel.app/

The product stance is intentionally human-in-the-loop: the app surfaces `Likely Match`, `Needs Review`, and `Mismatch Detected` findings, but it does not approve or reject applications.

## Demo Workflow

1. Start the app.
2. Upload one or more label images.
3. Enter the application values, or click `Load Sample`.
4. Click `Generate Review Findings` or `Review N Labels`.
5. Review the per-field findings grouped by uploaded file.

Sample labels are included in `public/samples`:

- `old-tom-compliant.png` should return mostly likely matches when used with `Load Sample`.
- `old-tom-missing-warning.png` should help demonstrate that required warning text can be flagged.

Batch upload is designed for multiple artwork files that belong to the same application, such as front label, back label, neck label, and carton artwork.

## Run Locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Set your API key in `.env.local`:

```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-5.4-mini
```

Without an API key, the app falls back to demo extraction so the UI can still be evaluated.

## Verify

```bash
npm run test
npm run build
```

The tests focus on deterministic verification rules: fuzzy matching for ordinary fields, stricter handling for the government warning, and summary counts for the UI.

## What It Checks

- Brand name
- Class/type designation
- Alcohol content
- Net contents
- Producer/importer text
- Government Health Warning Statement

Routine fields use normalization so labels like `STONE'S THROW` and applications like `Stone's Throw` are treated as likely matches. The government warning check is stricter because the prompt notes that wording and `GOVERNMENT WARNING:` capitalization matter.

## Architecture

- `app/page.tsx`: reviewer UI, upload flow, batch handling, clear/reset, and sample data loading.
- `app/api/verify/route.ts`: server-side image extraction route. The OpenAI API key never reaches the browser.
- `lib/verification.ts`: deterministic comparison rules and summary generation.
- `lib/verification.test.ts`: focused tests for matching behavior.
- `public/samples`: sample label images for evaluator testing.

Flow:

```text
Label image(s) + application values
        |
        v
/api/verify server route
        |
        v
Vision extraction to structured JSON
        |
        v
Deterministic verification rules
        |
        v
Reviewer findings in the UI
```

## Technical Choices

- Next.js keeps the prototype easy to run, deploy, and review.
- OpenAI vision extraction handles label artwork better than plain OCR for the prototype scope.
- Verification logic is kept in code instead of asking the model to make the final compliance decision.
- Batch processing is currently client-side sequential processing against the same API route, which keeps the implementation simple and transparent.

## Assumptions

- This is a standalone proof of concept, not a COLA integration.
- Uploaded files are processed transiently and are not stored by the app.
- A batch represents multiple images for the same application, not a spreadsheet of many different applications.
- Government warning validation here checks text presence and capitalization, but does not evaluate font size, boldness, contrast, or placement.

## Production Considerations

Before production use, this would need:

- Authentication and role-based access control.
- Audit logging and reviewer note capture.
- Clear document retention and deletion policy.
- Accessibility review.
- Stronger image quality handling for glare, skew, blur, and multi-panel bottles.
- A true batch API with concurrency limits, progress reporting, and retry behavior.
- Import workflow for many applications, likely CSV or COLA integration.
- Federal deployment review, including network allowlisting, privacy, and FedRAMP considerations.

## Deploy

This project is ready for Vercel or a similar Next.js host.

Set these environment variables in the deployment provider:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini
```

Then deploy the repository. The submitted URL should point to the deployed app, not localhost.
