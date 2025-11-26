import OpenAI from 'openai';
import { getPrompt, interpolatePrompt } from '@/lib/prompts/prompt-manager';

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

  const promptConfig = await getPrompt('extract-tool-info');
  const userPrompt = interpolatePrompt(promptConfig.user_prompt_template, {
    url,
    textContent,
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

