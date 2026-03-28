import { NextResponse } from "next/server";
import { seedMatchups } from "@/lib/seedData";

export async function GET() {
  return NextResponse.json(seedMatchups);
}