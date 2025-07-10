import { Request, Response } from "express";
import db from "@/lib/db/db";

interface projectDTO {
  name: string;
  description: string;
  location: string;
  photo_url: string;
  impact: string;
  asset_code: string;
  supply: number;
}

export const registerProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body: projectDTO = req.body;
  const { error: insertError } = await db.from("projects").insert([body]);

  if (insertError) {
    console.error(insertError);
    res.status(500).json({ error: "Error inserting external wallet" });
    return;
  }
  res.status(201).json({
    message: "Project registered successfully",
    body,
  });
};
