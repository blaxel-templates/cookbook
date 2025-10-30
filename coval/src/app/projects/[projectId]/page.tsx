"use client";

import { useSearchParams, useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  status?: "created" | "modified" | "deleted";
  isExpanded?: boolean;
  isLoading?: boolean;
}

export default function ProjectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const description = searchParams.get("desc");
  const [logs, setLogs] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ttydUrl, setTtydUrl] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [updateDescription, setUpdateDescription] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "terminal" | "code">("preview");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>("Waiting");
  const [isRefreshingFiles, setIsRefreshingFiles] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          cache: 'no-store',
        });
        if (response.ok) {
          const { project } = await response.json();
          setProjectData(project);
          if (project.previewUrl) setPreviewUrl(project.previewUrl);
          if (project.ttydUrl) setTtydUrl(project.ttydUrl);
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      }
    };
    fetchProject();
  }, [projectId]);

  // Fetch root files from sandbox on mount and when switching to code tab
  useEffect(() => {
    if (projectData?.sandboxId && activeTab === 'code') {
      refreshFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, projectData, activeTab]);

  useEffect(() => {
    // Only auto-generate if:
    // 1. We have a description
    // 2. Not currently generating
    // 3. Project has no sandbox (never been generated)
    if (description && !isGenerating && projectData && !projectData.sandboxId) {
      startGeneration(description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, projectData]);

  const startGeneration = async (desc: string) => {
    setIsGenerating(true);
    setIsComplete(false);
    setCurrentStatus("Thinking");

    // Add user request to logs if it's an update
    if (projectData && projectData.sandboxId) {
      setLogs(prev => [...prev, `\n[USER REQUEST] ${desc}`]);
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: desc,
          projectId: projectId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // Use default
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              setIsGenerating(false);
              setIsComplete(true);
              break;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.log) {
                setLogs((prev) => [...prev, parsed.log]);

                const log = parsed.log.toLowerCase();
                if (log.includes("thinking")) {
                  setCurrentStatus("Thinking");
                } else if (log.includes("generating") || log.includes("creating")) {
                  setCurrentStatus("Building");
                } else if (log.includes("installing")) {
                  setCurrentStatus("Installing");
                } else if (log.includes("starting")) {
                  setCurrentStatus("Starting");
                }
              }

              if (parsed.files) {
                setFiles(parsed.files);
              }

              if (parsed.previewUrl) {
                setPreviewUrl(parsed.previewUrl);
              }

              if (parsed.ttydUrl) {
                setTtydUrl(parsed.ttydUrl);
              }

              // Refresh files after updates
              if (parsed.type === "complete") {
                setTimeout(() => {
                  refreshFiles();
                }, 2000);
              }

              if (parsed.type === "complete") {
                setIsGenerating(false);
                setIsComplete(true);
                setCurrentStatus("Ready");
              }
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        setLogs((prev) => [...prev, "❌ Generation cancelled by user"]);
      } else {
        setLogs((prev) => [...prev, `❌ Error: ${error.message}`]);
      }
      setIsGenerating(false);
    }
  };

  const handleUpdate = () => {
    if (!updateDescription.trim() || isGenerating) return;
    startGeneration(updateDescription);
    setUpdateDescription("");
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectData) return;

    if (!confirm(`Are you sure you want to delete "${projectData.name}"? This will also delete the associated sandbox and cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Navigate back to home
      router.push('/');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleFileClick = async (node: FileNode) => {
    if (node.type === "file") {
      setSelectedFile(node.path);
      setFileContent("// Loading...");

      try {
        // Remove leading slash and split path
        const pathParts = node.path.replace(/^\//, '').split('/');
        const response = await fetch(`/api/projects/${projectId}/files/${pathParts.join('/')}`, {
          cache: 'no-store',
        });

        if (response.ok) {
          const { content } = await response.json();
          setFileContent(content);
        } else {
          setFileContent(`// Error loading file: ${node.path}`);
        }
      } catch (error) {
        console.error('Error fetching file content:', error);
        setFileContent(`// Error loading file: ${error}`);
      }
    }
  };

  const refreshFiles = async () => {
    setIsRefreshingFiles(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const { files } = await response.json();

        // All folders closed by default
        const initFiles = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(node => ({
            ...node,
            isExpanded: false,
            isLoading: false,
            children: node.type === 'directory' ? [] : undefined,
          }));
        };

        setFiles(initFiles(files));
      }
    } catch (error) {
      console.error('Error refreshing files:', error);
    } finally {
      setIsRefreshingFiles(false);
    }
  };

  const handleFolderClick = async (node: FileNode) => {
    if (node.type !== "directory") return;

    // If already expanded, just collapse it
    if (node.isExpanded) {
      const collapseFolder = (nodes: FileNode[], targetPath: string): FileNode[] => {
        return nodes.map(n => {
          if (n.path === targetPath) {
            return { ...n, isExpanded: false };
          }
          if (n.children) {
            return { ...n, children: collapseFolder(n.children, targetPath) };
          }
          return n;
        });
      };

      setFiles(prev => collapseFolder(prev, node.path));
      return;
    }

    // Set loading state
    const setLoading = (nodes: FileNode[], targetPath: string, loading: boolean): FileNode[] => {
      return nodes.map(n => {
        if (n.path === targetPath) {
          return { ...n, isLoading: loading };
        }
        if (n.children) {
          return { ...n, children: setLoading(n.children, targetPath, loading) };
        }
        return n;
      });
    };

    setFiles(prev => setLoading(prev, node.path, true));

    try {
      // Fetch folder contents
      const response = await fetch(`/api/projects/${projectId}/files?path=${encodeURIComponent(node.path)}`, {
        cache: 'no-store',
      });

      if (response.ok) {
        const { files: folderContents } = await response.json();

        // Update the tree with loaded children
        const updateFolder = (nodes: FileNode[], targetPath: string, children: FileNode[]): FileNode[] => {
          return nodes.map(n => {
            if (n.path === targetPath) {
              // Initialize children as not expanded
              const initChildren = children.map(child => ({
                ...child,
                isExpanded: false,
                isLoading: false,
                children: child.type === 'directory' ? [] : undefined,
              }));
              return { ...n, isExpanded: true, isLoading: false, children: initChildren };
            }
            if (n.children) {
              return { ...n, children: updateFolder(n.children, targetPath, children) };
            }
            return n;
          });
        };

        setFiles(prev => updateFolder(prev, node.path, folderContents));
      } else {
        console.error('Error loading folder');
        setFiles(prev => setLoading(prev, node.path, false));
      }
    } catch (error) {
      console.error('Error fetching folder contents:', error);
      setFiles(prev => setLoading(prev, node.path, false));
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0, inSidebar = false): JSX.Element[] => {
    return nodes.map((node, index) => (
      <div key={`${node.path}-${index}`}>
        <div
          className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-800/50 rounded cursor-pointer ${
            selectedFile === node.path && !inSidebar ? 'bg-gray-800' : ''
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => {
            if (inSidebar) return;
            if (node.type === "directory") {
              handleFolderClick(node);
            } else {
              handleFileClick(node);
            }
          }}
        >
          {node.type === "directory" ? (
            <>
              {/* Chevron or loader */}
              {node.isLoading ? (
                <div className={`${inSidebar ? 'w-2 h-2' : 'w-3 h-3'} border border-gray-500 border-t-transparent rounded-full animate-spin`}></div>
              ) : (
                <svg
                  className={`${inSidebar ? 'w-2 h-2' : 'w-3 h-3'} text-gray-500 transition-transform ${
                    node.isExpanded ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              )}
              <svg className={`${inSidebar ? 'w-3 h-3' : 'w-4 h-4'} text-blue-400`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className={`${inSidebar ? 'text-xs text-gray-400' : 'text-sm text-gray-300'}`}>{node.name}</span>
            </>
          ) : (
            <>
              <div className={inSidebar ? 'w-2' : 'w-3'}></div>
              <svg className={`${inSidebar ? 'w-3 h-3' : 'w-4 h-4'} text-gray-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className={`${inSidebar ? 'text-xs text-gray-500' : 'text-sm text-gray-300'}`}>{node.name}</span>
              {node.status && (
                <span className={`${inSidebar ? 'text-[10px]' : 'text-xs'} ml-auto font-medium ${
                  node.status === "created" ? "text-green-500" :
                  node.status === "modified" ? "text-yellow-500" :
                  "text-red-500"
                }`}>
                  {node.status === "created" ? "+" : node.status === "modified" ? "M" : "-"}
                </span>
              )}
            </>
          )}
        </div>
        {node.type === "directory" && node.isExpanded && node.children && node.children.length > 0 && renderFileTree(node.children, level + 1, inSidebar)}
      </div>
    ));
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Left Sidebar - Conversation */}
      <div className="w-[420px] flex flex-col bg-[#1a1a1a] border-r border-gray-800">
        {/* Conversation Content */}
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {logs.length === 0 && projectData && !projectData.sandboxId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="w-8 h-8 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin mx-auto mb-3"></div>
                <p>Waiting to start...</p>
              </div>
            </div>
          ) : logs.length === 0 && projectData && projectData.sandboxId ? (
            <div className="space-y-6 p-4">
              {/* Show existing project info */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{projectData.name}</h3>
                <p className="text-gray-400 text-sm">{projectData.description}</p>
              </div>

              {/* Show project history */}
              {projectData.history && projectData.history.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase">History</div>
                  {projectData.history.map((entry: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        entry.type === 'create' ? 'bg-green-400' :
                        entry.type === 'update' ? 'bg-blue-400' :
                        'bg-red-400'
                      }`}></div>
                      <div>
                        <p className="text-gray-300">{entry.description}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-blue-950/20 border border-blue-800/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  Edit your project by describing what you&apos;d like to update.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status */}
              {isGenerating && (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">{currentStatus}</span>
                </div>
              )}

              {/* User Request */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{description}</h3>
              </div>

              {/* Logs */}
              <div className="space-y-2 text-gray-400 text-sm">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={`${
                      log.startsWith("❌")
                        ? "text-red-400"
                        : log.startsWith("✅")
                        ? "text-green-400 font-medium"
                        : log.startsWith("[USER REQUEST]")
                        ? "hidden"
                        : "text-gray-400"
                    }`}
                  >
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>


              {/* Done Message */}
              {isComplete && (
                <div className="p-3 bg-green-950/20 border border-green-800/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs">
                      <p className="text-green-400 font-medium">Done!</p>
                      <p className="text-gray-400 mt-0.5">Your app is ready.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Input */}
        <div className="border-t border-gray-800 p-4">
          {(isComplete || (projectData && projectData.sandboxId)) ? (
            <input
              type="text"
              value={updateDescription}
              onChange={(e) => setUpdateDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleUpdate();
                }
              }}
              placeholder="Ask for changes..."
              className="w-full px-4 py-3 bg-[#0d0d0d] text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-600 placeholder-gray-600 text-sm"
              disabled={isGenerating}
            />
          ) : isGenerating ? (
            <button
              onClick={handleCancel}
              className="w-full px-4 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg font-medium transition-all text-sm"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between bg-[#0d0d0d] border-b border-gray-800 px-4 h-12">
          <div className="flex items-center gap-4">
            {/* Back Button */}
            <button
              onClick={() => router.push('/')}
              className="p-2 text-gray-400 hover:text-white transition-all"
              title="Back to home"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-700"></div>

            {/* Tabs */}
            <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("preview")}
              className={`p-2 rounded-md transition-all ${
                activeTab === "preview"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
              title="Preview"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`p-2 rounded-md transition-all ${
                activeTab === "code"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
              title="Code"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </button>
            <button
              onClick={() => setActiveTab("terminal")}
              className={`p-2 rounded-md transition-all ${
                activeTab === "terminal"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              } ${!ttydUrl ? "opacity-50" : ""}`}
              title={!ttydUrl ? "Terminal (pending)" : "Terminal"}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Delete Project Button */}
            <button
              onClick={handleDeleteProject}
              className="p-2 text-gray-400 hover:text-red-400 transition-all"
              title="Delete project"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Divider */}
            {((activeTab === "preview" && previewUrl) || (activeTab === "terminal" && ttydUrl)) && (
              <div className="h-6 w-px bg-gray-700"></div>
            )}

            {/* Open in New Tab */}
            {activeTab === "preview" && previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-white"
                title="Open in new tab"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {activeTab === "terminal" && ttydUrl && (
              <a
                href={ttydUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-white"
                title="Open in new tab"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "preview" ? (
            <div className="h-full bg-white">
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-800">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-lg font-medium">Setting up your app...</p>
                    <p className="text-sm text-gray-500 mt-1">This usually takes 30-60 seconds</p>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "code" ? (
            <div className="flex h-full bg-[#1e1e1e]">
              {/* File Tree */}
              <div className="w-64 bg-[#252526] border-r border-gray-800 overflow-y-auto">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase">Files</div>
                    <button
                      onClick={refreshFiles}
                      disabled={isRefreshingFiles}
                      className="p-1 text-gray-400 hover:text-white transition-all disabled:opacity-50"
                      title="Refresh files"
                    >
                      <svg
                        className={`w-3 h-3 ${isRefreshingFiles ? 'animate-spin' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                  {files.length === 0 ? (
                    <div className="text-xs text-gray-500 py-4">No files yet</div>
                  ) : (
                    <div className="space-y-0.5">
                      {renderFileTree(files, 0, false)}
                    </div>
                  )}
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 flex flex-col">
                {selectedFile ? (
                  <>
                    {/* File Tab */}
                    <div className="bg-[#252526] border-b border-gray-800 px-4 py-2">
                      <div className="text-sm text-gray-300">{selectedFile.split('/').pop()}</div>
                    </div>
                    {/* Monaco Editor */}
                    <div className="flex-1 overflow-hidden">
                      <Editor
                        height="100%"
                        defaultLanguage="typescript"
                        language={
                          selectedFile?.endsWith('.tsx') || selectedFile?.endsWith('.jsx') ? 'typescript' :
                          selectedFile?.endsWith('.ts') ? 'typescript' :
                          selectedFile?.endsWith('.js') ? 'javascript' :
                          selectedFile?.endsWith('.json') ? 'json' :
                          selectedFile?.endsWith('.css') ? 'css' :
                          selectedFile?.endsWith('.html') ? 'html' :
                          selectedFile?.endsWith('.md') ? 'markdown' :
                          'typescript'
                        }
                        value={fileContent}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          minimap: { enabled: true },
                          fontSize: 14,
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          wordWrap: 'on',
                          folding: true,
                          renderWhitespace: 'none',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm">Select a file to view</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full bg-black">
              {ttydUrl ? (
                <iframe
                  src={ttydUrl}
                  className="w-full h-full border-0"
                  title="Terminal"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p>Terminal not available yet</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
