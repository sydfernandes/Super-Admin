import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function UploadsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 bg-background border-b flex items-center px-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <h1 className="text-xl font-semibold">Uploads</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button className="gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload New
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>File Management</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters and Search */}
            <div className="mb-6 flex gap-4">
              <div className="flex-1">
                <Input type="text" placeholder="Search files..." />
              </div>
              <Select>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="File Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Files Table */}
            <div className="rounded-md border">
              <div className="p-4 border-b flex items-center justify-between text-sm font-medium text-muted-foreground">
                <div className="flex-1">Name</div>
                <div className="w-32 text-right">Size</div>
                <div className="w-40">Upload Date</div>
                <div className="w-20">Actions</div>
              </div>
              
              <div className="p-4 text-sm text-muted-foreground">
                No files uploaded yet.
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 