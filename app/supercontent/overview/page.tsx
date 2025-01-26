'use client';

import { Card } from '@/components/ui/card';

export function Overview() {
  return (
    <div className="flex-1 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Overview
        </p>
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