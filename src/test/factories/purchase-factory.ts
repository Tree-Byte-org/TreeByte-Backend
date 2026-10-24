import type { Purchase } from '@/types/database';

export interface MockPurchaseOptions {
  id?: number;
  user_id?: string;
  project_id?: string;
  amount?: number;
  purchase_date?: string;
}

/**
 * Creates a mock purchase object with default test data.
 * @param overrides - An object with properties to override the default mock purchase data.
 * @returns A new Purchase object.
 */
export const createMockPurchase = (overrides?: MockPurchaseOptions): Purchase => {
  return {
    id: overrides?.id ?? Math.floor(Math.random() * 100000) + 1,
    user_id: overrides?.user_id ?? '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    project_id: overrides?.project_id ?? '4fa85f64-5717-4562-b3fc-2c963f66afa7',
    amount: overrides?.amount ?? 100,
    purchase_date: overrides?.purchase_date ?? new Date().toISOString(),
  };
};
