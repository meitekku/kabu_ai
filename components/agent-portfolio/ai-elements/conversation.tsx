"use client";

import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";

// Lightweight stick-to-bottom replacement (no external dep) — auto-scroll
// while user is at bottom; expose a manual jump button when scrolled up.

export type ConversationProps = ComponentProps<"div"> & {
  children?: ReactNode;
};

export function Conversation({ className, children, ...props }: ConversationProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickRef.current = dist < 32;
      if (buttonRef.current) {
        buttonRef.current.style.display = stickRef.current ? "none" : "flex";
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Observe content size — auto-scroll when at bottom
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      if (stickRef.current) {
        el.scrollTop = el.scrollHeight;
      }
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  const scrollToBottom = () => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  return (
    <div className={cn("relative flex-1 overflow-hidden", className)} {...props}>
      <div
        ref={scrollerRef}
        className="absolute inset-0 overflow-y-auto"
        role="log"
      >
        {children}
      </div>
      <Button
        ref={buttonRef}
        variant="outline"
        size="icon"
        type="button"
        onClick={scrollToBottom}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden rounded-full shadow-md"
        aria-label="最新メッセージへ"
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    </div>
  );
}

export type ConversationContentProps = ComponentProps<"div">;

export function ConversationContent({
  className,
  ...props
}: ConversationContentProps) {
  return <div className={cn("flex flex-col gap-8 p-4", className)} {...props} />;
}
