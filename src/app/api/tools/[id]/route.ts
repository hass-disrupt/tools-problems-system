import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Tool ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if tool exists
    const { data: existingTool, error: checkError } = await supabase
      .from('tools')
      .select('id, title')
      .eq('id', id)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Tool not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to check tool', details: checkError.message },
        { status: 500 }
      );
    }

    if (!existingTool) {
      return NextResponse.json(
        { error: 'Tool not found' },
        { status: 404 }
      );
    }

    // Delete the tool
    // Note: Problems table has ON DELETE SET NULL, so matched_tool_id will be set to null
    const { error: deleteError } = await supabase
      .from('tools')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting tool:', deleteError);
      return NextResponse.json(
        { 
          error: 'Failed to delete tool', 
          details: deleteError.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: `Tool "${existingTool.title}" deleted successfully` 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting tool:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process delete request', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

