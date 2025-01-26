"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface ContentHeaderProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
  isSidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

export function ContentHeader({
  title,
  className,
  children,
  isSidebarOpen = true,
  onSidebarToggle,
}: ContentHeaderProps) {
  return (
    <header className={cn("flex h-16 items-center border-b px-6", className)}>
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {children}
        <Button variant="default" className="bg-black hover:bg-black/90">
          Action
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
          className="h-9 w-9"
          title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          {isSidebarOpen ? (
            <PanelRightClose className="h-5 w-5" />
          ) : (
            <PanelRightOpen className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  );
} 