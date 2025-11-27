export default async function OAuthSuccess({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; team_id?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Installation Successful!
        </h1>
        <p className="text-gray-600 mb-4">
          Your Slack app has been successfully installed to your workspace.
        </p>
        <p className="text-sm text-gray-500">
          You can now use the app in Slack. Try using the <code className="bg-gray-100 px-2 py-1 rounded">/problem</code> or <code className="bg-gray-100 px-2 py-1 rounded">/addtool</code> commands!
        </p>
      </div>
    </div>
  );
}

