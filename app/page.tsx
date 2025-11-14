'use client';

import { useState, useEffect } from 'react';

interface LinkedInProfile {
  name?: string;
  profileUrl?: string;
  headline?: string;
  [key: string]: any;
}

interface Project {
  id: number;
  name: string;
  createdAt: string;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [linkedinPostUrl, setLinkedinPostUrl] = useState('');
  const [profiles, setProfiles] = useState<LinkedInProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.projects);
        if (data.projects.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data.projects[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setProjects([...projects, data.project]);
        setSelectedProjectId(data.project.id);
        setNewProjectName('');
        setShowNewProjectForm(false);
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProjectId) {
      setError('Please select or create a project first');
      return;
    }

    setLoading(true);
    setError(null);
    setProfiles([]);

    try {
      const response = await fetch('/api/phantombuster', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          linkedinPostUrl,
          projectId: selectedProjectId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show detailed error message if available
        const errorMessage = data.error || 'Failed to scrape profiles';
        const errorDetails = data.details ? ` ${data.details}` : '';
        throw new Error(errorMessage + errorDetails);
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Project Selection
          </h2>
          
          {projects.length > 0 && (
            <div className="mb-4">
              <label
                htmlFor="project-select"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Select Project
              </label>
              <select
                id="project-select"
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={loading}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!showNewProjectForm ? (
            <button
              type="button"
              onClick={() => setShowNewProjectForm(true)}
              className="mb-4 text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
            >
              + Create New Project
            </button>
          ) : (
            <form onSubmit={handleCreateProject} className="mb-4 space-y-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProjectForm(false);
                    setNewProjectName('');
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
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
                onChange={(e) => {
                  setLinkedinPostUrl(e.target.value);
                  // Clear error when user starts typing
                  if (error) setError(null);
                }}
                placeholder="https://www.linkedin.com/posts/..."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
                disabled={loading || !selectedProjectId}
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Note: Pulse posts (linkedin.com/pulse/...) are not supported. LinkedIn limits visibility to 3,000 profiles per post.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !linkedinPostUrl || !selectedProjectId}
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
            {error.includes('session') && (
              <p className="text-red-600 dark:text-red-300 text-sm mt-2">
                💡 Tip: Install the PhantomBuster browser extension and reconnect your LinkedIn account to refresh your session cookie.
              </p>
            )}
            {error.includes('Pulse') && (
              <p className="text-red-600 dark:text-red-300 text-sm mt-2">
                💡 Tip: Use regular LinkedIn posts (linkedin.com/posts/...) instead of Pulse articles.
              </p>
            )}
          </div>
        )}

        {profiles.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Found {profiles.length} Profile{profiles.length !== 1 ? 's' : ''}
              </h2>
              {profiles.length >= 3000 && (
                <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full">
                  LinkedIn's 3,000 profile limit reached
                </span>
              )}
            </div>
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
