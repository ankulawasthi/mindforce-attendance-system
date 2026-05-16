import { useState, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import api from "../../api/axios"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { DashboardLayout } from "../../components/layout/DashboardLayout"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "../../components/ui/table"
import { Badge } from "../../components/ui/badge"
import { Home, Calendar, Users, FileText, Building, Coffee, Download, CheckCircle, AlertCircle, Clock, UserCheck, UserX, Activity, User, Shield } from "lucide-react"
import { ProfileView } from "../../components/profile/ProfileView"
import { ManagersTab } from "./ManagersTab"
import { ShiftMonitor } from "../shared/ShiftMonitor"
import { MeetingScheduler } from "../shared/MeetingScheduler"
import { OccupancyWidget } from "../../components/dashboard/OccupancyWidget"
import { RoomAnalytics } from "./RoomAnalytics"

const NAV_LINKS = [
  { key: "overview",  label: "Home",           icon: Home     },
  { key: "profile",   label: "My Profile",      icon: User     },
  { key: "managers",  label: "Managers",        icon: Shield   },
  { key: "shifts",    label: "Shift Monitor",   icon: Clock    },
  { key: "attendance",label: "Attendance",      icon: Calendar },
  { key: "employees", label: "All Staff",       icon: Users    },
  { key: "leaves",    label: "Leave Approvals", icon: FileText },
  { key: "bookings",  label: "Meeting Rooms",   icon: Building },
  { key: "room_stats",label: "Room Analytics",  icon: Activity },
  { key: "breaks",    label: "Break Monitor",   icon: Coffee   },
]

export default function DirectorDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")

  // Data states
  const [attendance, setAttendance] = useState(null)
  const [breaks, setBreaks] = useState([])
  const [activeBreak, setActiveBreak] = useState(null)
  const [now, setNow] = useState(new Date())

  // Org data
  const [todayAll, setTodayAll] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [breakSummary, setBreakSummary] = useState([])

  // Leave
  const [managerLeaves, setManagerLeaves] = useState([])

  // UI
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "success" })

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchPersonalAttendance()
    fetchOrgData()
    fetchLeaves()
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

  const fetchOrgData = async () => {
    try {
      const [attRes, userRes, deptRes, breakRes] = await Promise.all([
        api.get("/attendances/today"),
        api.get("/users"),
        api.get("/departments"),
        api.get("/breaks/department_summary"),
      ])
      setTodayAll(attRes.data)
      setAllUsers(userRes.data)
      setDepartments(deptRes.data)
      setBreakSummary(breakRes.data)
    } catch (err) { console.error(err) }
  }

  const fetchLeaves = async () => {
    try {
      const res = await api.get("/leave_requests")
      const all = res.data
      setManagerLeaves(all.filter((l) => l.user_id !== user.id && l.status === "pending"))
    } catch (err) { console.error(err) }
  }

  // Handlers
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
      a.download = `all_attendance_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
    } catch (err) { showMsg("Export failed", "error") }
  }

  const handleLeaveAction = async (id, action) => {
    try {
      await api.patch(`/leave_requests/${id}/${action}`)
      showMsg(`Leave ${action}d!`)
      fetchLeaves()
    } catch (err) { showMsg(err.response?.data?.error || "Error", "error") }
  }

  // Computed Values
  const checkedIn = !!attendance?.clock_in
  const checkedOut = !!attendance?.clock_out

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = Math.floor(totalSeconds % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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

  const totalUsers = allUsers.filter((u) => u.role !== "director")
  const presentCount = todayAll.length
  const absentCount = Math.max(0, totalUsers.length - presentCount)

  const deptChartData = departments.map((d) => {
    const deptUsers = allUsers.filter((u) => u.department_id === d.id)
    const deptPresent = todayAll.filter((a) => deptUsers.some((u) => u.id === a.user_id)).length
    return { name: d.name?.split(" ")[0] || d.name, present: deptPresent, total: deptUsers.length }
  })

  const recentActivities = todayAll
    .flatMap(a => {
      const acts = []
      if (a.clock_in) acts.push({ user: a.user_name, type: 'in', action: 'Clocked in', timestamp: new Date(a.clock_in).getTime(), time: new Date(a.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })
      if (a.clock_out) acts.push({ user: a.user_name, type: 'out', action: 'Clocked out', timestamp: new Date(a.clock_out).getTime(), time: new Date(a.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) })
      return acts
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8)

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
          <div className="space-y-6">
            {/* KPI Cards Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-6 flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Total Staff</p>
                    <p className="text-2xl font-bold">{totalUsers.length}</p>
                  </div>
                  <Users className="h-4 w-4 text-slate-400" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Present Today</p>
                    <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                  </div>
                  <UserCheck className="h-4 w-4 text-green-500" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Absent Today</p>
                    <p className="text-2xl font-bold text-red-600">{absentCount}</p>
                  </div>
                  <UserX className="h-4 w-4 text-red-500" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500">Pending Leaves</p>
                    <p className="text-2xl font-bold text-yellow-600">{managerLeaves.length}</p>
                  </div>
                  <FileText className="h-4 w-4 text-yellow-500" />
                </CardContent>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Left Column (2/3 width) */}
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold">Department Attendance</CardTitle>
                    <Button variant="outline" size="sm" onClick={exportAttendance}>
                      <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={deptChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <RechartsTooltip cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="total" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Total Staff" />
                        <Bar dataKey="present" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Present" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Department Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead>Manager</TableHead>
                          <TableHead className="text-right">Headcount</TableHead>
                          <TableHead className="text-right">Present</TableHead>
                          <TableHead className="text-right">Absent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deptChartData.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{d.name}</TableCell>
                            <TableCell>{departments.find(dept => dept.name.startsWith(d.name))?.manager_name || "—"}</TableCell>
                            <TableCell className="text-right">{d.total}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">{d.present}</TableCell>
                            <TableCell className="text-right text-red-600 font-medium">{Math.max(0, d.total - d.present)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column (1/3 width) */}
              <div className="space-y-6">

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-slate-500" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-5">
                      {recentActivities.map((act, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <div className={`mt-0.5 rounded-full p-1.5 ${act.type === 'in' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                            {act.type === 'in' ? <UserCheck className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-900 leading-none mb-1.5">{act.user}</p>
                            <p className="text-slate-500 text-xs leading-none">{act.action} at {act.time}</p>
                          </div>
                        </div>
                      ))}
                      {recentActivities.length === 0 && (
                        <p className="text-slate-500 text-sm text-center py-4">No activity today</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <OccupancyWidget />
              </div>
            </div>
          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === "attendance" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Staff Attendance</CardTitle>
              <Button onClick={exportAttendance} variant="outline">
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAll.map((a) => {
                    const empUser = allUsers.find((u) => u.id === a.user_id)
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.user_name}</TableCell>
                        <TableCell>{empUser?.department || "—"}</TableCell>
                        <TableCell>{a.clock_in ? new Date(a.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                        <TableCell>{a.clock_out ? new Date(a.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={a.status === "present" ? "success" : a.status === "late" ? "warning" : "destructive"}>
                            {a.status?.replace("_", " ") || "—"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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

        {/* EMPLOYEES */}
        {activeTab === "employees" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {departments.map((d) => {
                const deptUsers = allUsers.filter((u) => u.department_id === d.id)
                const deptPresent = todayAll.filter((a) => deptUsers.some((u) => u.id === a.user_id)).length
                return (
                  <Card key={d.id} className="border-t-4 border-t-blue-500">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-base">{d.name}</CardTitle>
                      <p className="text-xs text-slate-500">Manager: {d.manager_name || "—"}</p>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="flex justify-between text-sm mt-4">
                        <span className="text-slate-600">{deptUsers.length} staff</span>
                        <span className="font-medium text-green-600">{deptPresent} present</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>All Staff Directory</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Emp ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.filter((u) => u.role !== "director").map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs">{u.employee_id}</TableCell>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="capitalize">{u.role}</TableCell>
                        <TableCell>{u.department || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={u.is_active ? "success" : "destructive"}>
                            {u.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* LEAVES */}
        {activeTab === "leaves" && (
          <Card>
            <CardHeader>
              <CardTitle>Manager Leave Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manager</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managerLeaves.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.user_name}</TableCell>
                      <TableCell className="capitalize">{l.leave_type}</TableCell>
                      <TableCell className="capitalize">{l.leave_slot?.replace("_", " ")}</TableCell>
                      <TableCell>{l.from_date}</TableCell>
                      <TableCell>{l.to_date}</TableCell>
                      <TableCell className="max-w-xs truncate" title={l.reason}>{l.reason}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleLeaveAction(l.id, "approve")}>
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleLeaveAction(l.id, "reject")}>
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {managerLeaves.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-500 py-6">No pending approvals</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* BREAK MONITOR */}
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
                    <TableHead>Department</TableHead>
                    <TableHead>Total Break</TableHead>
                    <TableHead>Breaks Taken</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakSummary.map((s) => (
                    <TableRow key={s.user_id}>
                      <TableCell className="font-medium">{s.user_name}</TableCell>
                      <TableCell>{allUsers.find((u) => u.id === s.user_id)?.department || "—"}</TableCell>
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
                      <TableCell colSpan={5} className="text-center text-slate-500 py-6">No break data today</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── MANAGERS ── */}
        {activeTab === "managers" && <ManagersTab />}

        {/* ── BOOKINGS ── */}
        {activeTab === "bookings" && <MeetingScheduler role="director" />}

        {/* ── ROOM ANALYTICS ── */}
        {activeTab === "room_stats" && <RoomAnalytics />}

        {/* ── SHIFTS ── */}
        {activeTab === "shifts" && (
          <ShiftMonitor
            employees={allUsers.filter(u => u.role !== "director")}
            todayAll={todayAll}
            breakSummary={breakSummary}
            departments={departments}
            role="director"
            now={now}
          />
        )}

        {/* ── PROFILE ── */}
        {activeTab === "profile" && <ProfileView user={user} />}

      </div>
    </DashboardLayout>
  )
}