import { AccountService } from '../account.service';
import { StellarClientService } from '../stellar-client.service';
import { StellarError } from '../error-handler.service';
import { Keypair } from '@stellar/stellar-sdk';

// Mock dependencies
jest.mock('../stellar-client.service');
jest.mock('@stellar/stellar-sdk', () => ({
  Keypair: {
    random: jest.fn(),
    fromPublicKey: jest.fn(),
    fromSecret: jest.fn(),
  },
}));

describe('AccountService', () => {
  let accountService: AccountService;
  let mockStellarClient: jest.Mocked<StellarClientService>;

  beforeEach(() => {
    mockStellarClient = {
      getAccount: jest.fn(),
      fundAccount: jest.fn(),
      isAccountExists: jest.fn(),
    } as any;

    accountService = new AccountService(mockStellarClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createKeypair', () => {
    it('should create a random keypair successfully', async () => {
      const mockKeypair = {
        publicKey: jest.fn().mockReturnValue('GTEST123'),
        secret: jest.fn().mockReturnValue('STEST123'),
      };
      
      (Keypair.random as jest.Mock).mockReturnValueOnce(mockKeypair);

      const result = await accountService.createKeypair();

      expect(result).toBe(mockKeypair);
      expect(Keypair.random).toHaveBeenCalled();
    });

    it('should throw StellarError when keypair creation fails', async () => {
      (Keypair.random as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Keypair creation failed');
      });

      await expect(accountService.createKeypair()).rejects.toThrow(StellarError);
      await expect(accountService.createKeypair()).rejects.toThrow('Failed to generate keypair');
    });
  });

  describe('getAccount', () => {
    it('should successfully get an account', async () => {
      const mockAccount = {
        id: 'GTEST123',
        sequence: '12345',
        balances: [],
      };

      mockStellarClient.getAccount.mockResolvedValueOnce(mockAccount as any);

      const result = await accountService.getAccount('GTEST123');

      expect(result).toBe(mockAccount);
      expect(mockStellarClient.getAccount).toHaveBeenCalledWith('GTEST123');
    });
  });

  describe('getAccountInfo', () => {
    it('should return formatted account information', async () => {
      const mockAccount = {
        id: 'GTEST123',
        sequence: '12345',
        balances: [
          {
            asset_type: 'native',
            balance: '100.0000000',
          },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: 'GISSUER123',
            balance: '50.0000000',
            limit: '1000.0000000',
          },
        ],
        signers: [],
        thresholds: {
          low_threshold: 0,
          med_threshold: 0,
          high_threshold: 0,
        },
      };

      mockStellarClient.getAccount.mockResolvedValueOnce(mockAccount as any);

      const result = await accountService.getAccountInfo('GTEST123');

      expect(result).toEqual({
        id: 'GTEST123',
        sequence: '12345',
        balances: [
          {
            asset_type: 'native',
            balance: '100.0000000',
            asset_code: undefined,
            asset_issuer: undefined,
            limit: undefined,
          },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: 'GISSUER123',
            balance: '50.0000000',
            limit: '1000.0000000',
          },
        ],
        signers: [],
        thresholds: {
          low_threshold: 0,
          med_threshold: 0,
          high_threshold: 0,
        },
      });
    });
  });

  describe('getNativeBalance', () => {
    it('should return native XLM balance', async () => {
      const mockAccount = {
        id: 'GTEST123',
        sequence: '12345',
        balances: [
          {
            asset_type: 'native',
            balance: '100.0000000',
          },
        ],
        signers: [],
        thresholds: {},
      };

      mockStellarClient.getAccount.mockResolvedValueOnce(mockAccount as any);

      const result = await accountService.getNativeBalance('GTEST123');

      expect(result).toBe('100.0000000');
    });

    it('should return "0" when no native balance found', async () => {
      const mockAccount = {
        id: 'GTEST123',
        sequence: '12345',
        balances: [],
        signers: [],
        thresholds: {},
      };

      mockStellarClient.getAccount.mockResolvedValueOnce(mockAccount as any);

      const result = await accountService.getNativeBalance('GTEST123');

      expect(result).toBe('0');
    });
  });

  describe('validatePublicKey', () => {
    it('should return true for valid public key', () => {
      (Keypair.fromPublicKey as jest.Mock).mockImplementationOnce(() => ({}));

      const result = accountService.validatePublicKey('GTEST123');

      expect(result).toBe(true);
      expect(Keypair.fromPublicKey).toHaveBeenCalledWith('GTEST123');
    });

    it('should return false for invalid public key', () => {
      (Keypair.fromPublicKey as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid public key');
      });

      const result = accountService.validatePublicKey('INVALID');

      expect(result).toBe(false);
    });
  });

  describe('validateSecretKey', () => {
    it('should return true for valid secret key', () => {
      (Keypair.fromSecret as jest.Mock).mockImplementationOnce(() => ({}));

      const result = accountService.validateSecretKey('STEST123');

      expect(result).toBe(true);
      expect(Keypair.fromSecret).toHaveBeenCalledWith('STEST123');
    });

    it('should return false for invalid secret key', () => {
      (Keypair.fromSecret as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Invalid secret key');
      });

      const result = accountService.validateSecretKey('INVALID');

      expect(result).toBe(false);
    });
  });

  describe('accountExists', () => {
    it('should return true when account exists', async () => {
      mockStellarClient.isAccountExists.mockResolvedValueOnce(true);

      const result = await accountService.accountExists('GTEST123');

      expect(result).toBe(true);
      expect(mockStellarClient.isAccountExists).toHaveBeenCalledWith('GTEST123');
    });

    it('should return false when account does not exist', async () => {
      mockStellarClient.isAccountExists.mockResolvedValueOnce(false);

      const result = await accountService.accountExists('GTEST123');

      expect(result).toBe(false);
    });
  });
});