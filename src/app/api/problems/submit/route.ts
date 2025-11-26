import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { matchProblemToTools } from '@/lib/matching/match-problem';

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Problem description is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Run matching logic
    const matchResult = await matchProblemToTools(description.trim());

    // Insert problem into database
    const { data: newProblem, error: insertError } = await supabase
      .from('problems')
      .insert({
        description: description.trim(),
        status: matchResult.status === 'solved' ? 'solved' : 
                matchResult.status === 'suggested' ? 'pending' : 
                'opportunity',
        matched_tool_id: matchResult.matchedToolId || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting problem:', insertError);
      return NextResponse.json(
        { error: 'Failed to save problem', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        problem: newProblem,
        match: matchResult,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting problem:', error);
    return NextResponse.json(
      {
        error: 'Failed to process problem',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

