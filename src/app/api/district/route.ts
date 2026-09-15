import { NextResponse } from "next/server";
import { districtDetail } from "@/lib/queries";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const state = url.searchParams.get("state");
  const district = url.searchParams.get("district");
  if (!state || !district) {
    return NextResponse.json({ error: "state and district are required" }, { status: 400 });
  }
  return NextResponse.json(await districtDetail(state, district));
}
