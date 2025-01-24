"use client"

import { Database, Upload } from "lucide-react"
import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface DatabaseItem {
  name: string
  url: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavDatabaseProps {
  databases: DatabaseItem[]
}

const defaultDatabases = [
  {
    name: "View Database",
    url: "/database",
    icon: Database,
  },
  {
    name: "Adicionar Archivos",
    url: "/database/upload",
    icon: Upload,
  },
]

export function NavDatabase({ databases = defaultDatabases }: NavDatabaseProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Database</SidebarGroupLabel>
      <SidebarMenu>
        {databases.map((item) => (
          <SidebarMenuItem key={item.url}>
            <SidebarMenuButton asChild>
              <Link href={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
} 