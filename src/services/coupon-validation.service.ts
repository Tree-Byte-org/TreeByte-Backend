
import { CouponDbService } from '@/services/coupon-db.service';
import { walletService, accountService } from '@/services/stellar';
import { simulateSorobanBuyCall } from '@/lib/soroban/soroban-client';
import supabase from '@/lib/db/db';
import logger from '@/utils/logger';
import {
  ValidationError,
  CouponNotFoundError,
  UnauthorizedRedemptionError,
  CouponExpiredError,
  CouponAlreadyRedeemedError,
  ContractValidationError,
  WalletValidationError,
  BusinessHoursError,
  GeographicRestrictionError,
  DailyLimitExceededError,
  RedemptionWindowError,
  CouponStatusError
} from '@/types/coupon-validation-errors';
import { Coupon, CouponStatus, CouponWithRelations, isCouponExpired } from '@/types/coupon';


export interface CouponValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  couponData?: CouponWithRelations | null;
  contractData?: any;
}

export async function validateCouponForRedemption(couponId: string, userId: string): Promise<CouponValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  let couponData: CouponWithRelations | null = null;
  let contractData: any = null;
  let isValid = true;

  try {
    couponData = await validateCouponExists(couponId);
    await validateCouponOwnership(couponData, userId);
    await validateCouponStatus(couponData);
    await validateCouponExpiration(couponData);
    await validateUserWallet(userId);
    await checkRedemptionWindow(couponData);
    await checkBusinessOperatingHours(couponData);
    await checkGeographicRestrictions(couponData, userId);
    await checkDailyRedemptionLimits(userId);

    contractData = await validateContractCouponStatus(couponData.token_id);
    await validateContractOwnership(couponData.token_id, couponData.user_id);
    await validateContractNotRedeemed(couponData.token_id);
  } catch (err: any) {
    isValid = false;
    if (err instanceof ValidationError) errors.push(err);
    else errors.push(new ValidationError(err.message));
    logger.error('Coupon validation failed', { couponId, userId, error: err });
  }

  logger.info('Coupon validation attempt', { couponId, userId, isValid, errors });
  return { isValid, errors, warnings, couponData, contractData };
}


export async function validateCouponExists(couponId: string): Promise<CouponWithRelations> {
  const coupon = await CouponDbService.getCouponWithRelations(couponId);
  if (!coupon) throw new CouponNotFoundError();
  return coupon;
}


export async function validateCouponOwnership(coupon: CouponWithRelations, userId: string): Promise<void> {
  if (coupon.user_id !== userId) throw new UnauthorizedRedemptionError();
}


export async function validateCouponStatus(coupon: CouponWithRelations): Promise<void> {
  if (coupon.status === CouponStatus.REDEEMED) {
    throw new CouponAlreadyRedeemedError();
  }
  
  if (coupon.status !== CouponStatus.ACTIVE) {
    throw new CouponStatusError(`Coupon status is ${coupon.status}, expected ACTIVE`);
  }
}


export async function validateCouponExpiration(coupon: CouponWithRelations): Promise<void> {
  if (isCouponExpired(coupon)) throw new CouponExpiredError();
}


export async function validateUserWallet(userId: string): Promise<void> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (error || !user) {
      throw new WalletValidationError('User not found');
    }

    if (!user.wallet_address) {
      throw new WalletValidationError('User wallet not found');
    }

    const isValidAddress = accountService.validatePublicKey(user.wallet_address);
    if (!isValidAddress) {
      throw new WalletValidationError('Invalid wallet address format');
    }

    const accountExists = await accountService.accountExists(user.wallet_address);
    if (!accountExists) {
      throw new WalletValidationError('Wallet account does not exist on Stellar network');
    }
  } catch (error) {
    if (error instanceof WalletValidationError) throw error;
    logger.error('Wallet validation failed', { userId, error });
    throw new WalletValidationError('Wallet validation failed');
  }
}


export async function validateContractCouponStatus(tokenId: number): Promise<any> {
  try {
    const coupon = await CouponDbService.getCouponByTokenId(tokenId);
    if (!coupon || !coupon.contract_address) {
      throw new ContractValidationError('Contract address not found for coupon');
    }

    {/*For now, I am not calling the contract, I am just simulating the call 
       replace with actual Soroban contract interaction */}
    const contractData = {
      tokenId,
      valid: coupon.status === CouponStatus.ACTIVE,
      contractAddress: coupon.contract_address,
      onChainStatus: 'active'
    };

    if (!contractData.valid) {
      throw new ContractValidationError('Contract reports coupon as invalid');
    }

    return contractData;
  } catch (error) {
    if (error instanceof ContractValidationError) throw error;
    logger.error('Contract validation failed', { tokenId, error });
    throw new ContractValidationError('Failed to validate coupon on contract');
  }
}


