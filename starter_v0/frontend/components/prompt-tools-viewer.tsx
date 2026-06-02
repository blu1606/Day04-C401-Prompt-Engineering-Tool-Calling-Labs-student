"use client";

import { useEffect, useState } from "react";
import {
  RefreshCw,
  AlertCircle,
  FileCode,
  FileText,
  Search,
  SlidersHorizontal,
  Sliders,
  Sparkles,
  Cpu,
  BookOpen,
  MessageSquare,
  Wrench,
  Globe,
  Cloud,
  Send,
  ShieldCheck,
  CheckCircle2,
  List,
  Eye,
  Info
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ArtifactData {
  systemPrompt: string;
  toolsYaml: string;
  reportMd: string;
  runbookMd: string;
}

interface ParsedTool {
  name: string;
  description: string;
  track: "core" | "bonus";
  parameters: {
    name: string;
    type: string;
    description: string;
    default?: string;
  }[];
}

// Simple YAML to Tool objects parser
function parseToolsYaml(yamlStr: string): ParsedTool[] {
  const tools: ParsedTool[] = [];
  if (!yamlStr) return tools;

  const blocks = yamlStr.split(/^\s*-\s*name:\s*/m);
  
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const lines = block.split("\n");
    const name = lines[0].trim();
    
    let description = "";
    const descMatch = block.match(/description:\s*"([^"]+)"/);
    if (descMatch) {
      description = descMatch[1];
    } else {
      const descMatchSingle = block.match(/description:\s*'([^']+)'/);
      if (descMatchSingle) {
        description = descMatchSingle[1];
      } else {
        const descMatchUnquoted = block.match(/description:\s*([^\n]+)/);
        if (descMatchUnquoted) {
          description = descMatchUnquoted[1].replace(/^["']|["']$/g, "").trim();
        }
      }
    }
    
    const parameters: ParsedTool["parameters"] = [];
    const propertiesIndex = block.indexOf("properties:");
    if (propertiesIndex !== -1) {
      const propertiesBlock = block.substring(propertiesIndex);
      const propLines = propertiesBlock.split("\n");
      let currentProp: any = null;
      
      for (const line of propLines) {
        const trimmed = line.trim();
        if (trimmed.endsWith(":")) {
          const propName = trimmed.slice(0, -1).trim();
          if (propName !== "properties" && propName !== "items" && propName !== "required") {
            if (currentProp) {
              parameters.push(currentProp);
            }
            currentProp = { name: propName, type: "string", description: "" };
          }
        } else if (trimmed.startsWith("type:") && currentProp) {
          currentProp.type = trimmed.replace("type:", "").trim();
        } else if (trimmed.startsWith("description:") && currentProp) {
          currentProp.description = trimmed.replace("description:", "").trim().replace(/^["']|["']$/g, "");
        } else if (trimmed.startsWith("default:") && currentProp) {
          currentProp.default = trimmed.replace("default:", "").trim().replace(/^["']|["']$/g, "");
        }
      }
      if (currentProp) {
        parameters.push(currentProp);
      }
    }
    
    const bonusTools = ["send", "policy", "papers", "paper_text", "weather_by_region", "trend_analyzer", "list_tools"];
    const track = bonusTools.includes(name) ? "bonus" : "core";
    
    tools.push({
      name,
      description,
      track,
      parameters
    });
  }
  
  return tools;
}

export function PromptToolsViewer() {
  const [data, setData] = useState<ArtifactData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>("tools.yaml");
  const [viewMode, setViewMode] = useState<"visual" | "yaml">("visual");
  const [searchQuery, setSearchQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState<"all" | "core" | "bonus">("all");
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const fetchArtifacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prompt-tools");
      if (!res.ok) throw new Error("Failed to fetch artifacts");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtifacts();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center font-mono text-xs text-[#3c3a39]">
        <RefreshCw className="size-4 animate-spin text-[#ff7300] mr-2" />
        /loading-prompt-and-tools-artifacts...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 flex items-center gap-2">
        <AlertCircle className="size-4 shrink-0" />
        <span>Error: {error || "Failed to load artifacts"}</span>
      </div>
    );
  }

  const files = [
    { id: "system_prompt.md", name: "system_prompt.md", type: "markdown", content: data.systemPrompt },
    { id: "tools.yaml", name: "tools.yaml", type: "yaml", content: data.toolsYaml },
    { id: "REPORT.md", name: "REPORT.md", type: "markdown", content: data.reportMd },
    { id: "PERSON1_RUNBOOK.md", name: "PERSON1_RUNBOOK.md", type: "markdown", content: data.runbookMd },
  ];

  const activeFile = files.find((f) => f.id === selectedFile) || files[0];
  const parsedTools = activeFile.id === "tools.yaml" ? parseToolsYaml(activeFile.content) : [];

  const filteredTools = parsedTools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrack = trackFilter === "all" || tool.track === trackFilter;
    return matchesSearch && matchesTrack;
  });

  const getToolIcon = (name: string) => {
    switch (name) {
      case "clarify":
        return MessageSquare;
      case "lookup":
        return Globe;
      case "fetch":
        return Eye;
      case "format":
        return List;
      case "send":
        return Send;
      case "policy":
        return BookOpen;
      case "papers":
      case "paper_text":
        return Cpu;
      case "weather_by_region":
        return Cloud;
      case "source_check":
        return ShieldCheck;
      case "trend_analyzer":
        return Sparkles;
      case "list_tools":
        return Wrench;
      default:
        return Wrench;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 gap-4 h-full">
      {/* Sub Sidebar: List of artifacts */}
      <aside className="w-64 flex flex-col rounded-2xl border border-[rgba(11,9,7,0.1)] bg-[#fffcf6] shadow-sm shrink-0">
        <div className="p-3 border-b border-[rgba(11,9,7,0.08)] bg-[#f7f7f5]/30">
          <span className="font-mono text-[9px] font-bold text-[#ff7300] uppercase tracking-wider">
            /artifacts-list
          </span>
          <p className="text-[10px] text-[rgba(11,9,7,0.5)] mt-1">
            Các tệp cấu hình và tài liệu của dự án.
          </p>
        </div>

        <div className="flex-1 overflow-auto p-2.5 space-y-1">
          {files.map((file) => {
            const isSelected = selectedFile === file.id;
            const Icon = file.type === "markdown" ? FileText : FileCode;
            return (
              <button
                key={file.id}
                onClick={() => {
                  setSelectedFile(file.id);
                  if (file.id !== "tools.yaml") setViewMode("yaml");
                }}
                className={`w-full flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all ${
                  isSelected
                    ? "border-[#3c3a39] bg-[#eaeae2]/40"
                    : "border-transparent bg-transparent hover:bg-[#eaeae2]/10"
                }`}
                type="button"
              >
                <Icon className={`size-4 shrink-0 ${isSelected ? "text-[#ff7300]" : "text-[rgba(11,9,7,0.4)]"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-[#3c3a39] truncate">{file.name}</p>
                  <p className="text-[9px] text-[rgba(11,9,7,0.4)] truncate mt-0.5">
                    {file.type === "markdown" ? "Markdown Text" : "YAML Declaration"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 rounded-2xl border border-[rgba(11,9,7,0.1)] bg-[#fffcf6] p-5 shadow-sm overflow-auto flex flex-col min-h-0">
        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b border-[rgba(11,9,7,0.08)] pb-3.5 shrink-0">
          <div>
            <span className="font-mono text-[9px] font-bold text-[#817fff] uppercase tracking-wider">
              /artifact-viewer
            </span>
            <div className="flex items-center gap-3 mt-0.5">
              <h3 className="text-sm font-bold text-[#3c3a39]">{activeFile.name}</h3>
              {activeFile.id === "tools.yaml" && (
                <div className="flex rounded-lg border border-[rgba(11,9,7,0.08)] bg-[#fefcf5] p-0.5 shadow-xs">
                  <button
                    onClick={() => setViewMode("visual")}
                    className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase transition-all ${
                      viewMode === "visual"
                        ? "bg-[#3c3a39] text-[#fefcf5] shadow-xs"
                        : "text-[rgba(11,9,7,0.5)] hover:text-[#3c3a39]"
                    }`}
                  >
                    Visual UI
                  </button>
                  <button
                    onClick={() => setViewMode("yaml")}
                    className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase transition-all ${
                      viewMode === "yaml"
                        ? "bg-[#3c3a39] text-[#fefcf5] shadow-xs"
                        : "text-[rgba(11,9,7,0.5)] hover:text-[#3c3a39]"
                    }`}
                  >
                    Raw YAML
                  </button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={fetchArtifacts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgba(11,9,7,0.1)] bg-[#fffcf6] text-[10px] font-mono hover:bg-[#eaeae2]/30 transition-all text-[#3c3a39]"
          >
            <RefreshCw className="size-3" />
            Reload
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-auto mt-4">
          {!activeFile.content ? (
            <div className="rounded-xl border border-dashed border-[rgba(11,9,7,0.1)] p-8 text-center text-xs text-[rgba(11,9,7,0.4)] font-mono">
              /artifact-file-is-empty-or-not-found
            </div>
          ) : activeFile.id === "tools.yaml" && viewMode === "visual" ? (
            /* Visual tool list rendering */
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-[rgba(11,9,7,0.06)] bg-[#fefcf5] shadow-xs">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[rgba(11,9,7,0.4)]" />
                  <input
                    type="text"
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-[rgba(11,9,7,0.08)] bg-[#fffcf6] py-1.5 pl-8 pr-3 text-[11px] font-medium text-[#3c3a39] placeholder-[rgba(11,9,7,0.3)] shadow-inner focus:outline-none focus:border-[#3c3a39]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5 text-[rgba(11,9,7,0.4)]" />
                  <div className="flex gap-1.5">
                    {(["all", "core", "bonus"] as const).map((track) => (
                      <button
                        key={track}
                        onClick={() => setTrackFilter(track)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase transition-all border ${
                          trackFilter === track
                            ? "border-[#3c3a39] bg-[#3c3a39] text-[#fefcf5] shadow-xs"
                            : "border-[rgba(11,9,7,0.08)] bg-[#fffcf6] text-[rgba(11,9,7,0.5)] hover:bg-[#eaeae2]/20"
                        }`}
                      >
                        {track}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid layout of parsed tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredTools.map((tool) => {
                  const ToolIcon = getToolIcon(tool.name);
                  const isExpanded = expandedTool === tool.name;
                  const isBonus = tool.track === "bonus";

                  return (
                    <div
                      key={tool.name}
                      className={`group rounded-xl border p-4 transition-all shadow-sm flex flex-col bg-[#fefcf5] ${
                        isBonus
                          ? "border-[#817fff]/20 hover:border-[#817fff]/40 hover:shadow-md"
                          : "border-[#ff7300]/20 hover:border-[#ff7300]/40 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl flex items-center justify-center border shadow-inner ${
                              isBonus
                                ? "bg-[#817fff]/[0.06] border-[#817fff]/10 text-[#817fff]"
                                : "bg-[#ff7300]/[0.06] border-[#ff7300]/10 text-[#ff7300]"
                            }`}
                          >
                            <ToolIcon className="size-4 shrink-0" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#3c3a39] tracking-tight group-hover:text-black">
                              {tool.name}
                            </h4>
                            <span
                              className={`inline-block rounded-full px-1.5 py-px text-[7.5px] font-bold uppercase tracking-wider border mt-1 ${
                                isBonus
                                  ? "bg-[#817fff]/10 text-[#817fff] border-[#817fff]/20"
                                  : "bg-[#ff7300]/10 text-[#ff7300] border-[#ff7300]/20"
                              }`}
                            >
                              {tool.track} tool
                            </span>
                          </div>
                        </div>

                        {tool.parameters.length > 0 && (
                          <button
                            onClick={() => setExpandedTool(isExpanded ? null : tool.name)}
                            className="rounded-lg border border-[rgba(11,9,7,0.06)] bg-[#fffcf6] px-2 py-1 text-[9px] font-mono hover:bg-[#eaeae2]/30 transition-all text-[#3c3a39] shadow-xs"
                          >
                            {isExpanded ? "Collapse" : `Args (${tool.parameters.length})`}
                          </button>
                        )}
                      </div>

                      <p className="mt-3 text-[11px] leading-5 text-[rgba(11,9,7,0.65)] font-medium">
                        {tool.description}
                      </p>

                      {/* Collapsible Arguments list */}
                      {isExpanded && tool.parameters.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-[rgba(11,9,7,0.06)] bg-[#fffcf6]/80 rounded-xl p-3 space-y-2.5 shadow-inner">
                          <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-[rgba(11,9,7,0.4)] flex items-center gap-1.5">
                            <Sliders className="size-3" /> /argument-details
                          </p>
                          <div className="space-y-2">
                            {tool.parameters.map((param) => (
                              <div
                                key={param.name}
                                className="flex flex-col p-2 bg-[#fefcf5] rounded-lg border border-[rgba(11,9,7,0.04)]"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[10px] font-bold text-[#3c3a39]">
                                    {param.name}
                                  </span>
                                  <span className="rounded-full bg-[#eaeae2]/50 px-1.5 py-0.5 font-mono text-[7px] text-[rgba(11,9,7,0.5)]">
                                    {param.type}
                                  </span>
                                </div>
                                {param.description && (
                                  <p className="mt-1 text-[9px] text-[rgba(11,9,7,0.5)] leading-4 font-semibold">
                                    {param.description}
                                  </p>
                                )}
                                {param.default && (
                                  <div className="mt-1 text-[8.5px] font-mono text-[#ff7300]">
                                    Default: <span className="font-bold">{param.default}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredTools.length === 0 && (
                <div className="rounded-xl border border-dashed border-[rgba(11,9,7,0.1)] p-8 text-center text-xs text-[rgba(11,9,7,0.4)] font-mono">
                  /no-registered-tools-matched-your-search
                </div>
              )}
            </div>
          ) : activeFile.type === "markdown" ? (
            /* Render markdown for report/system prompt */
            <div className="prose max-w-none text-xs text-[#3c3a39] leading-6 bg-[#fefcf5] border border-[rgba(11,9,7,0.06)] rounded-xl p-5 overflow-auto">
              <ReactMarkdown>{activeFile.content}</ReactMarkdown>
            </div>
          ) : (
            /* Code/YAML Block */
            <pre className="rounded-xl border border-[rgba(11,9,7,0.06)] bg-[#fefcf5] p-4 overflow-auto font-mono text-[11px] leading-5 text-[rgba(11,9,7,0.75)] max-h-[70vh]">
              <code>{activeFile.content}</code>
            </pre>
          )}
        </div>
      </section>
    </div>
  );
}
