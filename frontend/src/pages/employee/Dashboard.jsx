import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import api from "../../api/axios"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { DashboardLayout } from "../../components/layout/DashboardLayout"
import { ProfileView } from "../../components/profile/ProfileView"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../components/ui/table"
import { Badge } from "../../components/ui/badge"
import { Home, Calendar, Building, FileText, Clock, Download, CheckCircle, AlertCircle, Coffee, UserCheck, Activity, Monitor, Zap, Timer, User } from "lucide-react"
import { MeetingScheduler } from "../shared/MeetingScheduler"
import { OccupancyWidget } from "../../components/dashboard/OccupancyWidget"

const NAV_LINKS = [
  { key: "overview", label: "Home", icon: Home },
  { key: "profile", label: "My Profile", icon: User },
  { key: "history", label: "Attendance", icon: Calendar },
  { key: "breaks", label: "Break Tracker", icon: Clock },
  { key: "leaves", label: "Leave Tracker", icon: FileText },
  { key: "bookings", label: "Meeting Rooms", icon: Building },
]

const BREAK_OPTIONS = [
  { value: "lunch", label: "Lunch / Dinner Break" },
  { value: "short", label: "Short Break / Personal" },
  { value: "personal", label: "Bio Break / Personal" },
  { value: "training", label: "Training Break" },
  { value: "meeting", label: "Meeting Break" },
  { value: "application_issue", label: "Application Issue" },
  { value: "system_issue", label: "System Issue" },
  { value: "townhall", label: "Townhall / Fun Activity" },
  { value: "team_party", label: "Team Party" },
  { value: "client_call", label: "Client Call" },
  { value: "knowledge_session", label: "Knowledge Session" },
  { value: "hr_discussion", label: "HR Discussion" },
  { value: "technical_support", label: "Technical Support" },
  { value: "internet_power_issue", label: "Internet / Power Issue" },
]

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  const [attendance, setAttendance] = useState(null)
  const [breaks, setBreaks] = useState([])
  const [activeBreak, setActiveBreak] = useState(null)
  const [history, setHistory] = useState([])
  const [leaves, setLeaves] = useState([])
  const [rooms, setRooms] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [now, setNow] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "success" })
  const [leaveForm, setLeaveForm] = useState({ leave_type: "sick", leave_slot: "full_day", from_date: "", to_date: "", reason: "" })
  const [bookingForm, setBookingForm] = useState({ meeting_room_id: "", title: "", date: "", start_time: "", end_time: "", notes: "" })
  const [breakForm, setBreakForm] = useState({ break_type: "lunch", reason: "" })

  // Productivity tracking
  const [sessionStart] = useState(new Date())
  const [idleSeconds, setIdleSeconds] = useState(0)
  const [isIdle, setIsIdle] = useState(false)
  const IDLE_THRESHOLD = 120

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Idle detection
  useEffect(() => {
    let idleCount = 0
    const tick = setInterval(() => {
      idleCount++
      if (idleCount >= IDLE_THRESHOLD) {
        setIsIdle(true)
        setIdleSeconds(prev => prev + 1)
      }
    }, 1000)
    const resetIdle = () => { setIsIdle(false); idleCount = 0 }
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"]
    events.forEach(e => window.addEventListener(e, resetIdle))
    return () => {
      clearInterval(tick)
      events.forEach(e => window.removeEventListener(e, resetIdle))
    }
  }, [])

  useEffect(() => {
    fetchToday(); fetchHistory(); fetchLeaves(); fetchRooms()
  }, [])

  const showMsg = (text, type = "success") => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: "", type: "success" }), 4000)
  }

  const fetchToday = async () => {
    try {
      const res = await api.get("/attendances/today")
      const mine = res.data.find(a => a.user_id === user.id)
      setAttendance(mine || null)
      if (mine) fetchBreaks(mine.id)
    } catch (err) { console.error(err) }
  }

  const fetchBreaks = async (attendanceId) => {
    try {
      const res = await api.get(`/breaks?attendance_id=${attendanceId}`)
      setBreaks(res.data)
      setActiveBreak(res.data.find(b => b.is_active) || null)
    } catch (err) { console.error(err) }
  }

  const fetchHistory = async () => {
    try {
      const res = await api.get("/attendances")
      setHistory(res.data.slice(0, 30))
    } catch (err) { console.error(err) }
  }

  const fetchLeaves = async () => {
    try {
      const res = await api.get("/leave_requests")
      setLeaves(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchRooms = async () => {
    try {
      const [roomsRes, bookingsRes] = await Promise.all([
        api.get("/meeting_rooms"),
        api.get("/room_bookings")
      ])
      setRooms(roomsRes.data)
      setMyBookings(bookingsRes.data)
    } catch (err) { console.error(err) }
  }

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      const res = await api.post("/attendances/clock_in")
      setAttendance(res.data)
      await fetchToday()
      showMsg("✅ Checked in successfully!")
    } catch (err) { showMsg(err.response?.data?.error || "Error", "error") }
    finally { setLoading(false) }
  }

  const handleCheckOut = async () => {
    if (activeBreak) return showMsg("Please end your break before checking out", "error")
    setLoading(true)
    try {
      const res = await api.post("/attendances/clock_out", { idle_seconds: idleSeconds })
      setAttendance(res.data)
      showMsg(res.data.message || "✅ Checked out successfully!")
    } catch (err) { showMsg(err.response?.data?.error || "Error", "error") }
    finally { setLoading(false) }
  }

  const startBreak = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post("/breaks", { break_type: breakForm.break_type })
      setActiveBreak(res.data)
      setBreaks(prev => [...prev, res.data])
      showMsg("✅ Break started!")
    } catch (err) { showMsg(err.response?.data?.error || "Error", "error") }
    finally { setLoading(false) }
  }

  const endBreak = async () => {
    if (!activeBreak) return
    setLoading(true)
    try {
      const res = await api.patch(`/breaks/${activeBreak.id}`)
      setActiveBreak(null)
      if (attendance) fetchBreaks(attendance.id)
      showMsg(`✅ Break ended — ${res.data.duration_mins} mins`)
    } catch (err) { showMsg(err.response?.data?.error || "Error", "error") }
    finally { setLoading(false) }
  }

  const submitLeave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = leaveForm.leave_slot === "full_day"
        ? leaveForm : { ...leaveForm, to_date: leaveForm.from_date }
      await api.post("/leave_requests", { leave_request: payload })
      await fetchLeaves()
      setLeaveForm({ leave_type: "sick", leave_slot: "full_day", from_date: "", to_date: "", reason: "" })
      showMsg("✅ Leave requested successfully!")
    } catch (err) { showMsg(err.response?.data?.errors?.join(", ") || "Error", "error") }
    finally { setLoading(false) }
  }

  const submitBooking = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const start = new Date(`${bookingForm.date}T${bookingForm.start_time}`)
      const end = new Date(`${bookingForm.date}T${bookingForm.end_time}`)
      await api.post("/room_bookings", {
        room_booking: {
          ...bookingForm,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
        }
      })
      await fetchRooms()
      setBookingForm({ meeting_room_id: "", title: "", date: "", start_time: "", end_time: "", notes: "" })
      showMsg("✅ Room booked successfully!")
    } catch (err) { showMsg(err.response?.data?.errors?.join(", ") || "Error", "error") }
    finally { setLoading(false) }
  }

  const exportAttendance = async () => {
    try {
      const res = await api.get("/attendances/export", { responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement("a")
      a.href = url
      a.download = `my_attendance_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
    } catch (err) { showMsg("Failed to export", "error") }
  }

  // Computed
  const checkedIn = !!attendance?.clock_in
  const checkedOut = !!attendance?.clock_out

  const activeSeconds = activeBreak ? Math.floor((now - new Date(activeBreak.break_start)) / 1000) : 0
  const activeDurationMins = Math.floor(activeSeconds / 60)
  const totalBreakMin = breaks.reduce((sum, b) => sum + (b.duration_mins || 0), 0) + activeDurationMins

  const formatHMS = (secs) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // Work seconds
  let workSeconds = 0
  if (attendance?.clock_in) {
    const end = attendance.clock_out ? new Date(attendance.clock_out) : now
    const gross = Math.max(0, Math.floor((end - new Date(attendance.clock_in)) / 1000))
    let breakSecs = 0
    breaks.forEach(b => {
      const bStart = new Date(b.break_start)
      const bEnd = b.break_end ? new Date(b.break_end) : end
      if (bEnd > bStart) breakSecs += Math.floor((bEnd - bStart) / 1000)
    })
    workSeconds = gross
  }

  // Productivity
  const screenTimeSeconds = Math.floor((now - sessionStart) / 1000)
  const productivitySeconds = Math.max(0, workSeconds - idleSeconds)
  const productivityPct = workSeconds > 0 ? Math.round((productivitySeconds / workSeconds) * 100) : 0

  const thisWeekHrs = history.slice(0, 5).reduce((s, a) => s + (parseFloat(a.total_hours) || 0), 0).toFixed(1)
  const thisMonthHrs = history.slice(0, 22).reduce((s, a) => s + (parseFloat(a.total_hours) || 0), 0).toFixed(1)

  const chartData = history.slice(0, 7).reverse().map(a => ({
    date: a.date?.slice(5),
    hours: parseFloat(a.total_hours) || 0,
  }))

  const pendingLeaves = leaves.filter(l => l.status === "pending").length
  const todayBookings = myBookings.filter(b => b.date === new Date().toISOString().slice(0, 10)).length

  const recentActivities = []
  if (attendance?.clock_in) recentActivities.push({ type: "in", action: "Clocked in", time: new Date(attendance.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), ts: new Date(attendance.clock_in).getTime() })
  if (attendance?.clock_out) recentActivities.push({ type: "out", action: "Clocked out", time: new Date(attendance.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), ts: new Date(attendance.clock_out).getTime() })
  breaks.forEach(b => {
    const name = b.break_type?.replace(/_/g, " ") || "Break"
    recentActivities.push({ type: "break", action: `Started ${name}`, time: new Date(b.break_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), ts: new Date(b.break_start).getTime() })
    if (b.break_end) recentActivities.push({ type: "break_end", action: `Ended ${name}`, time: new Date(b.break_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), ts: new Date(b.break_end).getTime() })
  })
  recentActivities.sort((a, b) => b.ts - a.ts)

  return (
    <DashboardLayout 
      navigation={NAV_LINKS} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      attendanceConfig={{
        checkedIn,
        checkedOut,
        activeBreak,
        workTime: formatHMS(workSeconds),
        loading,
        onCheckIn: handleCheckIn,
        onCheckOut: handleCheckOut,
      }}
    >
      <div className="space-y-6">

        {/* Toast */}
        {message.text && (
          <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-[13px] font-medium ${
            message.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
            {message.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Today's Hours",   value: formatHMS(workSeconds),  icon: Clock,     accent: "text-blue-600",    bg: "bg-blue-50" },
                { label: "Breaks Taken",    value: breaks.length,           icon: Coffee,    accent: "text-amber-600",   bg: "bg-amber-50" },
                { label: "Pending Leaves",  value: pendingLeaves,           icon: FileText,  accent: "text-violet-600",  bg: "bg-violet-50" },
                { label: "Today's Bookings",value: todayBookings,           icon: Building,  accent: "text-emerald-600", bg: "bg-emerald-50" },
              ].map(({ label, value, icon: Icon, accent, bg }) => (
                <Card key={label}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                        <Icon className={`h-4 w-4 ${accent}`} />
                      </div>
                    </div>
                    <p className="text-2xl font-bold font-mono tracking-tight text-slate-900">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Productivity Cards */}
            {checkedIn && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Screen Time</p>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Monitor className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold font-mono tracking-tight text-slate-900">{formatHMS(screenTimeSeconds)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Since session start</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Productivity</p>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Zap className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold font-mono tracking-tight text-slate-900">{productivityPct}%</p>
                    <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-700 rounded-full transition-all duration-700"
                        style={{ width: `${productivityPct}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Break Duration</p>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Coffee className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                    <p className={`text-2xl font-bold font-mono tracking-tight ${totalBreakMin > 90 ? "text-red-600" : "text-slate-900"}`}>
                      {formatHMS(totalBreakMin * 60)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">{activeBreak ? "On break now" : `${totalBreakMin} / 90 min limit`}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Idle Time</p>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                        <Timer className="h-4 w-4 text-slate-500" />
                      </div>
                    </div>
                    <p className={`text-2xl font-bold font-mono tracking-tight ${isIdle ? "text-amber-600" : "text-slate-900"}`}>
                      {formatHMS(idleSeconds)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">{isIdle ? "Currently idle" : "Active now"}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Grid */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2 space-y-6">

                {/* Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Hours</CardTitle>
                    <p className="text-[11px] text-slate-400 font-medium">Last 7 working days</p>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} barCategoryGap="35%">
                        <defs>
                          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1e293b" stopOpacity={1}/>
                            <stop offset="100%" stopColor="#475569" stopOpacity={0.8}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "Inter" }} axisLine={false} tickLine={false} dy={8} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "Inter" }} axisLine={false} tickLine={false} dx={-4} width={30} />
                        <RechartsTooltip
                          cursor={{ fill: "#f8fafc", rx: 4 }}
                          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)", fontSize: 12, fontFamily: "Inter" }}
                          labelStyle={{ fontWeight: 600, color: "#334155" }}
                        />
                        <Bar dataKey="hours" fill="url(#barGrad)" radius={[3, 3, 0, 0]} name="Hours Worked" maxBarSize={36} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Live Occupancy Widget */}
                <OccupancyWidget />

                {/* Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-0 divide-y divide-slate-100">
                      <div className="flex justify-between items-center py-3">
                        <span className="text-[13px] text-slate-500">Today</span>
                        <span className="text-[13px] font-semibold text-slate-800 font-mono">{formatHMS(workSeconds)} / 09:00:00</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-[13px] text-slate-500">This Week</span>
                        <span className="text-[13px] font-semibold text-slate-800">{thisWeekHrs} / 45 hrs</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-[13px] text-slate-500">This Month</span>
                        <span className="text-[13px] font-semibold text-slate-800">{thisMonthHrs} / 198 hrs</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-[13px] text-slate-500">Status</span>
                        <Badge variant={attendance?.status === "present" ? "success" : attendance?.status === "half_day" ? "warning" : "secondary"}>
                          {attendance?.status?.replace("_", " ") || "Not checked in"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {recentActivities.slice(0, 6).map((act, i) => (
                        <div key={i} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                          <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 mt-2 ${
                            act.type === "in" ? "bg-emerald-500"
                            : act.type === "out" ? "bg-slate-400"
                            : "bg-amber-400"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-slate-800 leading-tight">{act.action}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{act.time}</p>
                          </div>
                        </div>
                      ))}
                      {recentActivities.length === 0 && (
                        <p className="text-[13px] text-slate-400 text-center py-6">No activity recorded today</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {activeTab === "history" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Attendance History</CardTitle>
              <Button onClick={exportAttendance} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Punch In</TableHead>
                    <TableHead>Punch Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{a.date}</TableCell>
                      <TableCell>{a.clock_in ? new Date(a.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                      <TableCell>{a.clock_out ? new Date(a.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                      <TableCell>{a.total_hours ? `${a.total_hours} hrs` : "-"}</TableCell>
                      <TableCell>{a.total_break_mins ? `${a.total_break_mins} mins` : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "present" ? "success" : a.status === "half_day" ? "warning" : "destructive"}>
                          {a.status?.replace("_", " ") || "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {history.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-6">No records yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── BREAK TRACKER ── */}
        {activeTab === "breaks" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Breaks</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Start</TableHead>
                        <TableHead>End</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {breaks.map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="capitalize">{b.break_type?.replace(/_/g, " ")}</TableCell>
                          <TableCell>{new Date(b.break_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                          <TableCell>{b.break_end ? new Date(b.break_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                          <TableCell>{b.is_active ? `${activeDurationMins}m (live)` : `${b.duration_mins} mins`}</TableCell>
                          <TableCell>
                            <Badge variant={b.is_active ? "warning" : "success"}>
                              {b.is_active ? "Active" : "Completed"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {breaks.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-slate-500 py-6">No breaks taken today</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Manage Break</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center space-y-1 pb-4 border-b">
                    <p className="text-sm text-slate-500">Total break time today</p>
                    <p className="text-4xl font-bold text-slate-900 font-mono">{totalBreakMin} <span className="text-lg text-slate-500 font-medium">mins</span></p>
                    <p className={`text-xs font-medium ${totalBreakMin > 90 ? "text-red-600" : totalBreakMin > 60 ? "text-yellow-600" : "text-green-600"}`}>
                      {totalBreakMin > 90 ? "⚠️ Limit exceeded" : totalBreakMin > 60 ? "⚠️ Approaching limit" : "✅ Within limit"} (90 min max)
                    </p>
                  </div>

                  {activeBreak ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 text-blue-900 p-4 rounded-md text-center text-sm font-medium border border-blue-100">
                        On {activeBreak.break_type?.replace(/_/g, " ")} break ({activeDurationMins} mins)
                      </div>
                      <Button className="w-full" onClick={endBreak} disabled={loading}>End Break</Button>
                    </div>
                  ) : (
                    <form onSubmit={startBreak} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Break Type</label>
                        <select
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={breakForm.break_type}
                          onChange={e => setBreakForm({ ...breakForm, break_type: e.target.value })} required>
                          {BREAK_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <Button type="submit" className="w-full" disabled={loading || !checkedIn || checkedOut}>
                        Start Break
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── LEAVE TRACKER ── */}
        {activeTab === "leaves" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>My Leave Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaves.map(l => (
                        <TableRow key={l.id}>
                          <TableCell className="capitalize">{l.leave_type}</TableCell>
                          <TableCell className="capitalize">{l.leave_slot?.replace("_", " ")}</TableCell>
                          <TableCell>{l.from_date}</TableCell>
                          <TableCell>{l.to_date}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{l.reason || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={l.status === "approved" ? "success" : l.status === "rejected" ? "destructive" : "warning"}>
                              {l.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {leaves.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-6">No leave requests yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Request Leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitLeave} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Leave Type</label>
                      <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={leaveForm.leave_type} onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })} required>
                        <option value="casual">Casual Leave</option>
                        <option value="sick">Sick Leave</option>
                        <option value="earned">Earned Leave</option>
                        <option value="unpaid">Unpaid Leave</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duration</label>
                      <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={leaveForm.leave_slot} onChange={e => setLeaveForm({ ...leaveForm, leave_slot: e.target.value })} required>
                        <option value="full_day">Full Day</option>
                        <option value="first_half">First Half (Sunrise)</option>
                        <option value="second_half">Second Half (Sunset)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">From</label>
                        <Input type="date" value={leaveForm.from_date} onChange={e => setLeaveForm({ ...leaveForm, from_date: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">To</label>
                        <Input type="date" value={leaveForm.to_date}
                          disabled={leaveForm.leave_slot !== "full_day"}
                          onChange={e => setLeaveForm({ ...leaveForm, to_date: e.target.value })} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Reason</label>
                      <Input value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Why are you taking leave?" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>Submit Request</Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ── MEETING ROOMS ── */}
        {activeTab === "bookings" && <MeetingScheduler role="employee" />}

        {/* ── OCCUPANCY ── */}
        {activeTab === "occupancy" && <OccupancyWidget />}

        {/* ── PROFILE ── */}
        {activeTab === "profile" && <ProfileView user={user} />}

      </div>
    </DashboardLayout>
  )
}