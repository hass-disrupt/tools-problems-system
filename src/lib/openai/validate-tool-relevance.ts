import OpenAI from 'openai';
import { getPrompt, interpolatePrompt } from '@/lib/prompts/prompt-manager';

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
  const promptConfig = await getPrompt('validate-relevance');
  const userPrompt = interpolatePrompt(promptConfig.user_prompt_template, {
    url,
    websiteContent,
  });

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: promptConfig.system_prompt,
      },
      {
        role: 'user',
        content: userPrompt,
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

