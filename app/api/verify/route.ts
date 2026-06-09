import OpenAI from "openai";
import { NextResponse } from "next/server";
import { demoExtraction, verifyLabel } from "@/lib/verification";
import type { ApplicationData, ExtractedLabel, VerificationResult } from "@/lib/types";

export const runtime = "nodejs";

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    brand_name: { type: ["string", "null"] },
    class_type: { type: ["string", "null"] },
    alcohol_content: { type: ["string", "null"] },
    net_contents: { type: ["string", "null"] },
    producer_or_importer: { type: ["string", "null"] },
    government_warning_text: { type: ["string", "null"] },
    other_visible_text: { type: "array", items: { type: "string" } }
  },
  required: [
    "brand_name",
    "class_type",
    "alcohol_content",
    "net_contents",
    "producer_or_importer",
    "government_warning_text",
    "other_visible_text"
  ]
} as const;

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

function getApplication(form: FormData): ApplicationData {
  return {
    brandName: String(form.get("brandName") || ""),
    classType: String(form.get("classType") || ""),
    alcoholContent: String(form.get("alcoholContent") || ""),
    netContents: String(form.get("netContents") || ""),
    producerOrImporter: String(form.get("producerOrImporter") || "")
  };
}

async function extractWithVision(file: File): Promise<ExtractedLabel> {
  if (!process.env.OPENAI_API_KEY) return demoExtraction;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const imageUrl = await fileToDataUrl(file);

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.4-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "Read this alcohol beverage label for compliance review. Extract visible text into the requested fields. Do not infer missing values. Return null when a field is not visible. Preserve government warning wording and capitalization as closely as possible."
          },
          { type: "input_image", image_url: imageUrl, detail: "auto" }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "alcohol_label_extraction",
        strict: true,
        schema: extractionSchema
      }
    }
  });

  return JSON.parse(response.output_text) as ExtractedLabel;
}

export async function POST(request: Request) {
  const started = Date.now();

  try {
    const form = await request.formData();
    const file = form.get("labelImage");
    const application = getApplication(form);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please upload a label image." }, { status: 400 });
    }

    const extracted = await extractWithVision(file);
    const review = verifyLabel(application, extracted);
    const result: VerificationResult = {
      mode: process.env.OPENAI_API_KEY ? "live_ai" : "demo",
      elapsedMs: Date.now() - started,
      extracted,
      ...review
    };

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to verify this label."
      },
      { status: 500 }
    );
  }
}
