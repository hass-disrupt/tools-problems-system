import { NextRequest, NextResponse } from 'next/server';
import { addTool } from '@/lib/tools/add-tool';

/**
 * Separate endpoint to process tool addition asynchronously
 * Called from the Slack handler to ensure it runs in a separate function context
 */
export async function POST(request: NextRequest) {
  let responseUrl: string | null = null;
  let url: string | undefined;
  
  try {
    const body = await request.json();
    url = body.url;
    responseUrl = body.responseUrl;

    if (!url || !responseUrl) {
      console.error('[PROCESS-TOOL] Missing required fields:', {
        hasUrl: !!url,
        hasResponseUrl: !!responseUrl
      });
      
      // Try to send error to Slack if we have responseUrl
      if (responseUrl) {
        try {
          await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              response_type: 'ephemeral',
              text: '❌ Error: Missing required information. Please try again.'
            })
          });
        } catch (slackError) {
          console.error('[PROCESS-TOOL] Failed to send error to Slack:', slackError);
        }
      }
      
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
        const errorText = await slackResponse.text();
        console.error('[PROCESS-TOOL] Failed to send error response to Slack:', {
          status: slackResponse.status,
          statusText: slackResponse.statusText,
          body: errorText
        });
      }
      
      // Always return a response to the caller
      return NextResponse.json({ success: false, error: errorMessage }, { status: 200 });
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
      const errorText = await slackResponse.text();
      console.error('[PROCESS-TOOL] Failed to send response to Slack:', {
        status: slackResponse.status,
        statusText: slackResponse.statusText,
        body: errorText
      });
      // Still return success since tool was added, just Slack notification failed
      return NextResponse.json({ 
        success: true, 
        tool,
        warning: 'Tool added but failed to notify Slack'
      }, { status: 200 });
    }
    
    console.log('[PROCESS-TOOL] Successfully sent response to Slack');
    return NextResponse.json({ success: true, tool }, { status: 200 });
  } catch (error) {
    console.error('[PROCESS-TOOL] Error processing tool addition:', error);
    console.error('[PROCESS-TOOL] Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Always try to send error to Slack if responseUrl is available
    if (responseUrl) {
      try {
        const slackResponse = await fetch(responseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            response_type: 'ephemeral',
            text: `❌ An error occurred while processing your tool: ${errorMessage}. Please try again later.`
          })
        });
        
        if (!slackResponse.ok) {
          console.error('[PROCESS-TOOL] Failed to send error response to Slack:', {
            status: slackResponse.status,
            statusText: slackResponse.statusText
          });
        }
      } catch (fetchError) {
        console.error('[PROCESS-TOOL] Exception while sending error response to Slack:', fetchError);
      }
    } else {
      console.error('[PROCESS-TOOL] No responseUrl available to send error notification');
    }
    
    // Always return a response, even on error
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

