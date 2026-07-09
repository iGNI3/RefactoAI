export type WSMessage = Record<string, unknown>;

export type MessageHandler = (data: WSMessage) => void;

export interface WSOptions {
  onMessage?: MessageHandler;
  onError?: (err: Event) => void;
  onClose?: () => void;
  onOpen?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

const WS_BASE = (() => {
  if (typeof window !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('electron') || window.location.protocol === 'file:') {
      return 'ws://127.0.0.1:8000';
    }
  }
  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
})();

export class WSClient {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private shouldReconnect = true;
  private options: WSOptions;

  private path: string;

  constructor(path: string = '/ws/refactor-stream', options: WSOptions = {}) {
    this.path = path;
    this.options = {
      reconnectInterval: 2000,
      maxReconnectAttempts: 10,
      ...options,
    };
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(`${WS_BASE}${this.path}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.options.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSMessage;
        this.handlers.forEach((h) => h(data));
        this.options.onMessage?.(data);
      } catch {
        // ignore unparseable messages
      }
    };

    this.ws.onerror = (err) => {
      this.options.onError?.(err);
    };

    this.ws.onclose = () => {
      this.options.onClose?.();
      if (this.shouldReconnect && this.reconnectAttempts < (this.options.maxReconnectAttempts ?? 10)) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), this.options.reconnectInterval);
      }
    };
  }

  send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  disconnect() {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
