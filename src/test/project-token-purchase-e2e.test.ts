import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';
import { randomUUID } from 'crypto';
import type { Project, User, Purchase } from '@/types/database';
import { createMockProject } from '@/test/factories/project-factory';
import { createMockUserWithWallet } from '@/test/factories/user-factory';
import { createMockPurchase } from '@/test/factories/purchase-factory';

// --- In-Memory Database Store for Stable E2E Testing ---
const inMemoryDb = {
  projects: new Map<string, Project>(),
  users: new Map<string, User>(),
  purchases: new Map<number, Purchase>(),
  purchaseIdCounter: 1,
  clear() {
    this.projects.clear();
    this.users.clear();
    this.purchases.clear();
    this.purchaseIdCounter = 1;
  },
};

// Mock External IPFS Service
const mockUploadToIPFS = jest.fn(async (_metadata: object) => ({
  ipfsHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
  ipfsUrl: 'https://gateway.pinata.cloud/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
  success: true,
}));

jest.mock('@/lib/ipfs/upload-to-ipfs', () => ({
  uploadToIPFS: (data: object) => mockUploadToIPFS(data),
}));

// Mock External Soroban Smart Contract Deployment Service
const mockDeployProjectToken = jest.fn(async (params: any) => ({
  contractAddress: 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K',
  issuerPublicKey: params.issuerPublicKey || 'GBXGQJW4BL5KSRNXMH6JHSMAHGAP2TVTNOYDNI457TGQ6F26E6I4B6GG',
  transactionHash: 'MOCK_DEPLOY_TX_HASH_9F8E7D6C5B4A3',
}));

jest.mock('@/services/soroban-deployment.service', () => ({
  sorobanDeploymentService: {
    deployProjectToken: (params: any) => mockDeployProjectToken(params),
  },
}));

// Mock Soroban Client (Buy Token simulation & execution)
const mockSimulateSorobanBuyCall = jest.fn(async (params: any) => ({
  txHash: 'MOCK_SOROBAN_BUY_TX_HASH_123456789',
  status: 'success',
  buyer: params.buyerAddress,
  asset: params.projectAsset,
  amount: params.amount,
  networkPassphrase: 'Test SDF Network ; September 2015',
}));

jest.mock('@/lib/soroban/soroban-client', () => ({
  simulateSorobanBuyCall: (params: any) => mockSimulateSorobanBuyCall(params),
}));

// Mock Supabase Database Client
jest.mock('@/lib/db/db', () => ({
  __esModule: true,
  default: {
    from: (table: string) => ({
      select: (_cols?: string) => ({
        eq: (col: string, val: any) => ({
          single: async () => {
            if (table === 'projects') {
              const project = inMemoryDb.projects.get(String(val));
              if (!project) {
                return { data: null, error: { message: 'Project not found' } };
              }
              return { data: project, error: null };
            }
            if (table === 'users') {
              const user = inMemoryDb.users.get(String(val));
              if (!user) {
                return { data: null, error: { message: 'User not found' } };
              }
              return { data: user, error: null };
            }
            return { data: null, error: { message: `Unknown table ${table}` } };
          },
        }),
      }),
      insert: (records: any[]) => ({
        select: () => ({
          single: async () => {
            if (table === 'purchases') {
              const rec = records[0];
              const newId = inMemoryDb.purchaseIdCounter++;
              const purchaseRecord: Purchase = {
                id: newId,
                user_id: String(rec.user_id),
                project_id: String(rec.project_id),
                amount: Number(rec.amount),
                purchase_date: rec.purchase_date || new Date().toISOString(),
              };
              inMemoryDb.purchases.set(newId, purchaseRecord);
              return { data: purchaseRecord, error: null };
            }
            return { data: null, error: { message: 'Insert not supported for table' } };
          },
        }),
      }),
    }),
  },
}));

