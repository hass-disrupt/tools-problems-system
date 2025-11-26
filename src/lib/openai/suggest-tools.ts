import OpenAI from 'openai';

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
  const prompt = `A user is facing this specific problem:

"${problemDescription}"

Your task is to find or suggest tools that can solve this EXACT problem. Be HYPER SPECIFIC - the tool must solve this precise problem, not a vague related problem.

Requirements:
1. The tool must solve the EXACT problem described above
2. Be very specific about what problem the tool solves - it must match the user's problem precisely
3. If you cannot find or suggest a tool that solves this exact problem, return null
4. Do not suggest vague or generic tools

If you can find tools that solve this exact problem, return a JSON array with tool objects. Each tool should have:
- title: Name of the tool
- description: What the tool does (2-3 sentences)
- tag: A single relevant tag
- category: The category this tool belongs to
- problem_solves: The EXACT problem this tool solves (must match the user's problem)
- who_can_use: Who should use this tool
- url: If you know a URL, provide it. Otherwise omit this field.

If NO tool exists that solves this exact problem, return: null

Return ONLY valid JSON - either an array of tool objects or null. No markdown, no code blocks, no explanations.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a precise tool finder. Only suggest tools that solve the EXACT problem described. Return valid JSON only - either an array of tools or null.',
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

