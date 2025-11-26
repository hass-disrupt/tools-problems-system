import OpenAI from 'openai';

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

  const prompt = `A user is facing this problem:

"${problemDescription}"

Here are existing tools in our database:
${toolsList}

Find tools that solve this EXACT problem or a very similar problem. Be HYPER SPECIFIC - only match if the tool solves the precise problem or a very closely related one.

Return a JSON array of matching tool indices (1-based from the list above) that solve this problem. Only include tools that solve the EXACT problem or very similar problems. If no tools match precisely, return an empty array.

Format: [1, 3, 5] (just the indices, no tool names)

Return ONLY valid JSON array. No markdown, no code blocks, no explanations.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a precise problem-solver matcher. Only match tools that solve the EXACT problem. Return valid JSON array only.',
      },
      {
        role: 'user',
        content: prompt,
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

