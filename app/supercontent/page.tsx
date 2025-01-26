'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryTree } from '@/app/supercontent/categories/page';
import { Overview } from '@/app/supercontent/overview/page';
import { ProductStructure } from '@/app/supercontent/product-structure/page';
import { ContentHeader } from '@/components/page-header';
import { RightSidebarProvider, RightSidebarTrigger } from '@/components/ui/right-sidebar';
import { CategoriesSidebar } from './categories/sidebar'
import { ProductStructureSidebar } from './product-structure/sidebar'
import { OverviewSidebar } from './overview/sidebar'

// Types
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

interface CategoryData {
  items: TreeItem[];
  history: CategoryAction[];
}

/**
 * Main Page Component
 */
export default function ContentManager() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [categories, setCategories] = useState<TreeItem[]>([]);
  const [actionHistory, setActionHistory] = useState<CategoryAction[]>([]);

  // Handler to receive data from CategoryTree
  const handleCategoryDataUpdate = (data: CategoryData) => {
    setCategories(data.items);
    setActionHistory(data.history);
  };

  return (
    <RightSidebarProvider>
      <div className="flex min-h-screen relative">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <Tabs 
            defaultValue="overview" 
            className="w-full"
            onValueChange={setActiveTab}
          >
            <ContentHeader 
              title="Super Content"
              subtitle="Manage your products, categories, and content structure."
              className="sticky top-0 z-30 bg-background"
              tabs={
                <TabsList className="h-9">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="categories">Categories</TabsTrigger>
                  <TabsTrigger value="product-structure">Structure</TabsTrigger>
                </TabsList>
              }
            >
              <RightSidebarTrigger />
            </ContentHeader>

            <div className="flex-1">
              <TabsContent value="overview" className="p-8">
                <Overview />
              </TabsContent>
              
              <TabsContent value="categories" className="p-8">
                <CategoryTree onDataUpdate={handleCategoryDataUpdate} />
              </TabsContent>
              
              <TabsContent value="product-structure" className="p-8">
                <ProductStructure />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Sidebar - Conditionally render based on active tab */}
        {activeTab === "overview" && (
          <OverviewSidebar />
        )}
        {activeTab === "categories" && (
          <CategoriesSidebar 
            activeTab={activeTab}
            categories={categories}
            actionHistory={actionHistory}
            isHistoryExpanded={isHistoryExpanded}
            onHistoryExpandToggle={() => setIsHistoryExpanded(!isHistoryExpanded)}
          />
        )}
        {activeTab === "product-structure" && (
          <ProductStructureSidebar 
            fields={[]}
            isExpanded={isHistoryExpanded}
            onExpandToggle={() => setIsHistoryExpanded(!isHistoryExpanded)}
          />
        )}
      </div>
    </RightSidebarProvider>
  );
} 