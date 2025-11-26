import { NextRequest, NextResponse } from 'next/server';
import { verifySlackRequest } from '@/lib/slack/verify-request';

/**
 * Process problem submission asynchronously and send result to Slack via response_url
 */
async function processProblemSubmission(problemDescription: string, responseUrl: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tools-problems-system.vercel.app';
    const apiResponse = await fetch(`${baseUrl}/api/problems/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description: problemDescription }),
    });

    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          text: `❌ Error: ${apiData.error || apiData.details || 'Failed to process problem'}`
        })
      });
      return;
    }

    const matchResult = apiData.match;
    const blocks: any[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Problem Submitted:*\n${problemDescription}`
        }
      }
    ];

    // Handle different match results
    if (matchResult.status === 'solved' && apiData.problem?.matched_tool_id) {
      // Fetch tool details if matched
      const toolResponse = await fetch(`${baseUrl}/api/tools/search?q=&limit=100`);
      const toolData = await toolResponse.json();
      const matchedTool = toolData.tools?.find(
        (t: any) => t.id === apiData.problem.matched_tool_id
      );

      if (matchedTool) {
        blocks.push({
          type: 'divider'
        });
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Found a Matching Tool!*\n\n*${matchedTool.title}*\n${matchedTool.description}\n\n*Solves:* ${matchedTool.problem_solves}\n*For:* ${matchedTool.who_can_use}\n\n<${matchedTool.url}|Visit Tool →>`
          }
        });
      }
    } else if (matchResult.status === 'suggested' && matchResult.suggestedTools) {
      blocks.push({
        type: 'divider'
      });
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💡 *Found ${matchResult.suggestedTools.length} Suggested Tool(s)*\n\nThese tools might solve your problem but need URLs to be added.`
        }
      });
      
      matchResult.suggestedTools.slice(0, 3).forEach((tool: any) => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${tool.title}*\n${tool.description}\n*Solves:* ${tool.problem_solves}`
          }
        });
      });
    } else if (matchResult.status === 'opportunity') {
      blocks.push({
        type: 'divider'
      });
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🚀 *Opportunity Identified!*\n\nNo existing tool solves this exact problem. This is an opportunity - we will work on this!`
        }
      });
    }

    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'in_channel',
        blocks
      })
    });
  } catch (error) {
    console.error('Error processing problem submission:', error);
    await fetch(responseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response_type: 'ephemeral',
        text: '❌ An error occurred while processing your problem. Please try again later.'
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

    // Process asynchronously - don't await
    processProblemSubmission(problemDescription, responseUrl).catch((error) => {
      console.error('Error in async problem processing:', error);
      // Send error via response_url
      fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'ephemeral',
          text: '❌ An error occurred while processing your problem. Please try again later.'
        })
      }).catch(console.error);
    });

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

