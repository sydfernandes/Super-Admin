"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface ContentHeaderProps {
  title: string;
  className?: string;
  children?: React.ReactNode;
}

export function ContentHeader({
  title,
  className,
  children
}: ContentHeaderProps) {
  return (
    <header className={cn("flex h-16 items-center border-b px-6", className)}>
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      {children && (
        <div className="ml-auto">
          {children}
        </div>
      )}
    </header>
  );
} 