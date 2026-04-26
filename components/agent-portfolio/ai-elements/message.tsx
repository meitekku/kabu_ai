"use client";

import type { UIMessage } from "ai";
import { memo, type ComponentProps, type HTMLAttributes } from "react";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export function Message({ className, from, ...props }: MessageProps) {
  return (
    <div
      className={cn(
        "group flex w-full max-w-[95%] flex-col gap-2",
        from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
        className,
      )}
      {...props}
    />
  );
}

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export function MessageContent({
  children,
  className,
  ...props
}: MessageContentProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-col gap-2 text-sm",
        "group-[.is-user]:w-fit group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
        "group-[.is-assistant]:w-full group-[.is-assistant]:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type MessageActionsProps = ComponentProps<"div">;

export function MessageActions({
  className,
  children,
  ...props
}: MessageActionsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 group-[.is-user]:ml-auto",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export function MessageAction({
  tooltip,
  children,
  label,
  variant = "ghost",
  size = "icon",
  className,
  ...props
}: MessageActionProps) {
  const button = (
    <Button
      size={size}
      type="button"
      variant={variant}
      className={cn("h-7 w-7", className)}
      {...props}
    >
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (!tooltip) return button;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export type MessageResponseProps = ComponentProps<typeof Streamdown> & {
  isActiveStreaming?: boolean;
};

const sdClassName =
  "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:pl-5 [&_ol]:pl-5 prose prose-sm max-w-none dark:prose-invert";

// WHY: useChat protocol streams text incrementally — Streamdown handles
// partial markdown without breaking layout
export const MessageResponse = memo(function MessageResponse({
  className,
  isActiveStreaming,
  ...props
}: MessageResponseProps) {
  return (
    <Streamdown
      className={cn(sdClassName, className)}
      animated={!!isActiveStreaming}
      {...props}
    />
  );
});
