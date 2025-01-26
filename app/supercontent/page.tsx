'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryTree } from '@/app/supercontent/categories/page';
import { ContentHeader } from '@/components/page-header';
import { RightSidebar } from '@/components/app-rightsidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

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

// Product Structure Component
function ProductStructure() {
  const [fields, setFields] = useState([
    { id: 1, name: 'name', type: 'string', required: true },
    { id: 2, name: 'price', type: 'number', required: true },
    { id: 3, name: 'description', type: 'text', required: false },
  ]);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Product Structure</h2>
        <Button>Add Field</Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((field) => (
              <TableRow key={field.id}>
                <TableCell>{field.name}</TableCell>
                <TableCell>{field.type}</TableCell>
                <TableCell>{field.required ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">Edit</Button>
                  <Button variant="ghost" size="sm" className="text-red-500">Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

// Overview Component
function Overview() {
  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="p-6">
            <h3 className="font-semibold mb-2">Total Products</h3>
            <p className="text-3xl font-bold">0</p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <h3 className="font-semibold mb-2">Total Categories</h3>
            <p className="text-3xl font-bold">0</p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <h3 className="font-semibold mb-2">Last Update</h3>
            <p className="text-3xl font-bold">-</p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <h3 className="font-semibold mb-2">Active Products</h3>
            <p className="text-3xl font-bold">0</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Main Page Component
 */
export default function ContentManager() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [categories, setCategories] = useState<TreeItem[]>([]);
  const [actionHistory, setActionHistory] = useState<CategoryAction[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Handler to receive data from CategoryTree
  const handleCategoryDataUpdate = (data: CategoryData) => {
    setCategories(data.items);
    setActionHistory(data.history);
  };

  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col",
        isSidebarOpen ? "mr-[450px]" : "mr-0"
      )}>
        <ContentHeader 
          title="Contenaat Manager" 
          className="sticky top-0 z-30 bg-background"
          isSidebarOpen={isSidebarOpen}
          onSidebarToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <div className="flex-1 p-8 pt-6">
          <Tabs 
            defaultValue="overview" 
            className="w-full space-y-6"
            onValueChange={setActiveTab}
          >
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="product-structure">Product Structure</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <Overview />
            </TabsContent>
            
            <TabsContent value="categories">
              <CategoryTree onDataUpdate={handleCategoryDataUpdate} />
            </TabsContent>
            
            <TabsContent value="product-structure">
              <ProductStructure />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar 
        activeTab={activeTab}
        categories={categories}
        actionHistory={actionHistory}
        isHistoryExpanded={isHistoryExpanded}
        onHistoryExpandToggle={() => setIsHistoryExpanded(!isHistoryExpanded)}
        isOpen={isSidebarOpen}
      />
    </div>
  );
} 