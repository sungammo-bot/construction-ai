"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProjectForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [cameraLabel, setCameraLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, camera_label: cameraLabel }),
    });
    setSaving(false);
    if (res.ok) {
      setName("");
      setAddress("");
      setCameraLabel("");
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="focus-ring rounded-md border border-line px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-accent"
      >
        + Nyt projekt
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-line bg-panel p-4 space-y-3 mb-6"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          required
          placeholder="Projektnavn, fx Villa Nielsen"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="focus-ring rounded-md border border-line bg-ink px-3 py-2 text-sm placeholder:text-muted"
        />
        <input
          placeholder="Adresse"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="focus-ring rounded-md border border-line bg-ink px-3 py-2 text-sm placeholder:text-muted"
        />
        <input
          placeholder="Kamera-navn, fx Kamera 1"
          value={cameraLabel}
          onChange={(e) => setCameraLabel(e.target.value)}
          className="focus-ring rounded-md border border-line bg-ink px-3 py-2 text-sm placeholder:text-muted"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="focus-ring rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink hover:brightness-110 disabled:opacity-60"
        >
          {saving ? "Opretter…" : "Opret projekt"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="focus-ring rounded-md px-4 py-2 text-sm text-muted hover:text-white"
        >
          Annuller
        </button>
      </div>
    </form>
  );
}