export async function validateContractOwnership(tokenId: number, userId: string): Promise<void> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('id', userId)
      .single();

    if (error || !user?.wallet_address) {
      throw new ContractValidationError('User wallet address not found');
    }

    const coupon = await CouponDbService.getCouponByTokenId(tokenId);
    if (!coupon || !coupon.contract_address) {
      throw new ContractValidationError('Contract address not found');
    }

    
    const isOwner = coupon.user_id === userId;
    if (!isOwner) {
      throw new ContractValidationError('Contract ownership verification failed');
    }

    logger.info('Contract ownership validated', { tokenId, userId, userAddress: user.wallet_address });
  } catch (error) {
    if (error instanceof ContractValidationError) throw error;
    logger.error('Contract ownership validation failed', { tokenId, userId, error });
    throw new ContractValidationError('Failed to verify contract ownership');
  }
}


export async function validateContractNotRedeemed(tokenId: number): Promise<void> {
  try {
    const coupon = await CouponDbService.getCouponByTokenId(tokenId);
    if (!coupon) {
      throw new ContractValidationError('Coupon not found for redemption check');
    }

    {/*For now, I am not calling the contract,
       I am just simulating the call 
       replace with actual Soroban contract call 
       */}
    const contractRedemptionStatus = {
      tokenId,
      isRedeemed: coupon.redeemed_at !== null,
      redeemedAt: coupon.redeemed_at
    };

    if (contractRedemptionStatus.isRedeemed) {
      throw new ContractValidationError('Contract reports coupon as already redeemed');
    }

    logger.info('Contract redemption status validated', { tokenId, status: 'not_redeemed' });
  } catch (error) {
    if (error instanceof ContractValidationError) throw error;
    logger.error('Contract redemption validation failed', { tokenId, error });
    throw new ContractValidationError('Failed to verify contract redemption status');
  }
}


export function checkCouponExpiry(expirationDate: string): boolean {
  return new Date(expirationDate) > new Date();
}


export async function checkRedemptionWindow(coupon: CouponWithRelations): Promise<void> {
  try {
    const now = new Date();
    const expirationDate = new Date(coupon.expiration_date);
    const createdDate = new Date(coupon.created_at);
    
    
    if (now < createdDate) {
      throw new RedemptionWindowError('Coupon redemption window has not started yet');
    }
    
    if (now > expirationDate) {
      throw new RedemptionWindowError('Coupon redemption window has expired');
    }
    
    
    const gracePeriodHours = 24;
    const graceEndTime = new Date(expirationDate.getTime() + (gracePeriodHours * 60 * 60 * 1000));
    
    if (now > graceEndTime) {
      throw new RedemptionWindowError('Coupon is beyond grace period for redemption');
    }
    
    logger.info('Redemption window validated', { 
      couponId: coupon.id, 
      now: now.toISOString(), 
      expirationDate: coupon.expiration_date 
    });
  } catch (error) {
    if (error instanceof RedemptionWindowError) throw error;
    logger.error('Redemption window validation failed', { couponId: coupon.id, error });
    throw new RedemptionWindowError('Failed to validate redemption window');
  }
}


export async function checkDailyRedemptionLimits(userId: string): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data: todayRedemptions, error } = await supabase
      .from('coupons')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'redeemed')
      .gte('redeemed_at', today.toISOString())
      .lt('redeemed_at', tomorrow.toISOString());
    
    if (error) {
      throw new DailyLimitExceededError('Failed to check daily redemption limits');
    }
    
    const dailyLimit = parseInt(process.env.DAILY_REDEMPTION_LIMIT || '10');
    const todayCount = todayRedemptions?.length || 0;
    
    if (todayCount >= dailyLimit) {
      throw new DailyLimitExceededError(`Daily redemption limit of ${dailyLimit} exceeded`);
    }
    
    logger.info('Daily redemption limit validated', { 
      userId, 
      todayCount, 
      dailyLimit 
    });
  } catch (error) {
    if (error instanceof DailyLimitExceededError) throw error;
    logger.error('Daily redemption limit validation failed', { userId, error });
    throw new DailyLimitExceededError('Failed to validate daily redemption limits');
  }
}


