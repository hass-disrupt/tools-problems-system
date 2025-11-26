'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PromptEditor from '@/components/PromptEditor';

interface Prompt {
  function_name: string;
  system_prompt: string;
  user_prompt_template: string;
  version: number;
  updated_at: string;
}

export default function FineTuningPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch prompts');
      }

      setPrompts(data.prompts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (functionName: string, systemPrompt: string, userPrompt: string) => {
    const response = await fetch(`/api/prompts/${functionName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_prompt: systemPrompt,
        user_prompt_template: userPrompt,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to save prompts');
    }

    // Update the prompt in the list
    setPrompts((prev) =>
      prev.map((p) =>
        p.function_name === functionName
          ? {
              ...p,
              system_prompt: data.prompt.system_prompt,
              user_prompt_template: data.prompt.user_prompt_template,
              version: data.prompt.version,
              updated_at: data.prompt.updated_at,
            }
          : p
      )
    );
  };

  const functionNames = [
    'match-problem',
    'suggest-tools',
    'validate-relevance',
    'extract-tool-info',
  ];

  const functionDescriptions: Record<string, string> = {
    'match-problem': 'Matches user problems with existing tools in the database',
    'suggest-tools': 'Suggests new tools that could solve a user problem',
    'validate-relevance': 'Validates if a website/tool is relevant for the database',
    'extract-tool-info': 'Extracts structured information from a tool website URL',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <p className="text-zinc-600 dark:text-zinc-400">Loading prompts...</p>
          </div>
        </div>
      </div>
    );
  }

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
            Fine-Tune OpenAI Prompts
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            Improve system and user prompts to get better tool responses for problem answers.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {functionNames.map((functionName) => {
            const prompt = prompts.find((p) => p.function_name === functionName);
            
            if (!prompt) {
              return (
                <div
                  key={functionName}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6"
                >
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 capitalize mb-2">
                    {functionName.replace(/-/g, ' ')}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {functionDescriptions[functionName]}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    Prompt not found. Please run the database migration.
                  </p>
                </div>
              );
            }

            return (
              <div
                key={functionName}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6"
              >
                <div className="mb-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    {functionDescriptions[functionName]}
                  </p>
                </div>
                <PromptEditor
                  functionName={prompt.function_name}
                  initialSystemPrompt={prompt.system_prompt}
                  initialUserPrompt={prompt.user_prompt_template}
                  version={prompt.version}
                  updatedAt={prompt.updated_at}
                  onSave={async (systemPrompt, userPrompt) => {
                    await handleSave(prompt.function_name, systemPrompt, userPrompt);
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
            How to Use
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>
              Edit the system prompt to change the AI's behavior and role
            </li>
            <li>
              Edit the user prompt template to change how problems are presented to the AI
            </li>
            <li>
              Use {'{variableName}'} placeholders in user prompts (e.g., {'{problemDescription}'}, {'{toolsList}'})
            </li>
            <li>
              Click "Test Prompt" to preview how the prompt will work with sample data
            </li>
            <li>
              Click "Save Changes" to update the prompt (version will increment automatically)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

