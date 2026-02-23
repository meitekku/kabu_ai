import Anthropic from '@anthropic-ai/sdk';

export type MessageParam = Anthropic.MessageParam;
export type ContentBlock = Anthropic.ContentBlock;
export type ToolUseBlock = Anthropic.ToolUseBlock;
export type TextBlock = Anthropic.TextBlock;
export type ToolResultBlockParam = Anthropic.ToolResultBlockParam;
export type Tool = Anthropic.Tool;

export type StatusCallback = (status: string) => void;

export interface AgentConfig {
  model: string;
  maxIterations: number;
}

export const ORCHESTRATOR_CONFIG: AgentConfig = {
  model: process.env.AGENT_ORCHESTRATOR_MODEL || 'claude-sonnet-4-20250514',
  maxIterations: 5,
};

export const SUB_AGENT_CONFIG: AgentConfig = {
  model: process.env.AGENT_SUB_MODEL || 'claude-haiku-4-5-20251001',
  maxIterations: 3,
};
