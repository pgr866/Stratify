import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TeamSwitcher from "@/components/team-switcher"
import { UserNav } from "@/components/user-nav"
import { Input } from "@/components/ui/input"
import { Dashboard } from "@/components/dashboard"
import { Settings } from "@/components/settings"

export function Portal() {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarInset style={{ margin: '0' }}>
        <Tabs defaultValue="dashboard">
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="flex-col flex">
              <div className="border-b">
                <div className="flex h-auto items-center space-y-2 sm:space-y-auto flex-wrap">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" style={{ marginTop: '0' }} />
                  <TeamSwitcher />
                  <TabsList className="bg-transparent sm:ml-4" style={{ marginTop: '0' }}>
                    <TabsTrigger className="px-2 md:px-3" value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger className="px-2 md:px-3" value="customers">Customers</TabsTrigger>
                    <TabsTrigger className="px-2 md:px-3" value="products">Products</TabsTrigger>
                    <TabsTrigger className="px-2 md:px-3" value="settings">Settings</TabsTrigger>
                  </TabsList>
                  <div className="flex md:ml-auto items-center space-x-4 pb-2">
                    <Input
                      type="search"
                      placeholder="Search..."
                      className="sm:w-[150px] lg:w-[300px]"
                    />
                    <UserNav />
                  </div>
                </div>
              </div>
              <TabsContent value="dashboard" className="space-y-4">
                <Dashboard />
              </TabsContent>
              <TabsContent value="customers" className="space-y-4">
              </TabsContent>
              <TabsContent value="products" className="space-y-4">
              </TabsContent>
              <TabsContent value="settings" className="space-y-4">
                <Settings />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </SidebarInset>
    </SidebarProvider>
  )
}
