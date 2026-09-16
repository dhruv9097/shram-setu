/**
 * Multilingual grievance triage.
 *
 * A worker describes what happened in their own language. An officer needs a
 * category, an urgency and something they can read. Without this the worker
 * has to file in Hindi or English — which excludes precisely the people the
 * system exists for — or the state staffs every language at every desk.
 *
 * Deliberately a classification task with a fixed output schema, not open
 * generation: the model chooses among known categories and summarises text the
 * worker supplied. The worker's own words are always stored verbatim alongside,
 * so nothing depends on the summary being perfect, and an officer can always
 * read the original.
 *
 * If the key is absent or the call fails, triage returns null and the worker
 * picks a category from icons instead. The grievance is never lost.
 */
import { SOS_TYPES, type SosType } from "./types";

/**
 * Tried in order. The free tier returns 503 on the flagship flash models under
 * load and 429 on the pro models, both verified against this key, so a second
 * model is a deliberate availability decision rather than defensive padding.
 * When every model is unavailable the caller falls back to the worker choosing
 * a category from icons.
 */
const MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
].filter(Boolean) as string[];

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export type Triage = {
  type: SosType;
  urgency: "immediate" | "urgent" | "routine";
  summaryEnglish: string;
  /** what the model keyed on, so an officer can sanity-check the label */
  evidence: string;
};

const SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: [...SOS_TYPES] },
    urgency: { type: "string", enum: ["immediate", "urgent", "routine"] },
    summaryEnglish: { type: "string" },
    evidence: { type: "string" },
  },
  required: ["type", "urgency", "summaryEnglish", "evidence"],
};

const SYSTEM = `You triage grievances from unorganised migrant workers in India for a labour department.

The worker speaks in their own language (Hindi, Odia, Bengali, Assamese or English), often informally.

Classify into exactly one type:
- wage_theft: unpaid or underpaid wages, withheld dues, illegal deductions
- accident: an injury that has already happened
- unsafe_site: a hazard that has not yet caused injury
- stranded: no money, transport, food or shelter; unable to get home
- medical: illness needing care, not caused by a workplace accident

Urgency:
- immediate: risk to life or limb right now
- urgent: harm within days, or the worker has no food or shelter tonight
- routine: a claim that matters but is not time-critical

summaryEnglish: one factual sentence an officer can act on. Include amounts and
durations the worker mentioned. Do not invent details the worker did not state.
evidence: quote or closely paraphrase the words you classified on.`;

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function triageGrievance(
  text: string,
  language: string,
  timeoutMs = 9000,
): Promise<Triage | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !text.trim()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [
      { role: "user", parts: [{ text: `Worker's language: ${language}\nWhat they said:\n${text}` }] },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: SCHEMA,
      temperature: 0,
    },
  });

  try {
    for (const model of MODELS) {
      const res = await fetch(`${ENDPOINT(model)}?key=${key}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: payload,
      });

      if (!res.ok) {
        if (RETRYABLE.has(res.status)) continue; // try the next model
        return null;
      }

      const body = await res.json();
      const raw = body?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text)
        .filter(Boolean)
        .join("");
      if (!raw) continue;

      const parsed = JSON.parse(raw) as Triage;
      // Never file a category the system does not recognise — fall back to the
      // worker's own choice instead of recording something wrong.
      if (!SOS_TYPES.includes(parsed.type)) return null;
      return parsed;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
