"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { CategoryHistory } from "./history";

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

interface CategoriesSidebarProps {
  className?: string;
  activeTab?: string;
  categories: TreeItem[];
  actionHistory: CategoryAction[];
  isHistoryExpanded: boolean;
  onHistoryExpandToggle: () => void;
}

export function CategoriesSidebar({
  className,
  activeTab,
  categories = [],
  actionHistory = [],
  isHistoryExpanded = false,
  onHistoryExpandToggle,
}: CategoriesSidebarProps) {
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
    <RightSidebar className={className}>
      <div className="p-6 space-y-4 flex flex-col min-h-0">
        {activeTab === "categories" ? (
          <>
            {/* Categories Count Cards */}
            <div className="grid grid-cols-2 gap-4 flex-shrink-0">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Categorias</CardTitle>
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
                  <CardTitle>Subcategorias</CardTitle>
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
    </RightSidebar>
  );
} 