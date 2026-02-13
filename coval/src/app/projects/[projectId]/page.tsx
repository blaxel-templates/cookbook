"use client";

import { useSearchParams, useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import Link from "next/link";
import { fetchWithBasePath, navigateWithBasePath, withBasePath } from "@/lib/basePath";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  status?: "created" | "modified" | "deleted";
  isExpanded?: boolean;
  isLoading?: boolean;
}

/** A single entry in the conversation timeline - either a log message or a tool call */
type TimelineEntry =
  | { type: 'log'; content: string }
  | { type: 'tool'; id: number; name: string; args: Record<string, any>; result?: any; isExpanded: boolean };

/** Find a file path from args by checking common property names and values */
function findPathArg(args: Record<string, any>): string {
  // Try common property names first
  for (const key of ['path', 'filePath', 'file_path', 'directoryPath', 'directory_path', 'dir', 'dirPath']) {
    if (args[key] && typeof args[key] === 'string') return args[key];
  }
  // Fallback: find first string value that looks like a file path
  for (const val of Object.values(args)) {
    if (typeof val === 'string' && val.startsWith('/')) return val;
  }
  return '';
}

/** Find a command string from args */
function findCommandArg(args: Record<string, any>): string {
  for (const key of ['command', 'cmd', 'script', 'exec', 'args']) {
    if (args[key] && typeof args[key] === 'string') return args[key];
  }
  return JSON.stringify(args).slice(0, 80);
}

/** Find a process name from args */
function findNameArg(args: Record<string, any>): string {
  for (const key of ['name', 'identifier', 'processName', 'process_name', 'process']) {
    if (args[key] && typeof args[key] === 'string') return args[key];
  }
  return '';
}

/** Human-readable label and summary for each tool */
function formatToolCall(entry: { name: string; args: Record<string, any> }): { label: string; summary: string; icon: string } {
  switch (entry.name) {
    case 'fsWriteFile':
      return { label: 'Write File', summary: findPathArg(entry.args) || 'file', icon: 'pencil' };
    case 'fsReadFile':
      return { label: 'Read File', summary: findPathArg(entry.args) || 'file', icon: 'book' };
    case 'fsListDirectory':
      return { label: 'List Directory', summary: findPathArg(entry.args) || '/', icon: 'folder' };
    case 'processExecute':
      return { label: 'Run Command', summary: findCommandArg(entry.args), icon: 'terminal' };
    case 'processGetLogs':
      return { label: 'Check Logs', summary: findNameArg(entry.args) || 'dev-server', icon: 'logs' };
    default:
      return { label: entry.name, summary: JSON.stringify(entry.args).slice(0, 80), icon: 'tool' };
  }
}

