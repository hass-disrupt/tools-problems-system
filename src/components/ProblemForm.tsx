'use client';

import { useState } from 'react';
import ToolCard from './ToolCard';

interface SuggestedTool {
  title: string;
  description: string;
  tag: string;
  category: string;
  problem_solves: string;
  who_can_use: string;
  url?: string;
}

interface MatchResult {
  status: 'solved' | 'suggested' | 'opportunity';
  matchedToolId?: string;
  suggestedTools?: SuggestedTool[];
  message: string;
}

export default function ProblemForm() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchedTool, setMatchedTool] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMatchResult(null);
    setMatchedTool(null);

    try {
      const response = await fetch('/api/problems/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit problem');
      }

      setMatchResult(data.match);

      // If a tool was matched, fetch its full details
      if (data.match.matchedToolId) {
        const toolResponse = await fetch(`/api/tools/search?q=&limit=100`);
        const toolData = await toolResponse.json();
        const tool = toolData.tools?.find((t: any) => t.id === data.match.matchedToolId);
        if (tool) {
          setMatchedTool(tool);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Describe Your Problem
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Be as specific as possible about the problem you're facing..."
            required
            rows={6}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={loading}
          />
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Be very specific about your problem. We'll search for tools that solve this exact problem.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !description.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Searching for solutions...' : 'Find Solution'}
        </button>
      </form>

      {matchResult && (
        <div className="mt-8 space-y-4">
          <div
            className={`p-4 rounded-lg border ${
              matchResult.status === 'solved'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : matchResult.status === 'suggested'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            }`}
          >
            <p
              className={`text-sm font-medium ${
                matchResult.status === 'solved'
                  ? 'text-green-800 dark:text-green-200'
                  : matchResult.status === 'suggested'
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}
            >
              {matchResult.message}
            </p>
          </div>

          {matchedTool && (
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Matching Tool:
              </h3>
              <ToolCard tool={matchedTool} />
            </div>
          )}

          {matchResult.suggestedTools && matchResult.suggestedTools.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                Suggested Tools:
              </h3>
              <div className="space-y-4">
                {matchResult.suggestedTools.map((tool, index) => (
                  <div
                    key={index}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-900"
                  >
                    <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                      {tool.title}
                    </h4>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-4">{tool.description}</p>
                    <div className="space-y-1 text-sm">
                      <div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">Solves: </span>
                        <span className="text-zinc-600 dark:text-zinc-400">{tool.problem_solves}</span>
                      </div>
                      <div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">For: </span>
                        <span className="text-zinc-600 dark:text-zinc-400">{tool.who_can_use}</span>
                      </div>
                      {tool.url && (
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Visit Tool →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

