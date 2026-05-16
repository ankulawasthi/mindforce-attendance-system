import { useState, useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../components/ui/table"
import { Badge } from "../../components/ui/badge"
import {
  Users, Coffee, FileText, AlertCircle, Download, RefreshCw,
  Search, Filter, CheckCircle, Clock, TrendingUp, ArrowUpDown,
  UserCheck, AlertTriangle, Activity
} from "lucide-react"
import { OccupancyWidget } from "../../components/dashboard/OccupancyWidget"

const fmtHMS = (secs) => {
  if (!secs || secs <= 0) return "—"
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
}

const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"

// Derive live status for an employee row
function deriveStatus(att, brk, now) {
  if (!att?.clock_in) return "absent"
  if (att.clock_out)  return "checked_out"
  if (brk?.has_active_break) return "on_break"
  // Late: check-in after 09:30
  const ci = new Date(att.clock_in)
  const cutoff = new Date(ci); cutoff.setHours(9, 30, 0, 0)
  if (ci > cutoff) return "late"
  return "working"
}

const STATUS_META = {
  working:     { label: "Working",     variant: "success",     dot: "bg-emerald-500" },
  on_break:    { label: "On Break",    variant: "warning",     dot: "bg-amber-400" },
  late:        { label: "Late",        variant: "destructive", dot: "bg-red-500" },
  checked_out: { label: "Checked Out", variant: "secondary",   dot: "bg-slate-400" },
  absent:      { label: "Absent",      variant: "outline",     dot: "bg-slate-200" },
}

export function WorkforceMonitor({ employees, todayAll, breakSummary, teamLeaves, history, now, onExport, onRefresh, onApproveLeave, onRejectLeave }) {
  const [search, setSearch]           = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortKey, setSortKey]         = useState("name")
  const [sortDir, setSortDir]         = useState("asc")
  const [exportLoading, setExportLoading] = useState(false)

  // Build enriched rows
  const rows = useMemo(() => {
    return employees.map(emp => {
      const att = todayAll.find(a => a.user_id === emp.id)
      const brk = breakSummary.find(b => b.user_id === emp.id)
      const status = deriveStatus(att, brk, now)

      // Working seconds
      let workSecs = 0
      if (att?.clock_in) {
        const end = att.clock_out ? new Date(att.clock_out) : now
        workSecs = Math.max(0, Math.floor((end - new Date(att.clock_in)) / 1000))
      }

      // Break seconds
      const breakMins = brk?.total_break_mins || 0
      const breakSecs = breakMins * 60

      // Productivity = work - break
      const productivitySecs = Math.max(0, workSecs - breakSecs)

      return {
        id: emp.id,
        employee_id: emp.employee_id || "—",
        name: emp.name,
        department: emp.department || "—",
        clockIn: att?.clock_in,
        clockOut: att?.clock_out,
        workSecs,
        breakSecs,
        productivitySecs,
        status,
        brk,
      }
    })
  }, [employees, todayAll, breakSummary, now])

  // Filter + search
  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchSearch = search === "" || r.name.toLowerCase().includes(search.toLowerCase()) || r.employee_id.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || r.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [rows, search, statusFilter])

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va = a[sortKey] ?? ""
      let vb = b[sortKey] ?? ""
      if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va
      return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }, [filtered, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
  }

  // KPI counts
  const workingCount    = rows.filter(r => r.status === "working").length
  const onBreakCount    = rows.filter(r => r.status === "on_break").length
  const lateCount       = rows.filter(r => r.status === "late").length
  const absentCount     = rows.filter(r => r.status === "absent").length
  const checkedOutCount = rows.filter(r => r.status === "checked_out").length
  const presentCount    = rows.filter(r => r.status !== "absent").length

  // Avg productivity %
  const activeProd = rows.filter(r => r.workSecs > 0)
  const avgProdPct = activeProd.length
    ? Math.round(activeProd.reduce((s, r) => s + (r.workSecs > 0 ? (r.productivitySecs / r.workSecs) * 100 : 0), 0) / activeProd.length)
    : 0

  // Attendance trend from history (last 7 days)
  const trendData = useMemo(() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString("en-IN", { weekday: "short" })
      const count = history.filter(h => h.date === key).length
      days.push({ label, count })
    }
    return days
  }, [history])

  // Alerts
  const alerts = useMemo(() => {
    const list = []
    rows.filter(r => r.status === "absent").slice(0, 3).forEach(r =>
      list.push({ type: "absent", msg: `${r.name} has not checked in today` })
    )
    rows.filter(r => r.status === "late").forEach(r =>
      list.push({ type: "late", msg: `${r.name} checked in late` })
    )
    if (breakSummary.some(b => b.flagged)) {
      breakSummary.filter(b => b.flagged).forEach(b =>
        list.push({ type: "break", msg: `${b.user_name} exceeded break limit (${b.total_break_mins} mins)` })
      )
    }
    return list.slice(0, 5)
  }, [rows, breakSummary])

  const handleExport = async () => {
    setExportLoading(true)
    await onExport()
    setExportLoading(false)
  }

  const SortButton = ({ k, children }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-slate-800 transition-colors">
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "text-slate-700" : "text-slate-300"}`} />
    </button>
  )

  return (
    <div className="space-y-5">

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Present",     value: presentCount,    icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Working",     value: workingCount,    icon: Activity,  color: "text-blue-600",    bg: "bg-blue-50"    },
          { label: "On Break",    value: onBreakCount,    icon: Coffee,    color: "text-amber-600",   bg: "bg-amber-50"   },
          { label: "Late",        value: lateCount,       icon: Clock,     color: "text-red-600",     bg: "bg-red-50"     },
          { label: "Absent",      value: absentCount,     icon: AlertCircle, color: "text-slate-500", bg: "bg-slate-100"  },
          { label: "Avg Productivity", value: `${avgProdPct}%`, icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <div className={`h-7 w-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
              </div>
              <p className="text-xl font-bold font-mono text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Main content: table + side panels ── */}
      <div className="grid gap-5 lg:grid-cols-4">

        {/* Live Workforce Table (3 cols wide) */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Workforce — {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={onRefresh} className="h-8 gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </Button>
                  <Button size="sm" onClick={handleExport} disabled={exportLoading} className="h-8 gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    {exportLoading ? "Exporting…" : "Export CSV"}
                  </Button>
                </div>
              </div>

              {/* Filters row */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search employee…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  {["all", "working", "on_break", "late", "checked_out", "absent"].map(s => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                        statusFilter === s
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {s === "all" ? "All" : STATUS_META[s]?.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-y border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <SortButton k="employee_id">Emp ID</SortButton>
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <SortButton k="name">Name</SortButton>
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Check In</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Check Out</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <SortButton k="breakSecs">Break</SortButton>
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <SortButton k="workSecs">Working</SortButton>
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <SortButton k="productivitySecs">Productivity</SortButton>
                      </th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {sorted.map(row => {
                      const meta = STATUS_META[row.status] || STATUS_META.absent
                      const prodPct = row.workSecs > 0 ? Math.round((row.productivitySecs / row.workSecs) * 100) : 0
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{row.employee_id}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">{row.name}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{fmtTime(row.clockIn)}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{fmtTime(row.clockOut)}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{fmtHMS(row.breakSecs)}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-mono text-xs font-semibold text-slate-800">{fmtHMS(row.workSecs)}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${prodPct >= 70 ? "bg-emerald-500" : prodPct >= 40 ? "bg-amber-400" : "bg-slate-300"}`}
                                  style={{ width: `${prodPct}%` }} />
                              </div>
                              <span className="text-[11px] text-slate-500 tabular-nums w-8">{prodPct > 0 ? `${prodPct}%` : "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} shrink-0`} />
                              <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {sorted.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center text-slate-400 text-sm py-10">No employees match the current filter</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Showing {sorted.length} of {rows.length} employees
                </span>
                <span className="text-[11px] text-slate-400">
                  Updated {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panels */}
        <div className="space-y-5">

          {/* Pending Approvals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Pending Approvals</span>
                {teamLeaves.length > 0 && (
                  <span className="text-[11px] font-bold bg-red-100 text-red-700 rounded-full px-2 py-0.5">{teamLeaves.length}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {teamLeaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <CheckCircle className="h-8 w-8 mb-2 text-emerald-400" />
                  <p className="text-[12px] font-medium">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {teamLeaves.slice(0, 4).map(l => (
                    <div key={l.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="text-[13px] font-semibold text-slate-900">{l.user_name || "—"}</p>
                          <p className="text-[11px] text-slate-400 capitalize">{l.leave_type} · {l.leave_slot?.replace("_", " ")}</p>
                          <p className="text-[11px] text-slate-400">{l.from_date} {l.to_date && l.to_date !== l.from_date ? `→ ${l.to_date}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => onApproveLeave(l.id)}
                          className="flex-1 rounded-md bg-emerald-600 text-white text-[11px] font-semibold py-1 hover:bg-emerald-700 transition-colors">
                          Approve
                        </button>
                        <button onClick={() => onRejectLeave(l.id)}
                          className="flex-1 rounded-md border border-slate-200 text-slate-600 text-[11px] font-semibold py-1 hover:bg-slate-50 transition-colors">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                  {teamLeaves.length > 4 && (
                    <p className="text-center text-[11px] text-slate-400 py-2">+{teamLeaves.length - 4} more in Leave Tracker</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-4 w-4" />
                  Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {alerts.map((a, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-4 py-2.5">
                      <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${a.type === "absent" ? "bg-slate-400" : a.type === "late" ? "bg-red-500" : "bg-amber-500"}`} />
                      <p className="text-[12px] text-slate-700">{a.msg}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <OccupancyWidget />

        </div>
      </div>

      {/* ── Analytics Row ── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Attendance Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>7-Day Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trendData} barCategoryGap="35%">
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e293b" stopOpacity={1} />
                    <stop offset="100%" stopColor="#475569" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)", fontSize: 12 }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar dataKey="count" name="Present" fill="url(#trendGrad)" radius={[3, 3, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Productivity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Team Productivity Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {rows.filter(r => r.workSecs > 0).slice(0, 6).map(r => {
                const pct = r.workSecs > 0 ? Math.round((r.productivitySecs / r.workSecs) * 100) : 0
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    <span className="text-[12px] font-medium text-slate-700 w-24 truncate shrink-0">{r.name.split(" ")[0]}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 tabular-nums w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
              {rows.filter(r => r.workSecs > 0).length === 0 && (
                <p className="text-[13px] text-slate-400 text-center py-6">No active sessions yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
