import { cn } from "../../lib/utils"
import { Button } from "../ui/button"

export function Sidebar({ navigation, activeTab, onTabChange, attendanceConfig }) {
  return (
    <div className="flex w-60 flex-col border-r border-slate-200 bg-white z-20 shrink-0">
      {/* Brand */}
      <div className="flex h-14 items-center px-5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <img
            src="https://www.mindforceresearch.com/images/logo.png"
            alt="Mindforce Research"
            className="h-8 w-auto object-contain"
          />

          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold tracking-tight text-slate-900">
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Navigation</p>
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.key
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={cn(
                "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all duration-150 mb-0.5",
                isActive
                  ? "bg-slate-900 text-white shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Attendance Widget */}
      {
        attendanceConfig && (() => {
          const timeStr = attendanceConfig.workTime || "00:00:00"
          const [h, m, s] = timeStr.split(":")

          let statusLabel = "Not checked in"
          let statusDot = "bg-slate-300"
          if (attendanceConfig.checkedOut) {
            statusLabel = "Session ended"
            statusDot = "bg-slate-400"
          } else if (attendanceConfig.activeBreak) {
            statusLabel = "On break"
            statusDot = "bg-amber-400"
          } else if (attendanceConfig.checkedIn) {
            statusLabel = "Active"
            statusDot = "bg-emerald-500"
          }

          return (
            <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50/80">
              {/* Status row */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-block w-2 h-2 rounded-full ${statusDot} shrink-0`} />
                <span className="text-[12px] font-semibold text-slate-600">{statusLabel}</span>
              </div>

              {/* Timer */}
              <div className="flex items-center gap-1 font-mono text-[22px] font-semibold text-slate-900 tracking-tight mb-4">
                <span>{h}</span>
                <span className="text-slate-300 mb-px">:</span>
                <span>{m}</span>
                <span className="text-slate-300 mb-px">:</span>
                <span>{s}</span>
              </div>

              {/* Action */}
              <div className="w-full">
                {!attendanceConfig.checkedIn ? (
                  <Button
                    onClick={attendanceConfig.onCheckIn}
                    disabled={attendanceConfig.loading}
                    className="w-full h-9 text-[13px]"
                  >
                    Punch In
                  </Button>
                ) : !attendanceConfig.checkedOut ? (
                  <Button
                    onClick={attendanceConfig.onCheckOut}
                    disabled={attendanceConfig.loading || attendanceConfig.activeBreak}
                    variant="outline"
                    className="w-full h-9 text-[13px]"
                  >
                    Punch Out
                  </Button>
                ) : (
                  <div className="w-full h-9 flex items-center justify-center rounded-md bg-slate-100 text-[12px] font-medium text-slate-400">
                    Out

                  </div>
                )}
              </div>
            </div>
          )
        })()
      }
    </div >
  )
}
