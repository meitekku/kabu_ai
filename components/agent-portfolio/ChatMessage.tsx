"use client";

import { memo, useCallback, useState } from "react";
import { isToolUIPart, getToolName, type UIMessage } from "ai";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "./ai-elements/message";
import { StepIndicator } from "./StepIndicator";
import {
  CopyIcon,
  CheckIcon,
  RotateCcwIcon,
  SearchIcon,
  BrainIcon,
  SparklesIcon,
  DatabaseIcon,
  OctagonIcon,
} from "lucide-react";

// WHY: tool calls in portfolio agent are simple — DB query, websearch, etc.
const TOOL_LABEL: Record<string, { active: string; done: string; icon: typeof SearchIcon }> = {
  bash: { active: "DB を検索中...", done: "DB を検索しました", icon: DatabaseIcon },
  Bash: { active: "DB を検索中...", done: "DB を検索しました", icon: DatabaseIcon },
  read: { active: "ファイルを確認中...", done: "ファイルを確認しました", icon: SearchIcon },
  Read: { active: "ファイルを確認中...", done: "ファイルを確認しました", icon: SearchIcon },
  grep: { active: "テキスト検索中...", done: "テキスト検索完了", icon: SearchIcon },
  Grep: { active: "テキスト検索中...", done: "テキスト検索完了", icon: SearchIcon },
};

function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => stripThinkTags(p.text))
    .join("");
}

interface ToolCallIndicatorProps {
  toolName: string;
  state: string;
  stopped?: boolean;
}

const ToolCallIndicator = memo(function ToolCallIndicator({
  toolName,
  state,
  stopped,
}: ToolCallIndicatorProps) {
  const isComplete = state === "output-available" || !!stopped;
  const labels = TOOL_LABEL[toolName] ?? {
    active: `${toolName} 実行中...`,
    done: `${toolName} 完了`,
    icon: SearchIcon,
  };

  return (
    <StepIndicator
      icon={labels.icon}
      activeLabel={labels.active}
      completedLabel={labels.done}
      active={!isComplete}
    />
  );
});

interface ChatMessageProps {
  message: UIMessage;
  isActiveStreaming?: boolean;
  stopped?: boolean;
  onCopy: (text: string) => void;
  onRegenerate?: () => void;
}

export const ChatMessage = memo(function ChatMessage({
  message,
  isActiveStreaming,
  stopped,
  onCopy,
  onRegenerate,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    onCopy(getMessageText(message));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [message, onCopy]);

  const hasText = message.parts.some(
    (p) => p.type === "text" && stripThinkTags(p.text).length > 0,
  );
  const toolParts = message.parts.filter((p) => isToolUIPart(p));
  const allToolsComplete =
    toolParts.length > 0 &&
    toolParts.every((p) => isToolUIPart(p) && p.state === "output-available");
  const showThinking =
    isActiveStreaming && toolParts.length === 0 && !hasText;
  const showGenerating =
    isActiveStreaming && allToolsComplete && !hasText;

  return (
    <Message from={message.role} className="animate-portfolio-fade-in">
      <MessageContent>
        {message.parts.map((part, i) => {
          const key = `${message.id}-${i}`;
          if (part.type === "text") {
            const text = stripThinkTags(part.text);
            if (!text) return null;
            return (
              <MessageResponse
                key={key}
                isActiveStreaming={
                  message.role === "assistant" ? isActiveStreaming : false
                }
              >
                {text}
              </MessageResponse>
            );
          }
          if (isToolUIPart(part)) {
            const tn = getToolName(part);
            return (
              <ToolCallIndicator
                key={key}
                toolName={tn}
                state={part.state}
                stopped={stopped}
              />
            );
          }
          return null;
        })}
        {showThinking && (
          <StepIndicator
            icon={BrainIcon}
            activeLabel="クエリを分析中..."
            completedLabel="クエリを分析しました"
            active
          />
        )}
        {showGenerating && (
          <StepIndicator
            icon={SparklesIcon}
            activeLabel="回答を生成中..."
            completedLabel="回答を生成しました"
            active
          />
        )}
        {stopped && message.role === "assistant" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 mt-1">
            <OctagonIcon className="size-3" />
            <span>回答が中断されました</span>
          </div>
        )}
      </MessageContent>

      {message.role === "assistant" && !isActiveStreaming && hasText && (
        <MessageActions>
          <MessageAction
            tooltip={copied ? "コピー済み" : "コピー"}
            onClick={handleCopy}
          >
            {copied ? (
              <CheckIcon className="size-3.5 text-green-500" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </MessageAction>
          {onRegenerate && (
            <MessageAction tooltip="再生成" onClick={onRegenerate}>
              <RotateCcwIcon className="size-3.5" />
            </MessageAction>
          )}
        </MessageActions>
      )}
    </Message>
  );
});
