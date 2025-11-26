import { NextRequest, NextResponse } from 'next/server';
import { getAllPrompts } from '@/lib/prompts/prompt-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const prompts = await getAllPrompts();
    return NextResponse.json(
      {
        success: true,
        prompts,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch prompts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

