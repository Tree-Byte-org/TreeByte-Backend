import pinataSDK from "@pinata/sdk";

const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY!,
  pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY!,
});

export interface IPFSUploadResult {
  ipfsHash: string;
  ipfsUrl: string;
  metadataSize?: number;
  uploadTimestamp?: number;
  success: boolean;
}

export interface CouponMetadata {
  name: string;
  description: string;
  image: string;
  tokenId: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  couponType?: string;
  validUntil?: string;
  discountAmount?: number;
  discountPercentage?: number;
  minPurchaseAmount?: number;
  maxUses?: number;
  currentUses?: number;
}

export const uploadToIPFS = async (metadata: object): Promise<IPFSUploadResult> => {
  try {
    const result = await pinata.pinJSONToIPFS(metadata);
    return {
      ipfsHash: result.IpfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      success: true,
    };
  } catch (err) {
    console.error("IPFS upload error:", err);
    throw new Error("Failed to upload metadata to IPFS");
  }
};

export const uploadCouponMetadataToIPFS = async (
  couponMetadata: CouponMetadata
): Promise<IPFSUploadResult> => {
  try {
    const timestamp = Date.now();
    const filename = `coupon-metadata-${couponMetadata.tokenId}-${timestamp}.json`;
    
    const enhancedMetadata = {
      ...couponMetadata,
      uploadTimestamp: timestamp,
      version: "1.0",
    };

    const metadataString = JSON.stringify(enhancedMetadata);
    const metadataSize = Buffer.byteLength(metadataString, 'utf8');

    if (metadataSize > 1024 * 1024) {
      throw new Error(`Metadata too large: ${metadataSize} bytes (max 1MB)`);
    }

    const options = {
      pinataMetadata: {
        name: filename,
      },
    };

    const result = await pinata.pinJSONToIPFS(enhancedMetadata, options);

    return {
      ipfsHash: result.IpfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
      metadataSize,
      uploadTimestamp: timestamp,
      success: true,
    };
  } catch (err) {
    console.error("Coupon IPFS upload error:", err);
    return {
      ipfsHash: "",
      ipfsUrl: "",
      success: false,
    };
  }
};
