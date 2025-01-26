"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Filter, X } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TreeItem {
  id: string;
  name: string;
  parentId: string | null;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string;
    status?: "active" | "inactive";
  };
}

interface CategoryAction {
  id: string;
  timestamp: string;
  action: "CATEGORY_CREATED" | "SUBCATEGORY_ADDED" | "SUBCATEGORY_MOVED" | "CATEGORY_RENAMED" | "CATEGORY_REMOVED" | "SUBCATEGORY_REMOVED" | "ORDER_CHANGED" | "PROPERTY_ASSIGNED" | "CATEGORY_ACTIVATED" | "CATEGORY_DEACTIVATED";
  details: {
    message: string;
    affectedCategories: {
      target?: {
        id: string;
        name: string;
        path?: string;
      };
      previousParent?: {
        id: string;
        name: string;
      };
      newParent?: {
        id: string;
        name: string;
      };
    };
  };
  user: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
    path?: string;
    metadata?: {
      createdAt?: string;
      updatedAt?: string;
      deletedAt?: string;
      status?: "active" | "inactive";
    };
  };
  changes?: {
    previousState?: {
      parentId?: string;
      position?: number;
      depth?: number;
      path?: string;
      status?: "active" | "inactive";
    };
    newState?: {
      parentId?: string;
      position?: number;
      depth?: number;
      path?: string;
      status?: "active" | "inactive";
    };
  };
}

interface CategoryHistoryProps {
  className?: string;
  history: CategoryAction[];
  categories: TreeItem[];
}

export function CategoryHistory({
  className,
  history = [],
  categories = [],
}: CategoryHistoryProps) {
  const [dateFilter, setDateFilter] = useState<Date>();

  // Memoize the categories map for faster lookups
  const categoriesMap = useMemo(() => {
    return new Map(categories.map(cat => [cat.id, cat]));
  }, [categories]);

  // Optimize parent category name lookup
  const getParentCategoryName = useCallback((parentId: string | undefined | null): string => {
    if (!parentId) return "Root";
    const parent = categoriesMap.get(parentId);
    return parent ? parent.name : "Unknown";
  }, [categoriesMap]);

  // Optimize date filtering with memoized date object and faster date comparison
  const filteredHistory = useMemo(() => {
    if (!dateFilter) return history;
    
    return history.filter(action => {
      if (!action.timestamp) return false;
      try {
        return isSameDay(parseISO(action.timestamp), dateFilter);
      } catch {
        return false;
      }
    });
  }, [history, dateFilter]);

  // Optimize grouping with pre-parsed dates and memoized format function
  const groupedHistory = useMemo(() => {
    const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');
    const groups = new Map<string, CategoryAction[]>();
    
    filteredHistory.forEach(action => {
      try {
        const actionDate = parseISO(action.timestamp);
        const dateKey = formatDate(actionDate);
        if (!groups.has(dateKey)) {
          groups.set(dateKey, []);
        }
        groups.get(dateKey)?.push(action);
      } catch {
        // Skip invalid dates
      }
    });

    return Array.from(groups.entries())
      .sort((a, b) => parseISO(b[0]).getTime() - parseISO(a[0]).getTime());
  }, [filteredHistory]);

  // Memoize date formatting functions
  const formatFullDate = useCallback((date: string) => {
    try {
      return format(parseISO(date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  }, []);

  const formatTime = useCallback((timestamp: string) => {
    try {
      return format(parseISO(timestamp), 'HH:mm');
    } catch {
      return "--:--";
    }
  }, []);

  return (
    <Card className={cn(
      "flex flex-col min-h-0",
      "max-h-[calc(100vh-8rem)]",
      "h-full",
      className
    )}>
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle>
            Histórico de Alterações
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
                  locale={ptBR}
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
                  {formatFullDate(date)}
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
                        {formatTime(action.timestamp)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground/90 font-medium truncate">
                          {action.details.message}
                        </p>
                        {action.details.affectedCategories.previousParent && action.details.affectedCategories.newParent && (
                          <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span className="truncate">{action.details.affectedCategories.previousParent.name}</span>
                            <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14m-7-7 7 7-7 7" />
                            </svg>
                            <span className="truncate">{action.details.affectedCategories.newParent.name}</span>
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
              <p className="text-sm text-muted-foreground">Nenhuma alteração encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                {history.length > 0 
                  ? "Tente ajustar os filtros"
                  : "As alterações nas categorias aparecerão aqui"
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 