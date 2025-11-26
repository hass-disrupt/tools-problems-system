'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ToolCardProps {
  tool: {
    id: string;
    title: string;
    description: string;
    tag: string;
    category: string;
    problem_solves: string;
    who_can_use: string;
    url: string;
    created_at?: string;
  };
}

export default function ToolCard({ tool }: ToolCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/tools/${tool.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete tool');
      }

      // Refresh the page to show updated list
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 bg-white dark:bg-zinc-900 hover:shadow-lg transition-shadow relative">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 pr-2">
          {tool.title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded">
            {tool.tag}
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={isDeleting}
            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
            title="Delete tool"
            aria-label="Delete tool"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {showConfirm && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
            Are you sure you want to delete this tool?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setError(null);
              }}
              disabled={isDeleting}
              className="px-3 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      
      <p className="text-zinc-600 dark:text-zinc-400 mb-4">
        {tool.description}
      </p>

      <div className="space-y-2 mb-4">
        <div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Category: </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{tool.category}</span>
        </div>
        <div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Solves: </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{tool.problem_solves}</span>
        </div>
        <div>
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">For: </span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{tool.who_can_use}</span>
        </div>
      </div>

      <a
        href={tool.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
      >
        Visit Tool →
      </a>
    </div>
  );
}

