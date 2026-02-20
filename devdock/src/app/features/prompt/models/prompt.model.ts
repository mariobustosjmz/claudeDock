export interface StructuredPrompt {
  context: string;
  file: string;
  action: string;
  expected: string;
}

export interface OptimizeRequest {
  rawPrompt: string;
}

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature: number;
  max_tokens: number;
}

export interface GroqResponse {
  choices: Array<{ message: { content: string } }>;
}

export interface ProjectContext {
  project_name?: string;
  current_branch?: string;
  recent_commits: string[];
  package_json?: { main_dependencies: string[] };
}
