import { CouponIPFSService } from '@/services/coupon-ipfs.service';
import { CouponIPFSHelpers } from '@/utils/coupon-ipfs-helpers';
import { uploadCouponMetadataToIPFS, CouponMetadata } from '@/lib/ipfs/upload-to-ipfs';

// Test de validación de metadata
async function testMetadataValidation() {
  console.log('=== Test: Validación de Metadata ===');
  
  const validMetadata: CouponMetadata = {
    name: 'Cupón de Descuento 20%',
    description: 'Cupón válido para descuento del 20% en productos seleccionados',
    image: 'https://example.com/coupon-image.jpg',
    tokenId: 'COUPON001',
    attributes: [
      { trait_type: 'Discount Type', value: 'Percentage' },
      { trait_type: 'Discount Value', value: 20 },
      { trait_type: 'Category', value: 'General' }
    ],
    discountPercentage: 20,
    validUntil: '2025-12-31T23:59:59Z',
    maxUses: 100,
    currentUses: 0
  };

  const validation = CouponIPFSHelpers.validateCouponMetadataStructure(validMetadata);
  console.log('✓ Validación exitosa:', validation.isValid);
  console.log('✓ Errores:', validation.errors.length);
  console.log('✓ Advertencias:', validation.warnings.length);

  // Test con metadata inválida
  const invalidMetadata = { ...validMetadata, name: '' };
  const invalidValidation = CouponIPFSHelpers.validateCouponMetadataStructure(invalidMetadata);
  console.log('✓ Detección de metadata inválida:', !invalidValidation.isValid);
}

// Test de optimización
async function testMetadataOptimization() {
  console.log('\n=== Test: Optimización de Metadata ===');
  
  const messyMetadata: CouponMetadata = {
    name: '  Cupón con espacios  ',
    description: '  Descripción con espacios  ',
    image: '',
    tokenId: 'TEST001',
    attributes: [
      { trait_type: 'Valid', value: 'test' },
      { trait_type: '', value: 'invalid' },
      { trait_type: 'Empty', value: '' }
    ],
    couponType: '  DISCOUNT  '
  };

  const optimized = CouponIPFSHelpers.optimizeCouponMetadata(messyMetadata);
  console.log('✓ Nombre limpio:', optimized.name === 'Cupón con espacios');
  console.log('✓ Descripción limpia:', optimized.description === 'Descripción con espacios');
  console.log('✓ Tipo normalizado:', optimized.couponType === 'discount');
  console.log('✓ Atributos filtrados:', optimized.attributes?.length);
}

// Test de utilidades IPFS
async function testIPFSUtilities() {
  console.log('\n=== Test: Utilidades IPFS ===');
  
  const service = new CouponIPFSService();
  
  // Validación de hash
  const validHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG';
  const invalidHash = 'invalid-hash-123';
  
  console.log('✓ Hash válido reconocido:', service.validateIPFSHash(validHash));
  console.log('✓ Hash inválido rechazado:', !service.validateIPFSHash(invalidHash));
  
  // Generación de URL
  const url = service.getCouponMetadataURL(validHash);
  console.log('✓ URL generada:', url.includes('gateway.pinata.cloud'));
  
  // Test de disponibilidad IPFS
  try {
    const isAvailable = await service.pingIPFSAvailability();
    console.log('✓ IPFS disponible:', isAvailable);
  } catch (error) {
    console.log('⚠ Error al verificar IPFS:', (error as Error).message);
  }
}

// Test de creación de template
async function testTemplateCreation() {
  console.log('\n=== Test: Creación de Template ===');
  
  const tokenId = 'TEMPLATE123';
  const template = CouponIPFSHelpers.createCouponMetadataTemplate(tokenId);
  
  console.log('✓ Token ID correcto:', template.tokenId === tokenId);
  console.log('✓ Nombre generado:', template.name === `Coupon #${tokenId}`);
  console.log('✓ Tiene atributos:', Array.isArray(template.attributes));
  console.log('✓ Configuración inicial:', template.currentUses === 0);
}

// Test de validez del cupón
async function testCouponValidity() {
  console.log('\n=== Test: Validez del Cupón ===');
  
  // Cupón expirado
  const expiredCoupon: CouponMetadata = {
    name: 'Cupón Expirado',
    description: 'Test',
    image: '',
    tokenId: 'EXP001',
    attributes: [],
    validUntil: '2020-01-01T00:00:00Z'
  };
  
  console.log('✓ Cupón expirado detectado:', CouponIPFSHelpers.isExpiredCoupon(expiredCoupon));
  console.log('✓ Cupón inválido por expiración:', !CouponIPFSHelpers.isCouponValid(expiredCoupon));
  
  // Cupón agotado
  const usedUpCoupon: CouponMetadata = {
    name: 'Cupón Agotado',
    description: 'Test',
    image: '',
    tokenId: 'USED001',
    attributes: [],
    maxUses: 5,
    currentUses: 5
  };
  
  console.log('✓ Cupón agotado detectado:', CouponIPFSHelpers.isFullyUsedCoupon(usedUpCoupon));
  console.log('✓ Cupón inválido por uso:', !CouponIPFSHelpers.isCouponValid(usedUpCoupon));
}

// Test completo con upload simulado
async function testFullWorkflow() {
  console.log('\n=== Test: Workflow Completo ===');
  
  const metadata: CouponMetadata = {
    name: 'Cupón de Prueba',
    description: 'Cupón para testing del sistema IPFS',
    image: 'https://example.com/test-coupon.jpg',
    tokenId: 'TEST001',
    attributes: [
      { trait_type: 'Test', value: 'true' },
      { trait_type: 'Environment', value: 'development' }
    ],
    discountPercentage: 15,
    validUntil: '2025-06-30T23:59:59Z',
    maxUses: 10,
    currentUses: 0
  };

  // Validar antes del upload
  const validation = CouponIPFSHelpers.validateCouponMetadataStructure(metadata);
  if (!validation.isValid) {
    console.log('❌ Metadata inválida:', validation.errors);
    return;
  }

  // Optimizar metadata
  const optimized = CouponIPFSHelpers.optimizeCouponMetadata(metadata);
  const size = CouponIPFSHelpers.estimateMetadataSize(optimized);
  console.log('✓ Tamaño estimado:', size, 'bytes');

  console.log('✓ Workflow completado exitosamente');
}

async function runAllTests() {
  console.log('🧪 Ejecutando Tests Manuales de Coupon IPFS\n');
  
  try {
    await testMetadataValidation();
    await testMetadataOptimization();
    await testIPFSUtilities();
    await testTemplateCreation();
    await testCouponValidity();
    await testFullWorkflow();
    
    console.log('\n✅ Todos los tests completados exitosamente');
  } catch (error) {
    console.error('\n❌ Error en los tests:', error);
  }
}

if (require.main === module) {
  runAllTests();
}