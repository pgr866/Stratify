import { AppSidebar } from "@/components/app-sidebar"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { DateTimeRangePicker } from "@/components/date-time-range-picker"
import { CandleChart } from "@/components/candle-chart"

export function Dashboard() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Building Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="fixed top-4 right-4">
            <ThemeToggle />
          </div>
          <DateTimeRangePicker></DateTimeRangePicker>
          <CandleChart></CandleChart>
          <h1>Taxing Laughter: The Joke Tax Chronicles</h1>
          <h2>Taxing Laughter: The Joke Tax Chronicles</h2>
          <h3>Taxing Laughter: The Joke Tax Chronicles</h3>
          <h4>Taxing Laughter: The Joke Tax Chronicles</h4>
          <blockquote>Taxing Laughter: The Joke Tax Chronicles</blockquote>
          <div className="my-6 w-full overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="m-0 border-t p-0 even:bg-muted">
                  <th className="table-head">
                    King's Treasury
                  </th>
                  <th className="table-head">
                    People's happiness
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="m-0 border-t p-0 even:bg-muted">
                  <td className="table-item">
                    Empty
                  </td>
                  <td className="table-item">
                    Overflowing
                  </td>
                </tr>
                <tr className="m-0 border-t p-0 even:bg-muted">
                  <td className="table-item">
                    Modest
                  </td>
                  <td className="table-item">
                    Satisfied
                  </td>
                </tr>
                <tr className="m-0 border-t p-0 even:bg-muted">
                  <td className="table-item">
                    Full
                  </td>
                  <td className="table-item">
                    Ecstatic
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <ul className="list">
            <li>1st level of puns: 5 gold coins</li>
            <li>2nd level of jokes: 10 gold coins</li>
            <li>3rd level of one-liners : 20 gold coins</li>
          </ul>
          <code>Taxing Laughter: The Joke Tax Chronicles</code>
          <p className="lead">Taxing Laughter: The Joke Tax Chronicles</p>
          <p className="large">Taxing Laughter: The Joke Tax Chronicles</p>
          <small>Taxing Laughter: The Joke Tax Chronicles</small>
          <p className="muted">Taxing Laughter: The Joke Tax Chronicles</p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
