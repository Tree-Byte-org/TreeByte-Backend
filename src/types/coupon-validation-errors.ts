export class ValidationError extends Error {
  code: string;
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message);
    this.code = code;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class CouponNotFoundError extends ValidationError {
  constructor(message = 'Coupon not found') {
    super(message, 'COUPON_NOT_FOUND');
  }
}

export class UnauthorizedRedemptionError extends ValidationError {
  constructor(message = 'User does not own coupon') {
    super(message, 'UNAUTHORIZED_REDEMPTION');
  }
}

export class CouponExpiredError extends ValidationError {
  constructor(message = 'Coupon expired') {
    super(message, 'COUPON_EXPIRED');
  }
}

export class CouponAlreadyRedeemedError extends ValidationError {
  constructor(message = 'Coupon already redeemed') {
    super(message, 'COUPON_ALREADY_REDEEMED');
  }
}

export class ContractValidationError extends ValidationError {
  constructor(message = 'Contract validation failed') {
    super(message, 'CONTRACT_VALIDATION_ERROR');
  }
}

export class WalletValidationError extends ValidationError {
  constructor(message = 'Wallet validation failed') {
    super(message, 'WALLET_VALIDATION_ERROR');
  }
}

export class BusinessHoursError extends ValidationError {
  constructor(message = 'Business is closed') {
    super(message, 'BUSINESS_HOURS_ERROR');
  }
}

export class GeographicRestrictionError extends ValidationError {
  constructor(message = 'Geographic restriction violation') {
    super(message, 'GEOGRAPHIC_RESTRICTION_ERROR');
  }
}

export class DailyLimitExceededError extends ValidationError {
  constructor(message = 'Daily redemption limit exceeded') {
    super(message, 'DAILY_LIMIT_EXCEEDED');
  }
}

export class RedemptionWindowError extends ValidationError {
  constructor(message = 'Redemption window violation') {
    super(message, 'REDEMPTION_WINDOW_ERROR');
  }
}

export class CouponStatusError extends ValidationError {
  constructor(message = 'Invalid coupon status') {
    super(message, 'COUPON_STATUS_ERROR');
  }
}
