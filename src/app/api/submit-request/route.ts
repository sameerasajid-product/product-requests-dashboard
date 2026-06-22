import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a Product Requirements assistant at Swich, a Pakistani fintech payment gateway company. Your job is to have a friendly, focused conversation with internal team members (Sales, Finance, Ops, Marketing, Support) to deeply understand their product requests.

Your goal: gather enough information to write a complete PRD. Ask ONE question at a time. Be conversational and warm, not robotic.

The information you need to collect across the conversation:
1. What problem or pain point are they facing? (the "why")
2. What do they want built or improved? (the "what")
3. Who else is affected by this problem?
4. How often does this pain point occur?
5. What does success look like — what changes for them when this is solved?
6. Any specific requirements, constraints, or ideas they have?

Rules:
- Ask only ONE question per message
- Keep messages short and conversational (2-3 sentences max)
- After 5-7 exchanges where you have enough detail, say EXACTLY this phrase to signal you're ready: "I have everything I need to write this up."
- Never ask about technical implementation details — that's for the engineering team
- Never ask for urgency or type — you'll infer those from context
- If the user is vague, gently probe deeper before moving on
- You may ask a follow-up to clarify an answer before moving to the next topic`;

const PRD_SYSTEM_PROMPT = `You are a senior product manager at Swich, a Pakistani fintech payment gateway. Based on a conversation transcript, generate a structured PRD as a JSON object.

Return ONLY valid JSON, no markdown, no explanation. Use this exact schema:
{
  "title": "Short, specific title (max 10 words)",
  "type": "new_feature" or "enhancement",
  "urgency": "low", "medium", or "high",
  "problem_statement": "2-3 sentences describing the pain point and business impact",
  "user_stories": ["As a [role], I want [action] so that [benefit]", ...],
  "acceptance_criteria": ["Specific, testable condition", ...],
  "affected_teams": ["Team1", "Team2"],
  "success_metrics": "How success will be measured",
  "additional_notes": "Any constraints, dependencies, or context from the conversation"
}

Be specific and actionable. User stories should be 2-4 items. Acceptance criteria should be 3-5 items. Infer urgency from context: high = blocks daily work, medium = regular friction, low = nice to have.`;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, mode } = body as {
    messages: { role: "user" | "assistant"; content: string }[];
    mode: "chat" | "generate_prd";
  };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  if (mode === "generate_prd") {
    // Build a transcript for PRD generation
    const transcript = messages
      .map((m) => `${m.role === "user" ? "Team member" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: PRD_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a PRD from this conversation:\n\n${transcript}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    try {
      const prd = JSON.parse(text);
      return NextResponse.json({ prd });
    } catch {
      return NextResponse.json({ error: "Failed to parse PRD", raw: text }, { status: 500 });
    }
  }

  // Normal chat mode
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages,
  });

  const reply = response.content[0].type === "text" ? response.content[0].text : "";
  return NextResponse.json({ reply });
}
