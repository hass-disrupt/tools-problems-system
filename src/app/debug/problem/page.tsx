'use client';

import { useState } from 'react';
import Link from 'next/link';

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

interface DebugResult {
  success: boolean;
  problem?: {
    id: string;
    description: string;
    status: string;
    matched_tool_id: string | null;
    created_at: string;
  };
  matchResult?: MatchResult;
  matchedTool?: {
    id: string;
    title: string;
    url: string;
    description: string;
    problem_solves: string;
    who_can_use: string;
    category: string;
  };
  userId?: string | null;
  userName?: string | null;
  error?: string;
  insertError?: any;
  matchError?: any;
  errorDetails?: any;
}

export default function DebugProblemPage() {
  const [description, setDescription] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/debug/problem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          userId: userId.trim() || null,
          userName: userName.trim() || null,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 dark:text-blue-400 hover:underline mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-4">
            Debug: Problem Webhook Test
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Test the problem submission flow used by Slack webhooks. Verify database insertion and matching results.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Problem Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., I need a tool to automate product demos"
                required
                rows={4}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="userId" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  User ID (optional - for Slack simulation)
                </label>
                <input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="U09SQ6ZFEQ0"
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="userName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  User Name (optional - for Slack simulation)
                </label>
                <input
                  id="userName"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="hassanain.anver"
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !description.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Processing...' : 'Test Problem Submission'}
            </button>
          </form>
        </div>

        {result && (
          <div className="space-y-6">
            {/* Success/Error Status */}
            <div
              className={`p-4 rounded-lg border ${
                result.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-semibold ${
                  result.success
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {result.success ? '✅ Success' : '❌ Error'}
                </h2>
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
                >
                  {showRawJson ? 'Hide' : 'Show'} Raw JSON
                </button>
              </div>
              {result.error && (
                <p className="mt-2 text-sm text-red-800 dark:text-red-200">{result.error}</p>
              )}
            </div>

            {/* Database Insertion Status */}
            {result.problem ? (
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                  ✅ Database Insertion: Success
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 w-32">Problem ID:</span>
                    <span className="text-zinc-900 dark:text-zinc-50 font-mono">{result.problem.id}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 w-32">Status:</span>
                    <span className="text-zinc-900 dark:text-zinc-50">{result.problem.status}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 w-32">Description:</span>
                    <span className="text-zinc-900 dark:text-zinc-50 flex-1">{result.problem.description}</span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 w-32">Matched Tool ID:</span>
                    <span className="text-zinc-900 dark:text-zinc-50 font-mono">
                      {result.problem.matched_tool_id || 'None'}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 w-32">Created At:</span>
                    <span className="text-zinc-900 dark:text-zinc-50">
                      {new Date(result.problem.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href="/problems"
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    View all problems →
                  </Link>
                </div>
              </div>
            ) : result.insertError ? (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
                <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-4">
                  ❌ Database Insertion: Failed
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-red-800 dark:text-red-200">Message: </span>
                    <span className="text-red-700 dark:text-red-300">{result.insertError.message}</span>
                  </div>
                  {result.insertError.code && (
                    <div>
                      <span className="font-medium text-red-800 dark:text-red-200">Code: </span>
                      <span className="text-red-700 dark:text-red-300 font-mono">{result.insertError.code}</span>
                    </div>
                  )}
                  {result.insertError.details && (
                    <div>
                      <span className="font-medium text-red-800 dark:text-red-200">Details: </span>
                      <span className="text-red-700 dark:text-red-300">{result.insertError.details}</span>
                    </div>
                  )}
                  {result.insertError.hint && (
                    <div>
                      <span className="font-medium text-red-800 dark:text-red-200">Hint: </span>
                      <span className="text-red-700 dark:text-red-300">{result.insertError.hint}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Match Result */}
            {result.matchResult && (
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
                  🔍 Match Result
                </h3>
                <div
                  className={`p-4 rounded-lg mb-4 ${
                    result.matchResult.status === 'solved'
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : result.matchResult.status === 'suggested'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                      : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 w-32">Status:</span>
                      <span className="text-zinc-900 dark:text-zinc-50 font-semibold">
                        {result.matchResult.status}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300 w-32">Message:</span>
                      <span className="text-zinc-900 dark:text-zinc-50 flex-1">{result.matchResult.message}</span>
                    </div>
                    {result.matchResult.matchedToolId && (
                      <div className="flex">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300 w-32">Matched Tool ID:</span>
                        <span className="text-zinc-900 dark:text-zinc-50 font-mono">
                          {result.matchResult.matchedToolId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Matched Tool */}
                {result.matchedTool && (
                  <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">✅ Matched Tool:</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">Title: </span>
                        <span className="text-zinc-900 dark:text-zinc-50">{result.matchedTool.title}</span>
                      </div>
                      {result.matchedTool.url && (
                        <div>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">URL: </span>
                          <a
                            href={result.matchedTool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {result.matchedTool.url}
                          </a>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">Category: </span>
                        <span className="text-zinc-900 dark:text-zinc-50">{result.matchedTool.category}</span>
                      </div>
                      <div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">Solves: </span>
                        <span className="text-zinc-900 dark:text-zinc-50">{result.matchedTool.problem_solves}</span>
                      </div>
                      <div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">For: </span>
                        <span className="text-zinc-900 dark:text-zinc-50">{result.matchedTool.who_can_use}</span>
                      </div>
                      <div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">Description: </span>
                        <span className="text-zinc-900 dark:text-zinc-50">{result.matchedTool.description}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Suggested Tools */}
                {result.matchResult.suggestedTools && result.matchResult.suggestedTools.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                      💡 Suggested Tools ({result.matchResult.suggestedTools.length}):
                    </h4>
                    <div className="space-y-3">
                      {result.matchResult.suggestedTools.map((tool, index) => (
                        <div
                          key={index}
                          className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
                        >
                          <h5 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">{tool.title}</h5>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{tool.description}</p>
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="font-medium text-zinc-700 dark:text-zinc-300">Solves: </span>
                              <span className="text-zinc-600 dark:text-zinc-400">{tool.problem_solves}</span>
                            </div>
                            {tool.url && (
                              <div>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">URL: </span>
                                <a
                                  href={tool.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {tool.url}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Match Error */}
            {result.matchError && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 p-6">
                <h3 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-4">
                  ❌ Matching Error
                </h3>
                <pre className="text-sm text-red-700 dark:text-red-300 overflow-auto">
                  {JSON.stringify(result.matchError, null, 2)}
                </pre>
              </div>
            )}

            {/* User Info */}
            {(result.userId || result.userName) && (
              <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
                  👤 User Info (Slack Simulation)
                </h3>
                <div className="space-y-1 text-sm">
                  {result.userId && (
                    <div>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">User ID: </span>
                      <span className="text-zinc-900 dark:text-zinc-50 font-mono">{result.userId}</span>
                    </div>
                  )}
                  {result.userName && (
                    <div>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">User Name: </span>
                      <span className="text-zinc-900 dark:text-zinc-50">{result.userName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Raw JSON */}
            {showRawJson && (
              <div className="bg-zinc-900 rounded-lg border border-zinc-700 p-6">
                <h3 className="text-lg font-semibold text-zinc-50 mb-4">Raw JSON Response</h3>
                <pre className="text-xs text-zinc-300 overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

