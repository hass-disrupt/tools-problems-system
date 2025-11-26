import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ToolInfo {
  title: string;
  description: string;
  tag: string;
  category: string;
  problem_solves: string;
  who_can_use: string;
}

/**
 * Helper function to extract text content from HTML
 */
function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 8000);
}

export async function extractToolInfoFromUrl(url: string, websiteContent?: string): Promise<ToolInfo> {
  // Use provided content or fetch it
  let textContent: string;
  
  if (websiteContent) {
    textContent = extractTextFromHtml(websiteContent);
  } else {
    // Fetch the webpage content if not provided
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const html = await response.text();
    textContent = extractTextFromHtml(html);
  }

  const prompt = `You are analyzing a website/tool at this URL: ${url}

Website content (first 8000 chars):
${textContent}

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
}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a precise tool analyzer. Extract structured information from websites. Always return valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to extract tool information');
  }

  try {
    const toolInfo = JSON.parse(content) as ToolInfo;
    
    // Validate required fields
    if (!toolInfo.title || !toolInfo.description || !toolInfo.tag || 
        !toolInfo.category || !toolInfo.problem_solves || !toolInfo.who_can_use) {
      throw new Error('Missing required fields in extracted information');
    }

    return toolInfo;
  } catch (error) {
    throw new Error(`Failed to parse tool information: ${error}`);
  }
}

