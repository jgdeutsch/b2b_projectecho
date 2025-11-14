'use client';

import { useState } from 'react';

interface LinkedInProfile {
  name?: string;
  profileUrl?: string;
  headline?: string;
  [key: string]: any;
}

export default function Home() {
  const [linkedinPostUrl, setLinkedinPostUrl] = useState('');
  const [profiles, setProfiles] = useState<LinkedInProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setProfiles([]);

    try {
      const response = await fetch('/api/phantombuster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ linkedinPostUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to scrape profiles');
      }

      // Handle different response formats
      if (Array.isArray(data.profiles)) {
        setProfiles(data.profiles);
      } else if (data.profiles && Array.isArray(data.profiles.profiles)) {
        setProfiles(data.profiles.profiles);
      } else if (data.profiles && typeof data.profiles === 'object') {
        // If it's an object, try to extract array from common keys
        const profilesArray = Object.values(data.profiles).find(
          (val) => Array.isArray(val) && val.length > 0
        ) as LinkedInProfile[] | undefined;
        setProfiles(profilesArray || []);
      } else {
        setProfiles([]);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            LinkedIn Post Reactors Scraper
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Extract all LinkedIn profiles that reacted to a post using PhantomBuster
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="linkedin-url"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                LinkedIn Post URL
              </label>
              <input
                id="linkedin-url"
                type="url"
                value={linkedinPostUrl}
                onChange={(e) => setLinkedinPostUrl(e.target.value)}
                placeholder="https://www.linkedin.com/posts/..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !linkedinPostUrl}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Scraping profiles...' : 'Scrape Reactors'}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
            <p className="text-red-800 dark:text-red-200 font-medium">Error:</p>
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        {profiles.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Found {profiles.length} Profile{profiles.length !== 1 ? 's' : ''}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((profile, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {profile.profileUrl && (
                    <a
                      href={profile.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      {profile.name || 'LinkedIn Profile'}
                    </a>
                  )}
                  {!profile.profileUrl && profile.name && (
                    <p className="font-medium text-gray-900 dark:text-white">
                      {profile.name}
                    </p>
                  )}
                  {profile.headline && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {profile.headline}
                    </p>
                  )}
                  {profile.profileUrl && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 break-all">
                      {profile.profileUrl}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              This may take a few minutes...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
