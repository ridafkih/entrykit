"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, Box, ChevronRight, Plus } from "lucide-react";
import { FormInput } from "./form-input";
import { useAppView } from "./app-view";
import { IconButton } from "./icon-button";
import { Tabs } from "./tabs";
import { mockProjects } from "@/placeholder/data";

type SettingsTab = "github" | "providers" | "projects";

function SettingsFrame({ children }: { children: ReactNode }) {
  return <div className="flex flex-col h-full overflow-hidden">{children}</div>;
}

function SettingsHeader() {
  const { setView } = useAppView();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border">
      <IconButton onClick={() => setView("projects")}>
        <ArrowLeft size={14} />
      </IconButton>
      <span className="text-text font-medium">Settings</span>
    </div>
  );
}

function SettingsPanel({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 overflow-y-auto p-3">
      <div className="flex flex-col gap-2 max-w-sm">{children}</div>
    </div>
  );
}

function SettingsFormField({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-1">{children}</div>;
}

function GitHubTab() {
  const [pat, setPat] = useState("");
  const [username, setUsername] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [attributeAgent, setAttributeAgent] = useState(true);

  return (
    <SettingsPanel>
      <SettingsFormField>
        <FormInput.Label>Personal Access Token</FormInput.Label>
        <FormInput.Password
          value={pat}
          onChange={(e) => setPat(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxx"
        />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>Username</FormInput.Label>
        <FormInput.Text
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your-github-username"
        />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>Commit Author Name</FormInput.Label>
        <FormInput.Text
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your Name"
        />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>Commit Author Email</FormInput.Label>
        <FormInput.Text
          type="email"
          value={authorEmail}
          onChange={(e) => setAuthorEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </SettingsFormField>

      <FormInput.Checkbox
        checked={attributeAgent}
        onChange={setAttributeAgent}
        label="Attribute agent to commits"
      />
    </SettingsPanel>
  );
}

const aiProviderOptions = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google" },
];

const modelOptions: Record<string, { value: string; label: string }[]> = {
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-opus-4-20250514", label: "Claude Opus 4" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  google: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  ],
};

function ProvidersTab() {
  const [provider, setProvider] = useState("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-20250514");

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const defaultModel = modelOptions[newProvider]?.[0]?.value ?? "";
    setModel(defaultModel);
  };

  return (
    <SettingsPanel>
      <SettingsFormField>
        <FormInput.Label>Provider</FormInput.Label>
        <FormInput.Select
          options={aiProviderOptions}
          value={provider}
          onChange={handleProviderChange}
        />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>API Key</FormInput.Label>
        <FormInput.Password
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-xxxxxxxxxxxx"
        />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>Default Model</FormInput.Label>
        <FormInput.Select
          options={modelOptions[provider] ?? []}
          value={model}
          onChange={setModel}
        />
      </SettingsFormField>
    </SettingsPanel>
  );
}

type ProjectsView = { page: "list" } | { page: "detail"; projectId: string } | { page: "create" };

function ProjectsList({
  onSelect,
  onCreate,
}: {
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">Projects</span>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text"
        >
          <Plus size={12} />
          Create New
        </button>
      </div>

      <div className="flex flex-col gap-px bg-border border border-border">
        {mockProjects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => onSelect(project.id)}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-bg text-xs text-left hover:bg-bg-hover"
          >
            <Box size={12} className="text-text-muted shrink-0" />
            <span className="text-text truncate">{project.name}</span>
            <ChevronRight size={12} className="text-text-muted ml-auto shrink-0" />
          </button>
        ))}
      </div>
    </>
  );
}

function ProjectDetail({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  const project = mockProjects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <SettingsPanel>
        <span className="text-xs text-text-muted">Project not found</span>
      </SettingsPanel>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text"
      >
        <ArrowLeft size={12} />
        Back to projects
      </button>

      <SettingsFormField>
        <FormInput.Label>Project Name</FormInput.Label>
        <FormInput.Text value={project.name} readOnly />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>Repository URL</FormInput.Label>
        <FormInput.Text value="https://github.com/user/repo" readOnly />
      </SettingsFormField>

      <div className="text-xs text-text-muted">{project.sessions.length} sessions</div>
    </>
  );
}

function ProjectCreate({ onBack }: { onBack: () => void }) {
  const [projectName, setProjectName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");

  const handleCreate = () => {
    if (!projectName.trim() || !repoUrl.trim()) return;
    console.log("Create project:", { projectName, repoUrl });
    setProjectName("");
    setRepoUrl("");
    onBack();
  };

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text"
      >
        <ArrowLeft size={12} />
        Back to projects
      </button>

      <SettingsFormField>
        <FormInput.Label>Project Name</FormInput.Label>
        <FormInput.Text
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="my-project"
        />
      </SettingsFormField>

      <SettingsFormField>
        <FormInput.Label>Repository URL</FormInput.Label>
        <FormInput.Text
          type="url"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/user/repo"
        />
      </SettingsFormField>

      <button
        type="button"
        onClick={handleCreate}
        disabled={!projectName.trim() || !repoUrl.trim()}
        className="self-start px-2 py-1 text-xs bg-bg-muted border border-border text-text hover:bg-bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Create Project
      </button>
    </>
  );
}

function ProjectsTab() {
  const [view, setView] = useState<ProjectsView>({ page: "list" });

  return (
    <SettingsPanel>
      {view.page === "list" && (
        <ProjectsList
          onSelect={(id) => setView({ page: "detail", projectId: id })}
          onCreate={() => setView({ page: "create" })}
        />
      )}
      {view.page === "detail" && (
        <ProjectDetail projectId={view.projectId} onBack={() => setView({ page: "list" })} />
      )}
      {view.page === "create" && <ProjectCreate onBack={() => setView({ page: "list" })} />}
    </SettingsPanel>
  );
}

function SettingsContent() {
  return (
    <Tabs.Root<SettingsTab> defaultTab="github">
      <Tabs.List>
        <Tabs.Tab value="github">GitHub</Tabs.Tab>
        <Tabs.Tab value="providers">Providers</Tabs.Tab>
        <Tabs.Tab value="projects">Projects</Tabs.Tab>
      </Tabs.List>
      <Tabs.Content value="github">
        <GitHubTab />
      </Tabs.Content>
      <Tabs.Content value="providers">
        <ProvidersTab />
      </Tabs.Content>
      <Tabs.Content value="projects">
        <ProjectsTab />
      </Tabs.Content>
    </Tabs.Root>
  );
}

const Settings = {
  Frame: SettingsFrame,
  Header: SettingsHeader,
  Content: SettingsContent,
  Panel: SettingsPanel,
  FormField: SettingsFormField,
};

export { Settings, type SettingsTab };
