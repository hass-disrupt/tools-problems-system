'use client';

import { useState } from 'react';

interface PromptEditorProps {
  functionName: string;
  initialSystemPrompt: string;
  initialUserPrompt: string;
  version: number;
  updatedAt: string;
  onSave: (systemPrompt: string, userPrompt: string) => Promise<void>;
}

export default function PromptEditor({
  functionName,
  initialSystemPrompt,
  initialUserPrompt,
  version,
  updatedAt,
  onSave,
}: PromptEditorProps) {
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [userPrompt, setUserPrompt] = useState(initialUserPrompt);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await onSave(systemPrompt, userPrompt);
      setSuccess('Prompts saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompts');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setError(null);
    setTestResult(null);

    try {
      // Determine test variables based on function name
      const variables: Record<string, string> = { ...testVariables };
      
      if (functionName === 'match-problem' && !variables.problemDescription) {
        variables.problemDescription = 'I need to convert Figma designs to React components';
      }
      if (functionName === 'match-problem' && !variables.toolsList) {
        variables.toolsList = '1. Figma to React: Converts Figma designs to React components automatically\n2. Design System: Creates design systems for React';
      }
      if (functionName === 'suggest-tools' && !variables.problemDescription) {
        variables.problemDescription = 'I need to convert Figma designs to React components';
      }
      if (functionName === 'validate-relevance' && !variables.url) {
        variables.url = 'https://example.com';
      }
      if (functionName === 'validate-relevance' && !variables.websiteContent) {
        variables.websiteContent = 'This is a SaaS tool for converting designs to code...';
      }
      if (functionName === 'extract-tool-info' && !variables.url) {
        variables.url = 'https://example.com';
      }
      if (functionName === 'extract-tool-info' && !variables.textContent) {
        variables.textContent = 'Figma to React - Convert your Figma designs to React components automatically...';
      }

      const response = await fetch(`/api/prompts/${functionName}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_prompt: systemPrompt,
          user_prompt_template: userPrompt,
          test_variables: variables,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to test prompt');
      }

      setTestResult(JSON.stringify(data.result, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test prompt');
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    setSystemPrompt(initialSystemPrompt);
    setUserPrompt(initialUserPrompt);
    setError(null);
    setSuccess(null);
    setTestResult(null);
  };

  const hasChanges =
    systemPrompt !== initialSystemPrompt || userPrompt !== initialUserPrompt;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 capitalize">
            {functionName.replace(/-/g, ' ')}
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Version {version} • Last updated: {new Date(updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {isTesting ? 'Testing...' : 'Test Prompt'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Enter system prompt..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            User Prompt Template
            <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
              (Use {'{variableName}'} for placeholders)
            </span>
          </label>
          <textarea
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            rows={12}
            className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Enter user prompt template..."
          />
        </div>
      </div>

      {testResult && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Test Result:
          </h4>
          <pre className="p-4 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-auto text-xs text-zinc-900 dark:text-zinc-50">
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
}

