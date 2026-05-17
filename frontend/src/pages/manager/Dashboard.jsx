import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import api from "../../api/axios"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts"
import { DashboardLayout } from "../../components/layout/DashboardLayout"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../components/ui/table"
import { Badge } from "../../components/ui/badge"
import { Home, Calendar, Users, FileText, Building, Coffee, Download, CheckCircle, AlertCircle, Clock, Activity, UserCheck, User, UserPlus } from "lucide-react"
import { ProfileView } from "../../components/profile/ProfileView"
import { EmployeesTab } from "./EmployeesTab"
import { WorkforceMonitor } from "./WorkforceMonitor"
import { ShiftMonitor } from "../shared/ShiftMonitor"
import { MeetingScheduler } from "../shared/MeetingScheduler"
import { OccupancyWidget } from "../../components/dashboard/OccupancyWidget"

const NAV_LINKS = [
  { key: "overview", label: "Home", icon: Home },
  { key: "profile", label: "My Profile", icon: User },
  { key: "employees", label: "Employees", icon: UserPlus },
  { key: "team", label: "My Team", icon: Users },
  { key: "shifts", label: "Shift Monitor", icon: Clock },
  { key: "attendance", label: "Attendance", icon: Calendar },
  { key: "breaks", label: "Break Monitor", icon: Coffee },
  { key: "bookings", label: "Meeting Rooms", icon: Building },
  { key: "leaves", label: "Leave Tracker", icon: FileText },
]

