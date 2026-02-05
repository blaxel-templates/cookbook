"use client";

import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { fetchWithBasePath, navigateWithBasePath } from "@/lib/basePath";

export default function Home() {
  const router = useRouter();
  const [projectDescription, setProjectDescription] = useState("");
  const [existingProjects, setExistingProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const projectsSectionRef = useRef<HTMLDivElement>(null);

  // Hide scroll indicator on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setShowScrollIndicator(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToProjects = () => {
    setShowScrollIndicator(false);
    projectsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load existing projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetchWithBasePath('/api/projects', {
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
    navigateWithBasePath(router, `/projects/new?desc=${encodeURIComponent(projectDescription)}`);
  };

  const handleDeleteProject = async (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete "${projectName}"? This will also delete the associated sandbox and cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetchWithBasePath(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      setExistingProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0a0a0a]">
      {/* Navbar */}
      <Navbar />

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-950/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.1)_0%,_transparent_50%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 sm:px-6 lg:px-8">
        {/* Hero Section Container */}
        <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-white/5 border border-white/10 text-sm">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>
              <span className="text-gray-400">Powered by Blaxel Sandboxes</span>
            </div>

            {/* Hero Section */}
            <div className="mb-10">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                Build apps with
                <br />
                <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                  AI in seconds
                </span>
              </h1>

              <p className="text-xl text-gray-400 mb-2 max-w-2xl mx-auto">
                Describe your app idea and watch it come to life instantly.
              </p>
              <p className="text-gray-500 max-w-xl mx-auto">
                No coding required. Powered by Claude AI and Blaxel's perpetual sandbox platform.
              </p>
            </div>

            {/* Input Section */}
            <div className="relative max-w-3xl mx-auto">
              <div className="relative bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl shadow-orange-500/5 p-2">
                {/* Textarea */}
                <textarea
                  placeholder="Describe your app idea... (e.g., 'A todo app with dark mode' or 'A weather dashboard with charts')"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleBuild();
                    }
                  }}
                  className="w-full px-6 py-4 bg-transparent text-white placeholder-gray-600 focus:outline-none text-lg resize-none min-h-[120px] font-normal"
                  rows={3}
                />

                {/* Build button */}
                <div className="flex justify-end items-center px-2 pb-2">
                  <span className="text-xs text-gray-600 mr-4">Press ⌘/Ctrl+Enter to build</span>
                  <button
                    onClick={handleBuild}
                    disabled={!projectDescription.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-500/25"
                  >
                    Build My App
                  </button>
                </div>
              </div>

              {/* Example prompts */}
              <div className="mt-8 space-y-3">
                <p className="text-sm text-gray-600 mb-3">Try these examples:</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => setProjectDescription("A beautiful task manager with categories, due dates, and progress tracking")}
                    className="px-4 py-2 text-sm text-gray-400 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-colors border border-white/10"
                  >
                    Task Manager
                  </button>
                  <button
                    onClick={() => setProjectDescription("A modern blog platform with markdown support and a clean reading experience")}
                    className="px-4 py-2 text-sm text-gray-400 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-colors border border-white/10"
                  >
                    Blog Platform
                  </button>
                  <button
                    onClick={() => setProjectDescription("A real-time chat application with rooms and user avatars")}
                    className="px-4 py-2 text-sm text-gray-400 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-colors border border-white/10"
                  >
                    Chat App
                  </button>
                  <button
                    onClick={() => setProjectDescription("An expense tracker with charts, categories, and monthly budgets")}
                    className="px-4 py-2 text-sm text-gray-400 bg-white/5 backdrop-blur-sm rounded-xl hover:bg-white/10 transition-colors border border-white/10"
                  >
                    Expense Tracker
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll indicator when projects exist */}
          {existingProjects.length > 0 && showScrollIndicator && (
            <button
              onClick={scrollToProjects}
              className="mt-12 flex flex-col items-center gap-2 animate-bounce hover:opacity-80 transition-opacity cursor-pointer"
            >
              <span className="text-xs text-gray-500">Your projects</span>
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>

        {/* Existing Projects Section */}
        {existingProjects.length > 0 && (
          <div ref={projectsSectionRef} className="w-full py-20">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-3">Your Projects</h2>
                <p className="text-gray-500 text-lg">Continue working on your existing projects</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {existingProjects.slice(0, 6).map((project) => (
                  <div
                    key={project.id}
                    className="relative p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-orange-500/50 transition-all group cursor-pointer"
                    onClick={() => navigateWithBasePath(router, `/projects/${project.id}`)}
                  >
                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteProject(project.id, project.name, e)}
                      className="absolute top-3 right-3 p-1.5 bg-black/50 hover:bg-red-600 text-gray-400 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 z-10"
                      title="Delete project"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      {project.sandboxId && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-xs text-gray-500">Active</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-white font-semibold mb-2 line-clamp-1 group-hover:text-orange-400 transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                      {project.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                      <span className="text-orange-500 group-hover:text-orange-400">
                        Open →
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {existingProjects.length > 6 && (
                <div className="text-center mt-8">
                  <p className="text-gray-600">
                    and {existingProjects.length - 6} more projects
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="w-full py-20 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">25ms Cold Start</h3>
                <p className="text-gray-500 text-sm">Lightning-fast sandbox creation with Blaxel's perpetual standby architecture</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Secure Sandboxes</h3>
                <p className="text-gray-500 text-sm">Isolated environments for safe AI code execution</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-white font-semibold mb-2">Live Preview</h3>
                <p className="text-gray-500 text-sm">Watch your app update in real-time as AI writes code</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full py-8 border-t border-white/5">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
            <p>
              Powered by <a href="https://blaxel.ai" target="_blank" className="text-orange-500 hover:text-orange-400 transition-colors">Blaxel</a> — The perpetual sandbox platform
            </p>
            <div className="flex items-center gap-6">
              <a href="https://docs.blaxel.ai" target="_blank" className="hover:text-gray-400 transition-colors">Documentation</a>
              <a href="https://github.com/blaxel-ai" target="_blank" className="hover:text-gray-400 transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
