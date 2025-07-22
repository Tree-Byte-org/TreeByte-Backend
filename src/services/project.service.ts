import db from "@/lib/db/db";
import { uploadToIPFS } from "@/lib/ipfs/upload-to-ipfs";
import { deployProjectToken } from "@/lib/soroban/deploy-project-token";

type ProjectDTO = {
  name: string;
  description: string;
  location: string;
  photo_url: string;
  impact: string;
  asset_code: string;
  issuer_public_key: string;
  supply: number;
};

export const registerProjectService = async (project: ProjectDTO) => {
  // 1. Upload metadata to IPFS
  const ipfsResult = await uploadToIPFS(project);

  // 2. Deploy soroban contract
  const { contractId } = await deployProjectToken({
    supply: project.supply,
    name: project.name,
    issuerPublicKey: project.issuer_public_key,
  });

  // 3. Prepare object to insert into DB
  const projectWithMetadata = {
    ...project,
    ipfs_hash: ipfsResult.ipfsHash,
    ipfs_url: ipfsResult.ipfsUrl,
    contract_id: contractId,
  };

  // 4. Insert into 'projects' table
  const { data, error } = await db
    .from("projects")
    .insert([projectWithMetadata])
    .select()
    .single();
  if (error) {
    console.error(error);
    throw new Error("Error inserting project into database");
  }
  return data;
};
