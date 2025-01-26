"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";

interface FieldItem {
  id: string;
  name: string;
  type: "text" | "number" | "boolean" | "date" | "select" | "multiselect" | "url" | "timestamp" | "email" | "image" | "currency" | "phone" | "json" | "markdown" | "color";
  required: boolean;
  parentId: string | undefined;
  children: FieldItem[];
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
    status?: "active" | "inactive";
  };
}

interface FieldAction {
  id: string;
  timestamp: string;
  action: "FIELD_CREATED" | "FIELD_UPDATED" | "FIELD_DELETED" | "FIELD_MOVED" | "FIELD_REQUIRED_CHANGED" | "FIELD_TYPE_CHANGED";
  details: {
    message: string;
    affectedFields: {
      target: {
        id: string;
        name: string;
      };
    };
  };
  user: {
    id: string;
    name: string;
  };
  field: {
    id: string;
    name: string;
    type: string;
    required: boolean;
    metadata?: {
      createdAt?: string;
      updatedAt?: string;
      deletedAt?: string;
      status?: "active" | "inactive";
    };
  };
  changes?: {
    previousState?: {
      type?: string;
      required?: boolean;
      parentId?: string;
      position?: number;
    };
    newState?: {
      type?: string;
      required?: boolean;
      parentId?: string;
      position?: number;
    };
  };
}

interface ProductStructureHistoryProps {
  history: FieldAction[];
  fields: FieldItem[];
  className?: string;
  isExpanded?: boolean;
  onExpandToggle?: () => void;
}

export function ProductStructureHistory({
  history,
  fields,
  className,
  isExpanded,
  onExpandToggle,
}: ProductStructureHistoryProps) {
  const [dateFilter, setDateFilter] = useState<Date>();

  const filteredHistory = useMemo(() => {
    return history.filter(action => {
      if (dateFilter) {
        const actionDate = new Date(action.timestamp);
        if (
          actionDate.getDate() !== dateFilter.getDate() ||
          actionDate.getMonth() !== dateFilter.getMonth() ||
          actionDate.getFullYear() !== dateFilter.getFullYear()
        ) {
          return false;
        }
      }
      return true;
    });
  }, [history, dateFilter]);

  // Group history items by date
  const groupedHistory = useMemo(() => {
    const groups = new Map<string, FieldAction[]>();
    
    filteredHistory.forEach(action => {
      const date = new Date(action.timestamp).toLocaleDateString();
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)?.push(action);
    });

    return Array.from(groups.entries()).sort((a, b) => 
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [filteredHistory]);

  return (
    <Card className={cn(
      "flex flex-col min-h-0",
      "max-h-[calc(100vh-8rem)]", // Maximum height with padding
      "h-full", // Take full height of parent
      className
    )}>
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle>
            Change History
          </CardTitle>
          <div className="flex items-center gap-2">
            {dateFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setDateFilter(undefined)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 w-7",
                    dateFilter && "text-primary"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto min-h-0 px-3 pb-4">
        <div className="space-y-4">
          {groupedHistory.map(([date, actions]) => (
            <div key={date} className="space-y-2">
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 py-1">
                <div className="text-xs font-medium text-muted-foreground">
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
              <div className="space-y-1 relative pl-4">
                <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-border" />
                {actions.map((action) => (
                  <div 
                    key={action.id} 
                    className="relative py-1"
                  >
                    <div className="absolute left-[-12px] top-2.5 w-2 h-2 rounded-full bg-border ring-[3px] ring-background" />
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap">
                        {new Date(action.timestamp).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground/90 font-medium truncate">
                          {action.details.message}
                        </p>
                        {action.changes && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {action.changes.previousState?.type !== action.changes.newState?.type && (
                              <div className="flex items-center gap-1.5">
                                <span className="truncate capitalize">{action.changes.previousState?.type || 'none'}</span>
                                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M5 12h14m-7-7 7 7-7 7" />
                                </svg>
                                <span className="truncate capitalize">{action.changes.newState?.type}</span>
                              </div>
                            )}
                            {action.changes.previousState?.required !== action.changes.newState?.required && (
                              <div className="flex items-center gap-1.5">
                                <span>{action.changes.previousState?.required ? 'Required' : 'Optional'}</span>
                                <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M5 12h14m-7-7 7 7-7 7" />
                                </svg>
                                <span>{action.changes.newState?.required ? 'Required' : 'Optional'}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filteredHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">No changes found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {history.length > 0 
                  ? "Try adjusting the filters"
                  : "Field changes will appear here"
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 