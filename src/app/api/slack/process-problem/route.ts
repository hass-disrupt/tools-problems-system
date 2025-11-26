import { NextRequest, NextResponse } from 'next/server';
import { matchProblemToTools } from '@/lib/matching/match-problem';
import { createClient } from '@/lib/supabase/server';

/**
 * Extended timeout for OpenAI API calls
 * Vercel Hobby: max 10s, Pro: max 60s
 * Setting to 30s to allow for OpenAI processing time
 */
export const maxDuration = 30;

/**
 * Separate endpoint to process problem submission asynchronously
 * Called from the Slack handler to ensure it runs in a separate function context
 */
export async function POST(request: NextRequest) {
  let responseUrl: string | null = null;
  let problemDescription: string | undefined;
  
  try {
    console.log('[PROCESS-PROBLEM] Endpoint called - starting request processing');
    
    const body = await request.json();
    console.log('[PROCESS-PROBLEM] Request body received:', {
      hasProblemDescription: !!body.problemDescription,
      hasResponseUrl: !!body.responseUrl,
      hasUserId: !!body.userId,
      hasUserName: !!body.userName,
      problemDescriptionPreview: body.problemDescription?.substring(0, 50)
    });
    
    const { problemDescription: desc, responseUrl: urlFromBody, userId, userName } = body;
    problemDescription = desc;
    responseUrl = urlFromBody;

    if (!problemDescription || !responseUrl) {
      console.error('[PROCESS-PROBLEM] Missing required fields:', {
        hasProblemDescription: !!problemDescription,
        hasResponseUrl: !!responseUrl
      });
      return NextResponse.json(
        { error: 'Missing problemDescription or responseUrl' },
        { status: 400 }
      );
    }

    console.log('[PROCESS-PROBLEM] Processing problem submission:', { 
      problemDescription: problemDescription.substring(0, 100), 
      userId, 
      userName 
    });
    
    const supabase = await createClient();
    
    // Declare progressTimeout outside try block so it can be cleared in catch
    let progressTimeout: NodeJS.Timeout | undefined;
    
    // Send progress update after 8 seconds if still processing
    progressTimeout = setTimeout(async () => {
      if (!responseUrl) {
        console.log('[PROCESS-PROBLEM] Skipping progress update - no responseUrl');
        return;
      }
      try {
        console.log('[PROCESS-PROBLEM] Sending progress update to Slack (processing taking longer than expected)');
        await fetch(responseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            response_type: 'ephemeral',
            text: '⏳ Still processing your problem... This may take a bit longer as we search for the best solutions.'
          })
        });
      } catch (progressError) {
        console.error('[PROCESS-PROBLEM] Failed to send progress update:', progressError);
      }
    }, 8000);
    
    // Run matching logic with timeout handling
    console.log('[PROCESS-PROBLEM] Starting problem matching...');
    let matchResult;
    const matchingTimeout = 25000; // 25 seconds timeout for matching (leaving 5s buffer)
    
    try {
      // Wrap matching in a timeout promise
      const matchingPromise = matchProblemToTools(problemDescription.trim());
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Matching timeout: OpenAI API calls took too long')), matchingTimeout);
      });
      
      matchResult = await Promise.race([matchingPromise, timeoutPromise]);
      
      clearTimeout(progressTimeout); // Clear progress update if matching completes
      
      console.log('[PROCESS-PROBLEM] Matching completed successfully:', {
        status: matchResult.status,
        matchedToolId: matchResult.matchedToolId,
        suggestedToolsCount: matchResult.suggestedTools?.length || 0,
        message: matchResult.message
      });
    } catch (matchError) {
      clearTimeout(progressTimeout); // Clear progress update on error
      
      const isTimeout = matchError instanceof Error && matchError.message.includes('timeout');
      
      console.error('[PROCESS-PROBLEM] Error during problem matching:', {
        error: matchError,
        message: matchError instanceof Error ? matchError.message : 'Unknown error',
        stack: matchError instanceof Error ? matchError.stack : undefined,
        name: matchError instanceof Error ? matchError.name : undefined,
        isTimeout
      });
      
      // If timeout, create fallback match result and continue
      if (isTimeout) {
        console.log('[PROCESS-PROBLEM] Matching timed out, using fallback result');
        matchResult = {
          status: 'opportunity',
          message: 'Processing timed out while searching for solutions. Your problem has been saved and will be reviewed manually.'
        };
      } else {
        throw matchError;
      }
    }
    
    // Prepare insert data
    const insertData = {
      description: problemDescription.trim(),
      status: matchResult.status === 'solved' ? 'solved' : 
              matchResult.status === 'suggested' ? 'pending' : 
              'opportunity',
      matched_tool_id: matchResult.matchedToolId || null,
    };
    console.log('Preparing to insert problem into database:', insertData);
    
    // Insert problem into database
    console.log('Attempting database insert...');
    const { data: newProblem, error: insertError } = await supabase
      .from('problems')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting problem - Full error details:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        error: insertError
      });
      
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
                  text: `❌ *Error Processing Problem*\n\nFailed to save problem: ${insertError.message}`
                }
              }
            ]
          })
        });
      } catch (slackError) {
        console.error('Failed to send error response to Slack:', {
          error: slackError,
          message: slackError instanceof Error ? slackError.message : 'Unknown error'
        });
      }
      
      return NextResponse.json({ success: false, error: 'Database insertion failed', insertError });
    }

    if (!newProblem) {
      console.error('Database insert returned no data and no error - this is unexpected');
      throw new Error('Database insert returned no data');
    }

    console.log('Problem successfully inserted into database:', {
      problemId: newProblem.id,
      description: newProblem.description,
      status: newProblem.status,
      matched_tool_id: newProblem.matched_tool_id,
      created_at: newProblem.created_at,
      fullProblem: newProblem
    });

    const apiData = {
      success: true,
      problem: newProblem,
      match: matchResult,
    };

    const problemId = apiData.problem?.id;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      'https://tools-problems-system.vercel.app';
    const problemsPageUrl = `${baseUrl}/problems`;
    
    // Build header block with user info
    const headerText = userId 
      ? `*🔍 Problem Flagged by <@${userId}>${userName ? ` (${userName})` : ''}*\n\n*Problem:*\n${problemDescription}`
      : `*🔍 Problem Flagged*\n\n*Problem:*\n${problemDescription}`;

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚩 New Problem Submitted',
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: headerText
        }
      }
    ];

    // Handle different match results
    if (matchResult.status === 'solved' && apiData.problem?.matched_tool_id) {
      console.log('Fetching matched tool details...', { toolId: apiData.problem.matched_tool_id });
      // Fetch tool details directly from database
      const { data: matchedTool, error: toolError } = await supabase
        .from('tools')
        .select('id, title, url, description, problem_solves, who_can_use')
        .eq('id', apiData.problem.matched_tool_id)
        .single();
      
      if (toolError) {
        console.error('Error fetching matched tool - Full error details:', {
          message: toolError.message,
          code: toolError.code,
          details: toolError.details,
          hint: toolError.hint,
          toolId: apiData.problem.matched_tool_id,
          error: toolError
        });
      } else {
        console.log('Matched tool fetched successfully:', {
          toolId: matchedTool?.id,
          title: matchedTool?.title
        });
      }

      if (matchedTool && !toolError) {
        blocks.push({
          type: 'divider'
        });
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Solution Found!*\n\nWe found a tool that solves this problem:`
          }
        });
        blocks.push({
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Tool:*\n<${matchedTool.url}|${matchedTool.title}>`
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\n✅ Solved`
            }
          ]
        });
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${matchedTool.description}`
          }
        });
        blocks.push({
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Solves:*\n${matchedTool.problem_solves}`
            },
            {
              type: 'mrkdwn',
              text: `*For:*\n${matchedTool.who_can_use}`
            }
          ]
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
          text: `💡 *Potential Solutions Found*\n\nFound ${matchResult.suggestedTools.length} tool(s) that might solve this problem, but they need URLs to be added:`
        }
      });
      
      matchResult.suggestedTools.slice(0, 3).forEach((tool: any) => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${tool.title}*\n${tool.description}\n\n*Solves:* ${tool.problem_solves}`
          }
        });
      });
    } else if (matchResult.status === 'opportunity') {
      blocks.push({
        type: 'divider'
      });
      
      // Check if this was a timeout case
      const isTimeoutCase = matchResult.message?.includes('timed out');
      
      if (isTimeoutCase) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⏱️ *Processing Timeout*\n\nYour problem has been saved, but the AI search timed out. We'll review it manually and get back to you!`
          }
        });
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `💡 *What happened:*\nThe search for solutions took longer than expected. Your problem is safely stored and will be reviewed by our team.`
          }
        });
      } else {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🚀 *New Opportunity Identified!*\n\nNo existing tool solves this exact problem. This is a great opportunity for a new solution!`
          }
        });
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `💡 *Next Steps:*\n• Research potential solutions\n• Evaluate feasibility\n• Add to development pipeline`
          }
        });
      }
    }

    // Add footer with link to view all problems
    blocks.push({
      type: 'divider'
    });
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `📋 <${problemsPageUrl}|View all problems> • Status: ${matchResult.status === 'solved' ? '✅ Solved' : matchResult.status === 'suggested' ? '⏳ Pending' : '🚀 Opportunity'}`
        }
      ]
    });

    console.log('Preparing Slack response:', { 
      responseUrl, 
      blocksCount: blocks.length,
      problemId: apiData.problem?.id,
      status: matchResult.status
    });
    
    try {
      const slackResponse = await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response_type: 'in_channel',
          blocks
        })
      });

      if (!slackResponse.ok) {
        const errorText = await slackResponse.text();
        console.error('Failed to send response to Slack - Full error details:', {
          status: slackResponse.status,
          statusText: slackResponse.statusText,
          body: errorText,
          responseUrl,
          problemId: apiData.problem?.id
        });
      } else {
        console.log('Successfully sent response to Slack:', {
          status: slackResponse.status,
          problemId: apiData.problem?.id
        });
      }
    } catch (slackFetchError) {
      console.error('Exception while sending response to Slack:', {
        error: slackFetchError,
        message: slackFetchError instanceof Error ? slackFetchError.message : 'Unknown error',
        stack: slackFetchError instanceof Error ? slackFetchError.stack : undefined,
        responseUrl,
        problemId: apiData.problem?.id
      });
      // Don't throw - problem was successfully saved, just Slack notification failed
    }
    
    return NextResponse.json({ success: true, problem: newProblem, match: matchResult });
  } catch (error) {
    // Clear progress timeout if still pending
    if (typeof progressTimeout !== 'undefined') {
      clearTimeout(progressTimeout);
    }
    
    console.error('[PROCESS-PROBLEM] Error processing problem submission:', error);
    console.error('[PROCESS-PROBLEM] Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
    
    // Try to save problem even on error (if not already saved)
    let problemSaved = false;
    if (responseUrl && !isTimeout) {
      try {
        const supabase = await createClient();
        const { data: savedProblem } = await supabase
          .from('problems')
          .insert({
            description: problemDescription || 'Unknown problem',
            status: 'pending',
            matched_tool_id: null,
          })
          .select()
          .single();
        
        if (savedProblem) {
          problemSaved = true;
          console.log('[PROCESS-PROBLEM] Problem saved as fallback despite error:', savedProblem.id);
        }
      } catch (saveError) {
        console.error('[PROCESS-PROBLEM] Failed to save problem as fallback:', saveError);
      }
    }
    
    // Try to send error to Slack if responseUrl is available
    if (responseUrl) {
      try {
        const errorText = isTimeout
          ? `⏱️ *Processing Timeout*\n\nYour problem ${problemSaved ? 'has been saved' : 'could not be saved'} due to a timeout. Please try again or contact support.`
          : `❌ *Error*\n\nAn error occurred while processing your problem: ${errorMessage}\n\n${problemSaved ? 'Your problem has been saved and will be reviewed manually.' : 'Please try again later.'}`;
        
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
                  text: errorText
                }
              }
            ]
          })
        });
      } catch (fetchError) {
        console.error('[PROCESS-PROBLEM] Failed to send error response to Slack:', fetchError);
      }
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage, problemSaved },
      { status: 500 }
    );
  }
}

