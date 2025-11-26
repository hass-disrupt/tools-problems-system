import { NextRequest, NextResponse } from 'next/server';
import { addTool } from '@/lib/tools/add-tool';

/**
 * Separate endpoint to process tool addition asynchronously
 * Called from the Slack handler to ensure it runs in a separate function context
 */
export async function POST(request: NextRequest) {
  let responseUrl: string | null = null;
  
  try {
    const body = await request.json();
    const { url, responseUrl: urlFromBody } = body;
    responseUrl = urlFromBody;

    if (!url || !responseUrl) {
      return NextResponse.json(
        { error: 'Missing url or responseUrl' },
        { status: 400 }
      );
    }

    console.log('Processing tool addition for URL:', url);

    // Call the internal function directly
    const result = await addTool(url);
    console.log('Tool addition result:', result.success ? 'Success' : 'Failed');

    if (!result.success) {
      // Handle different error types
      let errorMessage = 'Failed to add tool.';
      let useBlocks = false;
      let blocks: any[] = [];
      
      if (result.error?.includes('rejected')) {
        errorMessage = `❌ Tool rejected: ${result.reason || result.details || result.error}`;
      } else if (result.error?.includes('already exists') || result.code === '23505') {
        // Fun message for duplicate tools
        const existingTool = result.tool;
        const toolTitle = existingTool?.title || 'this tool';
        const createdDate = existingTool?.created_at 
          ? new Date(existingTool.created_at).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })
          : 'previously';
        
        const funMessages = [
          `🎯 *Nice try!* Someone else already added ${toolTitle} on ${createdDate}. Great minds think alike! 🧠✨`,
          `🔄 *Oops!* ${toolTitle} was already added on ${createdDate}. You're not the first to discover this gem! 💎`,
          `👀 *Already in the collection!* Someone beat you to adding ${toolTitle} on ${createdDate}. But hey, you've got great taste! 👏`,
          `🎪 *Plot twist!* ${toolTitle} is already in our database (added ${createdDate}). You're clearly on the right track! 🚀`,
          `🎨 *Duplicate detected!* ${toolTitle} was added on ${createdDate}. No worries - you're still awesome for trying! 🌟`
        ];
        
        const randomMessage = funMessages[Math.floor(Math.random() * funMessages.length)];
        
        useBlocks = true;
        blocks = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: randomMessage
            }
          }
        ];
        errorMessage = randomMessage; // Fallback for text
      } else {
        errorMessage = `❌ Error: ${result.error || result.details || 'Unknown error'}`;
      }

      const slackResponse = await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          ...(useBlocks ? { blocks } : { text: errorMessage })
        })
      });
      
      if (!slackResponse.ok) {
        console.error('Failed to send error response to Slack:', await slackResponse.text());
      }
      
      return NextResponse.json({ success: false, error: errorMessage });
    }

    // Success response
    const tool = result.tool;
    console.log('Sending success response to Slack via response_url');
    
    const slackResponse = await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'in_channel',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🎉 *You are awesome! Thanks for adding this tool!* Looks pretty cool! ✨\n\n*${tool.title}*\n${tool.description}\n\n*Category:* ${tool.category}\n*Solves:* ${tool.problem_solves}\n*For:* ${tool.who_can_use}\n\n<${tool.url}|Visit Tool →>`
            }
          }
        ]
      })
    });
    
    if (!slackResponse.ok) {
      console.error('Failed to send response to Slack:', await slackResponse.text());
      return NextResponse.json({ success: false, error: 'Failed to send response to Slack' });
    }
    
    console.log('Successfully sent response to Slack');
    return NextResponse.json({ success: true, tool });
  } catch (error) {
    console.error('Error processing tool addition:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Try to send error to Slack if responseUrl is available
    if (responseUrl) {
      try {
        await fetch(responseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            response_type: 'ephemeral',
            text: `❌ An error occurred while processing your tool: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`
          })
        });
      } catch (fetchError) {
        console.error('Failed to send error response to Slack:', fetchError);
      }
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

