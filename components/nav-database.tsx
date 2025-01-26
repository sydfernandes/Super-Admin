"use client"

import { LayoutGrid, type LucideIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

type DatabaseItem = {
  name: string
  url: string
  icon: LucideIcon
}

interface NavDatabaseProps {
  databases?: DatabaseItem[]
}

export function NavDatabase({ databases }: NavDatabaseProps) {
  const pathname = usePathname()

  const defaultItems: DatabaseItem[] = [
    {
      name: "Database",
      url: "/database",
      icon: LayoutGrid
    },
    {
      name: "Super Content",
      url: "/supercontent",
      icon: LayoutGrid
    }
  ]

  const items = databases || defaultItems

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + "/")
          return (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
} 