const API_BASE = (() => {
  if (typeof window !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('electron') || window.location.protocol === 'file:') {
      return 'http://127.0.0.1:8000';
    }
  }
  return '';
})();

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

class ApiError extends Error {
  public status: number;
  public data?: unknown;

  constructor(
    status: number,
    message: string,
    data?: unknown,
  ) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

async function request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = opts.timeout ?? 30000;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new ApiError(res.status, data?.error ?? res.statusText, data);
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiError(408, `Request to ${path} timed out after ${timeout}ms`);
    }
    throw new ApiError(0, (err as Error).message);
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T = unknown>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'GET' }),

  post: <T = unknown>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: 'POST', body }),

  getProviders: () => api.get<Record<string, string[]>>('/api/providers'),
  getStats: () => api.get<{
    indexed_files: string;
    total_chunks: number;
    mcp_servers: number;
    uptime: string;
    workspace: string;
  }>('/api/stats'),

  getSettings: () => api.get<Record<string, string | boolean>>('/api/settings'),
  updateSettings: (body: Record<string, unknown>) =>
    api.post<{ status: string; message: string }>('/api/settings', body),

  indexWorkspace: (workspacePath: string) =>
    api.post<{ status: string; message?: string }>('/api/index', { workspace_path: workspacePath }),

  searchCodebase: (query: string, maxResults = 5) =>
    api.post<{ results: Array<{
      id: string;
      content: string;
      metadata: { source_file: string; node_type: string; symbol_name: string; language: string };
      distance: number;
    }> }>('/api/search', { query, max_results: maxResults }),

  applyPatch: (filePath: string, diff: string) =>
    api.post<{ success: boolean; message: string }>('/api/patch', { file_path: filePath, diff }),

  browseDirectory: () => api.get<{ path: string }>('/api/browse'),

  getPlugins: () => api.get<{ plugins: Array<{ id: string; name: string; status: string }> }>('/api/plugins'),
  getScheduledTasks: () => api.get<{ tasks: Array<{ id: string; name: string; schedule: string; status: string }> }>('/api/tasks'),
  getWebBridgeStatus: () => api.get<{ status: string; latency: string; active_sessions: number }>('/api/bridge'),
  getProjects: () => api.get<{ projects: Array<{ id: string; name: string; active_task: string; status: string }> }>('/api/projects'),
  getChats: () => api.get<{ chats: Array<{ id: string; title: string; date: string }> }>('/api/chats'),
};
