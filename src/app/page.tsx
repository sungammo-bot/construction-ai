import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { NewProjectForm } from "@/components/NewProjectForm";
import type { Project, Observation } from "@/lib/types";

async function getProjectsWithStatus() {
  const supabase = createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (!projects || projects.length === 0) return [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const results = await Promise.all(
    (projects as Project[]).map(async (project) => {
      const { data: observations } = await supabase
        .from("observations")
        .select("*")
        .eq("project_id", project.id)
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false })
        .limit(5);

      const obs = (observations ?? []) as Observation[];
      let status: "match" | "mismatch" | "unknown" = "unknown";
      if (obs.length > 0) {
        status = obs.some((o) => o.matches_plan === false)
          ? "mismatch"
          : obs.every((o) => o.matches_plan === true)
          ? "match"
          : "unknown";
      }

      return { project, status, latestObservation: obs[0] ?? null };
    })
  );

  return results;
}

export default async function DashboardPage() {
  const rows = await getProjectsWithStatus();

  return (
    <main>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl">Dine byggepladser</h1>
          <p className="text-muted text-sm mt-1">
            Planlagt bemanding sammenholdt med, hvad kameraerne faktisk observerer.
          </p>
        </div>
      </header>

      <div className="mb-6">
        <NewProjectForm />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-line bg-panel px-4 py-6 text-sm text-muted">
          Ingen projekter endnu. Opret dit første projekt ovenfor, og upload dets tidsplan
          bagefter for at komme i gang.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-md border border-line bg-panel">
          {rows.map(({ project, status, latestObservation }) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="focus-ring flex items-center justify-between px-5 py-4 transition hover:bg-white/5"
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-muted text-sm">
                    {project.address ?? "Ingen adresse angivet"}
                    {project.camera_label ? ` · ${project.camera_label}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {latestObservation && (
                    <span className="text-muted text-xs">
                      {latestObservation.person_count} pers. sidst observeret
                    </span>
                  )}
                  <StatusBadge status={status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
