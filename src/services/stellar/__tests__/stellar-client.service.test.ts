import { StellarClientService } from '../stellar-client.service';
import { StellarError } from '../error-handler.service';

// Mock the stellar SDK
jest.mock('@stellar/stellar-sdk', () => ({
  Horizon: {
    Server: jest.fn().mockImplementation(() => ({
      loadAccount: jest.fn(),
      submitTransaction: jest.fn(),
      fetchBaseFee: jest.fn(),
      transactions: jest.fn().mockReturnThis(),
      payments: jest.fn().mockReturnThis(),
      forAccount: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      call: jest.fn(),
    })),
  },
}));

describe('StellarClientService', () => {
  let stellarClient: StellarClientService;
  let mockServer: any;

  beforeEach(() => {
    const config = {
      horizonUrl: 'https://horizon-testnet.stellar.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      friendbotUrl: 'https://friendbot.stellar.org',
    };
    
    stellarClient = new StellarClientService(config);
    mockServer = stellarClient.getServer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccount', () => {
    it('should successfully load an account', async () => {
      const mockAccount = {
        id: 'GTEST123',
        sequence: '12345',
        balances: [],
      };

      mockServer.loadAccount.mockResolvedValueOnce(mockAccount);

      const result = await stellarClient.getAccount('GTEST123');

      expect(result).toEqual(mockAccount);
      expect(mockServer.loadAccount).toHaveBeenCalledWith('GTEST123');
    });

    it('should throw StellarError when account loading fails', async () => {
      const mockError = new Error('Account not found');
      mockServer.loadAccount.mockRejectedValueOnce(mockError);

      await expect(stellarClient.getAccount('GTEST123')).rejects.toThrow(StellarError);
      await expect(stellarClient.getAccount('GTEST123')).rejects.toThrow('Failed to load account');
    });
  });

  describe('fetchBaseFee', () => {
    it('should successfully fetch base fee', async () => {
      const mockFee = 100;
      mockServer.fetchBaseFee.mockResolvedValueOnce(mockFee);

      const result = await stellarClient.fetchBaseFee();

      expect(result).toBe(mockFee);
      expect(mockServer.fetchBaseFee).toHaveBeenCalled();
    });

    it('should throw StellarError when base fee fetching fails', async () => {
      const mockError = new Error('Network error');
      mockServer.fetchBaseFee.mockRejectedValueOnce(mockError);

      await expect(stellarClient.fetchBaseFee()).rejects.toThrow(StellarError);
      await expect(stellarClient.fetchBaseFee()).rejects.toThrow('Failed to fetch base fee');
    });
  });

  describe('isAccountExists', () => {
    it('should return true when account exists', async () => {
      const mockAccount = { id: 'GTEST123' };
      mockServer.loadAccount.mockResolvedValueOnce(mockAccount);

      const result = await stellarClient.isAccountExists('GTEST123');

      expect(result).toBe(true);
    });

    it('should return false when account does not exist', async () => {
      const mockError = new Error('404');
      mockServer.loadAccount.mockRejectedValueOnce(mockError);

      // Mock StellarError to handle 404
      jest.spyOn(stellarClient, 'getAccount').mockRejectedValueOnce(
        new StellarError('Failed to load account', mockError)
      );

      const result = await stellarClient.isAccountExists('GTEST123');

      expect(result).toBe(false);
    });
  });

  describe('fundAccount', () => {
    beforeEach(() => {
      // Mock fetch globally
      global.fetch = jest.fn();
    });

    it('should successfully fund an account', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        statusText: 'OK',
      });

      await expect(stellarClient.fundAccount('GTEST123')).resolves.not.toThrow();
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://friendbot.stellar.org?addr=GTEST123'
      );
    });

    it('should throw StellarError when funding fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      await expect(stellarClient.fundAccount('GTEST123')).rejects.toThrow(StellarError);
      await expect(stellarClient.fundAccount('GTEST123')).rejects.toThrow('Account funding failed');
    });

    it('should throw StellarError when friendbot URL is not configured', async () => {
      const configWithoutFriendbot = {
        horizonUrl: 'https://horizon.stellar.org',
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
      };
      
      const mainnetClient = new StellarClientService(configWithoutFriendbot);

      await expect(mainnetClient.fundAccount('GTEST123')).rejects.toThrow(StellarError);
      await expect(mainnetClient.fundAccount('GTEST123')).rejects.toThrow('Friendbot URL not configured');
    });
  });
});