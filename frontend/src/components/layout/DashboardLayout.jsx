import { Sidebar } from "./Sidebar"
import { Header } from "./Header"

export function DashboardLayout({ children, navigation, activeTab, onTabChange, attendanceConfig }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100/60">
      <Sidebar navigation={navigation} activeTab={activeTab} onTabChange={onTabChange} attendanceConfig={attendanceConfig} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-100/60">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
