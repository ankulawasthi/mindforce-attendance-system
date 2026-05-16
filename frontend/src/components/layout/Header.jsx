import { useAuth } from "../../context/AuthContext"
import { LogOut } from "lucide-react"

export function Header({ attendanceConfig }) {
  const { user, logout } = useAuth()

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "?"

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 z-10 shrink-0">
      {/* Left: page context + attendance controls */}
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">Dashboard</h2>
        <span className="text-slate-300">·</span>
        <span className="text-[13px] text-slate-400 font-medium capitalize">{user?.role}</span>

        {/* Attendance Controls */}
        {attendanceConfig && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <div className="flex items-center gap-3">
              {/* Status dot */}
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${attendanceConfig.checkedOut ? 'bg-slate-400' :
                  attendanceConfig.activeBreak ? 'bg-amber-400' :
                    attendanceConfig.checkedIn ? 'bg-emerald-500' : 'bg-slate-300'
                  }`} />
                <span className="text-[12px] text-slate-500 font-medium">
                  {attendanceConfig.checkedOut ? 'Session ended' :
                    attendanceConfig.activeBreak ? 'On break' :
                      attendanceConfig.checkedIn ? 'Active' : 'Not checked in'}
                </span>
              </div>

              {/* Work timer */}
              {attendanceConfig.checkedIn && (
                <span className="font-mono text-[13px] font-semibold text-slate-700 tabular-nums bg-slate-100 px-2 py-0.5 rounded">
                  {attendanceConfig.workTime}
                </span>
              )}

              {/* Punch In button */}
              {!attendanceConfig.checkedIn && (
                <button
                  onClick={attendanceConfig.onCheckIn}
                  disabled={attendanceConfig.loading}
                  className="rounded-md bg-slate-900 px-3 py-1 text-[12px] font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors">
                  Punch In
                </button>
              )}

              {/* Punch Out button */}
              {attendanceConfig.checkedIn && !attendanceConfig.checkedOut && !attendanceConfig.activeBreak && (
                <button
                  onClick={attendanceConfig.onCheckOut}
                  disabled={attendanceConfig.loading}
                  className="rounded-md border border-slate-200 px-3 py-1 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                  Punch Out
                </button>
              )}

              {/* Done */}
              {attendanceConfig.checkedIn && attendanceConfig.checkedOut && (
                <span className="text-[12px] font-semibold text-emerald-600">Out for today</span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: user + logout */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-[13px] font-semibold text-slate-800 leading-tight">{user?.name}</p>
            <p className="text-[11px] text-slate-400 font-medium">{user?.department || user?.role}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-[12px] font-bold ring-2 ring-white shadow-sm shrink-0">
            {initials}
          </div>
        </div>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <button
          onClick={logout}
          className="flex items-center justify-center h-8 w-8 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Sign out">
          <LogOut className="h-[15px] w-[15px]" />
        </button>
      </div>
    </header>
  )
}