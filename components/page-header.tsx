"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

interface ContentHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
}

export function ContentHeader({
  title,
  subtitle,
  className,
  children,
  actions,
  tabs,
}: ContentHeaderProps) {
  return (
    <div className="flex flex-col border-b">
      {/* Top Navigation Bar */}
      <header className={cn("flex h-14 shrink-0 items-center gap-2 ", className)}>
        <div className="flex flex-1 items-center gap-2 px-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="line-clamp-1">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto px-3">
          {children}
        </div>
      </header>

      {/* Page Header with Title and Actions */}
      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {tabs}
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 