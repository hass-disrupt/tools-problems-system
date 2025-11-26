import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const supabase = await createClient();

    let queryBuilder = supabase
      .from('tools')
      .select('id, url, title, description, tag, category, problem_solves, who_can_use, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (query && query.trim().length > 0) {
      // Use text search on problem_solves field
      queryBuilder = queryBuilder.textSearch('problem_solves', query.trim(), {
        type: 'plain',
        config: 'english',
      });
    }

    const { data: tools, error } = await queryBuilder;

    if (error) {
      console.error('Error searching tools:', error);
      return NextResponse.json(
        { error: 'Failed to search tools', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        tools: tools || [],
        count: tools?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in search route:', error);
    return NextResponse.json(
      {
        error: 'Failed to process search',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

