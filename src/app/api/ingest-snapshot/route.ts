import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeSnapshot } from "@/lib/anthropic";
import type { PlanMilestone } from "@/lib/types";

/**
 * POST /api/ingest-snapshot
 *
 * Called by your n8n pipeline (camera → FTP bridge → n8n → here), not by a
 * logged-in user, so it authenticates with a shared secret instead of a
 * Supabase session.
 *
 * Body (JSON):
 * {
 *   "project_id": "uuid",
 *   "captured_at": "2026-07-17T09:00:00Z",
 *   "image_base64": "...",        // raw base64, no data: prefix
 *   "media_type": "image/jpeg"    // or "image/png"
 * }
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-ingest-secret");
  if (!secret || secret !== process.env.INGEST_API_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.project_id || !body?.image_base64 || !body?.captured_at) {
    return NextResponse.json(
      { error: "project_id, captured_at and image_base64 are required" },
      { status: 400 }
    );
  }

  const mediaType: "image/jpeg" | "image/png" =
    body.media_type === "image/png" ? "image/png" : "image/jpeg";
  const extension = mediaType === "image/png" ? "png" : "jpg";

  const supabase = createAdminClient();

  // 1. Confirm the project exists
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id")
    .eq("id", body.project_id)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: "unknown project_id" }, { status: 404 });
  }

  // 2. Upload the raw image to Storage
  const storagePath = `${body.project_id}/${Date.now()}.${extension}`;
  const imageBuffer = Buffer.from(body.image_base64, "base64");

  const { error: uploadError } = await supabase.storage
    .from("snapshots")
    .upload(storagePath, imageBuffer, { contentType: mediaType });

  if (uploadError) {
    return NextResponse.json({ error: `storage upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // 3. Record the snapshot row
  const { data: snapshot, error: snapshotError } = await supabase
    .from("snapshots")
    .insert({
      project_id: body.project_id,
      storage_path: storagePath,
      captured_at: body.captured_at,
    })
    .select()
    .single();

  if (snapshotError || !snapshot) {
    return NextResponse.json({ error: "failed to record snapshot" }, { status: 500 });
  }

  // 4. Look up today's active plan milestones for this project, so the AI
  //    has the project's actual plan to compare against (see concept doc §6.1)
  const capturedDate = body.captured_at.slice(0, 10);
  const { data: milestones } = await supabase
    .from("plan_milestones")
    .select("*")
    .eq("project_id", body.project_id)
    .lte("expected_start", capturedDate)
    .gte("expected_end", capturedDate);

  // 5. Run the AI analysis
  const analysis = await analyzeSnapshot(
    body.image_base64,
    mediaType,
    (milestones ?? []) as PlanMilestone[]
  );

  // 6. Store the observation
  const { data: observation, error: observationError } = await supabase
    .from("observations")
    .insert({
      snapshot_id: snapshot.id,
      project_id: body.project_id,
      trades_detected: analysis.trades_detected,
      person_count: analysis.person_count,
      confidence: analysis.confidence,
      matches_plan: analysis.matches_plan,
      raw_model_output: analysis,
    })
    .select()
    .single();

  if (observationError) {
    return NextResponse.json({ error: "failed to record observation" }, { status: 500 });
  }

  return NextResponse.json({ snapshot, observation }, { status: 201 });
}
