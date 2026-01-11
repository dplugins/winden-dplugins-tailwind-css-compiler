/**
 * BroadcastChannel utility for cross-tab communication
 *
 * Allows Winden admin to sync changes across all open tabs:
 * - Admin panel updates → Frontend preview
 * - Admin panel updates → Other editor tabs
 * - Instant CSS/config updates without page refresh
 */

import type { WindenSettings } from '@/types/api.d';

/**
 * Broadcast message data payload
 */
export interface BroadcastMessageData {
  javascript?: string;
  scss?: string;
  wizzard?: string;
  css?: string;
  settings?: WindenSettings;
}

export type WindenBroadcastMessage = {
  type: 'CONTENT_SAVED' | 'WIZZARD_UPDATED' | 'SETTINGS_UPDATED' | 'CACHE_CLEARED';
  timestamp: number;
  data?: BroadcastMessageData;
};

/**
 * Listener callback types for different message scenarios
 */
type MessageDataListener = (data: BroadcastMessageData | undefined) => void;
type FullMessageListener = (message: WindenBroadcastMessage) => void;
type BroadcastListener = MessageDataListener | FullMessageListener;

class WindenBroadcastChannel {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<BroadcastListener>> = new Map();
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
        typeListeners.forEach(callback => (callback as MessageDataListener)(message.data));
      }

      // Trigger wildcard listeners (receive full message)
      const wildcardListeners = this.listeners.get('*');
      if (wildcardListeners) {
        wildcardListeners.forEach(callback => (callback as FullMessageListener)(message));
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
   * @param type - Message type to listen for, or '*' for all messages
   * @param callback - Callback receives message.data for specific types, full message for '*'
   */
  public on(type: WindenBroadcastMessage['type'], callback: MessageDataListener): () => void;
  public on(type: '*', callback: FullMessageListener): () => void;
  public on(type: WindenBroadcastMessage['type'] | '*', callback: BroadcastListener): () => void {
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
  public off(type: WindenBroadcastMessage['type'], callback: MessageDataListener): void;
  public off(type: '*', callback: FullMessageListener): void;
  public off(type: WindenBroadcastMessage['type'] | '*', callback: BroadcastListener): void {
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
