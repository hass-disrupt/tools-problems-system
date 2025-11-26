import { createClient } from '@/lib/supabase/server';

export interface PromptConfig {
  system_prompt: string;
  user_prompt_template: string;
  version: number;
  updated_at: string;
}

// Default prompts as fallback
const DEFAULT_PROMPTS: Record<string, PromptConfig> = {
  'match-problem': {
    system_prompt: 'You are a precise problem-solver matcher. Only match tools that solve the EXACT problem. Return valid JSON array only.',
    user_prompt_template: `A user is facing this problem:

"{problemDescription}"

Here are existing tools in our database:
{toolsList}

Find tools that solve this EXACT problem or a very similar problem. Be HYPER SPECIFIC - only match if the tool solves the precise problem or a very closely related one.

Return a JSON array of matching tool indices (1-based from the list above) that solve this problem. Only include tools that solve the EXACT problem or very similar problems. If no tools match precisely, return an empty array.

Format: [1, 3, 5] (just the indices, no tool names)

Return ONLY valid JSON array. No markdown, no code blocks, no explanations.`,
    version: 1,
    updated_at: new Date().toISOString(),
  },
  'suggest-tools': {
    system_prompt: 'You are a precise tool finder. Only suggest tools that solve the EXACT problem described. Return valid JSON only - either an array of tools or null.',
    user_prompt_template: `A user is facing this specific problem:

"{problemDescription}"

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

Return ONLY valid JSON - either an array of tool objects or null. No markdown, no code blocks, no explanations.`,
    version: 1,
    updated_at: new Date().toISOString(),
  },
  'validate-relevance': {
    system_prompt: 'You are a strict validator. Only accept B2B SaaS, B2C SaaS, or AI tools. Reject everything else. Return valid JSON only.',
    user_prompt_template: `You are a strict validator for a B2B/B2C SaaS and AI tools database.

Website URL: {url}
Website content (first 8000 chars):
{websiteContent}

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
}`,
    version: 1,
    updated_at: new Date().toISOString(),
  },
  'extract-tool-info': {
    system_prompt: 'You are a precise tool analyzer. Extract structured information from websites. Always return valid JSON only.',
    user_prompt_template: `You are analyzing a website/tool at this URL: {url}

Website content (first 8000 chars):
{textContent}

Extract the following information about this tool/website. Be VERY SPECIFIC and PRECISE:

1. **Title**: The exact name/title of the tool or website
2. **Description**: A clear, concise description of what this tool does (2-3 sentences)
3. **Tag**: A single relevant tag/keyword (e.g., "productivity", "design", "development", "marketing")
4. **Category**: The primary category this tool belongs to (e.g., "Design Tools", "Development Tools", "Marketing", "Analytics")
5. **Problem it solves**: Be HYPER SPECIFIC. What exact, precise problem does this tool solve? Not vague descriptions - be very specific about the exact problem. (e.g., "Converts Figma designs to React components automatically" not "helps with design")
6. **Who can use this**: Be specific about the target audience (e.g., "React developers working with Figma", "Content creators needing video editing", "E-commerce store owners")

Return ONLY a valid JSON object with these exact keys (no markdown, no code blocks):
{
  "title": "...",
  "description": "...",
  "tag": "...",
  "category": "...",
  "problem_solves": "...",
  "who_can_use": "..."
}`,
    version: 1,
    updated_at: new Date().toISOString(),
  },
};

/**
 * Get active prompt configuration for a function from database
 * Falls back to default prompts if database fetch fails
 */
export async function getPrompt(functionName: string): Promise<PromptConfig> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('prompts')
      .select('system_prompt, user_prompt_template, version, updated_at')
      .eq('function_name', functionName)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.warn(`Failed to fetch prompt for ${functionName}, using default:`, error?.message);
      return DEFAULT_PROMPTS[functionName] || DEFAULT_PROMPTS['match-problem'];
    }

    return {
      system_prompt: data.system_prompt,
      user_prompt_template: data.user_prompt_template,
      version: data.version,
      updated_at: data.updated_at,
    };
  } catch (error) {
    console.error(`Error fetching prompt for ${functionName}:`, error);
    return DEFAULT_PROMPTS[functionName] || DEFAULT_PROMPTS['match-problem'];
  }
}

/**
 * Interpolate a prompt template with variables
 * Replaces {variableName} with actual values
 */
export function interpolatePrompt(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

/**
 * Get all prompts (for admin/fine-tuning page)
 */
export async function getAllPrompts(): Promise<Array<PromptConfig & { function_name: string }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('prompts')
      .select('function_name, system_prompt, user_prompt_template, version, updated_at')
      .eq('is_active', true)
      .order('function_name');

    if (error || !data) {
      console.warn('Failed to fetch prompts, returning defaults:', error?.message);
      return Object.entries(DEFAULT_PROMPTS).map(([function_name, config]) => ({
        ...config,
        function_name,
      }));
    }

    return data.map((item) => ({
      function_name: item.function_name,
      system_prompt: item.system_prompt,
      user_prompt_template: item.user_prompt_template,
      version: item.version,
      updated_at: item.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching all prompts:', error);
    return Object.entries(DEFAULT_PROMPTS).map(([function_name, config]) => ({
      ...config,
      function_name,
    }));
  }
}

