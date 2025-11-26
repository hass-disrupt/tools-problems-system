import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Check if tool already exists
    const supabase = await createClient();
    const { data: existingTool, error: checkError } = await supabase
      .from('tools')
      .select('id')
      .eq('url', url)
      .single();

    // Handle case where table doesn't exist
    if (checkError && (checkError.code === '42P01' || checkError.message?.includes('does not exist'))) {
      return NextResponse.json(
        { 
          error: 'Database tables not found. Please run the migration in Supabase SQL Editor.',
          details: 'The tools table does not exist. Run the SQL from supabase/migrations/001_create_tables.sql'
        },
        { status: 500 }
      );
    }

    if (existingTool) {
      return NextResponse.json(
        { error: 'Tool with this URL already exists', toolId: existingTool.id },
        { status: 409 }
      );
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
      return NextResponse.json(
        { 
          error: 'Failed to fetch website content',
          details: 'Could not access the website. Please check the URL is accessible.'
        },
        { status: 400 }
      );
    }

    // Validate tool relevance BEFORE extraction
    const relevanceCheck = await validateToolRelevance(url, websiteContent);
    
    if (!relevanceCheck.isRelevant) {
      return NextResponse.json(
        { 
          error: 'Tool rejected - not a relevant SaaS or AI tool',
          reason: relevanceCheck.reason || 'This website is not a B2B SaaS, B2C SaaS, or AI tool',
          toolType: relevanceCheck.toolType,
          details: 'We only accept B2B SaaS tools, B2C SaaS tools, or AI tools. Shopping websites, e-commerce stores, and other irrelevant sites are not allowed.'
        },
        { status: 400 }
      );
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
        return NextResponse.json(
          { 
            error: 'Database tables not found. Please run the migration in Supabase SQL Editor.',
            details: 'The tools table does not exist. Run the SQL from supabase/migrations/001_create_tables.sql'
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to add tool to database', 
          details: insertError.message,
          code: insertError.code 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        tool: newTool,
        message: 'Tool added successfully' 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding tool:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process tool', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

