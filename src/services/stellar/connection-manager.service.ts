import { Horizon } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from '@/config/stellar-config';
import { StellarError } from './error-handler.service';

interface ConnectionStats {
  requests: number;
  failures: number;
  lastRequestTime: number;
  lastFailureTime?: number;
  averageResponseTime: number;
}

interface ServerConfig {
  url: string;
  isBackup: boolean;
  priority: number;
}

export class ConnectionManagerService {
  private servers: Map<string, Horizon.Server> = new Map();
  private connectionStats: Map<string, ConnectionStats> = new Map();
  private rateLimitQueue: Array<{ timestamp: number; resolve: () => void }> = [];
  private maxRequestsPerSecond = 10;
  private backupServers: ServerConfig[] = [];
  private currentServerIndex = 0;

  constructor() {
    this.initializeServers();
    this.setupRateLimit();
  }

  private initializeServers() {
    // Primary server
    const primaryUrl = STELLAR_CONFIG.horizonURL;
    this.servers.set('primary', new Horizon.Server(primaryUrl));
    this.connectionStats.set('primary', this.createInitialStats());

    // Backup servers (for production)
    if (STELLAR_CONFIG.horizonURL.includes('horizon.stellar.org')) {
      this.backupServers = [
        { url: 'https://horizon.stellar.org', isBackup: false, priority: 1 },
        { url: 'https://horizon-backup.stellar.org', isBackup: true, priority: 2 },
      ];
    } else {
      // Testnet backups
      this.backupServers = [
        { url: 'https://horizon-testnet.stellar.org', isBackup: false, priority: 1 },
      ];
    }

    // Initialize backup servers
    this.backupServers.forEach((config, index) => {
      const key = config.isBackup ? `backup-${index}` : `server-${index}`;
      this.servers.set(key, new Horizon.Server(config.url));
      this.connectionStats.set(key, this.createInitialStats());
    });
  }

  private createInitialStats(): ConnectionStats {
    return {
      requests: 0,
      failures: 0,
      lastRequestTime: 0,
      averageResponseTime: 0,
    };
  }

  private setupRateLimit() {
    setInterval(() => {
      const now = Date.now();
      this.rateLimitQueue = this.rateLimitQueue.filter(item => {
        if (now - item.timestamp > 1000) {
          item.resolve();
          return false;
        }
        return true;
      });
    }, 100);
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const recentRequests = this.rateLimitQueue.filter(
      item => now - item.timestamp < 1000
    ).length;

    if (recentRequests >= this.maxRequestsPerSecond) {
      return new Promise((resolve) => {
        this.rateLimitQueue.push({ timestamp: now, resolve });
      });
    }
  }

  async getOptimalServer(): Promise<Horizon.Server> {
    await this.waitForRateLimit();

    // Get server with best performance
    let bestServer = 'primary';
    let bestScore = this.calculateServerScore('primary');

    for (const [key] of this.servers) {
      if (key === 'primary') continue;
      
      const score = this.calculateServerScore(key);
      if (score > bestScore) {
        bestScore = score;
        bestServer = key;
      }
    }

    const server = this.servers.get(bestServer);
    if (!server) {
      throw new StellarError('No available servers');
    }

    return server;
  }

  private calculateServerScore(serverKey: string): number {
    const stats = this.connectionStats.get(serverKey);
    if (!stats) return 0;

    if (stats.requests === 0) return 1; // New server gets a chance

    const successRate = (stats.requests - stats.failures) / stats.requests;
    const responseTimeScore = Math.max(0, 1 - (stats.averageResponseTime / 5000)); // 5 second max
    const recentFailuresPenalty = stats.lastFailureTime && 
      (Date.now() - stats.lastFailureTime) < 60000 ? 0.5 : 1; // 1 minute penalty

    return successRate * responseTimeScore * recentFailuresPenalty;
  }

  async executeWithFallback<T>(
    operation: (server: Horizon.Server) => Promise<T>
  ): Promise<T> {
    const serverKeys = Array.from(this.servers.keys()).sort((a, b) => {
      return this.calculateServerScore(b) - this.calculateServerScore(a);
    });

    let lastError: Error | null = null;

    for (const serverKey of serverKeys) {
      const server = this.servers.get(serverKey);
      const stats = this.connectionStats.get(serverKey);
      
      if (!server || !stats) continue;

      try {
        const startTime = Date.now();
        
        const result = await operation(server);
        
        const responseTime = Date.now() - startTime;
        this.updateStats(serverKey, true, responseTime);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        this.updateStats(serverKey, false);
        
        // Continue to next server
        continue;
      }
    }

    throw new StellarError(
      'All servers failed', 
      lastError || new Error('No servers available')
    );
  }

  private updateStats(serverKey: string, success: boolean, responseTime?: number) {
    const stats = this.connectionStats.get(serverKey);
    if (!stats) return;

    stats.requests++;
    stats.lastRequestTime = Date.now();

    if (success && responseTime) {
      // Update average response time
      const totalTime = stats.averageResponseTime * (stats.requests - 1) + responseTime;
      stats.averageResponseTime = totalTime / stats.requests;
    } else {
      stats.failures++;
      stats.lastFailureTime = Date.now();
    }
  }

  async checkServerHealth(): Promise<Map<string, boolean>> {
    const healthStatus = new Map<string, boolean>();

    for (const [serverKey, server] of this.servers) {
      try {
        await server.ledgers().limit(1).call();
        healthStatus.set(serverKey, true);
      } catch (error) {
        healthStatus.set(serverKey, false);
      }
    }

    return healthStatus;
  }

  getConnectionStats(): Map<string, ConnectionStats> {
    return new Map(this.connectionStats);
  }

  async measureLatency(serverKey?: string): Promise<number> {
    const server = serverKey ? 
      this.servers.get(serverKey) : 
      await this.getOptimalServer();
    
    if (!server) {
      throw new StellarError('Server not found');
    }

    const startTime = Date.now();
    try {
      await server.ledgers().limit(1).call();
      return Date.now() - startTime;
    } catch (error) {
      throw new StellarError('Latency measurement failed', error as Error);
    }
  }

  setRateLimit(requestsPerSecond: number) {
    this.maxRequestsPerSecond = Math.max(1, Math.min(100, requestsPerSecond));
  }

  resetStats() {
    for (const [key] of this.servers) {
      this.connectionStats.set(key, this.createInitialStats());
    }
  }

  async loadAccount(publicKey: string) {
    return this.executeWithFallback(server => server.loadAccount(publicKey));
  }

  async submitTransaction(transaction: any) {
    return this.executeWithFallback(server => server.submitTransaction(transaction));
  }

  async fetchBaseFee() {
    return this.executeWithFallback(server => server.fetchBaseFee());
  }

  async getTransactions(publicKey: string, limit: number) {
    return this.executeWithFallback(server => 
      server.transactions().forAccount(publicKey).limit(limit).order('desc').call()
    );
  }

  async getPayments(publicKey: string, limit: number) {
    return this.executeWithFallback(server => 
      server.payments().forAccount(publicKey).limit(limit).order('desc').call()
    );
  }
}

// Remove default instance export to avoid circular dependencies