import { NextRequest, NextResponse } from 'next/server';
import { verifySlackRequest } from '@/lib/slack/verify-request';

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
    if (command !== '/problem') {
      return NextResponse.json(
        { 
          response_type: 'ephemeral',
          text: `Unknown command: ${command}` 
        },
        { status: 200 }
      );
    }

    // Validate problem description
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        {
          response_type: 'ephemeral',
          text: 'Please describe your problem. Usage: `/problem I need a tool to convert Figma designs to React components`'
        },
        { status: 200 }
      );
    }

    const problemDescription = text.trim();

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
    const processUrl = `${baseUrl}/api/slack/process-problem`;
    
    console.log('Triggering async problem processing:', {
      baseUrl,
      processUrl,
      problemDescription: problemDescription.substring(0, 50) + '...',
      hasResponseUrl: !!responseUrl,
      userId,
      userName
    });
    
    // Create the fetch promise and ensure it's initiated
    // Use void to explicitly mark as fire-and-forget
    void (async () => {
      try {
        console.log('Initiating fetch to process-problem endpoint...');
        const response = await fetch(processUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            problemDescription, 
            responseUrl, 
            userId, 
            userName 
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Process-problem endpoint returned error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            processUrl
          });
        } else {
          console.log('Process-problem endpoint called successfully:', {
            status: response.status,
            processUrl
          });
        }
      } catch (error) {
        console.error('Failed to trigger async processing:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          processUrl,
          problemDescription: problemDescription.substring(0, 50)
        });
        // Try to send error to Slack
        try {
          await fetch(responseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              response_type: 'ephemeral',
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: '❌ *Error*\n\nAn error occurred while processing your problem. Please try again later.'
                  }
                }
              ]
            })
          });
        } catch (slackError) {
          console.error('Failed to send error notification to Slack:', slackError);
        }
      }
    })();
    
    console.log('Async processing triggered (fire-and-forget), returning response to Slack');

    // Return immediate response
    return NextResponse.json(
      {
        response_type: 'ephemeral',
        text: 'Got it! I\'m searching for tools that solve your problem. This may take a few moments...'
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
