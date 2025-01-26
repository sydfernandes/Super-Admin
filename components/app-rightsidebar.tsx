'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CategoryHistory } from "@/app/supercontent/categories/history";
import { cn } from "@/lib/utils";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

interface TreeItem {
  id: string;
  name: string;
  parentId: string | undefined;
  children: TreeItem[];
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

interface RightSidebarProps {
  className?: string;
  activeTab: string;
  categories: TreeItem[];
  actionHistory: CategoryAction[];
  isHistoryExpanded?: boolean;
  onHistoryExpandToggle?: () => void;
  isOpen?: boolean;
}

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

export function RightSidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(true);
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
  activeTab,
  categories = [],
  actionHistory = [],
  isHistoryExpanded = false,
  onHistoryExpandToggle,
}: Omit<RightSidebarProps, 'isOpen'>) {
  const { isOpen } = useRightSidebar();

  // Calculate total subcategories by recursively counting all children
  const countSubcategories = (categories: TreeItem[]): number => {
    return categories.reduce((count, category) => {
      // Count immediate children
      const immediateChildren = category.children?.length || 0;
      // Recursively count children of children
      const childrenOfChildren = category.children ? countSubcategories(category.children) : 0;
      return count + immediateChildren + childrenOfChildren;
    }, 0);
  };

  // Root categories are the top-level categories
  const rootCategoriesCount = categories.length;
  // Get total subcategories count
  const totalSubcategoriesCount = countSubcategories(categories);

  return (
    <div className={cn(
      "w-[450px] border-l bg-muted/10",
      "fixed top-0 right-0 h-screen flex flex-col",
      "transition-transform duration-300 ease-in-out",
      !isOpen && "translate-x-full",
      className
    )}>
      <div className="h-16 border-b px-6 flex items-center flex-shrink-0">
        <h2 className="font-semibold">
          {activeTab === "categories" ? "Category Details" : "Content Overview"}
        </h2>
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="p-6 space-y-4 flex flex-col min-h-0">
          {activeTab === "categories" ? (
            <>
              {/* Categories Count Cards */}
              <div className="grid grid-cols-2 gap-4 flex-shrink-0">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Categories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold">{rootCategoriesCount}</span>
                      <span className="text-xs text-muted-foreground">
                        Main {rootCategoriesCount === 1 ? 'category' : 'categories'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Subcategories</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col">
                      <span className="text-2xl font-bold">{totalSubcategoriesCount}</span>
                      <span className="text-xs text-muted-foreground">
                        Total {totalSubcategoriesCount === 1 ? 'subcategory' : 'subcategories'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category History */}
              <div className="flex-1 min-h-0">
                <CategoryHistory 
                  history={actionHistory}
                  categories={categories}
                  isExpanded={isHistoryExpanded}
                  onExpandToggle={onHistoryExpandToggle}
                  className="h-full"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Recent Activity</h3>
                      <div className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500" />
                          New product added
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Stock updated
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Product removed
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 