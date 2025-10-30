"use client";

import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const [projectDescription, setProjectDescription] = useState("");
  const [existingProjects, setExistingProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Load existing projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects', {
          cache: 'no-store',
        });
        if (response.ok) {
          const { projects } = await response.json();
          setExistingProjects(projects);
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  const handleBuild = async () => {
    if (!projectDescription.trim()) return;

    try {
      // Create a new project
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: projectDescription,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const { project } = await response.json();

      // Navigate to project page
      router.push(`/projects/${project.id}?desc=${encodeURIComponent(projectDescription)}`);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    if (!confirm(`Are you sure you want to delete "${projectName}"? This will also delete the associated sandbox and cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Remove from local state
      setExistingProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-black">
      {/* Navbar */}
      <Navbar />

      {/* Background gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-orange-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_70%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8">
        {/* Hero Section Container */}
        <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-8">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-4">
              Build apps with
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                AI in seconds
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-300 mb-2 max-w-3xl mx-auto">
              Describe your app idea and watch it come to life instantly.
            </p>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              No coding required. Just tell me what you want to build.
            </p>
          </div>

          {/* Input Section */}
          <div className="relative max-w-3xl mx-auto">
            <div className="relative bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-800 shadow-2xl p-2">
              {/* Textarea */}
              <textarea
                placeholder="Describe your app idea... (e.g., 'A todo app with dark mode' or 'A weather dashboard with charts')"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    e.preventDefault();
                    handleBuild();
                  }
                }}
                className="w-full px-6 py-4 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg resize-none min-h-[120px] font-normal"
                rows={3}
              />

              {/* Build button */}
              <div className="flex justify-end items-center px-2 pb-2">
                <span className="text-xs text-gray-500 mr-4">Press Ctrl+Enter to build</span>
                <button
                  onClick={handleBuild}
                  disabled={!projectDescription.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 text-white rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                >
                  Build My App
                </button>
              </div>
            </div>

            {/* Example prompts */}
            <div className="mt-8 space-y-3">
              <p className="text-sm text-gray-500 mb-3">Try these examples:</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setProjectDescription("A beautiful task manager with categories, due dates, and progress tracking")}
                  className="px-4 py-2 text-sm text-gray-300 bg-gray-800/50 backdrop-blur-sm rounded-xl hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  Task Manager
                </button>
                <button
                  onClick={() => setProjectDescription("A modern blog platform with markdown support and a clean reading experience")}
                  className="px-4 py-2 text-sm text-gray-300 bg-gray-800/50 backdrop-blur-sm rounded-xl hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  Blog Platform
                </button>
                <button
                  onClick={() => setProjectDescription("A real-time chat application with rooms and user avatars")}
                  className="px-4 py-2 text-sm text-gray-300 bg-gray-800/50 backdrop-blur-sm rounded-xl hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  Chat App
                </button>
                <button
                  onClick={() => setProjectDescription("An expense tracker with charts, categories, and monthly budgets")}
                  className="px-4 py-2 text-sm text-gray-300 bg-gray-800/50 backdrop-blur-sm rounded-xl hover:bg-gray-700/50 transition-colors border border-gray-700"
                >
                  Expense Tracker
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Existing Projects Section - Outside hero container */}
        {existingProjects.length > 0 && (
          <div className="w-full py-20">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-3">Your Projects</h2>
                <p className="text-gray-400 text-lg">Continue working on your existing projects</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {existingProjects.slice(0, 6).map((project) => (
                  <div
                    key={project.id}
                    className="relative p-6 bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 hover:border-purple-600 transition-all group cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteProject(project.id, project.name, e)}
                      className="absolute top-3 right-3 p-1.5 bg-gray-900/80 hover:bg-red-600 text-gray-400 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                      title="Delete project"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      {project.sandboxId && (
                        <div className="w-2 h-2 bg-green-400 rounded-full" title="Active sandbox"></div>
                      )}
                    </div>
                    <h3 className="text-white font-semibold mb-2 line-clamp-1 group-hover:text-purple-400 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                      {project.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                      <span className="text-purple-400 group-hover:text-purple-300">
                        Open →
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {existingProjects.length > 6 && (
                <div className="text-center mt-8">
                  <p className="text-gray-500">
                    and {existingProjects.length - 6} more projects
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Powered by */}
        <div className="w-full py-12 text-center">
          <p className="text-sm text-gray-500">
            Powered by Claude AI and Blaxel Sandboxes
          </p>
        </div>
      </div>
    </main>
  );
}