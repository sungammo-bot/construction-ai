import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/observations/:id/review   body: { verdict: "confirmed" | "rejected" }
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (body?.verdict !== "confirmed" && body?.verdict !== "rejected") {
    return NextResponse.json({ error: "verdict must be 'confirmed' or 'rejected'" }, { status: 400 });
  }

  // RLS ensures this only succeeds if the observation belongs to a project
  // owned by the logged-in user.
  const { data, error } = await supabase
    .from("observations")
    .update({ reviewed: true, reviewer_verdict: body.verdict })
    .eq("id", params.id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "observation not found" }, { status: 404 });
  }

  return NextResponse.json({ observation: data });
}
