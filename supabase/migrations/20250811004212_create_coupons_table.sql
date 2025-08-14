CREATE TYPE coupon_status AS ENUM ('active', 'redeemed', 'expired');

CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    
    token_id INTEGER NOT NULL UNIQUE,
    metadata_url TEXT,
    metadata_hash TEXT,
    contract_address VARCHAR(255),
    
    activity_type VARCHAR(100),
    business_name VARCHAR(255),
    location VARCHAR(255),
    
    status coupon_status NOT NULL DEFAULT 'active',
    expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
    redemption_code VARCHAR(100),
    redeemed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT check_expiration_after_creation 
        CHECK (expiration_date > created_at),
    CONSTRAINT check_redeemed_when_status_redeemed 
        CHECK (
            (status = 'redeemed' AND redeemed_at IS NOT NULL) OR 
            (status != 'redeemed' AND redeemed_at IS NULL)
        )
);

CREATE UNIQUE INDEX idx_coupons_token_id ON coupons(token_id);
CREATE INDEX idx_coupons_user_id ON coupons(user_id);
CREATE INDEX idx_coupons_project_id ON coupons(project_id);
CREATE INDEX idx_coupons_purchase_id ON coupons(purchase_id);
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_expiration_date ON coupons(expiration_date);
CREATE INDEX idx_coupons_activity_type ON coupons(activity_type);
CREATE INDEX idx_coupons_created_at ON coupons(created_at);

CREATE INDEX idx_coupons_user_status ON coupons(user_id, status);
CREATE INDEX idx_coupons_status_expiration ON coupons(status, expiration_date);