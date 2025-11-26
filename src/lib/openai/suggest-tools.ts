import OpenAI from 'openai';
import { getPrompt, interpolatePrompt } from '@/lib/prompts/prompt-manager';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface SuggestedTool {
  title: string;
  description: string;
  tag: string;
  category: string;
  problem_solves: string;
  who_can_use: string;
  url?: string; // Optional if we can find a URL
}

export async function suggestToolsForProblem(problemDescription: string): Promise<SuggestedTool[] | null> {
  const promptConfig = await getPrompt('suggest-tools');
  const userPrompt = interpolatePrompt(promptConfig.user_prompt_template, {
    problemDescription,
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
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content);
    
    // Check if it's null or has a null value
    if (parsed === null || parsed.tools === null || parsed.result === null) {
      return null;
    }

    // Handle different response formats
    let tools: SuggestedTool[] = [];
    if (Array.isArray(parsed)) {
      tools = parsed;
    } else if (parsed.tools && Array.isArray(parsed.tools)) {
      tools = parsed.tools;
    } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
      tools = parsed.suggestions;
    } else {
      return null;
    }

    // Validate tools have required fields
    const validTools = tools.filter(tool => 
      tool.title && tool.description && tool.tag && 
      tool.category && tool.problem_solves && tool.who_can_use
    );

    return validTools.length > 0 ? validTools : null;
  } catch (error) {
    // If parsing fails, assume no tools found
    return null;
  }
}

