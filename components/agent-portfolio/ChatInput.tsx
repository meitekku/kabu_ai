"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import type { ChatStatus } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CornerDownLeftIcon, SquareIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  status: ChatStatus;
  onSend: (text: string) => void;
  onStop: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  status,
  onSend,
  onStop,
  disabled,
  placeholder = "メッセージを入力...",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  const isGenerating = status === "submitted" || status === "streaming";
  const isError = status === "error";
  const canSubmit = !!input.trim() && !disabled && !isGenerating;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSend(input);
    setInput("");
  }, [canSubmit, input, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key !== "Enter") return;
      if (isComposing || e.nativeEvent.isComposing) return;
      if (e.shiftKey) return;
      e.preventDefault();
      handleSubmit();
    },
    [handleSubmit, isComposing],
  );

  const handleClick = useCallback(() => {
    if (isGenerating) {
      onStop();
      return;
    }
    handleSubmit();
  }, [isGenerating, onStop, handleSubmit]);

  let icon = <CornerDownLeftIcon className="size-4" />;
  if (isGenerating) icon = <SquareIcon className="size-4" />;
  else if (isError) icon = <XIcon className="size-4" />;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-3">
      <div
        className={cn(
          "rounded-xl border bg-background shadow-sm transition-shadow",
          "focus-within:ring-1 focus-within:ring-primary/30",
          disabled && "opacity-60",
        )}
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className="resize-none border-0 bg-transparent px-4 py-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[64px] max-h-48"
        />
        <div className="flex items-center justify-end gap-2 px-3 pb-2">
          <Button
            type="button"
            variant="default"
            size="icon"
            className="h-8 w-8 rounded-md"
            disabled={!canSubmit && !isGenerating}
            onClick={handleClick}
            aria-label={isGenerating ? "停止" : "送信"}
          >
            {icon}
          </Button>
        </div>
      </div>
      <p className="text-center text-[11px] text-muted-foreground/70 py-1.5">
        AI の回答には誤りが含まれる場合があります。投資判断は自己責任でお願いします。
      </p>
    </div>
  );
}
