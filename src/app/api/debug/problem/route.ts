import { NextRequest, NextResponse } from 'next/server';
import { matchProblemToTools } from '@/lib/matching/match-problem';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { description, userId, userName } = await request.json();

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Problem description is required' },
        { status: 400 }
      );
    }

    console.log('[DEBUG] Processing problem submission:', { description, userId, userName });

    const supabase = await createClient();

    // Run matching logic
    console.log('[DEBUG] Starting problem matching...');
    let matchResult;
    try {
      matchResult = await matchProblemToTools(description.trim());
      console.log('[DEBUG] Matching completed:', {
        status: matchResult.status,
        matchedToolId: matchResult.matchedToolId,
        suggestedToolsCount: matchResult.suggestedTools?.length || 0,
      });
    } catch (matchError) {
      console.error('[DEBUG] Error during problem matching:', matchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Matching failed',
          details: matchError instanceof Error ? matchError.message : 'Unknown error',
          matchError: matchError instanceof Error ? {
            message: matchError.message,
            stack: matchError.stack,
            name: matchError.name
          } : matchError
        },
        { status: 500 }
      );
    }

    // Prepare insert data
    const insertData = {
      description: description.trim(),
      status: matchResult.status === 'solved' ? 'solved' : 
              matchResult.status === 'suggested' ? 'pending' : 
              'opportunity',
      matched_tool_id: matchResult.matchedToolId || null,
    };
    console.log('[DEBUG] Preparing to insert problem:', insertData);

    // Insert problem into database
    console.log('[DEBUG] Attempting database insert...');
    const { data: newProblem, error: insertError } = await supabase
      .from('problems')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[DEBUG] Error inserting problem:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Database insertion failed',
          insertError: {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
          },
          matchResult,
        },
        { status: 500 }
      );
    }

    if (!newProblem) {
      console.error('[DEBUG] Database insert returned no data and no error');
      return NextResponse.json(
        {
          success: false,
          error: 'Database insert returned no data',
          matchResult,
        },
        { status: 500 }
      );
    }

    console.log('[DEBUG] Problem successfully inserted:', {
      problemId: newProblem.id,
      status: newProblem.status,
    });

    // Fetch matched tool details if available
    let matchedTool = null;
    if (matchResult.status === 'solved' && newProblem.matched_tool_id) {
      console.log('[DEBUG] Fetching matched tool details...');
      const { data: tool, error: toolError } = await supabase
        .from('tools')
        .select('id, title, url, description, problem_solves, who_can_use, category')
        .eq('id', newProblem.matched_tool_id)
        .single();

      if (toolError) {
        console.error('[DEBUG] Error fetching matched tool:', toolError);
      } else {
        matchedTool = tool;
        console.log('[DEBUG] Matched tool fetched:', { toolId: tool?.id, title: tool?.title });
      }
    }

    return NextResponse.json(
      {
        success: true,
        problem: newProblem,
        matchResult,
        matchedTool,
        userId,
        userName,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[DEBUG] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error
      },
      { status: 500 }
    );
  }
}