// Mock ProjectRepository persistence
jest.mock('@/repositories/project.repository', () => ({
  ProjectRepository: class {
    async create(payload: Partial<Project>): Promise<Project> {
      const generatedId = (payload as any).id || randomUUID();
      const savedProject: Project = {
        id: generatedId,
        name: payload.name || 'Test Project',
        description: payload.description || '',
        location: payload.location || 'Costa Rica',
        photo_url: payload.photo_url || 'https://example.com/photo.jpg',
        impact: payload.impact || 'Conservation',
        asset_code: payload.asset_code || 'TREE',
        issuer_public_key: payload.issuer_public_key || 'GTESTISSUERKEY',
        supply: payload.supply || 1000,
        active: payload.active ?? true,
        ipfs_hash: payload.ipfs_hash || null,
        ipfs_url: payload.ipfs_url || null,
        contract_id: payload.contract_id || null,
        transaction_hash: payload.transaction_hash || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      inMemoryDb.projects.set(generatedId, savedProject);
      return savedProject;
    }

    async findById(id: string): Promise<Project | null> {
      return inMemoryDb.projects.get(id) || null;
    }

    async findMany(): Promise<Project[]> {
      return Array.from(inMemoryDb.projects.values());
    }

    async paginateProjects(page: number, limit: number) {
      const all = Array.from(inMemoryDb.projects.values());
      const start = (page - 1) * limit;
      return {
        data: all.slice(start, start + limit),
        total: all.length,
        page,
        limit,
      };
    }
  },
}));

describe('Project Token Purchase Flow (End-to-End)', () => {
  let app: Express;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key-1234567890';
    process.env.STELLAR_NETWORK = 'testnet';
    process.env.JWT_SECRET = 'dev-insecure-jwt-secret-please-change-32+chars';
    process.env.ENCRYPTION_KEY = 'dev-insecure-encryption-key-change-32+chars';

    app = express();
    app.use(express.json());

    const projectRoutes = (await import('@/routes/project.routes')).default;
    const buyTokenRoutes = (await import('@/routes/buy-token.route')).default;

    // Support both root paths and /api paths
    app.use('/projects', projectRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/buy-token', buyTokenRoutes);
    app.use('/api/token', buyTokenRoutes);
  });

  beforeEach(() => {
    inMemoryDb.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.resetModules();
  });

  describe('POST /projects (Project Creation & Soroban Contract Deployment)', () => {
    it('successfully creates a project, uploads to IPFS, deploys Soroban contract, and registers in database', async () => {
      const projectPayload = {
        name: 'Monteverde Cloud Forest Conservation',
        description: 'Protecting endangered cloud forest biodiversity in Puntarenas',
        location: 'Monteverde, Costa Rica',
        photo_url: 'https://images.unsplash.com/photo-monteverde.jpg',
        impact: '1500 hectares preserved',
        asset_code: 'MVCF',
        issuer_public_key: 'GBXGQJW4BL5KSRNXMH6JHSMAHGAP2TVTNOYDNI457TGQ6F26E6I4B6GG',
        supply: 1000000,
      };

      const response = await request(app)
        .post('/projects')
        .send(projectPayload)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Project registered successfully');
      expect(response.body).toHaveProperty('data');

      const data = response.body.data;
      expect(data.name).toBe(projectPayload.name);
      expect(data.asset_code).toBe(projectPayload.asset_code);
      expect(data.contract_address).toBe('CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K');
      expect(data.transaction_hash).toBe('MOCK_DEPLOY_TX_HASH_9F8E7D6C5B4A3');
      expect(data.ipfs_hash).toBe('QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco');

      // Verify IPFS upload was triggered
      expect(mockUploadToIPFS).toHaveBeenCalledTimes(1);

      // Verify Soroban deployment was triggered with exact contract parameters
      expect(mockDeployProjectToken).toHaveBeenCalledWith({
        supply: projectPayload.supply,
        name: projectPayload.name,
        description: projectPayload.description,
        ipfsHash: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
        issuerPublicKey: projectPayload.issuer_public_key,
      });

      // Verify database entry
      expect(inMemoryDb.projects.size).toBe(1);
      const savedProject = inMemoryDb.projects.get(data.id);
      expect(savedProject).toBeDefined();
      expect(savedProject?.contract_id).toBe('CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K');
      expect(savedProject?.asset_code).toBe('MVCF');
    });

    it('returns 500 when Soroban contract deployment fails', async () => {
      mockDeployProjectToken.mockRejectedValueOnce(new Error('Contract deployment failed: Insufficient gas'));

      const projectPayload = {
        name: 'Faulty Project',
        description: 'Should fail at Soroban deployment',
        location: 'Tortuguero, Costa Rica',
        photo_url: 'https://example.com/photo.jpg',
        impact: 'Failed deployment test',
        asset_code: 'FLT',
        issuer_public_key: 'GBXGQJW4BL5KSRNXMH6JHSMAHGAP2TVTNOYDNI457TGQ6F26E6I4B6GG',
        supply: 500000,
      };

      const response = await request(app)
        .post('/projects')
        .send(projectPayload)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error registering project');
      expect(inMemoryDb.projects.size).toBe(0);
    });

    it('returns 500 when IPFS upload fails', async () => {
      mockUploadToIPFS.mockRejectedValueOnce(new Error('IPFS gateway timed out'));

      const projectPayload = {
        name: 'Faulty IPFS Project',
        description: 'Should fail at IPFS pinning',
        location: 'Arenal, Costa Rica',
        photo_url: 'https://example.com/photo.jpg',
        impact: 'IPFS failure test',
        asset_code: 'FIP',
        issuer_public_key: 'GBXGQJW4BL5KSRNXMH6JHSMAHGAP2TVTNOYDNI457TGQ6F26E6I4B6GG',
        supply: 250000,
      };

      const response = await request(app)
        .post('/projects')
        .send(projectPayload)
        .expect(500);

      expect(response.body).toHaveProperty('error', 'Error registering project');
      expect(mockDeployProjectToken).not.toHaveBeenCalled();
      expect(inMemoryDb.projects.size).toBe(0);
    });
  });

  describe('POST /buy-token (User Token Purchase Flow)', () => {
    const validProjectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const validUserId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';

    beforeEach(() => {
      // Seed valid project in database
      const projectMock = createMockProject({
        id: validProjectId,
        name: 'Sarapiqui Rainforest Reserve',
      });
      inMemoryDb.projects.set(validProjectId, {
        id: projectMock.id,
        name: projectMock.name,
        description: 'Biodiversity corridor conservation',
        location: 'Heredia, Costa Rica',
        photo_url: 'https://example.com/sarapiqui.jpg',
        impact: '3000 trees planted',
        asset_code: 'SRQ',
        issuer_public_key: 'GBXGQJW4BL5KSRNXMH6JHSMAHGAP2TVTNOYDNI457TGQ6F26E6I4B6GG',
        supply: 500000,
        active: true,
        contract_id: 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K',
        transaction_hash: 'MOCK_DEPLOY_TX_HASH_SRQ',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Seed valid user with wallet in database
      const userMock = createMockUserWithWallet({
        id: validUserId,
        email: 'buyer@example.com',
      });
      inMemoryDb.users.set(validUserId, {
        id: userMock.id,
        email: userMock.email,
        public_key: userMock.publicKey,
        wallet_address: userMock.publicKey,
        secret_key_enc: null,
        auth_method: 'external',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);
    });

    it('successfully purchases tokens, simulates Soroban call, and registers purchase in database', async () => {
      const purchasePayload = {
        project_id: validProjectId,
        user_id: validUserId,
        amount: 500,
      };

      const response = await request(app)
        .post('/buy-token')
        .send(purchasePayload)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Token purchase successful');
      expect(response.body).toHaveProperty('transaction');
      expect(response.body).toHaveProperty('purchase');

      // Verify Soroban simulation call
      expect(mockSimulateSorobanBuyCall).toHaveBeenCalledWith({
        buyerAddress: expect.any(String),
        projectAsset: 'SRQ',
        amount: 500,
      });

      // Verify database purchase record
      expect(inMemoryDb.purchases.size).toBe(1);
      const purchase = inMemoryDb.purchases.get(response.body.purchase.id);
      expect(purchase).toBeDefined();
      expect(purchase?.user_id).toBe(validUserId);
      expect(purchase?.project_id).toBe(validProjectId);
      expect(purchase?.amount).toBe(500);
      expect(purchase?.purchase_date).toBeDefined();
    });

    it('returns 400 when purchase payload validation fails (invalid UUIDs)', async () => {
      const invalidPayload = {
        project_id: 'invalid-non-uuid-project-id',
        user_id: 'invalid-user-id',
        amount: 100,
      };

      const response = await request(app)
        .post('/buy-token')
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(inMemoryDb.purchases.size).toBe(0);
      expect(mockSimulateSorobanBuyCall).not.toHaveBeenCalled();
    });

    it('returns 400 when amount is not positive', async () => {
      const invalidPayload = {
        project_id: validProjectId,
        user_id: validUserId,
        amount: -50,
      };

      const response = await request(app)
        .post('/buy-token')
        .send(invalidPayload)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(inMemoryDb.purchases.size).toBe(0);
      expect(mockSimulateSorobanBuyCall).not.toHaveBeenCalled();
    });

    it('returns error when project does not exist in database', async () => {
      const nonExistentProjectId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
      const purchasePayload = {
        project_id: nonExistentProjectId,
        user_id: validUserId,
        amount: 250,
      };

      const response = await request(app)
        .post('/buy-token')
        .send(purchasePayload);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(inMemoryDb.purchases.size).toBe(0);
    });

    it('returns error when user does not exist in database', async () => {
      const nonExistentUserId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
      const purchasePayload = {
        project_id: validProjectId,
        user_id: nonExistentUserId,
        amount: 150,
      };

      const response = await request(app)
        .post('/buy-token')
        .send(purchasePayload);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(inMemoryDb.purchases.size).toBe(0);
    });
  });

  describe('Complete Integrated Lifecycle (Project Deployment -> Token Purchase)', () => {
    it('executes full sequence: registers project with Soroban, creates user, purchases tokens, and verifies database persistence', async () => {
      // 1. Project Registration via POST /projects
      const projectPayload = {
        name: 'Osa Peninsula Jaguar Corridor',
        description: 'Rainforest protection and habitat regeneration',
        location: 'Osa Peninsula, Costa Rica',
        photo_url: 'https://images.unsplash.com/photo-jaguar.jpg',
        impact: '5000 hectares protected',
        asset_code: 'OPJC',
        issuer_public_key: 'GBXGQJW4BL5KSRNXMH6JHSMAHGAP2TVTNOYDNI457TGQ6F26E6I4B6GG',
        supply: 2000000,
      };

      const projectRes = await request(app)
        .post('/projects')
        .send(projectPayload)
        .expect(201);

      const createdProject = projectRes.body.data;
      expect(createdProject.id).toBeDefined();
      expect(createdProject.contract_address).toBe('CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K');

      // 2. Set up buyer user in DB
      const buyerId = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
      const buyerWallet = createMockUserWithWallet({ id: buyerId, email: 'investor@treebyte.eco' });
      inMemoryDb.users.set(buyerId, {
        id: buyerWallet.id,
        email: buyerWallet.email,
        public_key: buyerWallet.publicKey,
        wallet_address: buyerWallet.publicKey,
        secret_key_enc: null,
        auth_method: 'external',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      // 3. Purchase tokens via POST /buy-token
      const purchaseRes = await request(app)
        .post('/buy-token')
        .send({
          project_id: createdProject.id,
          user_id: buyerId,
          amount: 1500,
        })
        .expect(200);

      expect(purchaseRes.body.message).toBe('Token purchase successful');
      expect(purchaseRes.body.transaction.txHash).toBe('MOCK_SOROBAN_BUY_TX_HASH_123456789');

      // 4. Verify Database Integrity
      expect(inMemoryDb.projects.has(createdProject.id)).toBe(true);
      expect(inMemoryDb.purchases.size).toBe(1);

      const recordedPurchase = inMemoryDb.purchases.get(purchaseRes.body.purchase.id);
      expect(recordedPurchase?.project_id).toBe(createdProject.id);
      expect(recordedPurchase?.user_id).toBe(buyerId);
      expect(recordedPurchase?.amount).toBe(1500);
    });
  });
});
