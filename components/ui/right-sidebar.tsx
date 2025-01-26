'use client';

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

interface RightSidebarContextType {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const RightSidebarContext = React.createContext<RightSidebarContextType | undefined>(undefined);

function useRightSidebar() {
  const context = React.useContext(RightSidebarContext);
  if (!context) {
    throw new Error("useRightSidebar must be used within a RightSidebarProvider");
  }
  return context;
}

export const RightSidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentPropsWithoutRef<typeof Button>
>(({ className, ...props }, ref) => {
  const { isOpen, toggleSidebar } = useRightSidebar();

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn("h-7 w-7", className)}
      title={isOpen ? "Hide sidebar" : "Show sidebar"}
      {...props}
    >
      {isOpen ? (
        <PanelRightClose className="h-5 w-5" />
      ) : (
        <PanelRightOpen className="h-5 w-5" />
      )}
    </Button>
  );
});
RightSidebarTrigger.displayName = "RightSidebarTrigger";

interface RightSidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  header?: React.ReactNode;
  width?: string;
}

export function RightSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const toggleSidebar = React.useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <RightSidebarContext.Provider value={{ isOpen, toggleSidebar }}>
      <div className={cn(
        "transition-[margin] duration-300 ease-in-out",
        isOpen ? "mr-[450px]" : "mr-0"
      )}>
        {children}
      </div>
    </RightSidebarContext.Provider>
  );
}

export function RightSidebar({
  className,
  children,
  header,
  width = "450px",
  ...props
}: RightSidebarProps) {
  const { isOpen } = useRightSidebar();

  return (
    <div 
      className={cn(
        "border-l bg-muted/10",
        "fixed top-0 right-0 h-screen flex flex-col",
        "transition-transform duration-300 ease-in-out",
        !isOpen && "translate-x-full",
        className
      )}
      style={{ width }}
      {...props}
    >
      {header && (
        <div className="h-16 border-b px-6 flex items-center flex-shrink-0">
          {header}
        </div>
      )}
      <div className="flex flex-col flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
} 