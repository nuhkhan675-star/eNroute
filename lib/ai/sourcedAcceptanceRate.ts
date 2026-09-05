import "server-only";
import OpenAI from "openai";
import { OPENAI_MODEL } from "@/lib/ai/client";
import { findSourcedAcceptanceRateWith, type SourcedRate } from "@/lib/ai/sourcedRateCore";

export type { SourcedRate };

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

/**
 * Server-side entry point for the sourced acceptance-rate lookup. The actual
 * implementation (and, importantly, the citation cross-check) lives in
 * sourcedRateCore.ts so the backfill script runs the identical code rather
 * than a copy that could drift away from it.
 */
export async function findSourcedAcceptanceRate(
  universityName: string,
  countryName: string
): Promise<SourcedRate | null> {
  if (!openai) return null;
  return findSourcedAcceptanceRateWith(openai, OPENAI_MODEL, universityName, countryName);
}
