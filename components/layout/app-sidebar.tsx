import { Sparkles, Database, Wand2 } from "lucide-react"
import Link from "next/link"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-violet-200 bg-gradient-to-b from-violet-50 via-purple-50 to-pink-50"
    >
      <SidebarHeader className="border-b border-violet-200 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-500 text-white shadow-lg">
            <Database className="h-5 w-5" />
          </div>

          <div className="group-data-[collapsible=icon]:hidden">
            <h2 className="text-lg font-bold text-violet-900">
              SchemaCraft AI
            </h2>
            <p className="text-xs text-violet-500">
              AI Database Designer
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-500">
            Workspace
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link href="/dashboard" />}
                  isActive
                  tooltip="Generator"
                  className="rounded-xl py-6 transition-all hover:bg-violet-100 data-[active=true]:bg-gradient-to-r data-[active=true]:from-violet-600 data-[active=true]:to-purple-500 data-[active=true]:text-white data-[active=true]:shadow-lg"
                >
                  <Wand2 className="h-5 w-5" />
                  <span className="font-medium">AI Generator</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto px-2 pt-8 group-data-[collapsible=icon]:hidden">
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 p-4 text-white shadow-xl">
            <Sparkles className="mb-2 h-6 w-6" />

            <h3 className="text-sm font-semibold">
              Build Faster
            </h3>

            <p className="mt-1 text-xs text-violet-100">
              Generate SQL schemas, Drizzle ORM models and ER diagrams in
              seconds using AI.
            </p>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}