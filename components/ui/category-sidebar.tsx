"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryHistory } from "@/components/ui/category-history";
import { cn } from "@/lib/utils";

interface TreeItem {
  id: string;
  name: string;
  parentId: string | undefined;
  children: TreeItem[];
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

interface CategorySidebarProps {
  items: TreeItem[];
  actionHistory: CategoryAction[];
  isHistoryExpanded: boolean;
  onHistoryExpandToggle: () => void;
  countSubcategories: (items: TreeItem[]) => number;
  className?: string;
}

export function CategorySidebar({
  items,
  actionHistory,
  isHistoryExpanded,
  onHistoryExpandToggle,
  countSubcategories,
  className
}: CategorySidebarProps) {
  return (
    <div className={cn(
      "w-80 flex flex-col gap-4 transition-all duration-200 h-screen sticky top-0 py-8",
      isHistoryExpanded && "w-[500px]",
      className
    )}>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Número de Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Número de Subcategorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{countSubcategories(items)}</div>
          </CardContent>
        </Card>
      </div>
      <div className="flex-1 min-h-0">
        <CategoryHistory
          history={actionHistory}
          categories={items}
          isExpanded={isHistoryExpanded}
          onExpandToggle={onHistoryExpandToggle}
        />
      </div>
    </div>
  );
} 