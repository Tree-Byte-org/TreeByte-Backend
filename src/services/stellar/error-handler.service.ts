export interface StellarErrorContext {
  [key: string]: any;
}

export enum StellarErrorType {
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  INVALID_KEYPAIR = 'INVALID_KEYPAIR',
  TRUSTLINE_ERROR = 'TRUSTLINE_ERROR',
  FUNDING_ERROR = 'FUNDING_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class StellarError extends Error {
  public readonly type: StellarErrorType;
  public readonly originalError?: Error;
  public readonly context?: StellarErrorContext;
  public readonly timestamp: Date;

  constructor(
    message: string, 
    originalError?: Error, 
    context?: StellarErrorContext
  ) {
    super(message);
    this.name = 'StellarError';
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date();
    this.type = this.classifyError(message, originalError);
  }

  private classifyError(message: string, originalError?: Error): StellarErrorType {
    const errorMessage = (originalError?.message || message).toLowerCase();

    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return StellarErrorType.ACCOUNT_NOT_FOUND;
    }

    if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
      return StellarErrorType.INSUFFICIENT_BALANCE;
    }

    if (errorMessage.includes('transaction') && errorMessage.includes('failed')) {
      return StellarErrorType.TRANSACTION_FAILED;
    }

    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
      return StellarErrorType.NETWORK_ERROR;
    }

    if (errorMessage.includes('keypair') || errorMessage.includes('secret') || errorMessage.includes('public key')) {
      return StellarErrorType.INVALID_KEYPAIR;
    }

    if (errorMessage.includes('trustline') || errorMessage.includes('trust')) {
      return StellarErrorType.TRUSTLINE_ERROR;
    }

    if (errorMessage.includes('fund') || errorMessage.includes('friendbot')) {
      return StellarErrorType.FUNDING_ERROR;
    }

    return StellarErrorType.UNKNOWN_ERROR;
  }

  public isRetryable(): boolean {
    return this.type === StellarErrorType.NETWORK_ERROR || 
           this.type === StellarErrorType.FUNDING_ERROR;
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      context: this.context,
      timestamp: this.timestamp,
      originalError: this.originalError?.message,
    };
  }
}

export class StellarErrorHandler {
  private static maxRetries = 3;
  private static retryDelay = 1000; // 1 second

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = StellarErrorHandler.maxRetries
  ): Promise<T> {
    let lastError: StellarError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof StellarError ? error : new StellarError('Operation failed', error as Error);
        
        if (attempt === maxRetries || !lastError.isRetryable()) {
          throw lastError;
        }

        await StellarErrorHandler.delay(StellarErrorHandler.retryDelay * attempt);
      }
    }

    throw lastError!;
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static logError(error: StellarError, context?: string): void {
    console.error(`[StellarError${context ? ` - ${context}` : ''}]`, {
      message: error.message,
      type: error.type,
      context: error.context,
      originalError: error.originalError?.message,
      timestamp: error.timestamp,
    });
  }
}