import { NextRequest, NextResponse } from 'next/server';
import { verifySlackRequest } from '@/lib/slack/verify-request';

/**
 * Process tool addition asynchronously and send result to Slack via response_url
 */
async function processToolAddition(url: string, responseUrl: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tools-problems-system.vercel.app';
    const apiResponse = await fetch(`${baseUrl}/api/tools/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      // Handle different error types
      let errorMessage = 'Failed to add tool.';
      
      if (apiData.error?.includes('rejected')) {
        errorMessage = `❌ Tool rejected: ${apiData.reason || apiData.details || apiData.error}`;
      } else if (apiData.error?.includes('already exists') || apiData.code === '23505') {
        errorMessage = `⚠️ Tool already exists in the database.`;
      } else {
        errorMessage = `❌ Error: ${apiData.error || apiData.details || 'Unknown error'}`;
      }

      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          text: errorMessage
        })
      });
      return;
    }

    // Success response
    const tool = apiData.tool;
    await fetch(responseUrl, {
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
  } catch (error) {
    console.error('Error processing tool addition:', error);
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: '❌ An error occurred while processing your tool. Please try again later.'
      })
    });
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

    // Process asynchronously - don't await
    processToolAddition(url, responseUrl).catch((error) => {
      console.error('Error in async tool processing:', error);
      // Send error via response_url
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

