/**
 * BroadcastChannel utility for cross-tab communication
 *
 * Allows Winden admin to sync changes across all open tabs:
 * - Admin panel updates → Frontend preview
 * - Admin panel updates → Other editor tabs
 * - Instant CSS/config updates without page refresh
 */

export type WindenBroadcastMessage = {
  type: 'CONTENT_SAVED' | 'WIZZARD_UPDATED' | 'SETTINGS_UPDATED' | 'CACHE_CLEARED';
  timestamp: number;
  data?: {
    javascript?: string;
    scss?: string;
    wizzard?: string;
    css?: string;
    settings?: Record<string, any>;
  };
};

class WindenBroadcastChannel {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private isSupported: boolean = false;

  constructor() {
    // Check BroadcastChannel support
    this.isSupported = typeof BroadcastChannel !== 'undefined';

    if (this.isSupported) {
      try {
        this.channel = new BroadcastChannel('winden-updates');
        this.setupMessageListener();
      } catch (error) {
        console.warn('[Winden Broadcast] Failed to initialize:', error);
        this.isSupported = false;
      }
    }
  }

  /**
   * Setup listener for incoming messages
   */
  private setupMessageListener() {
    if (!this.channel) return;

    this.channel.onmessage = (event: MessageEvent<WindenBroadcastMessage>) => {
      const message = event.data;

      // Trigger registered listeners for this message type
      const typeListeners = this.listeners.get(message.type);
      if (typeListeners) {
        typeListeners.forEach(callback => callback(message.data));
      }

      // Trigger wildcard listeners
      const wildcardListeners = this.listeners.get('*');
      if (wildcardListeners) {
        wildcardListeners.forEach(callback => callback(message));
      }
    };
  }

  /**
   * Broadcast a message to all tabs
   */
  public postMessage(message: WindenBroadcastMessage) {
    if (!this.isSupported || !this.channel) {
      return;
    }

    try {
      this.channel.postMessage({
        ...message,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[Winden Broadcast] Error posting message:', error);
    }
  }

  /**
   * Listen for specific message types
   */
  public on(type: WindenBroadcastMessage['type'] | '*', callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /**
   * Remove a listener
   */
  public off(type: WindenBroadcastMessage['type'] | '*', callback: (data: any) => void) {
    this.listeners.get(type)?.delete(callback);
  }

  /**
   * Close the channel (cleanup)
   */
  public close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }

  /**
   * Check if BroadcastChannel is supported
   */
  public get supported(): boolean {
    return this.isSupported;
  }
}

// Export singleton instance
export const windenBroadcast = new WindenBroadcastChannel();
