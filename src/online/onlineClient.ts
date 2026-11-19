import type {
  ClientToServerMessage,
  PlayerIdentityPayload,
  ServerToClientMessage,
} from './protocol';

export type OnlineConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type MessageListener = (msg: ServerToClientMessage) => void;
type StatusListener = (status: OnlineConnectionStatus) => void;

export class OnlineArenaClient {
  private ws: WebSocket | null = null;
  private status: OnlineConnectionStatus = 'disconnected';
  private closedByUser = false;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private pendingQueue: ClientToServerMessage[] = [];
  private identity: PlayerIdentityPayload = { name: 'Explorer', avatarCode: 'jp' };
  private readonly messageListeners = new Set<MessageListener>();
  private readonly statusListeners = new Set<StatusListener>();

  public connect(identity: PlayerIdentityPayload): void {
    this.identity = identity;
    this.closedByUser = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.openSocket(false);
  }

  public disconnect(): void {
    this.closedByUser = true;
    this.clearTimers();
    this.pendingQueue = [];
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public send(msg: ClientToServerMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      // Queue control actions until connection finishes opening
      if (msg.type !== 'ping') {
        this.pendingQueue.push(msg);
      }
    }
  }

  public getStatus(): OnlineConnectionStatus {
    return this.status;
  }

  public onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private setStatus(next: OnlineConnectionStatus): void {
    if (this.status === next) return;
    this.status = next;
    for (const listener of this.statusListeners) {
      listener(next);
    }
  }

  private clearTimers(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private getWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  private openSocket(isReconnect: boolean): void {
    if (typeof window === 'undefined') return;
    this.clearTimers();
    this.setStatus(isReconnect ? 'reconnecting' : 'connecting');

    try {
      const ws = new WebSocket(this.getWsUrl());
      this.ws = ws;

      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.reconnectAttempt = 0;
        this.setStatus('connected');
        ws.send(JSON.stringify({ type: 'hello', player: this.identity } satisfies ClientToServerMessage));

        // Flush any queued client actions
        while (this.pendingQueue.length > 0 && ws.readyState === WebSocket.OPEN) {
          const next = this.pendingQueue.shift()!;
          ws.send(JSON.stringify(next));
        }

        // Periodic heartbeat keeps proxy WebSocket connections warm
        this.pingTimer = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' } satisfies ClientToServerMessage));
          }
        }, 20000);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as ServerToClientMessage;
          for (const listener of this.messageListeners) {
            listener(parsed);
          }
        } catch {
          // Ignore malformed frames
        }
      };

      ws.onclose = () => {
        if (this.ws !== ws) return;
        this.ws = null;
        this.clearTimers();
        if (this.closedByUser) {
          this.setStatus('disconnected');
          return;
        }
        this.scheduleReconnect();
      };

      ws.onerror = () => {
        // Error is followed by onclose which schedules reconnect cleanly
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.closedByUser) return;
    this.setStatus('reconnecting');
    const delay = Math.min(8000, 600 * Math.pow(1.6, this.reconnectAttempt));
    this.reconnectAttempt += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.openSocket(true);
    }, delay);
  }
}
