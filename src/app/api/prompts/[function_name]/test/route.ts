import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { interpolatePrompt } from '@/lib/prompts/prompt-manager';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ function_name: string }> }
) {
  try {
    const { function_name } = await params;
    const body = await request.json();
    const { system_prompt, user_prompt_template, test_variables } = body;

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

    // Interpolate the user prompt template with test variables
    const user_prompt = interpolatePrompt(
      user_prompt_template,
      test_variables || {}
    );

    // Make a test API call to OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: system_prompt,
        },
        {
          role: 'user',
          content: user_prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;

    return NextResponse.json(
      {
        success: true,
        result: {
          response: content,
          usage: completion.usage,
          model: completion.model,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error testing prompt:', error);
    return NextResponse.json(
      {
        error: 'Failed to test prompt',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

