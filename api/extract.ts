// Vercel serverless function. This is the ONLY place in the entire codebase
// that calls the Claude API. Its sole job is turning messy lease PDF text into
// structured JSON. It performs zero calculation — see src/engine/ for that.
//
// Environment variable required: ANTHROPIC_API_KEY (set in Vercel project settings,
// never committed to the repo or exposed to the client).

export const config = {
  runtime: "edge",
};

// --- Basic rate limiting -------------------------------------------------
// This is a lightweight, best-effort safeguard against runaway API cost from
// casual abuse or a stray infinite-loop bug in a client — NOT a robust
// security control. Vercel edge functions run as multiple isolated
// instances across regions, so this in-memory store is per-instance, not
// globally shared: a determined abuser spreading requests across regions
// could exceed these limits. It also resets whenever an instance cold-starts.
// For a portfolio/demo deployment this is a reasonable low-effort trade-off.
// If this app ever gets meaningful real traffic, replace this with a shared
// store (e.g. Vercel KV / Upstash Redis) so limits are enforced consistently
// across all edge instances.

const PER_IP_DAILY_LIMIT = 20;
const GLOBAL_DAILY_LIMIT = 150;
const WINDOW_MS = 24 * 60 * 60 * 1000;

interface Counter {
  count: number;
  windowStart: number;
}

const ipCounters = new Map<string, Counter>();
let globalCounter: Counter = { count: 0, windowStart: Date.now() };

function checkAndIncrement(counter: Counter, limit: number): { allowed: boolean; counter: Counter } {
  const now = Date.now();
  if (now - counter.windowStart > WINDOW_MS) {
    counter = { count: 0, windowStart: now };
  }
  if (counter.count >= limit) {
    return { allowed: false, counter };
  }
  counter.count += 1;
  return { allowed: true, counter };
}

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

const SYSTEM_PROMPT = `You are a lease document data extraction tool. You will be given the raw text of a commercial lease agreement. Your only job is to extract specific data points as structured JSON. You do not perform any calculations, do not compute present values, do not determine lease classification, and do not make judgment calls beyond what is asked below.

Return ONLY a single JSON object matching this exact shape, with no preamble, no markdown code fences, and no commentary before or after it:

{
  "commencement_date": string (ISO YYYY-MM-DD) or null,
  "lease_term_months": number or null,
  "renewal_options": [ { "additional_months": number or null, "reasonably_certain": "yes"|"no"|"unclear", "evidence": string (short quote or paraphrase of the clause) } ],
  "base_rent_amount": number or null,
  "base_rent_frequency": "monthly"|"quarterly"|"annual" or null,
  "escalations": [ { "type": "fixed_percent"|"fixed_dollar"|"cpi"|"other", "value": number or null, "effective_date": string (ISO date) or null, "notes": string } ],
  "rent_holidays": [ { "start_date": string or null, "end_date": string or null } ],
  "initial_direct_costs": number or null,
  "lease_incentives": number or null,
  "asset_description": string or null,
  "rate_implicit_in_lease": number or null (as a decimal, e.g. 0.06 for 6%; only populate if a specific rate is explicitly stated as the rate implicit in the lease — do not infer or calculate one),
  "rate_implicit_in_lease_evidence": string (empty string if not found),
  "purchase_option_exists": boolean,
  "purchase_option_bargain": "yes"|"no"|"unclear",
  "purchase_option_notes": string,
  "ownership_transfer_at_end": boolean,
  "extraction_confidence_notes": string (any caveats about ambiguous or missing terms)
}

Rules:
- If a field cannot be found in the document, use null (or an empty array for list fields, or false/"unclear" for booleans as shown above). Never guess or fabricate a value.
- For "escalations" of type "cpi": NEVER estimate or guess a numeric value for "value" — the future CPI is not knowable at extraction time. Always set "value" to null for CPI-based escalations and describe the clause in "notes" instead.
- For "rate_implicit_in_lease": only populate this if the lease document explicitly states a specific implicit interest/discount rate. Commercial leases almost never state this. Do not calculate or infer a rate.
- Keep "evidence" and "notes" fields short (under 200 characters) and grounded in the actual document text.
- Return valid JSON only. No markdown fences, no explanation.`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  // Global daily cap first (protects overall spend regardless of who's asking).
  const globalCheck = checkAndIncrement(globalCounter, GLOBAL_DAILY_LIMIT);
  globalCounter = globalCheck.counter;
  if (!globalCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "This tool has hit its daily extraction limit. Please try again tomorrow, or enter lease terms manually.",
      }),
      { status: 429 }
    );
  }

  // Per-IP daily cap (protects against a single source hammering the endpoint).
  const ip = getClientIp(req);
  const ipCounter = ipCounters.get(ip) ?? { count: 0, windowStart: Date.now() };
  const ipCheck = checkAndIncrement(ipCounter, PER_IP_DAILY_LIMIT);
  ipCounters.set(ip, ipCheck.counter);
  if (!ipCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "You've reached today's extraction limit for this tool. Please try again tomorrow, or enter lease terms manually.",
      }),
      { status: 429 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Server is not configured with an ANTHROPIC_API_KEY." }),
      { status: 500 }
    );
  }

  let documentText: string;
  try {
    const body = await req.json();
    documentText = body.documentText;
    if (!documentText || typeof documentText !== "string") {
      throw new Error("missing documentText");
    }
  } catch {
    return new Response(JSON.stringify({ error: "Request must include documentText (string)." }), {
      status: 400,
    });
  }

  // Guard against extremely large documents inflating cost unexpectedly.
  const MAX_CHARS = 100_000;
  const trimmedText =
    documentText.length > MAX_CHARS
      ? documentText.slice(0, MAX_CHARS) + "\n\n[Document truncated for length.]"
      : documentText;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Here is the raw text extracted from a commercial lease PDF. Extract the fields as instructed.\n\n---\n\n${trimmedText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `Claude API error: ${errText}` }), {
        status: 502,
      });
    }

    const data = await response.json();
    const textBlock = data.content?.find((b: any) => b.type === "text");
    if (!textBlock) {
      return new Response(JSON.stringify({ error: "No text response from extraction model." }), {
        status: 502,
      });
    }

    // Defensive: strip markdown fences if the model added them despite instructions.
    const cleaned = textBlock.text.replace(/^```json\s*|^```\s*|```\s*$/gm, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return new Response(
        JSON.stringify({ error: "Extraction model did not return valid JSON.", raw: textBlock.text }),
        { status: 502 }
      );
    }

    return new Response(JSON.stringify({ extraction: parsed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Extraction request failed: ${err.message}` }), {
      status: 500,
    });
  }
}
