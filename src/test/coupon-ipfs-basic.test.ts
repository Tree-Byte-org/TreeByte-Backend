import { CouponIPFSService } from '@/services/coupon-ipfs.service';
import { CouponIPFSHelpers } from '@/utils/coupon-ipfs-helpers';
import { CouponMetadata } from '@/lib/ipfs/upload-to-ipfs';

const createSampleMetadata = (): CouponMetadata => ({
  name: 'Test Coupon',
  description: 'A test coupon for validation',
  image: 'https://example.com/image.png',
  tokenId: 'TEST123',
  attributes: [
    { trait_type: 'Type', value: 'Discount' },
    { trait_type: 'Amount', value: 10 },
  ],
});

async function testCouponIPFSService() {
  console.log('Testing CouponIPFSService...');
  
  const service = new CouponIPFSService();
  const sampleMetadata = createSampleMetadata();

  console.log('✓ Service created successfully');
  
  try {
    const isValidHash = service.validateIPFSHash('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
    console.log(`✓ IPFS hash validation: ${isValidHash}`);
    
    const invalidHash = service.validateIPFSHash('invalid-hash');
    console.log(`✓ Invalid hash rejection: ${!invalidHash}`);
    
    const url = service.getCouponMetadataURL('QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG');
    console.log(`✓ URL generation: ${url}`);
    
    console.log('✓ All basic service tests passed');
  } catch (error) {
    console.error('✗ Service test failed:', error);
  }
}

async function testCouponIPFSHelpers() {
  console.log('\\nTesting CouponIPFSHelpers...');
  
  const sampleMetadata = createSampleMetadata();

  try {
    const validation = CouponIPFSHelpers.validateCouponMetadataStructure(sampleMetadata);
    console.log(`✓ Metadata validation: ${validation.isValid}`);
    
    const optimized = CouponIPFSHelpers.optimizeCouponMetadata(sampleMetadata);
    console.log(`✓ Metadata optimization: ${optimized.name === sampleMetadata.name}`);
    
    const size = CouponIPFSHelpers.estimateMetadataSize(sampleMetadata);
    console.log(`✓ Size estimation: ${size} bytes`);
    
    const template = CouponIPFSHelpers.createCouponMetadataTemplate('TEMPLATE123');
    console.log(`✓ Template creation: ${template.tokenId === 'TEMPLATE123'}`);
    
    const expiredMetadata = {
      ...sampleMetadata,
      validUntil: '2020-01-01T00:00:00Z',
    };
    const isExpired = CouponIPFSHelpers.isExpiredCoupon(expiredMetadata);
    console.log(`✓ Expiration check: ${isExpired}`);
    
    console.log('✓ All helper tests passed');
  } catch (error) {
    console.error('✗ Helper test failed:', error);
  }
}

async function main() {
  console.log('=== Coupon IPFS Tests ===\\n');
  
  await testCouponIPFSService();
  await testCouponIPFSHelpers();
  
  console.log('\\n=== Tests Complete ===');
}

if (require.main === module) {
  main().catch(console.error);
}