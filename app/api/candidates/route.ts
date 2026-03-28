import { NextResponse } from "next/server";
import { seedCandidates } from "@/lib/seedData";

export async function GET() {
  return NextResponse.json(seedCandidates);
}