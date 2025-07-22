import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type DeployProjectTokenParams = {
  supply: number;
  name: string;
  issuerPublicKey: string;
};

export type DeployProjectTokenResult = {
  contractId: string;
};

export const deployProjectToken = async ({
  supply,
  name,
  issuerPublicKey,
}: DeployProjectTokenParams): Promise<DeployProjectTokenResult> => {
  const wasmPath =
    process.env.PROJECT_TOKEN_WASM_PATH ||
    "contracts/target/wasm32-unknown-unknown/release/project_token.wasm";
  const network = process.env.STELLAR_NETWORK || "testnet";
  const source = process.env.CONTRACT_DEPLOYER || issuerPublicKey;

  const cmd = `stellar contract deploy --wasm ${wasmPath} --source ${source} --network ${network}`;
  try {
    const { stdout } = await execAsync(cmd);
    const lines = stdout.trim().split("\n");
    const contractId = lines[lines.length - 1];
    if (!/^C[A-Z0-9]{55}$/.test(contractId)) {
      throw new Error("Invalid contract id returned");
    }
    return { contractId };
  } catch (err) {
    console.error("[soroban] Contract deployment failed:", err);
    throw new Error("Soroban contract deployment failed");
  }
};
