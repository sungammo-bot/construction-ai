import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanUploadForm } from "@/components/PlanUploadForm";
import { ObservationRow } from "@/components/ObservationRow";
import type { PlanMilestone, Snapshot, Observation } from "@/lib/types";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!project) notFound();

  const { data: milestones } = await supabase
    .from("plan_milestones")
    .select("*")
    .eq("project_id", params.id)
    .order("expected_start", { ascending: true });

  const { data: observations } = await supabase
    .from("observations")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: snapshots } = await supabase
    .from("snapshots")
    .select("*")
    .eq("project_id", params.id);

  const snapshotById = new Map((snapshots as Snapshot[] | null)?.map((s) => [s.id, s]) ?? []);

  const imageUrls = new Map<string, string>();
  for (const obs of (observations as Observation[] | null) ?? []) {
    const snapshot = snapshotById.get(obs.snapshot_id);
    if (!snapshot) continue;
    const { data: signed } = await supabase.storage
      .from("snapshots")
      .createSignedUrl(snapshot.storage_path, 60 * 10);
    if (signed) imageUrls.set(obs.id, signed.signedUrl);
  }

  return (
    <main>
      <a href="/" className="text-muted text-sm hover:text-accent">
        ← Alle projekter
      </a>
      <h1 className="font-display text-2xl mt-2">{project.name}</h1>
      <p className="text-muted text-sm mb-8">
        {project.address ?? "Ingen adresse angivet"}
        {project.camera_label ? ` · ${project.camera_label}` : ""}
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          Tidsplan
        </h2>
        {milestones && milestones.length > 0 ? (
          <table className="mb-4 w-full border-collapse overflow-hidden rounded-md border border-line text-sm">
            <thead className="bg-panel text-muted">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Fag</th>
                <th className="px-3 py-2 text-left font-medium">Periode</th>
                <th className="px-3 py-2 text-left font-medium">Forventet</th>
                <th className="px-3 py-2 text-left font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {(milestones as PlanMilestone[]).map((m) => (
                <tr key={m.id} className="border-t border-line">
                  <td className="px-3 py-2">{m.trade}</td>
                  <td className="px-3 py-2 text-muted">
                    {m.expected_start} → {m.expected_end}
                  </td>
                  <td className="px-3 py-2 text-muted">{m.expected_workers} pers.</td>
                  <td className="px-3 py-2 text-muted">
                    {m.rate_payment_dkk ? `${m.rate_payment_dkk.toLocaleString("da-DK")} kr` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-muted mb-4 text-sm">Ingen tidsplan uploadet endnu.</p>
        )}
        <details className="rounded-md border border-line bg-panel p-4">
          <summary className="cursor-pointer text-sm text-muted">
            {milestones && milestones.length > 0 ? "Erstat tidsplan" : "Upload tidsplan"}
          </summary>
          <div className="mt-4">
            <PlanUploadForm projectId={project.id} />
          </div>
        </details>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">
          Seneste observationer
        </h2>
        {observations && observations.length > 0 ? (
          <ul className="divide-y divide-line rounded-md border border-line bg-panel">
            {(observations as Observation[]).map((obs) => (
              <ObservationRow
                key={obs.id}
                observation={obs}
                imageUrl={imageUrls.get(obs.id) ?? null}
              />
            ))}
          </ul>
        ) : (
          <p className="text-muted rounded-md border border-line bg-panel px-4 py-6 text-sm">
            Ingen observationer endnu — de dukker op, så snart kameraet begynder at sende
            snapshots til /api/ingest-snapshot.
          </p>
        )}
      </section>
    </main>
  );
}
