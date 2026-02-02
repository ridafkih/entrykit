"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { ArrowLeft } from "lucide-react";
import { tv } from "tailwind-variants";
import { FormInput } from "@/components/form-input";
import { useProjects } from "@/lib/hooks";
import { api } from "@/lib/api";
import type { ProjectContainer } from "@lab/client";

const backButton = tv({
  base: "flex items-center gap-1.5 text-xs text-text-muted hover:text-text",
});

const destructiveButton = tv({
  base: "px-2 py-1 text-xs border border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed",
});

const primaryButton = tv({
  base: "px-2 py-1 text-xs border border-border text-text hover:bg-bg-muted disabled:opacity-50 disabled:cursor-not-allowed",
});

const buttonRow = tv({
  base: "flex items-center gap-2",
});

const containersSection = tv({
  base: "flex flex-col gap-2",
});

const listSectionEmpty = tv({
  base: "text-xs text-text-muted",
});

const containerDisplay = tv({
  slots: {
    root: "flex flex-col gap-1.5 p-2 border border-border bg-bg-muted",
    header: "text-xs text-text-secondary",
    image: "text-xs text-text font-mono",
    meta: "text-xs text-text-muted",
  },
});

function SettingsFormField({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

function ContainerDisplay({ container }: { container: ProjectContainer }) {
  const styles = containerDisplay();
  const portsList = container.ports.length > 0 ? container.ports.join(", ") : "none";

  return (
    <div className={styles.root()}>
      <span className={styles.header()}>Container</span>
      <span className={styles.image()}>{container.image}</span>
      <span className={styles.meta()}>Ports: {portsList}</span>
    </div>
  );
}

type ProjectDetailProps = {
  projectId: string;
};

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: projects } = useProjects();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  const project = projects?.find((proj) => proj.id === projectId);

  useEffect(() => {
    if (project) {
      setDescription(project.description ?? "");
      setSystemPrompt(project.systemPrompt ?? "");
    }
  }, [project]);

  const hasChanges =
    project &&
    (description !== (project.description ?? "") || systemPrompt !== (project.systemPrompt ?? ""));

  if (!project) {
    return (
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-1 max-w-sm">
          <span className="text-xs text-text-muted">Project not found</span>
        </div>
      </div>
    );
  }

  const containers = project.containers ?? [];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.projects.update(projectId, {
        description: description || undefined,
        systemPrompt: systemPrompt || undefined,
      });
      await mutate("projects");
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await api.projects.delete(projectId);
      await mutate("projects");
      router.push("/settings/projects");
    } catch {
      setIsArchiving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex flex-col gap-1 max-w-sm">
        <Link href="/settings/projects" className={backButton()}>
          <ArrowLeft size={12} />
          Back to projects
        </Link>

        <SettingsFormField>
          <FormInput.Label>Project Name</FormInput.Label>
          <FormInput.Text value={project.name} readOnly />
        </SettingsFormField>

        <SettingsFormField>
          <FormInput.Label>Description</FormInput.Label>
          <FormInput.Text
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Project description"
          />
        </SettingsFormField>

        <SettingsFormField>
          <FormInput.Label>System Prompt</FormInput.Label>
          <FormInput.Textarea
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            placeholder="System prompt for orchestration"
            rows={3}
          />
        </SettingsFormField>

        <div className={containersSection()}>
          <span className="text-xs text-text-secondary">Containers</span>
          {containers.length === 0 && (
            <span className={listSectionEmpty()}>No containers configured</span>
          )}
          {containers.length > 0 && (
            <div className="flex flex-col gap-2">
              {containers.map((container) => (
                <ContainerDisplay key={container.id} container={container} />
              ))}
            </div>
          )}
        </div>

        <div className={buttonRow()}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className={primaryButton()}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={isArchiving}
            className={destructiveButton()}
          >
            {isArchiving ? "Archiving..." : "Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}
