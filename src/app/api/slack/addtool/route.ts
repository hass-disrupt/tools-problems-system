import { NextRequest, NextResponse } from 'next/server';
import { verifySlackRequest } from '@/lib/slack/verify-request';
import { addTool } from '@/lib/tools/add-tool';

/**
 * Process tool addition asynchronously and send result to Slack via response_url
 */
async function processToolAddition(url: string, responseUrl: string) {
  console.log('Starting async tool addition process for URL:', url);
  try {
    // Call the internal function directly instead of HTTP request
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
      return;
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
    } else {
      console.log('Successfully sent response to Slack');
    }
  } catch (error) {
    console.error('Error processing tool addition:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
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
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    
    // Parse form data
    const formData = new URLSearchParams(body);
    const command = formData.get('command');
    const text = formData.get('text');
    const responseUrl = formData.get('response_url');
    const userId = formData.get('user_id');
    const userName = formData.get('user_name');
    
    // Get Slack signing secret from environment
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
      console.error('SLACK_SIGNING_SECRET is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify request signature
    const timestamp = request.headers.get('x-slack-request-timestamp') || '';
    const signature = request.headers.get('x-slack-signature') || '';
    
    if (!verifySlackRequest(signingSecret, body, timestamp, signature)) {
      return NextResponse.json(
        { error: 'Invalid request signature' },
        { status: 401 }
      );
    }

    // Validate command
    if (command !== '/addtool') {
      return NextResponse.json(
        { 
          response_type: 'ephemeral',
          text: `Unknown command: ${command}` 
        },
        { status: 200 }
      );
    }

    // Validate URL
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          response_type: 'ephemeral',
          text: 'Please provide a URL. Usage: `/addtool https://example.com/tool`'
        },
        { status: 200 }
      );
    }

    const url = text.trim();

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        {
          response_type: 'ephemeral',
          text: 'Invalid URL format. Please provide a valid URL.'
        },
        { status: 200 }
      );
    }

    // IMPORTANT: Return immediate response to Slack (within 3 seconds)
    // Then process asynchronously and send result via response_url
    if (!responseUrl) {
      return NextResponse.json(
        {
          response_type: 'ephemeral',
          text: 'Error: Missing response URL'
        },
        { status: 200 }
      );
    }

    // Call separate API endpoint to process asynchronously
    // This ensures it runs in a separate function context in Vercel
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tools-problems-system.vercel.app';
    
    // Fire and forget - don't await
    fetch(`${baseUrl}/api/slack/process-tool`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, responseUrl }),
    }).catch((error) => {
      console.error('Failed to trigger async processing:', error);
      // Try to send error to Slack
      fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          text: '❌ An error occurred while processing your tool. Please try again later.'
        })
      }).catch(console.error);
    });

    // Return immediate response
    return NextResponse.json(
      {
        response_type: 'ephemeral',
        text: 'Got it! I\'m analyzing the URL and adding it to the database. This may take a few moments...'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing Slack command:', error);
    return NextResponse.json(
      {
        response_type: 'ephemeral',
        text: 'An error occurred while processing your request. Please try again later.'
      },
      { status: 200 }
    );
  }
}

