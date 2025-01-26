"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RightSidebar } from "@/components/ui/right-sidebar"

interface OverviewSidebarProps {
  className?: string
  isHistoryExpanded?: boolean
  onHistoryExpandToggle?: () => void
}

export function OverviewSidebar({
  className,
  isHistoryExpanded = false,
  onHistoryExpandToggle,
}: OverviewSidebarProps) {
  return (
    <RightSidebar className={className}>
      <div className="p-6 space-y-4 flex flex-col min-h-0">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-4 flex-shrink-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <span className="text-2xl font-bold">0</span>
                <span className="text-xs text-muted-foreground">
                  Active products
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <span className="text-2xl font-bold">0</span>
                <span className="text-xs text-muted-foreground">
                  Total categories
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="flex-1 min-h-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
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
      </div>
    </RightSidebar>
  )
} 