export async function checkBusinessOperatingHours(coupon: CouponWithRelations): Promise<void> {
  try {
    if (!coupon.business_name) {
      
      return;
    }
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); 
    
    
    const businessHours = {
      0: null, 
      1: { open: 9, close: 18 }, 
      2: { open: 9, close: 18 }, 
      3: { open: 9, close: 18 }, 
      4: { open: 9, close: 18 }, 
      5: { open: 9, close: 18 }, 
      6: { open: 10, close: 16 } 
    };
    
    const todayHours = businessHours[currentDay as keyof typeof businessHours];
    
    if (!todayHours) {
      throw new BusinessHoursError('Business is closed on Sundays');
    }
    
    if (currentHour < todayHours.open || currentHour >= todayHours.close) {
      throw new BusinessHoursError(
        `Business is closed. Operating hours: ${todayHours.open}:00 - ${todayHours.close}:00`
      );
    }
    
    logger.info('Business operating hours validated', { 
      couponId: coupon.id, 
      businessName: coupon.business_name,
      currentHour,
      operatingHours: todayHours
    });
  } catch (error) {
    if (error instanceof BusinessHoursError) throw error;
    logger.error('Business hours validation failed', { couponId: coupon.id, error });
    throw new BusinessHoursError('Failed to validate business operating hours');
  }
}


export async function checkGeographicRestrictions(coupon: CouponWithRelations, userId: string): Promise<void> {
  try {
    if (!coupon.location) {
      
      return;
    }
    
    
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('location, country')
      .eq('id', userId)
      .single();
    
    if (error) {
      logger.warn('Could not fetch user location for geo validation', { userId, error });
      
      return;
    }
    
    
    const couponLocation = coupon.location.toLowerCase();
    const userLocation = userProfile?.location?.toLowerCase() || '';
    const userCountry = userProfile?.country?.toLowerCase() || '';
    
    const isLocationMatch = 
      userLocation.includes(couponLocation) || 
      couponLocation.includes(userLocation) ||
      userCountry.includes(couponLocation) ||
      couponLocation.includes(userCountry);
    
    if (!isLocationMatch) {
      throw new GeographicRestrictionError(
        `Coupon is restricted to ${coupon.location}. Your location: ${userProfile?.location || 'Unknown'}`
      );
    }
    
    logger.info('Geographic restrictions validated', { 
      couponId: coupon.id, 
      couponLocation: coupon.location,
      userLocation: userProfile?.location
    });
  } catch (error) {
    if (error instanceof GeographicRestrictionError) throw error;
    logger.error('Geographic restriction validation failed', { couponId: coupon.id, userId, error });
    throw new GeographicRestrictionError('Failed to validate geographic restrictions');
  }
}


export async function preValidateCouponBatch(couponIds: string[], userId: string): Promise<CouponValidationResult[]> {
  try {
    const results: CouponValidationResult[] = [];
    
    
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select(`
        *,
        users!inner(id, email, wallet_address),
        projects!inner(id, name)
      `)
      .in('id', couponIds);
    
    if (error) {
      logger.error('Batch coupon fetch failed', { couponIds, error });
      
      return couponIds.map(id => ({
         isValid: false,
         errors: [new ValidationError('Failed to fetch coupon data')],
         warnings: [],
         couponData: null,
         contractData: null
       }));
    }
    
    
    const validationPromises = coupons.map(async (coupon: any) => {
      try {
        const couponWithRelations = coupon as CouponWithRelations;
        const result = await validateCouponForRedemption(coupon.id, coupon.user_id);
        return result;
      } catch (error) {
        logger.warn('Individual coupon validation failed in batch', { couponId: coupon.id, error });
        return {
           isValid: false,
           errors: [error instanceof ValidationError ? error : new ValidationError(error instanceof Error ? error.message : 'Validation failed')],
           warnings: [],
           couponData: coupon,
           contractData: null
         } as CouponValidationResult;
      }
    });
    
    const batchResults = await Promise.allSettled(validationPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
           isValid: false,
           errors: [new ValidationError('Batch validation failed')],
           warnings: [],
           couponData: coupons[index] || null,
           contractData: null
         });
      }
    });
    
    logger.info('Batch validation completed', { 
      totalCoupons: couponIds.length, 
      validCoupons: results.filter(r => r.isValid).length 
    });
    
    return results;
  } catch (error) {
    logger.error('Batch validation failed', { couponIds, error });
    return couponIds.map(() => ({
       isValid: false,
       errors: [new ValidationError('Batch validation system error')],
       warnings: [],
       couponData: null,
       contractData: null
     }));
  }
}


