"use client";

import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [projectDescription, setProjectDescription] = useState("");

  const handleBuild = () => {
    if (!projectDescription.trim()) return;

    // Navigate to build page with project description
    router.push(`/build?desc=${encodeURIComponent(projectDescription)}`);
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
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
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

          {/* Features */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Instant Generation</h3>
              <p className="text-gray-400">Your app is built in real-time as you describe it. See changes instantly.</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-600 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Production Ready</h3>
              <p className="text-gray-400">Get clean, modern code using Next.js, React, and Tailwind CSS.</p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Beautiful UI</h3>
              <p className="text-gray-400">Every app comes with a modern, responsive design that looks great on all devices.</p>
            </div>
          </div>

          {/* Powered by */}
          <div className="mt-16 text-center">
            <p className="text-sm text-gray-500">
              Powered by Claude AI and Blaxel Sandboxes
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}