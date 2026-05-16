import { useMemo, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card"
import { Badge } from "../../components/ui/badge"
import { Input } from "../../components/ui/input"
import { Clock, Users, AlertTriangle, TrendingUp, Search, ArrowUpDown } from "lucide-react"
import { SHIFTS, calcLate, isShiftActive, resolveShift } from "../../lib/shifts"

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"

function deriveRowStatus(att, brk) {
  if (!att?.clock_in)   return "absent"
  if (att.clock_out)    return "checked_out"
  if (brk?.has_active_break) return "on_break"
  return "working"
}

const STATUS_META = {
  working:     { label: "Working",     color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  on_break:    { label: "On Break",    color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"   },
  checked_out: { label: "Checked Out", color: "text-slate-600",   bg: "bg-slate-100 border-slate-200"  },
  absent:      { label: "Absent",      color: "text-red-700",     bg: "bg-red-50 border-red-200"       },
}

// ── Sub-components ─────────────────────────────────────────────────────────

function KpiTile({ label, value, icon: Icon, iconColor, iconBg, sub }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <div className={`h-8 w-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-slate-900">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function ShiftTable({ rows, title, accent }) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState("name")
  const [sortDir, setSortDir] = useState("asc")

  const toggleSort = (k) => {
    if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(k); setSortDir("asc") }
  }

  const filtered = rows.filter(r =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.employee_id?.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortKey] ?? ""; const vb = b[sortKey] ?? ""
    if (typeof va === "number") return sortDir === "asc" ? va - vb : vb - va
    return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
  })

  const SortBtn = ({ k, children }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-slate-800 transition-colors">
      {children}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === k ? "text-slate-700" : "text-slate-300"}`} />
    </button>
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <span className={`text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${accent}`}>{title}</span>
            <span className="text-slate-400 font-normal text-sm">{filtered.length} employees</span>
          </CardTitle>
          <div className="relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-y border-slate-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <SortBtn k="employee_id">Emp ID</SortBtn>
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <SortBtn k="name">Name</SortBtn>
                </th>
                {title === "All Shifts" && (
                  <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Shift</th>
                )}
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Dept</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Check In</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <SortBtn k="lateByMins">Late By</SortBtn>
                </th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-slate-400 text-sm">No employees in this shift</td></tr>
              ) : sorted.map(row => {
                const statusMeta = STATUS_META[row.rowStatus] || STATUS_META.absent
                return (
                  <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{row.employee_id || "—"}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">{row.name}</td>
                    {title === "All Shifts" && (
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          row.shiftName === "UK Shift" ? "bg-blue-50 border-blue-200 text-blue-700" :
                          row.shiftName === "US Shift" ? "bg-violet-50 border-violet-200 text-violet-700" :
                          "bg-slate-50 border-slate-200 text-slate-600"
                        }`}>{row.shiftName || "—"}</span>
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-xs text-slate-500">{row.department || "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{fmtTime(row.clockIn)}</td>
                    <td className="px-4 py-2.5">
                      {row.lateByMins > 0 ? (
                        <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> {row.lateByLabel}
                        </span>
                      ) : row.clockIn ? (
                        <span className="text-[11px] font-semibold text-emerald-600">On Time</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusMeta.bg} ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
          <span className="text-[11px] text-slate-400">Showing {sorted.length} of {rows.length} employees</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ShiftMonitor({ employees, todayAll, breakSummary, departments = [], role = "manager", now = new Date() }) {

  // Build enriched rows
  const allRows = useMemo(() => {
    return employees.map(emp => {
      const att    = todayAll.find(a => a.user_id === emp.id)
      const brk    = breakSummary.find(b => b.user_id === emp.id)
      const shift  = resolveShift(emp.shift_timing)
      const { onTime, lateByMins, lateByLabel } = att?.clock_in
        ? calcLate(shift?.name, att.clock_in)
        : { onTime: true, lateByMins: 0, lateByLabel: "—" }

      return {
        id:           emp.id,
        employee_id:  emp.employee_id || "—",
        name:         emp.name,
        department:   emp.department || "—",
        department_id: emp.department_id,
        shiftName:    shift?.name || emp.shift_timing || "—",
        clockIn:      att?.clock_in,
        clockOut:     att?.clock_out,
        onTime,
        lateByMins,
        lateByLabel,
        rowStatus:    deriveRowStatus(att, brk),
      }
    })
  }, [employees, todayAll, breakSummary])

  // Partition by shift
  const ukRows  = allRows.filter(r => r.shiftName === "UK Shift")
  const usRows  = allRows.filter(r => r.shiftName === "US Shift")
  const stdRows = allRows.filter(r => r.shiftName !== "UK Shift" && r.shiftName !== "US Shift")
  const lateRows = allRows.filter(r => r.lateByMins > 0)

  const ukActive  = isShiftActive("UK Shift", now)
  const usActive  = isShiftActive("US Shift", now)

  const ukPresent  = ukRows.filter(r => r.clockIn).length
  const usPresent  = usRows.filter(r => r.clockIn).length
  const lateCount  = lateRows.length
  const totalStaff = allRows.length

  // Department analytics (director only)
  const deptAnalytics = useMemo(() => {
    if (role !== "director") return []
    return departments.map(dept => {
      const dRows = allRows.filter(r => r.department_id === dept.id)
      const uk    = dRows.filter(r => r.shiftName === "UK Shift")
      const us    = dRows.filter(r => r.shiftName === "US Shift")
      const late  = dRows.filter(r => r.lateByMins > 0)
      return {
        name:      dept.name,
        total:     dRows.length,
        ukCount:   uk.length,
        usCount:   us.length,
        lateCount: late.length,
        presentCount: dRows.filter(r => r.clockIn).length,
      }
    }).filter(d => d.total > 0)
  }, [allRows, departments, role])

  return (
    <div className="space-y-5">
      {/* ── KPI Tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile
          label="UK Shift Active"
          value={ukPresent}
          icon={Clock}
          iconColor={ukActive ? "text-blue-600" : "text-slate-400"}
          iconBg={ukActive ? "bg-blue-50" : "bg-slate-100"}
          sub={ukActive ? `${ukRows.length} assigned · Shift active` : `${ukRows.length} assigned · Shift pending`}
        />
        <KpiTile
          label="US Shift Active"
          value={usPresent}
          icon={Clock}
          iconColor={usActive ? "text-violet-600" : "text-slate-400"}
          iconBg={usActive ? "bg-violet-50" : "bg-slate-100"}
          sub={usActive ? `${usRows.length} assigned · Shift active` : `${usRows.length} assigned · Shift pending`}
        />
        <KpiTile
          label="Late Check-ins"
          value={lateCount}
          icon={AlertTriangle}
          iconColor={lateCount > 0 ? "text-red-600" : "text-slate-400"}
          iconBg={lateCount > 0 ? "bg-red-50" : "bg-slate-100"}
          sub={lateCount > 0 ? "Employees past grace period" : "No late check-ins today"}
        />
        <KpiTile
          label="Total Workforce"
          value={totalStaff}
          icon={Users}
          iconColor="text-slate-600"
          iconBg="bg-slate-100"
          sub={`${allRows.filter(r => r.clockIn).length} checked in today`}
        />
      </div>

      {/* ── Department Analytics (Director only) ── */}
      {role === "director" && deptAnalytics.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              Department Shift Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-y border-slate-100">
                  <tr>
                    {["Department", "Total", "UK Shift", "US Shift", "Late Today", "Present", "Coverage"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {deptAnalytics.map(d => {
                    const coveragePct = d.total > 0 ? Math.round((d.presentCount / d.total) * 100) : 0
                    return (
                      <tr key={d.name} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{d.name}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">{d.total}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">{d.ukCount}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">{d.usCount}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {d.lateCount > 0
                            ? <span className="text-[11px] font-semibold text-red-600">{d.lateCount} late</span>
                            : <span className="text-[11px] text-emerald-600 font-semibold">None</span>}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">{d.presentCount}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${coveragePct >= 80 ? "bg-emerald-500" : coveragePct >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${coveragePct}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-slate-500 tabular-nums">{coveragePct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Late Check-ins Alert Table ── */}
      {lateRows.length > 0 && (
        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Late Check-ins Today ({lateRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-red-50/60 border-y border-red-100">
                <tr>
                  {["Emp ID", "Name", "Shift", "Dept", "Check In", "Late By"].map(h => (
                    <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-red-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {lateRows.sort((a, b) => b.lateByMins - a.lateByMins).map(r => (
                  <tr key={r.id} className="hover:bg-red-50/40">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.employee_id}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{r.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        r.shiftName === "UK Shift" ? "bg-blue-50 border-blue-200 text-blue-700" :
                        r.shiftName === "US Shift" ? "bg-violet-50 border-violet-200 text-violet-700" :
                        "bg-slate-50 border-slate-200 text-slate-600"
                      }`}>{r.shiftName}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.department}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{fmtTime(r.clockIn)}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-red-600 text-[12px]">{r.lateByLabel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ── Shift Tables ── */}
      {(ukRows.length > 0 || role === "director") && (
        <ShiftTable
          rows={ukRows}
          title="UK Shift"
          accent="bg-blue-50 border-blue-200 text-blue-700"
        />
      )}
      {(usRows.length > 0 || role === "director") && (
        <ShiftTable
          rows={usRows}
          title="US Shift"
          accent="bg-violet-50 border-violet-200 text-violet-700"
        />
      )}
      {stdRows.length > 0 && (
        <ShiftTable
          rows={stdRows}
          title="Standard / Other"
          accent="bg-slate-100 border-slate-200 text-slate-600"
        />
      )}
      {role === "director" && allRows.length > 0 && (
        <ShiftTable
          rows={allRows}
          title="All Shifts"
          accent="bg-slate-900 border-slate-700 text-white"
        />
      )}
    </div>
  )
}
