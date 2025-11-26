import { createClient } from '@/lib/supabase/server';
import { extractToolInfoFromUrl } from '@/lib/openai/extract-tool-info';
import { validateToolRelevance } from '@/lib/openai/validate-tool-relevance';

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

export interface AddToolResult {
  success: boolean;
  tool?: any;
  error?: string;
  reason?: string;
  details?: string;
  code?: string;
}

/**
 * Add a tool to the database (extracted logic from API route)
 */
export async function addTool(url: string): Promise<AddToolResult> {
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return {
        success: false,
        error: 'Invalid URL format',
      };
    }

    const supabase = await createClient();

    // Check if tool already exists
    const { data: existingTool, error: checkError } = await supabase
      .from('tools')
      .select('id, title, created_at')
      .eq('url', url)
      .single();

    // Handle case where table doesn't exist
    if (checkError && (checkError.code === '42P01' || checkError.message?.includes('does not exist'))) {
      return {
        success: false,
        error: 'Database tables not found. Please run the migration in Supabase SQL Editor.',
        details: 'The tools table does not exist. Run the SQL from supabase/migrations/001_create_tables.sql',
      };
    }

    if (existingTool) {
      return {
        success: false,
        error: 'Tool with this URL already exists',
        code: '23505',
        tool: existingTool, // Include existing tool info for fun message
      };
    }

    // Fetch website content for validation
    let websiteContent = '';
    try {
      const fetchResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      const html = await fetchResponse.text();
      websiteContent = extractTextFromHtml(html);
    } catch (fetchError) {
      return {
        success: false,
        error: 'Failed to fetch website content',
        details: 'Could not access the website. Please check the URL is accessible.',
      };
    }

    // Validate tool relevance BEFORE extraction
    const relevanceCheck = await validateToolRelevance(url, websiteContent);

    if (!relevanceCheck.isRelevant) {
      return {
        success: false,
        error: 'Tool rejected - not a relevant SaaS or AI tool',
        reason: relevanceCheck.reason || 'This website is not a B2B SaaS, B2C SaaS, or AI tool',
        details: 'We only accept B2B SaaS tools, B2C SaaS tools, or AI tools. Shopping websites, e-commerce stores, and other irrelevant sites are not allowed.',
      };
    }

    // Extract tool information using OpenAI (pass websiteContent to avoid duplicate fetch)
    const toolInfo = await extractToolInfoFromUrl(url, websiteContent);

    // Insert into database
    const { data: newTool, error: insertError } = await supabase
      .from('tools')
      .insert({
        url,
        ...toolInfo,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting tool:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });

      // Check if it's a table missing error
      if (insertError.code === '42P01' || insertError.message?.includes('does not exist')) {
        return {
          success: false,
          error: 'Database tables not found. Please run the migration in Supabase SQL Editor.',
          details: 'The tools table does not exist. Run the SQL from supabase/migrations/001_create_tables.sql',
        };
      }

      // Check if it's a duplicate key error (race condition)
      if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
        return {
          success: false,
          error: 'Tool with this URL already exists',
          code: '23505',
        };
      }

      return {
        success: false,
        error: 'Failed to add tool to database',
        details: insertError.message,
        code: insertError.code,
      };
    }

    return {
      success: true,
      tool: newTool,
    };
  } catch (error) {
    console.error('Error adding tool:', error);
    return {
      success: false,
      error: 'Failed to process tool',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

