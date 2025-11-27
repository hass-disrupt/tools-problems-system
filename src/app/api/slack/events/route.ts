import { NextRequest, NextResponse } from 'next/server';
import { verifySlackRequest } from '@/lib/slack/verify-request';

/**
 * Slack Event Subscriptions endpoint
 * Handles events from Slack like app_home_opened
 * 
 * This endpoint:
 * 1. Verifies the URL challenge when Slack first connects
 * 2. Handles app_home_opened events to send welcome messages
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const payload = JSON.parse(body);

    // Get Slack signing secret from environment
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    if (!signingSecret) {
      console.error('[EVENTS] SLACK_SIGNING_SECRET is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify request signature (except for URL verification challenge)
    if (payload.type !== 'url_verification') {
      const timestamp = request.headers.get('x-slack-request-timestamp') || '';
      const signature = request.headers.get('x-slack-signature') || '';
      
      if (!verifySlackRequest(signingSecret, body, timestamp, signature)) {
        console.error('[EVENTS] Invalid request signature');
        return NextResponse.json(
          { error: 'Invalid request signature' },
          { status: 401 }
        );
      }
    }

    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      console.log('[EVENTS] URL verification challenge received');
      return NextResponse.json({ challenge: payload.challenge });
    }

    // Handle event callbacks
    if (payload.type === 'event_callback') {
      const event = payload.event;

      // Handle app_home_opened event
      if (event.type === 'app_home_opened') {
        console.log('[EVENTS] app_home_opened event received:', {
          user: event.user,
          team: payload.team_id,
        });

        // Send welcome message
        await sendWelcomeMessage(event.user);

        // Acknowledge receipt immediately
        return NextResponse.json({ ok: true });
      }

      // Log other events for debugging
      console.log('[EVENTS] Unhandled event type:', event.type);
      return NextResponse.json({ ok: true });
    }

    // Handle other payload types
    console.log('[EVENTS] Unhandled payload type:', payload.type);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[EVENTS] Error processing event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Sends the welcome message to a user when they open the app home
 */
async function sendWelcomeMessage(userId: string) {
  const botToken = process.env.SLACK_BOT_TOKEN;
  
  if (!botToken) {
    console.error('[EVENTS] SLACK_BOT_TOKEN is not set');
    return;
  }

  const welcomeMessage = `:wave: Hey there, I am Gotafix

I help you untangle everyday work problems and point you to the right tools fast.

Just tell me what you are stuck with and I will do the rest.

Try one of these to start:

/problem I need to resize a bunch of images

/problem Slack notifications keep flooding me

/problem I want to turn a video into a transcript

Found a tool you think the team should know about? Add it:

/addtool <link>

You can also explore everything the team has shared here:

https://tools-problems-system.vercel.app

I get smarter every time you talk to me.

Tell me what is slowing you down and I will help you fix it.`;

  try {
    // Open a DM conversation with the user
    const conversationResponse = await fetch('https://slack.com/api/conversations.open', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${botToken}`,
      },
      body: JSON.stringify({
        users: userId,
      }),
    });

    const conversationData = await conversationResponse.json();

    if (!conversationData.ok) {
      console.error('[EVENTS] Failed to open conversation:', conversationData.error);
      return;
    }

    const channelId = conversationData.channel.id;

    // Send the welcome message
    const messageResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${botToken}`,
      },
      body: JSON.stringify({
        channel: channelId,
        text: welcomeMessage,
      }),
    });

    const messageData = await messageResponse.json();

    if (!messageData.ok) {
      console.error('[EVENTS] Failed to send welcome message:', messageData.error);
    } else {
      console.log('[EVENTS] Welcome message sent successfully to user:', userId);
    }
  } catch (error) {
    console.error('[EVENTS] Error sending welcome message:', error);
  }
}

