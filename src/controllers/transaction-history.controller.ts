import { Request, Response } from "express";
import { getTransactionHistory } from "@/services/transaction-history.service";
import { StellarError } from "@/services/stellar";
import logger from "@/utils/logger";

export const fetchUserTransactionHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { publicKey } = req.body;

    if (!publicKey) {
      res.status(400).json({
        error: {
          code: "MISSING_PUBLIC_KEY",
          message: "Public key is required in the request body.",
          status: 400,
        },
      });
      return;
    }

    const history = await getTransactionHistory(publicKey);
    res.status(200).json({ history });
  } catch (error: any) {
    if (error instanceof StellarError) {
      if (error.type === 'ACCOUNT_NOT_FOUND') {
        res.status(404).json({
          error: {
            code: "ACCOUNT_NOT_FOUND",
            message: "The requested account does not exist on the Stellar network.",
            status: 404,
          },
        });
        return;
      }
    }

    // Legacy error handling for backward compatibility
    if (error?.response?.data?.status === 404) {
      res.status(404).json({
        error: {
          code: "ACCOUNT_NOT_FOUND",
          message: "The requested account does not exist on the Stellar testnet.",
          status: 404,
        },
      });
      return;
    }

    logger.error("Error fetching transaction history", { error });

    res.status(500).json({
      error: {
        code: "UNKNOWN_ERROR",
        message: "An unexpected error occurred while fetching transaction history.",
        status: 500,
      },
    });
  }
};
