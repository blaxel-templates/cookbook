import fs from 'fs';
import path from 'path';

// Simple file-based database
const DB_FILE = path.join(process.cwd(), 'data', 'projects.json');

export interface Project {
  id: string;
  name: string;
  description: string;
  sandboxId: string | null;
  sessionId: string | null; // Claude Code session ID for conversation continuity
  previewUrl: string | null;
  ttydUrl: string | null;
  createdAt: string;
  updatedAt: string;
  history: ProjectHistoryEntry[];
}

export interface ProjectHistoryEntry {
  timestamp: string;
  type: 'create' | 'update' | 'error';
  description: string;
  logs?: string[];
}

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Load database
function loadDB(): { projects: Record<string, Project> } {
  ensureDataDir();
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading database:', error);
  }
  return { projects: {} };
}

// Save database
function saveDB(db: { projects: Record<string, Project> }) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

// Generate project ID from description
export function generateProjectId(description: string): string {
  // Extract key words and create a slug
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 3);

  const slug = words.join('-') || 'project';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);

  return `${slug}-${timestamp}-${random}`;
}

// Create new project
export function createProject(description: string): Project {
  const db = loadDB();
  const id = generateProjectId(description);

  const project: Project = {
    id,
    name: description.slice(0, 100),
    description,
    sandboxId: null,
    sessionId: null,
    previewUrl: null,
    ttydUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [{
      timestamp: new Date().toISOString(),
      type: 'create',
      description: 'Project created',
    }],
  };

  db.projects[id] = project;
  saveDB(db);

  return project;
}

// Get project by ID
export function getProject(id: string): Project | null {
  const db = loadDB();
  return db.projects[id] || null;
}

// Update project
export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const db = loadDB();
  const project = db.projects[id];

  if (!project) {
    return null;
  }

  db.projects[id] = {
    ...project,
    ...updates,
    id: project.id, // Never change ID
    updatedAt: new Date().toISOString(),
  };

  saveDB(db);
  return db.projects[id];
}

// Add history entry
export function addHistoryEntry(
  projectId: string,
  entry: Omit<ProjectHistoryEntry, 'timestamp'>
): void {
  const db = loadDB();
  const project = db.projects[projectId];

  if (!project) {
    return;
  }

  project.history.push({
    ...entry,
    timestamp: new Date().toISOString(),
  });

  project.updatedAt = new Date().toISOString();
  saveDB(db);
}

// List all projects
export function listProjects(): Project[] {
  const db = loadDB();
  return Object.values(db.projects).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

// Delete project
export function deleteProject(id: string): boolean {
  const db = loadDB();
  if (db.projects[id]) {
    delete db.projects[id];
    saveDB(db);
    return true;
  }
  return false;
}

