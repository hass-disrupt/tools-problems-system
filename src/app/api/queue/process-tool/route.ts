import { receive } from '@vercel/queue';
import { addTool } from '@/lib/tools/add-tool';

interface ProcessToolMessage {
  url: string;
  responseUrl: string;
}

/**
 * Queue consumer for processing tool additions
 * This endpoint processes messages from the 'process-tool' queue
 */
export async function POST(request: Request) {
  console.log('[QUEUE-PROCESS-TOOL] Consumer endpoint called');
  
  try {
    await receive<ProcessToolMessage>('process-tool', 'processor', async (message, metadata) => {
      console.log('[QUEUE-PROCESS-TOOL] Received message from queue:', {
        messageId: metadata.messageId,
        hasUrl: !!message?.url,
        hasResponseUrl: !!message?.responseUrl
      });

      const { url, responseUrl } = message;

      if (!url || !responseUrl) {
        console.error('[QUEUE-PROCESS-TOOL] Missing required fields:', {
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
            console.error('[QUEUE-PROCESS-TOOL] Failed to send error to Slack:', slackError);
          }
        }
        return;
      }

      console.log('[QUEUE-PROCESS-TOOL] Processing tool addition for URL:', url);

      // Call the internal function directly
      const result = await addTool(url);
      console.log('[QUEUE-PROCESS-TOOL] Tool addition result:', result.success ? 'Success' : 'Failed');

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
          console.error('[QUEUE-PROCESS-TOOL] Failed to send error response to Slack:', {
            status: slackResponse.status,
            statusText: slackResponse.statusText,
            body: errorText
          });
        }
        return;
      }

      // Success response
      const tool = result.tool;
      console.log('[QUEUE-PROCESS-TOOL] Sending success response to Slack via response_url');
      
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
        console.error('[QUEUE-PROCESS-TOOL] Failed to send response to Slack:', {
          status: slackResponse.status,
          statusText: slackResponse.statusText,
          body: errorText
        });
      } else {
        console.log('[QUEUE-PROCESS-TOOL] Successfully sent response to Slack');
      }
    });

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[QUEUE-PROCESS-TOOL] Error in queue consumer:', error);
    console.error('[QUEUE-PROCESS-TOOL] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return new Response('Error processing queue message', { status: 500 });
  }
}

