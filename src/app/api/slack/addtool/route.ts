import { NextRequest, NextResponse } from 'next/server';
import { verifySlackRequest } from '@/lib/slack/verify-request';
import { send } from '@vercel/queue';


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

    // Send message to queue for reliable background processing
    console.log('[ADDTOOL] Sending message to process-tool queue:', {
      url,
      hasResponseUrl: !!responseUrl
    });
    
    try {
      await send('process-tool', {
        url,
        responseUrl
      });
      console.log('[ADDTOOL] Message successfully sent to process-tool queue');
    } catch (queueError) {
      console.error('[ADDTOOL] Failed to send message to queue:', {
        error: queueError,
        message: queueError instanceof Error ? queueError.message : 'Unknown error',
        stack: queueError instanceof Error ? queueError.stack : undefined
      });
      // Try to send error to Slack if queue send fails
      try {
        await fetch(responseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            response_type: 'ephemeral',
            text: '❌ An error occurred while processing your tool. Please try again later.'
          })
        });
      } catch (slackError) {
        console.error('[ADDTOOL] Failed to send error notification to Slack:', slackError);
      }
    }

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
    // Always return a response, even on error
    return NextResponse.json(
      {
        response_type: 'ephemeral',
        text: 'An error occurred while processing your request. Please try again later.'
      },
      { status: 200 }
    );
  }
}

