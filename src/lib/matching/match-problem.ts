import { createClient } from '@/lib/supabase/server';
import { findSemanticMatches } from '@/lib/openai/match-problem';
import { suggestToolsForProblem } from '@/lib/openai/suggest-tools';

export interface MatchResult {
  status: 'solved' | 'suggested' | 'opportunity';
  matchedToolId?: string;
  suggestedTools?: Array<{
    title: string;
    description: string;
    tag: string;
    category: string;
    problem_solves: string;
    who_can_use: string;
    url?: string;
  }>;
  message: string;
}

/**
 * Hybrid matching: First keyword search, then semantic matching, then OpenAI suggestions
 */
export async function matchProblemToTools(problemDescription: string): Promise<MatchResult> {
  const supabase = await createClient();

  // Step 1: Keyword search on problem_solves field
  const { data: keywordMatches, error: keywordError } = await supabase
    .from('tools')
    .select('id, title, problem_solves')
    .textSearch('problem_solves', problemDescription, {
      type: 'plain',
      config: 'english',
    })
    .limit(5);

  if (keywordError) {
    console.error('Keyword search error:', keywordError);
  }

  // If we found keyword matches, return the first one
  if (keywordMatches && keywordMatches.length > 0) {
    return {
      status: 'solved',
      matchedToolId: keywordMatches[0].id,
      message: `Found a matching tool: ${keywordMatches[0].title}`,
    };
  }

  // Step 2: Get all tools for semantic matching
  const { data: allTools, error: toolsError } = await supabase
    .from('tools')
    .select('id, title, problem_solves')
    .limit(50); // Limit to avoid token limits

  if (toolsError) {
    console.error('Error fetching tools:', toolsError);
  }

  // Step 3: Try semantic matching if we have tools
  if (allTools && allTools.length > 0) {
    const semanticMatches = await findSemanticMatches(problemDescription, allTools);
    
    if (semanticMatches.length > 0) {
      return {
        status: 'solved',
        matchedToolId: semanticMatches[0].id,
        message: `Found a matching tool: ${semanticMatches[0].title}`,
      };
    }
  }

  // Step 4: Use OpenAI to suggest new tools
  const suggestedTools = await suggestToolsForProblem(problemDescription);

  if (suggestedTools && suggestedTools.length > 0) {
    // Auto-add suggested tools to the database
    const insertedTools = [];
    for (const tool of suggestedTools) {
      // Only insert if URL is provided, otherwise skip insertion but still return suggestion
      if (tool.url) {
        const { data: insertedTool, error: insertError } = await supabase
          .from('tools')
          .insert({
            url: tool.url,
            title: tool.title,
            description: tool.description,
            tag: tool.tag,
            category: tool.category,
            problem_solves: tool.problem_solves,
            who_can_use: tool.who_can_use,
          })
          .select()
          .single();

        if (!insertError && insertedTool) {
          insertedTools.push(insertedTool.id);
        }
      }
    }

    // If we inserted at least one tool, return the first one as matched
    if (insertedTools.length > 0) {
      return {
        status: 'solved',
        matchedToolId: insertedTools[0],
        suggestedTools: suggestedTools,
        message: `Found ${suggestedTools.length} tool(s) that can solve this problem. Added to database.`,
      };
    }

    // Otherwise, return suggestions without matching
    return {
      status: 'suggested',
      suggestedTools: suggestedTools,
      message: `Found ${suggestedTools.length} tool(s) that might solve this problem, but they need URLs to be added.`,
    };
  }

  // Step 5: No solution found - mark as opportunity
  return {
    status: 'opportunity',
    message: 'No existing tool solves this exact problem. This is an opportunity - we will work on this!',
  };
}

