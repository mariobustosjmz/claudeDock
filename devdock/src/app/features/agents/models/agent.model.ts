export interface AgentProcess {
  pid: number;
  name: string;
  agentType: string;
  cmd: string[];
  cwd: string | null;
  memoryKb: number;
  cpuPercent: number;
  startTime: number;
  status: string;
}

export interface AgentMetrics {
  pid: number;
  logLines: string[];
  tokenEstimate: number | null;
  costEstimate: number | null;
}
