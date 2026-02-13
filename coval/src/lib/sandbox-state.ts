import { SandboxInstance } from "@blaxel/core";

const STATE_FILE_PATH = '/state.json';

export interface SandboxState {
  status: 'idle' | 'in_progress' | 'completed' | 'error';
  logs: string[];
  conversationHistory: any[];
  currentPrompt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

export const DEFAULT_STATE: SandboxState = {
  status: 'idle',
  logs: [],
  conversationHistory: [],
  currentPrompt: null,
  startedAt: null,
  completedAt: null,
  error: null,
};

export async function readSandboxState(sandbox: SandboxInstance): Promise<SandboxState> {
  try {
    const content = await sandbox.fs.read(STATE_FILE_PATH);
    return JSON.parse(content);
  } catch {
    console.log('[Blaxel] No existing state found, using default');
  }
  return { ...DEFAULT_STATE };
}

export async function writeSandboxState(sandbox: SandboxInstance, state: SandboxState): Promise<void> {
  try {
    const content = JSON.stringify(state, null, 2);
    await sandbox.fs.write(STATE_FILE_PATH, content);
  } catch (error) {
    console.error('[Blaxel] Error writing state:', error);
  }
}