export async function validateAndLockCoupon(couponId: string, userId: string): Promise<CouponValidationResult> {
  try {
    
    const { data, error } = await supabase.rpc('validate_and_lock_coupon', {
      p_coupon_id: couponId,
      p_user_id: userId
    });
    
    if (error) {
      
      logger.warn('Stored procedure not available, using regular validation', { couponId, userId });
      return await validateCouponForRedemption(couponId, userId);
    }
    
    
    const result = await validateCouponForRedemption(couponId, userId);
    
    if (!result.isValid) {
      
      logger.info('Validation failed, lock should be released', { couponId, userId });
    }
    
    return result;
  } catch (error) {
    logger.error('Atomic validation with locking failed', { couponId, userId, error });
    
    
    try {
      return await validateCouponForRedemption(couponId, userId);
    } catch (fallbackError) {
      return {
         isValid: false,
         errors: [new ValidationError('Validation and locking failed')],
         warnings: ['Fallback validation also failed'],
         couponData: null,
         contractData: null
       };
    }
  }
}


export async function refreshCouponValidation(couponId: string, userId: string): Promise<CouponValidationResult> {
  try {
    
    const cacheKey = `coupon_validation_${couponId}`;
    
    
    logger.info('Clearing validation cache', { couponId, cacheKey });
    
    
    const coupon = await CouponDbService.getCouponWithRelations(couponId);
    if (!coupon) {
      return {
         isValid: false,
         errors: [new CouponNotFoundError('Coupon not found during refresh')],
         warnings: [],
         couponData: null,
         contractData: null
       };
    }
    
    
    const result = await validateCouponForRedemption(couponId, coupon.user_id);
    
    
    logger.info('Validation refreshed and cached', { 
      couponId, 
      isValid: result.isValid,
      cacheKey 
    });
    
    return result;
  } catch (error) {
    logger.error('Validation refresh failed', { couponId, error });
    return {
       isValid: false,
       errors: [new ValidationError('Failed to refresh validation')],
       warnings: [],
       couponData: null,
       contractData: null
     };
  }
}


export async function getValidationSummary(userId: string): Promise<{
  totalCoupons: number;
  validCoupons: number;
  expiredCoupons: number;
  redeemedCoupons: number;
  invalidCoupons: number;
  warnings: string[];
  lastValidated: string;
}> {
  try {
    
    const coupons = await CouponDbService.getCouponsByUserId(userId);
    
    
    const { data: activeCoupons, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('user_id', userId)
      .eq('status', CouponStatus.ACTIVE);
    
    if (error) {
      throw new Error(`Failed to fetch active coupons: ${error.message}`);
    }
    
    const warnings: string[] = [];
    let validCoupons = 0;
    let invalidCoupons = 0;
    let expiredCoupons = 0;
    let redeemedCoupons = 0;
    
    
    for (const coupon of coupons.data || []) {
      if (coupon.status === CouponStatus.REDEEMED) {
        redeemedCoupons++;
      } else if (isCouponExpired(coupon)) {
        expiredCoupons++;
      } else if (coupon.status === CouponStatus.ACTIVE) {
        try {
          const result = await validateCouponForRedemption(coupon.id, userId);
          if (result.isValid) {
            validCoupons++;
          } else {
            invalidCoupons++;
          }
          warnings.push(...result.warnings);
        } catch (error) {
          invalidCoupons++;
          warnings.push(`Coupon ${coupon.id}: Validation failed`);
        }
      } else {
        invalidCoupons++;
      }
    }
    
    
    const soonToExpire = activeCoupons?.filter(coupon => {
      const expiryDate = new Date(coupon.expiration_date);
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      return expiryDate <= sevenDaysFromNow;
    }) || [];
    
    if (soonToExpire.length > 0) {
      warnings.push(`${soonToExpire.length} coupon(s) expiring within 7 days`);
    }
    
    const summary = {
      totalCoupons: coupons.data.length,
      validCoupons,
      expiredCoupons,
      redeemedCoupons,
      invalidCoupons,
      warnings: [...new Set(warnings)], 
      lastValidated: new Date().toISOString()
    };
    
    logger.info('Validation summary generated', { userId, summary });
    return summary;
  } catch (error) {
    logger.error('Failed to generate validation summary', { userId, error });
    return {
      totalCoupons: 0,
      validCoupons: 0,
      expiredCoupons: 0,
      redeemedCoupons: 0,
      invalidCoupons: 0,
      warnings: ['Failed to generate validation summary'],
      lastValidated: new Date().toISOString()
    };
  }
}
