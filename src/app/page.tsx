import Link from 'next/link';
import ToolCard from '@/components/ToolCard';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function getRecentTools() {
  try {
    const supabase = await createClient();
    const { data: tools, error } = await supabase
      .from('tools')
      .select('id, url, title, description, tag, category, problem_solves, who_can_use, created_at')
      .order('created_at', { ascending: false })
      .limit(6);
    
    if (error) {
      console.error('Error fetching tools:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      // If table doesn't exist, return empty array gracefully
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        console.warn('Tools table does not exist. Please run the database migration.');
        return [];
      }
      return [];
    }
    
    return tools || [];
  } catch (error) {
    console.error('Error fetching tools:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return [];
  }
}

export default async function Home() {
  const recentTools = await getRecentTools();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            Tools & Problems System
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8">
            Find tools that solve specific problems, or submit a problem to discover solutions.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/add-tool"
              className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Add a Tool
            </Link>
            <Link
              href="/add-problem"
              className="flex items-center justify-center px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Submit a Problem
            </Link>
            <Link
              href="/problems"
              className="flex items-center justify-center px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              View All Problems
            </Link>
            <Link
              href="/tools"
              className="flex items-center justify-center px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              View All Tools
            </Link>
            <Link
              href="/fine-tuning"
              className="flex items-center justify-center px-6 py-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Fine-Tune Prompts
            </Link>
          </div>
        </div>

        {/* Recent Tools */}
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
            Recent Tools
          </h2>
          
          {recentTools.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-12 text-center">
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                No tools yet. Add your first tool to get started!
              </p>
              <Link
                href="/add-tool"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Add a Tool
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentTools.map((tool: any) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="mt-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-6">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                1. Add Tools
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Submit a URL and our AI will extract detailed information about the tool, including what specific problem it solves.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                2. Submit Problems
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Describe your problem precisely. We'll search for tools that solve your exact problem.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                3. Get Solutions
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                We'll match you with existing tools, suggest new ones, or identify opportunities for new solutions.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
