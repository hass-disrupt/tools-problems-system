-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT UNIQUE NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for active prompts lookup
CREATE INDEX IF NOT EXISTS idx_prompts_function_active ON prompts(function_name, is_active) WHERE is_active = true;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_prompts_updated_at();

-- Insert default prompts for match-problem
INSERT INTO prompts (function_name, system_prompt, user_prompt_template, version, is_active)
VALUES (
  'match-problem',
  'You are a precise problem-solver matcher. Only match tools that solve the EXACT problem. Return valid JSON array only.',
  'A user is facing this problem:

"{problemDescription}"

Here are existing tools in our database:
{toolsList}

Find tools that solve this EXACT problem or a very similar problem. Be HYPER SPECIFIC - only match if the tool solves the precise problem or a very closely related one.

Return a JSON array of matching tool indices (1-based from the list above) that solve this problem. Only include tools that solve the EXACT problem or very similar problems. If no tools match precisely, return an empty array.

Format: [1, 3, 5] (just the indices, no tool names)

Return ONLY valid JSON array. No markdown, no code blocks, no explanations.',
  1,
  true
) ON CONFLICT (function_name) DO NOTHING;

-- Insert default prompts for suggest-tools
INSERT INTO prompts (function_name, system_prompt, user_prompt_template, version, is_active)
VALUES (
  'suggest-tools',
  'You are a precise tool finder. Only suggest tools that solve the EXACT problem described. Return valid JSON only - either an array of tools or null.',
  'A user is facing this specific problem:

"{problemDescription}"

Your task is to find or suggest tools that can solve this EXACT problem. Be HYPER SPECIFIC - the tool must solve this precise problem, not a vague related problem.

Requirements:
1. The tool must solve the EXACT problem described above
2. Be very specific about what problem the tool solves - it must match the user''s problem precisely
3. If you cannot find or suggest a tool that solves this exact problem, return null
4. Do not suggest vague or generic tools

If you can find tools that solve this exact problem, return a JSON array with tool objects. Each tool should have:
- title: Name of the tool
- description: What the tool does (2-3 sentences)
- tag: A single relevant tag
- category: The category this tool belongs to
- problem_solves: The EXACT problem this tool solves (must match the user''s problem)
- who_can_use: Who should use this tool
- url: If you know a URL, provide it. Otherwise omit this field.

If NO tool exists that solves this exact problem, return: null

Return ONLY valid JSON - either an array of tool objects or null. No markdown, no code blocks, no explanations.',
  1,
  true
) ON CONFLICT (function_name) DO NOTHING;

-- Insert default prompts for validate-relevance
INSERT INTO prompts (function_name, system_prompt, user_prompt_template, version, is_active)
VALUES (
  'validate-relevance',
  'You are a strict validator. Only accept B2B SaaS, B2C SaaS, or AI tools. Reject everything else. Return valid JSON only.',
  'You are a strict validator for a B2B/B2C SaaS and AI tools database.

Website URL: {url}
Website content (first 8000 chars):
{websiteContent}

Determine if this website is:
1. **B2B SaaS** - Software as a Service for businesses (e.g., CRM, project management, analytics tools for businesses)
2. **B2C SaaS** - Software as a Service for consumers (e.g., personal productivity apps, consumer apps with subscription)
3. **AI Tool** - AI-powered software/service (e.g., AI writing assistants, AI image generators, AI code tools)

REJECT if it is:
- Shopping/e-commerce website (Amazon, eBay, online stores)
- Content/blog/news website (unless it''s a SaaS tool for creating content)
- Social media platform (unless it''s a SaaS tool for managing social media)
- Entertainment/media website
- Educational course platform (unless it''s a SaaS tool for creating courses)
- Any non-SaaS website

Be STRICT. Only accept if it''s clearly a SaaS tool or AI tool that solves a specific problem.

Return ONLY a valid JSON object:
{
  "isRelevant": true/false,
  "reason": "Brief explanation",
  "toolType": "B2B SaaS" | "B2C SaaS" | "AI Tool" | "Not Relevant"
}',
  1,
  true
) ON CONFLICT (function_name) DO NOTHING;

-- Insert default prompts for extract-tool-info
INSERT INTO prompts (function_name, system_prompt, user_prompt_template, version, is_active)
VALUES (
  'extract-tool-info',
  'You are a precise tool analyzer. Extract structured information from websites. Always return valid JSON only.',
  'You are analyzing a website/tool at this URL: {url}

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
}',
  1,
  true
) ON CONFLICT (function_name) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access on prompts" ON prompts
  FOR SELECT USING (true);

CREATE POLICY "Allow public update on prompts" ON prompts
  FOR UPDATE USING (true);

CREATE POLICY "Allow public insert on prompts" ON prompts
  FOR INSERT WITH CHECK (true);

