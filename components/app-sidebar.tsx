"use client"

import type * as React from "react"
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  Database,
  Upload,
} from "lucide-react"

import { NavMain } from "./nav-main"
import { NavProjects } from "./nav-projects"
import { NavDatabase } from "./nav-database"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "Sydney Fernandes",
    email: "sydneyfernandes@me.com",
    avatar: "app/public/user/sydneyfernandes/avatar.JPG",
  },
  teams: [
    {
      name: "Super Admin",
      logo: GalleryVerticalEnd,
      plan: "pro"
    },
    {
      name: "Super Products",
      logo: AudioWaveform,
      plan: "basic"
    },
    {
      name: "Super Collect",
      logo: Command,
      plan: "basic"
    },
  ],
  navMain: [
    {
      title: "Productos",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Ver todos",
          url: "#",
        },
        {
          title: "Novos productos",
          url: "#",
        },
        {
          title: "Removidos",
          url: "#",
        },
        {
          title: "Histórico",
          url: "#",
        },
      ],
    },
    {
      title: "Marcas",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Ver todas",
          url: "#",
        },
        {
          title: "Gerir",
          url: "#",
        },
      ],
    },
    {
      title: "Categorias",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Ver todas",
          url: "#",
        },
        {
          title: "Gerir",
          url: "#",
        },
        {
          title: "Archivo",
          url: "#",
        },
      ],
    },
    {
      title: "Supermercados",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "Ver todos",
          url: "#",
        },
        {
          title: "Gerir",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      name: "Supermercados",
      url: "#",
      icon: Frame,
    },
    {
      name: "Categorias",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Productos",
      url: "#",
      icon: Map,
    },
    {
        name: "Archivos",
        url: "#",
        icon: Map,
      },
  ],
  databases: [
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
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}  side="left">
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
        <NavDatabase databases={data.databases} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

