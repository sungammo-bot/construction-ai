import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/projects/:id/plan
 *
 * Body: { csv: string }
 *
 * Expected CSV columns (with header row):
 *   trade,expected_start,expected_end,expected_workers,rate_payment_dkk,notes
 *   Maler,2026-08-01,2026-08-05,3,45000,"2. rate"
 *
 * This is deliberately simple (paste-a-CSV) for the MVP — see concept doc
 * §6.1 and roadmap §7 "Digitalisér projektets plan". Replaces the entire
 * plan for the project on each import, so re-uploading after a plan change
 * (which happens a lot in construction) is a single action.
 */
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
  if (typeof body?.csv !== "string") {
    return NextResponse.json({ error: "csv (string) is required" }, { status: 400 });
  }

  // Ownership check happens implicitly via RLS on the delete/insert below,
  // but we confirm up front so we can return a clean 404 instead of an
  // empty-but-"successful" write.
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", params.id)
    .single();
  if (!project) {
    return NextResponse.json({ error: "project not found" }, { status: 404 });
  }

  const rows = body.csv
    .trim()
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);

  const [header, ...dataRows] = rows;
  const columns = header.split(",").map((c: string) => c.trim().toLowerCase());
  const required = ["trade", "expected_start", "expected_end", "expected_workers"];
  if (!required.every((col) => columns.includes(col))) {
    return NextResponse.json(
      { error: `CSV skal indeholde kolonnerne: ${required.join(", ")}` },
      { status: 400 }
    );
  }

  const milestones = dataRows.map((row: string) => {
    // naive CSV split — fine for the MVP's simple, comma-separated format
    const cells = row.split(",").map((c: string) => c.trim());
    const record: Record<string, string> = {};
    columns.forEach((col: string, i: number) => (record[col] = cells[i] ?? ""));

    return {
      project_id: params.id,
      trade: record.trade,
      expected_start: record.expected_start,
      expected_end: record.expected_end,
      expected_workers: Number(record.expected_workers) || 1,
      rate_payment_dkk: record.rate_payment_dkk ? Number(record.rate_payment_dkk) : null,
      notes: record.notes || null,
    };
  });

  // Replace the existing plan wholesale — simplest correct behaviour when a
  // byggeleder re-uploads an updated tidsplan.
  await supabase.from("plan_milestones").delete().eq("project_id", params.id);

  const { data, error } = await supabase
    .from("plan_milestones")
    .insert(milestones)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ milestones: data }, { status: 201 });
}
