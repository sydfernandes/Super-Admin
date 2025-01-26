"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RightSidebar } from "@/components/ui/right-sidebar";
import { CategoryHistory } from "./history";

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

interface CategoriesSidebarProps {
  className?: string;
  activeTab?: string;
  categories: TreeItem[];
  actionHistory: CategoryAction[];
}

export function CategoriesSidebar({
  className,
  activeTab,
  categories = [],
  actionHistory = [],
}: CategoriesSidebarProps) {
  // Count root categories (items with no parent)
  const getRootCategories = (items: TreeItem[]): TreeItem[] => {
    return items.filter(item => item.parentId === null);
  };

  // Count subcategories (items with a parent)
  const countSubcategories = (items: TreeItem[]): number => {
    return items.filter(item => item.parentId !== null).length;
  };

  // Get active categories count (excluding inactive ones)
  const activeCategories = categories.filter(cat => cat.metadata?.status !== 'inactive');
  const rootCategoriesCount = getRootCategories(activeCategories).length;
  const totalSubcategoriesCount = countSubcategories(activeCategories);

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
                      {rootCategoriesCount === 1 ? 'Categoria' : 'Categorias'} principais
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
                      Total de {totalSubcategoriesCount === 1 ? 'subcategoria' : 'subcategorias'}
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
                className="h-full"
              />
            </div>
          </>
        ) : null}
      </div>
    </RightSidebar>
  );
} 