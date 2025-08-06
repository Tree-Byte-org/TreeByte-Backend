import { StellarError, StellarErrorType, StellarErrorHandler } from '../error-handler.service';

describe('StellarError', () => {
  it('should create error with correct properties', () => {
    const originalError = new Error('Test error');
    const context = { publicKey: 'GTEST123' };
    
    const stellarError = new StellarError('Custom message', originalError, context);

    expect(stellarError.message).toBe('Custom message');
    expect(stellarError.originalError).toBe(originalError);
    expect(stellarError.context).toBe(context);
    expect(stellarError.type).toBe(StellarErrorType.UNKNOWN_ERROR);
    expect(stellarError.timestamp).toBeInstanceOf(Date);
  });

  describe('error classification', () => {
    it('should classify account not found errors', () => {
      const error404 = new StellarError('Account not found');
      expect(error404.type).toBe(StellarErrorType.ACCOUNT_NOT_FOUND);

      const error404Original = new StellarError('Failed', new Error('404 not found'));
      expect(error404Original.type).toBe(StellarErrorType.ACCOUNT_NOT_FOUND);
    });

    it('should classify insufficient balance errors', () => {
      const insufficientError = new StellarError('Insufficient funds');
      expect(insufficientError.type).toBe(StellarErrorType.INSUFFICIENT_BALANCE);

      const balanceError = new StellarError('Low balance detected');
      expect(balanceError.type).toBe(StellarErrorType.INSUFFICIENT_BALANCE);
    });

    it('should classify transaction failed errors', () => {
      const txError = new StellarError('Transaction failed');
      expect(txError.type).toBe(StellarErrorType.TRANSACTION_FAILED);
    });

    it('should classify network errors', () => {
      const networkError = new StellarError('Network timeout');
      expect(networkError.type).toBe(StellarErrorType.NETWORK_ERROR);

      const connectionError = new StellarError('Connection failed');
      expect(connectionError.type).toBe(StellarErrorType.NETWORK_ERROR);
    });

    it('should classify keypair errors', () => {
      const keypairError = new StellarError('Invalid keypair');
      expect(keypairError.type).toBe(StellarErrorType.INVALID_KEYPAIR);

      const secretError = new StellarError('Bad secret key');
      expect(secretError.type).toBe(StellarErrorType.INVALID_KEYPAIR);
    });

    it('should classify trustline errors', () => {
      const trustlineError = new StellarError('Trustline creation failed');
      expect(trustlineError.type).toBe(StellarErrorType.TRUSTLINE_ERROR);
    });

    it('should classify funding errors', () => {
      const fundError = new StellarError('Funding failed');
      expect(fundError.type).toBe(StellarErrorType.FUNDING_ERROR);

      const friendbotError = new StellarError('Friendbot error');
      expect(friendbotError.type).toBe(StellarErrorType.FUNDING_ERROR);
    });
  });

  describe('isRetryable', () => {
    it('should mark network errors as retryable', () => {
      const networkError = new StellarError('Network timeout');
      expect(networkError.isRetryable()).toBe(true);
    });

    it('should mark funding errors as retryable', () => {
      const fundingError = new StellarError('Funding failed');
      expect(fundingError.isRetryable()).toBe(true);
    });

    it('should not mark account not found errors as retryable', () => {
      const accountError = new StellarError('Account not found');
      expect(accountError.isRetryable()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize error correctly', () => {
      const originalError = new Error('Original message');
      const context = { key: 'value' };
      const stellarError = new StellarError('Test error', originalError, context);

      const json = stellarError.toJSON();

      expect(json).toEqual({
        name: 'StellarError',
        message: 'Test error',
        type: stellarError.type,
        context: context,
        timestamp: stellarError.timestamp,
        originalError: 'Original message',
      });
    });
  });
});

describe('StellarErrorHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValueOnce('success');

      const result = await StellarErrorHandler.withRetry(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry retryable errors', async () => {
      const retryableError = new StellarError('Network timeout');
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce('success');

      const promise = StellarErrorHandler.withRetry(mockOperation);

      // Advance timers to trigger retries
      jest.advanceTimersByTime(1000);
      await Promise.resolve(); // Allow first retry
      jest.advanceTimersByTime(2000);
      await Promise.resolve(); // Allow second retry

      const result = await promise;

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new StellarError('Account not found');
      const mockOperation = jest.fn().mockRejectedValueOnce(nonRetryableError);

      await expect(StellarErrorHandler.withRetry(mockOperation)).rejects.toBe(nonRetryableError);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect max retries limit', async () => {
      const retryableError = new StellarError('Network timeout');
      const mockOperation = jest.fn().mockRejectedValue(retryableError);

      const promise = StellarErrorHandler.withRetry(mockOperation, 2);

      // Advance timers for retries
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();

      await expect(promise).rejects.toBe(retryableError);
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should convert regular errors to StellarError', async () => {
      const regularError = new Error('Regular error');
      const mockOperation = jest.fn().mockRejectedValueOnce(regularError);

      await expect(StellarErrorHandler.withRetry(mockOperation)).rejects.toBeInstanceOf(StellarError);
    });
  });

  describe('logError', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log error with context', () => {
      const stellarError = new StellarError('Test error', new Error('Original'), { key: 'value' });
      
      StellarErrorHandler.logError(stellarError, 'TestContext');

      expect(consoleSpy).toHaveBeenCalledWith('[StellarError - TestContext]', {
        message: 'Test error',
        type: stellarError.type,
        context: { key: 'value' },
        originalError: 'Original',
        timestamp: stellarError.timestamp,
      });
    });

    it('should log error without context', () => {
      const stellarError = new StellarError('Test error');
      
      StellarErrorHandler.logError(stellarError);

      expect(consoleSpy).toHaveBeenCalledWith('[StellarError]', expect.any(Object));
    });
  });
});