export default function ManagerDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")

  // Personal attendance
  const [attendance, setAttendance] = useState(null)
  const [breaks, setBreaks] = useState([])
  const [activeBreak, setActiveBreak] = useState(null)
  const [history, setHistory] = useState([])
  const [now, setNow] = useState(new Date())

  // Team data
  const [todayAll, setTodayAll] = useState([])
  const [employees, setEmployees] = useState([])
  const [breakSummary, setBreakSummary] = useState([])
  const [teamLeaves, setTeamLeaves] = useState([])

  // Rooms & bookings (manager can also book)
  const [rooms, setRooms] = useState([])
  const [myBookings, setMyBookings] = useState([])

  // Forms
  const [leaveForm, setLeaveForm] = useState({ leave_type: "sick", leave_slot: "full_day", from_date: "", to_date: "", reason: "" })
  const [bookingForm, setBookingForm] = useState({ meeting_room_id: "", title: "", date: "", start_time: "", end_time: "", notes: "" })
  const [myLeaves, setMyLeaves] = useState([])

  // UI
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "success" })

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchPersonalAttendance()
    fetchHistory()
    fetchTeamData()
    fetchLeaves()
    fetchRooms()
  }, [])

  const showMsg = (text, type = "success") => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: "", type: "success" }), 4000)
  }

  const fetchPersonalAttendance = async () => {
    try {
      const res = await api.get("/attendances/today")
      const mine = res.data.find((a) => a.user_id === user.id)
      setAttendance(mine || null)
      if (mine) fetchBreaks(mine.id)
    } catch (err) { console.error(err) }
  }

  const fetchBreaks = async (attendanceId) => {
    try {
      const res = await api.get(`/breaks?attendance_id=${attendanceId}`)
      setBreaks(res.data)
      setActiveBreak(res.data.find((b) => b.is_active) || null)
    } catch (err) { console.error(err) }
  }

  const fetchHistory = async () => {
    try {
      const res = await api.get("/attendances")
      setHistory(res.data.slice(0, 30))
    } catch (err) { console.error(err) }
  }

  const fetchTeamData = async () => {
    try {
      const [attRes, userRes, breakRes] = await Promise.all([
        api.get("/attendances/today"),
        api.get("/users"),
        api.get("/breaks/department_summary"),
      ])
      const empsOnly = userRes.data.filter((u) => u.role === "employee")
      const empIds = empsOnly.map(u => u.id)

      setEmployees(empsOnly)

      // Enrich today's attendance with correct name from userRes
      const enrichedAtt = attRes.data
        .filter((a) => empIds.includes(a.user_id))
        .map((a) => {
          const emp = empsOnly.find(e => e.id === a.user_id)
          return {
            ...a,
            user_name: emp ? emp.name : a.user_name
          }
        })
      setTodayAll(enrichedAtt)

      // Enrich breaks summary with correct name from userRes
      const enrichedBreaks = breakRes.data
        .filter((b) => empIds.includes(b.user_id))
        .map((b) => {
          const emp = empsOnly.find(e => e.id === b.user_id)
          return {
            ...b,
            user_name: emp ? emp.name : b.user_name
          }
        })
      setBreakSummary(enrichedBreaks)
    } catch (err) { console.error(err) }
  }

  const fetchLeaves = async () => {
    try {
      const [leaveRes, userRes] = await Promise.all([
        api.get("/leave_requests"),
        api.get("/users")
      ])
      const empsOnly = userRes.data.filter((u) => u.role === "employee")
      const all = leaveRes.data
      setMyLeaves(all.filter((l) => l.user_id === user.id))

      // Only pending leaves for employees, enriched with correct name
      const pendingLeaves = all
        .filter((l) => l.user_id !== user.id && l.status === "pending" && l.user_role === "employee")
        .map((l) => {
          const emp = empsOnly.find(e => e.id === l.user_id)
          return {
            ...l,
            user_name: emp ? emp.name : l.user_name
          }
        })
      setTeamLeaves(pendingLeaves)
    } catch (err) { console.error(err) }
  }

  const fetchRooms = async () => {
    try {
      const [roomRes, bookRes] = await Promise.all([
        api.get("/meeting_rooms"),
        api.get("/room_bookings")
      ])
      setRooms(roomRes.data)
      setMyBookings(bookRes.data)
    } catch (err) { console.error(err) }
  }

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      const res = await api.post("/attendances/clock_in")
      setAttendance(res.data)
      await fetchPersonalAttendance()
      showMsg("Checked in successfully!")
    } catch (err) { showMsg(err.response?.data?.error || "Error", "error") }
    finally { setLoading(false) }
  }

  const handleCheckOut = async () => {
    if (activeBreak) return showMsg("End your break first", "error")
    setLoading(true)
    try {
      const res = await api.post("/attendances/clock_out", { idle_seconds: 0 })
      setAttendance(res.data)
      showMsg(res.data.message || "Checked out successfully!")
    } catch (err) { showMsg(err.response?.data?.error || "Error", "error") }
    finally { setLoading(false) }
  }

  const exportAttendance = async () => {
    try {
      const res = await api.get("/attendances/export", { responseType: "blob" })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement("a")
      a.href = url
      a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
    } catch (err) { showMsg("Export failed", "error") }
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
      showMsg("✅ Leave request submitted!")
    } catch (err) { showMsg(err.response?.data?.errors?.join(", ") || "Error", "error") }
    finally { setLoading(false) }
  }

  const approveLeave = async (id) => {
    try {
      await api.patch(`/leave_requests/${id}/approve`)
      showMsg("Leave approved!")
      fetchLeaves()
    } catch (err) { showMsg("Failed to approve", "error") }
  }

  const rejectLeave = async (id) => {
    try {
      await api.patch(`/leave_requests/${id}/reject`)
      showMsg("Leave rejected.")
      fetchLeaves()
    } catch (err) { showMsg("Failed to reject", "error") }
  }

  const submitBooking = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const start = new Date(`${bookingForm.date}T${bookingForm.start_time}`)
      const end   = new Date(`${bookingForm.date}T${bookingForm.end_time}`)
      await api.post("/room_bookings", {
        room_booking: { ...bookingForm, start_time: start.toISOString(), end_time: end.toISOString() }
      })
      await fetchRooms()
      setBookingForm({ meeting_room_id: "", title: "", date: "", start_time: "", end_time: "", notes: "" })
      showMsg("✅ Room booked successfully!")
    } catch (err) { showMsg(err.response?.data?.errors?.join(", ") || "Error", "error") }
    finally { setLoading(false) }
  }

  const checkedIn = !!attendance?.clock_in
  const checkedOut = !!attendance?.clock_out

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = Math.floor(totalSeconds % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const formatBreakName = (type) => {
    if (!type) return "Break"
    const words = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1))
    if (words[words.length - 1] !== 'Break') words.push('Break')
    return words.join(' ')
  }

  let workSeconds = 0
  if (attendance && attendance.clock_in) {
    const end = attendance.clock_out ? new Date(attendance.clock_out) : now
    const grossSeconds = Math.max(0, Math.floor((end - new Date(attendance.clock_in)) / 1000))
    
    let totalBreakSeconds = 0
    breaks.forEach(b => {
       const bStart = new Date(b.break_start)
       const bEnd = b.break_end ? new Date(b.break_end) : end
       if (bEnd > bStart) {
         totalBreakSeconds += Math.floor((bEnd - bStart) / 1000)
       }
    })

    workSeconds = grossSeconds
  }
  const formattedWorkTime = formatTime(workSeconds)

  const presentCount = todayAll.length
  const lateCount = todayAll.filter(a => a.status === 'late').length
  const onBreakCount = breakSummary.filter(b => b.has_active_break).length
  const pendingLeavesCount = teamLeaves.length

  const recentActivities = []
  todayAll.forEach(a => {
    if (a.clock_in) recentActivities.push({ type: 'in', action: `${a.user_name} clocked in`, timestamp: new Date(a.clock_in).getTime(), time: new Date(a.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
    if (a.clock_out) recentActivities.push({ type: 'out', action: `${a.user_name} clocked out`, timestamp: new Date(a.clock_out).getTime(), time: new Date(a.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
  })
  breakSummary.forEach(b => {
    b.breaks?.forEach(br => {
      const bName = formatBreakName(br.break_type)
      recentActivities.push({ type: 'break', action: `${b.user_name} started ${bName}`, timestamp: new Date(br.break_start).getTime(), time: new Date(br.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
      if (br.break_end) {
        recentActivities.push({ type: 'break_end', action: `${b.user_name} ended ${bName}`, timestamp: new Date(br.break_end).getTime(), time: new Date(br.break_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })
      }
    })
  })
  recentActivities.sort((a, b) => b.timestamp - a.timestamp)
  const slicedActivities = recentActivities.slice(0, 10)

  return (
    <DashboardLayout 
      navigation={NAV_LINKS} 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      attendanceConfig={{
        checkedIn,
        checkedOut,
        activeBreak,
        workTime: formattedWorkTime,
        loading,
        onCheckIn: handleCheckIn,
        onCheckOut: handleCheckOut,
      }}
    >
      <div className="space-y-6">
        {message.text && (
          <div className={`rounded-md p-4 flex items-center gap-3 ${message.type === "error" ? "bg-red-50 text-red-900" : "bg-green-50 text-green-900"}`}>
            {message.type === "error" ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <WorkforceMonitor
            employees={employees}
            todayAll={todayAll}
            breakSummary={breakSummary}
            teamLeaves={teamLeaves}
            history={history}
            now={now}
            onExport={exportAttendance}
            onRefresh={() => { fetchTeamData(); fetchLeaves() }}
            onApproveLeave={approveLeave}
            onRejectLeave={rejectLeave}
          />
        )}

        {/* TEAM */}
        {activeTab === "team" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>My Team</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emp ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.employee_id}</TableCell>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.email}</TableCell>
                      <TableCell>{e.job_title || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={e.is_active ? "success" : "destructive"}>
                          {e.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {employees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-6">No employees yet</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ATTENDANCE */}
        {activeTab === "attendance" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Team Attendance — Today</CardTitle>
              <Button onClick={exportAttendance} variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAll.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.user_name}</TableCell>
                      <TableCell>{a.clock_in ? new Date(a.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}</TableCell>
                      <TableCell>{a.clock_out ? new Date(a.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "-"}</TableCell>
                      <TableCell>{a.total_hours || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "present" ? "success" : a.status === "late" ? "warning" : "destructive"}>
                          {a.status?.replace("_", " ") || "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {todayAll.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-6">No attendance records today</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* BREAKS */}
        {activeTab === "breaks" && (
          <Card>
            <CardHeader>
              <CardTitle>Live Break Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Total Break</TableHead>
                    <TableHead>Breaks Taken</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakSummary.map((s) => (
                    <TableRow key={s.user_id}>
                      <TableCell className="font-medium">{s.user_name}</TableCell>
                      <TableCell>{s.total_break_mins} mins</TableCell>
                      <TableCell>{s.break_count}</TableCell>
                      <TableCell>
                        {s.flagged ? (
                          <Badge variant="destructive">Exceeded</Badge>
                        ) : s.has_active_break ? (
                          <Badge variant="warning">On Break</Badge>
                        ) : (
                          <Badge variant="success">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {breakSummary.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-6">No break data today</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── LEAVE TRACKER ── */}
        {activeTab === "leaves" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              {/* Team pending approvals */}
              <Card>
                <CardHeader>
                  <CardTitle>Team Leave Requests — Pending Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamLeaves.map(l => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.user_name || "—"}</TableCell>
                          <TableCell className="capitalize">{l.leave_type}</TableCell>
                          <TableCell className="capitalize">{l.leave_slot?.replace("_", " ")}</TableCell>
                          <TableCell>{l.from_date}</TableCell>
                          <TableCell>{l.to_date}</TableCell>
                          <TableCell className="max-w-[120px] truncate">{l.reason || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => approveLeave(l.id)} className="h-7 px-2 text-xs">Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => rejectLeave(l.id)} className="h-7 px-2 text-xs">Reject</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {teamLeaves.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-slate-500 py-6">No pending leave requests</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* My own leaves */}
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
                      {myLeaves.map(l => (
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
                      {myLeaves.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-slate-500 py-6">No leave requests yet</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Apply leave form */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Request Leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={submitLeave} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Leave Type</label>
                      <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={leaveForm.leave_type} onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })} required>
                        <option value="casual">Casual Leave</option>
                        <option value="sick">Sick Leave</option>
                        <option value="earned">Earned Leave</option>
                        <option value="unpaid">Unpaid Leave</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duration</label>
                      <select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        value={leaveForm.leave_slot} onChange={e => setLeaveForm({ ...leaveForm, leave_slot: e.target.value })} required>
                        <option value="full_day">Full Day</option>
                        <option value="first_half">First Half</option>
                        <option value="second_half">Second Half</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">From</label>
                        <Input type="date" value={leaveForm.from_date} onChange={e => setLeaveForm({ ...leaveForm, from_date: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">To</label>
                        <Input type="date" value={leaveForm.to_date} disabled={leaveForm.leave_slot !== "full_day"}
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
        {activeTab === "bookings" && <MeetingScheduler role="manager" />}

        {/* ── SHIFTS ── */}
        {activeTab === "shifts" && (
          <ShiftMonitor
            employees={employees}
            todayAll={todayAll}
            breakSummary={breakSummary}
            departments={[]}
            role="manager"
            now={now}
          />
        )}

        {/* ── PROFILE ── */}
        {activeTab === "profile" && <ProfileView user={user} />}

        {/* ── EMPLOYEES ── */}
        {activeTab === "employees" && <EmployeesTab />}

      </div>
    </DashboardLayout>
  )
}