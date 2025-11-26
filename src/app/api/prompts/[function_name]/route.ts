import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPrompt } from '@/lib/prompts/prompt-manager';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ function_name: string }> }
) {
  try {
    const { function_name } = await params;

    if (!function_name) {
      return NextResponse.json(
        { error: 'Function name is required' },
        { status: 400 }
      );
    }

    const prompt = await getPrompt(function_name);

    return NextResponse.json(
      {
        success: true,
        prompt: {
          ...prompt,
          function_name,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch prompt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ function_name: string }> }
) {
  try {
    const { function_name } = await params;
    const body = await request.json();
    const { system_prompt, user_prompt_template } = body;

    if (!function_name) {
      return NextResponse.json(
        { error: 'Function name is required' },
        { status: 400 }
      );
    }

    if (!system_prompt || !user_prompt_template) {
      return NextResponse.json(
        { error: 'system_prompt and user_prompt_template are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if prompt exists
    const { data: existing, error: checkError } = await supabase
      .from('prompts')
      .select('id, version')
      .eq('function_name', function_name)
      .eq('is_active', true)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to check existing prompt', details: checkError.message },
        { status: 500 }
      );
    }

    if (existing) {
      // Update existing prompt and increment version
      const { data, error } = await supabase
        .from('prompts')
        .update({
          system_prompt,
          user_prompt_template,
          version: existing.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('function_name, system_prompt, user_prompt_template, version, updated_at')
        .single();

      if (error) {
        console.error('Error updating prompt:', error);
        return NextResponse.json(
          { error: 'Failed to update prompt', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          prompt: data,
        },
        { status: 200 }
      );
    } else {
      // Create new prompt
      const { data, error } = await supabase
        .from('prompts')
        .insert({
          function_name,
          system_prompt,
          user_prompt_template,
          version: 1,
          is_active: true,
        })
        .select('function_name, system_prompt, user_prompt_template, version, updated_at')
        .single();

      if (error) {
        console.error('Error creating prompt:', error);
        return NextResponse.json(
          { error: 'Failed to create prompt', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          prompt: data,
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

