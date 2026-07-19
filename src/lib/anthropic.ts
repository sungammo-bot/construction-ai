import Anthropic from "@anthropic-ai/sdk";
import type { PlanMilestone } from "@/lib/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export type AnalysisResult = {
  person_count: number;
  trades_detected: string[];
  confidence: number; // 0.0 - 1.0
  matches_plan: boolean | null;
  notes: string;
};

/**
 * Sends one snapshot to Claude and asks for a strictly structured read of
 * what's on site — headcount and trade only, deliberately never asked to
 * identify or name individuals. That keeps this squarely in "verifying a
 * subcontractor delivered the agreed resource" territory rather than
 * individual employee monitoring (see GDPR section of the concept doc).
 */
export async function analyzeSnapshot(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png",
  activeMilestones: PlanMilestone[]
): Promise<AnalysisResult> {
  const planContext =
    activeMilestones.length > 0
      ? activeMilestones
          .map(
            (m) =>
              `- ${m.trade}: forventet ${m.expected_workers} person(er), i perioden ${m.expected_start} til ${m.expected_end}`
          )
          .join("\n")
      : "Ingen aktiv milepæl for i dag — vurdér blot hvad der observeres.";

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system:
      "Du analyserer et enkelt billede fra et fast byggepladskamera. Du skal KUN tælle antal personer og gætte deres faggruppe ud fra synligt arbejdstøj/udstyr (fx malerudstyr, tømrerbælte, høj-synlighedsvest). " +
      "Du må ALDRIG forsøge at identificere, navngive eller beskrive individuelle personers udseende, ansigt eller identitet — kun antal og faggruppe. " +
      "Svar udelukkende med gyldig JSON og intet andet, i nøjagtigt dette format: " +
      '{"person_count": number, "trades_detected": string[], "confidence": number (0-1), "matches_plan": boolean|null, "notes": string}. ' +
      "Sæt matches_plan til null, hvis du ikke kan vurdere det ud fra planen nedenfor.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: `Projektets forventede bemanding for i dag:\n${planContext}\n\nAnalysér billedet og svar kun med JSON.`,
          },
        ],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      person_count: Number(parsed.person_count) || 0,
      trades_detected: Array.isArray(parsed.trades_detected) ? parsed.trades_detected : [],
      confidence: Number(parsed.confidence) || 0,
      matches_plan: typeof parsed.matches_plan === "boolean" ? parsed.matches_plan : null,
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return {
      person_count: 0,
      trades_detected: [],
      confidence: 0,
      matches_plan: null,
      notes: "Kunne ikke fortolke AI-svar — kræver manuel gennemgang.",
    };
  }
}
