import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface Problem {
  id: string;
  description: string;
  status: 'solved' | 'pending' | 'opportunity';
  matched_tool_id: string | null;
  created_at: string;
  tools?: {
    id: string;
    title: string;
    url: string;
    description: string;
  } | null;
}

async function getProblems() {
  try {
    const supabase = await createClient();
    const { data: problems, error } = await supabase
      .from('problems')
      .select(`
        id,
        description,
        status,
        matched_tool_id,
        created_at,
        tools:matched_tool_id (
          id,
          title,
          url,
          description
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching problems:', error);
      return [];
    }

    return (problems || []) as Problem[];
  } catch (error) {
    console.error('Error fetching problems:', error);
    return [];
  }
}

function getStatusBadge(status: string) {
  const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium';
  
  switch (status) {
    case 'solved':
      return (
        <span className={`${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200`}>
          ✅ Solved
        </span>
      );
    case 'pending':
      return (
        <span className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200`}>
          ⏳ Pending
        </span>
      );
    case 'opportunity':
      return (
        <span className={`${baseClasses} bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200`}>
          🚀 Opportunity
        </span>
      );
    default:
      return (
        <span className={`${baseClasses} bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200`}>
          {status}
        </span>
      );
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function ProblemsPage() {
  const problems = await getProblems();

  const statusCounts = {
    solved: problems.filter(p => p.status === 'solved').length,
    pending: problems.filter(p => p.status === 'pending').length,
    opportunity: problems.filter(p => p.status === 'opportunity').length,
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
            All Problems
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-2">
            View all submitted problems and their status.
          </p>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {statusCounts.solved}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Solved</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {statusCounts.pending}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Pending</div>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {statusCounts.opportunity}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Opportunities</div>
          </div>
        </div>

        {/* Problems List */}
        {problems.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-12 text-center">
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              No problems submitted yet.
            </p>
            <Link
              href="/add-problem"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Submit a Problem
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {problems.map((problem) => (
              <div
                key={problem.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <p className="text-zinc-900 dark:text-zinc-50 text-lg mb-2">
                      {problem.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                      <span>{formatDate(problem.created_at)}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {getStatusBadge(problem.status)}
                  </div>
                </div>

                {problem.tools && (
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                          Matched Tool:
                        </h4>
                        <a
                          href={problem.tools.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          {problem.tools.title} →
                        </a>
                        {problem.tools.description && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            {problem.tools.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

