const STYLES: Record<string, string> = {
  match: "bg-good/15 text-good border-good/40",
  mismatch: "bg-bad/15 text-bad border-bad/40",
  unknown: "bg-muted/15 text-muted border-muted/40",
};

const LABELS: Record<string, string> = {
  match: "Følger planen",
  mismatch: "Afviger fra planen",
  unknown: "Ingen data endnu",
};

export function StatusBadge({ status }: { status: "match" | "mismatch" | "unknown" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
