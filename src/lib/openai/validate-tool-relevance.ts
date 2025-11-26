import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RelevanceCheck {
  isRelevant: boolean;
  reason?: string;
  toolType?: 'B2B SaaS' | 'B2C SaaS' | 'AI Tool' | 'Not Relevant';
}

/**
 * Validates if a website/tool is relevant for our database.
 * Only allows: B2B SaaS, B2C SaaS, or AI Tools
 * Rejects: Shopping websites, e-commerce stores, irrelevant sites
 */
export async function validateToolRelevance(
  url: string,
  websiteContent: string
): Promise<RelevanceCheck> {
  const prompt = `You are a strict validator for a B2B/B2C SaaS and AI tools database.

Website URL: ${url}
Website content (first 8000 chars):
${websiteContent}

Determine if this website is:
1. **B2B SaaS** - Software as a Service for businesses (e.g., CRM, project management, analytics tools for businesses)
2. **B2C SaaS** - Software as a Service for consumers (e.g., personal productivity apps, consumer apps with subscription)
3. **AI Tool** - AI-powered software/service (e.g., AI writing assistants, AI image generators, AI code tools)

REJECT if it is:
- Shopping/e-commerce website (Amazon, eBay, online stores)
- Content/blog/news website (unless it's a SaaS tool for creating content)
- Social media platform (unless it's a SaaS tool for managing social media)
- Entertainment/media website
- Educational course platform (unless it's a SaaS tool for creating courses)
- Any non-SaaS website

Be STRICT. Only accept if it's clearly a SaaS tool or AI tool that solves a specific problem.

Return ONLY a valid JSON object:
{
  "isRelevant": true/false,
  "reason": "Brief explanation",
  "toolType": "B2B SaaS" | "B2C SaaS" | "AI Tool" | "Not Relevant"
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a strict validator. Only accept B2B SaaS, B2C SaaS, or AI tools. Reject everything else. Return valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2, // Lower temperature for stricter validation
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return {
      isRelevant: false,
      reason: 'Failed to validate tool relevance',
      toolType: 'Not Relevant',
    };
  }

  try {
    const result = JSON.parse(content) as RelevanceCheck;
    
    // Ensure isRelevant is boolean
    if (typeof result.isRelevant !== 'boolean') {
      return {
        isRelevant: false,
        reason: 'Invalid validation response',
        toolType: 'Not Relevant',
      };
    }

    return result;
  } catch (error) {
    return {
      isRelevant: false,
      reason: 'Failed to parse validation response',
      toolType: 'Not Relevant',
    };
  }
}

