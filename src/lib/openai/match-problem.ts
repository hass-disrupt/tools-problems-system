import OpenAI from 'openai';
import { getPrompt, interpolatePrompt } from '@/lib/prompts/prompt-manager';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ToolMatch {
  id: string;
  title: string;
  problem_solves: string;
  similarity_score?: number;
}

/**
 * Uses OpenAI to find semantic matches between a problem and existing tools
 * Returns tools that solve similar or related problems
 */
export async function findSemanticMatches(
  problemDescription: string,
  existingTools: Array<{ id: string; title: string; problem_solves: string }>
): Promise<ToolMatch[]> {
  if (existingTools.length === 0) {
    return [];
  }

  const toolsList = existingTools
    .map((tool, idx) => `${idx + 1}. ${tool.title}: ${tool.problem_solves}`)
    .join('\n');

  const promptConfig = await getPrompt('match-problem');
  const userPrompt = interpolatePrompt(promptConfig.user_prompt_template, {
    problemDescription,
    toolsList,
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
    return [];
  }

  try {
    const parsed = JSON.parse(content);
    let indices: number[] = [];
    
    if (Array.isArray(parsed)) {
      indices = parsed;
    } else if (parsed.matches && Array.isArray(parsed.matches)) {
      indices = parsed.matches;
    } else if (parsed.indices && Array.isArray(parsed.indices)) {
      indices = parsed.indices;
    }

    // Convert 1-based indices to 0-based and get matching tools
    const matches = indices
      .filter((idx: number) => idx >= 1 && idx <= existingTools.length)
      .map((idx: number) => {
        const tool = existingTools[idx - 1];
        return {
          id: tool.id,
          title: tool.title,
          problem_solves: tool.problem_solves,
        };
      });

    return matches;
  } catch (error) {
    return [];
  }
}

