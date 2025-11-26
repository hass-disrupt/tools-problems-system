import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const supabase = await createClient();

    let queryBuilder = supabase
      .from('problems')
      .select(`
        id,
        description,
        status,
        matched_tool_id,
        created_at,
        tools:matched_tool_id (
          id,
          title,
          url,
          description
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by status if provided
    if (status && ['solved', 'pending', 'opportunity'].includes(status)) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    const { data: problems, error } = await queryBuilder;

    if (error) {
      console.error('Error fetching problems:', error);
      return NextResponse.json(
        { error: 'Failed to fetch problems', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        problems: problems || [],
        count: problems?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in problems route:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

