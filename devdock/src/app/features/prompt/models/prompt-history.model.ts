import { StructuredPrompt } from './prompt.model';

export interface PromptHistoryEntry {
  id: string;
  rawInput: string;
  result: StructuredPrompt;
  projectName?: string;
  tags: string[];
  createdAt: number;
}