/** Icon component for tool calls */
function ToolIcon({ type }: { type: string }) {
  switch (type) {
    case 'pencil':
      return (
        <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    case 'book':
      return (
        <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case 'folder':
      return (
        <svg className="w-3.5 h-3.5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    case 'terminal':
      return (
        <svg className="w-3.5 h-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'logs':
      return (
        <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      );
    default:
      return (
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
  }
}

export default function ProjectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const description = searchParams.get("desc");
  const isNewProject = projectId === "new";
  const [sandboxId, setSandboxId] = useState<string | null>(isNewProject ? null : projectId);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
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
  const toolCallIdCounter = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasStartedGenerationRef = useRef(false);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [timeline]);

  // Fetch project data and state (skip for new projects)
  useEffect(() => {
    if (isNewProject) return;

    const fetchProjectAndState = async () => {
      try {
        // Fetch project/sandbox data
        const response = await fetchWithBasePath(`/api/projects/${projectId}`, {
          cache: 'no-store',
        });
        if (response.ok) {
          const { project } = await response.json();
          setProjectData(project);
          setSandboxId(project.sandboxId);
          if (project.previewUrl) setPreviewUrl(project.previewUrl);
          if (project.sessionUrl) setSessionUrl(project.sessionUrl);
          if (project.sessionToken) setSessionToken(project.sessionToken);

          // Fetch state from sandbox
          const stateResponse = await fetchWithBasePath(`/api/projects/${projectId}/state`, {
            cache: 'no-store',
          });
          if (stateResponse.ok) {
            const { state } = await stateResponse.json();
            // Load existing logs
            if (state.logs && state.logs.length > 0) {
              setTimeline(state.logs.map((l: string) => ({ type: 'log' as const, content: l })));
            }
            // Update status based on state
            if (state.status === 'in_progress') {
              setCurrentStatus('In Progress');
              // Note: We don't auto-resume here, user can click continue
            } else if (state.status === 'completed') {
              setCurrentStatus('Completed');
              setIsComplete(true);
            } else if (state.status === 'error') {
              setCurrentStatus('Error');
            }
          }
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      }
    };
    fetchProjectAndState();
  }, [projectId, isNewProject]);

  // Refresh files from sandbox
  const refreshFiles = useCallback(async (overrideSandboxId?: string) => {
    const targetSandboxId = overrideSandboxId || sandboxId;
    if (!targetSandboxId) return;
    setIsRefreshingFiles(true);
    try {
      const response = await fetchWithBasePath(`/api/projects/${targetSandboxId}/files`, {
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
  }, [sandboxId]);

  // Fetch root files from sandbox when switching to code tab
  useEffect(() => {
    if (sandboxId && activeTab === 'code') {
      refreshFiles();
    }
  }, [activeTab, sandboxId, refreshFiles]);

  // Auto-generate for new projects with description
  useEffect(() => {
    // Guard against double execution in StrictMode
    if (hasStartedGenerationRef.current) return;

    // For new projects: auto-generate when we have a description
    // For existing projects: only auto-generate if no sandbox yet (shouldn't happen)
    if (description && !isGenerating && (isNewProject || (projectData && !projectData.sandboxId))) {
      hasStartedGenerationRef.current = true;
      startGeneration(description);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, isNewProject, projectData]);

  const startGeneration = async (desc: string) => {
    setIsGenerating(true);
    setIsComplete(false);
    setCurrentStatus("Thinking");
    toolCallIdCounter.current = 0;

    // Add user request to timeline if it's an update (not a new project)
    if (sandboxId) {
      setTimeline(prev => [...prev, { type: 'log', content: `\n[USER REQUEST] ${desc}` }]);
    }

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetchWithBasePath("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: desc,
          sandboxId: sandboxId, // null for new projects, sandbox ID for updates
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
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed === "[DONE]") {
            setIsGenerating(false);
            setIsComplete(true);
            break;
          }

          try {
            const parsed = JSON.parse(trimmed);

            // Handle existing logs from sandbox state (sent at start of generation)
            if (parsed.existingLogs && Array.isArray(parsed.existingLogs)) {
              setTimeline(parsed.existingLogs.map((l: string) => ({ type: 'log' as const, content: l })));
            }

            if (parsed.toolCall) {
              const tc = parsed.toolCall;
              const entry: TimelineEntry = {
                type: 'tool',
                id: toolCallIdCounter.current++,
                name: tc.name,
                args: tc.args || {},
                result: tc.result,
                isExpanded: false,
              };
              setTimeline((prev) => [...prev, entry]);

              // Update status based on tool being used
              if (tc.name === 'fsWriteFile') {
                setCurrentStatus("Writing files");
              } else if (tc.name === 'fsReadFile') {
                setCurrentStatus("Reading files");
              } else if (tc.name === 'processExecute') {
                setCurrentStatus("Running command");
              } else if (tc.name === 'processGetLogs') {
                setCurrentStatus("Checking logs");
              } else if (tc.name === 'fsListDirectory') {
                setCurrentStatus("Browsing files");
              }
            }

            if (parsed.log) {
              setTimeline((prev) => [...prev, { type: 'log', content: parsed.log }]);

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

            if (parsed.sessionUrl) {
              setSessionUrl(parsed.sessionUrl);
            }

            if (parsed.sessionToken) {
              setSessionToken(parsed.sessionToken);
            }

            // Handle sandbox ID for new projects
            let currentSandboxId = sandboxId;
            if (parsed.sandboxId && !sandboxId) {
              currentSandboxId = parsed.sandboxId;
              setSandboxId(parsed.sandboxId);
              // Redirect to the real sandbox URL (replace history so back button works correctly)
              if (isNewProject) {
                window.history.replaceState({}, '', withBasePath(`/projects/${parsed.sandboxId}`));
              }
            }

            // Refresh files after updates
            if (parsed.type === "complete") {
              setTimeout(() => {
                refreshFiles(currentSandboxId || undefined);
              }, 2000);
            }

            if (parsed.type === "complete") {
              setIsGenerating(false);
              setIsComplete(true);
              setCurrentStatus("Ready");
            }
          } catch (e) {
            console.error("Error parsing stream data:", e);
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        setTimeline((prev) => [...prev, { type: 'log', content: "❌ Generation cancelled by user" }]);
      } else {
        setTimeline((prev) => [...prev, { type: 'log', content: `❌ Error: ${error.message}` }]);
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
      const response = await fetchWithBasePath(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Navigate back to home
      navigateWithBasePath(router, '/');
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
        if (!sandboxId) return;
        // Remove leading slash and split path
        const pathParts = node.path.replace(/^\//, '').split('/');
        const response = await fetchWithBasePath(`/api/projects/${sandboxId}/files/${pathParts.join('/')}`, {
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

  const handleFolderClick = async (node: FileNode) => {
    if (node.type !== "directory") return;
    if (!sandboxId) return;

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
      const response = await fetchWithBasePath(`/api/projects/${sandboxId}/files?path=${encodeURIComponent(node.path)}`, {
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
              <svg className={`${inSidebar ? 'w-3 h-3' : 'w-4 h-4'} text-orange-400`} fill="currentColor" viewBox="0 0 20 20">
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
          {timeline.length === 0 && projectData && !projectData.sandboxId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <div className="w-8 h-8 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin mx-auto mb-3"></div>
                <p>Waiting to start...</p>
              </div>
            </div>
          ) : timeline.length === 0 && projectData && projectData.sandboxId ? (
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
                        entry.type === 'update' ? 'bg-orange-400' :
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

              <div className="p-4 bg-orange-950/20 border border-orange-800/30 rounded-lg">
                <p className="text-orange-400 text-sm">
                  Edit your project by describing what you&apos;d like to update.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Status */}
              {isGenerating && (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium">{currentStatus}</span>
                </div>
              )}

              {/* User Request */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">{description}</h3>
              </div>

              {/* Unified Timeline: logs and tool calls interleaved */}
              <div className="space-y-1.5 text-sm">
                {timeline.map((entry, i) => {
                  if (entry.type === 'log') {
                    return (
                      <div
                        key={`tl-${i}`}
                        className={`${
                          entry.content.startsWith("❌")
                            ? "text-red-400"
                            : entry.content.startsWith("✅")
                            ? "text-green-400 font-medium"
                            : entry.content.startsWith("[USER REQUEST]")
                            ? "hidden"
                            : "text-gray-400"
                        }`}
                      >
                        {entry.content}
                      </div>
                    );
                  }
                  // Tool call entry
                  const { label, summary, icon } = formatToolCall(entry);
                  return (
                    <div key={`tl-${i}`} className="group">
                      <button
                        onClick={() =>
                          setTimeline((prev) =>
                            prev.map((t, idx) =>
                              idx === i && t.type === 'tool' ? { ...t, isExpanded: !t.isExpanded } : t
                            )
                          )
                        }
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-gray-800/30 hover:bg-gray-800/60 transition-colors text-left"
                      >
                        <ToolIcon type={icon} />
                        <span className="text-xs font-medium text-gray-300 flex-shrink-0">{label}</span>
                        <span className="text-[11px] text-gray-500 truncate flex-1 min-w-0">{summary}</span>
                        <svg
                          className={`w-2.5 h-2.5 text-gray-600 transition-transform flex-shrink-0 ${entry.isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {entry.isExpanded && (
                        <div className="mt-1 ml-6 px-2.5 py-2 rounded bg-gray-900/60 border border-gray-800/50">
                          <div className="text-[10px] text-gray-600 uppercase mb-1">Parameters</div>
                          <pre className="text-[11px] text-gray-400 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                            {JSON.stringify(entry.args, null, 2)}
                          </pre>
                          {entry.result !== undefined && (
                            <>
                              <div className="text-[10px] text-gray-600 uppercase mt-2 mb-1">Result</div>
                              <pre className="text-[11px] text-gray-400 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                {typeof entry.result === 'string' ? entry.result : JSON.stringify(entry.result, null, 2)}
                              </pre>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div ref={logsEndRef} />


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
            <Link
              href={withBasePath('/')}
              className="p-2 text-gray-400 hover:text-white transition-all"
              title="Back to home"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>

            {/* Divider */}
            <div className="h-6 w-px bg-gray-700"></div>

            {/* Tabs */}
            <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("preview")}
              className={`p-2 rounded-md transition-all ${
                activeTab === "preview"
                  ? "bg-orange-600 text-white"
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
                  ? "bg-orange-600 text-white"
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
                  ? "bg-orange-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              } ${!sessionUrl ? "opacity-50" : ""}`}
              title={!sessionUrl ? "Terminal (pending)" : "Terminal"}
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
            {((activeTab === "preview" && previewUrl) || (activeTab === "terminal" && sessionUrl)) && (
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
            {activeTab === "terminal" && sessionUrl && sessionToken && (
              <a
                href={`${sessionUrl}/terminal?bl_preview_token=${sessionToken}`}
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
                    <div className="w-12 h-12 border-4 border-orange-200/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-lg font-medium">Setting up your app...</p>
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
                      onClick={() => refreshFiles()}
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
              {sessionUrl && sessionToken ? (
                <iframe
                  src={`${sessionUrl}/terminal?bl_preview_token=${sessionToken}`}
                  className="w-full h-full border-0"
                  title="Terminal"
                  allow="clipboard-read; clipboard-write"
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
