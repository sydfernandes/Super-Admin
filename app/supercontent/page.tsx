'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryTree } from '@/app/categories/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ContentHeader } from '@/components/ui/content-header';

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

// Main Content Manager Component
export default function ContentManager() {
  return (
    <div className="flex min-h-screen">
      {/* Main Content */}
      <div className="flex-1">
        <ContentHeader title="Content Manager" />
        <main className="flex-1 space-y-4 p-8 pt-6">
          <Tabs defaultValue="overview" className="w-full space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="product-structure">Product Structure</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <Overview />
            </TabsContent>
            
            <TabsContent value="categories">
              <CategoryTree />
            </TabsContent>
            
            <TabsContent value="product-structure">
              <ProductStructure />
            </TabsContent>
          </Tabs>
        </main>
      </div>

      
    </div>
  );
} 