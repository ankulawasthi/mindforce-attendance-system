import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import mfrLogo from '../../assets/mfr-logo.png'

const NAV_LINKS = [
  { key: 'overview',   label: 'Home',          icon: '🏠' },
  { key: 'attendance', label: 'Attendance',     icon: '📅' },
  { key: 'employees',  label: 'All Staff',      icon: '👥' },
  { key: 'leaves',     label: 'Leave Approvals',icon: '🏖️' },
  { key: 'bookings',   label: 'Meeting Rooms',  icon: '🏢' },
  { key: 'breaks',     label: 'Break Monitor',  icon: '☕' },
]

const BREAK_TYPES = [
  { value: 'lunch',    label: '🍽️ Lunch' },
  { value: 'short',    label: '☕ Short Break' },
  { value: 'personal', label: '🚶 Personal' },
]

const BREAK_LIMIT = 90

export default function DirectorDashboard() {
  const { user, logout }                    = useAuth()
  const [userProfile, setUserProfile]       = useState(null)
  const [activeTab, setActiveTab]           = useState('overview')
  const [hoveredTab, setHoveredTab]         = useState(null)
  const [isLogoutHovered, setIsLogoutHovered] = useState(false)

  // Personal attendance
  const [attendance, setAttendance]         = useState(null)
  const [breaks, setBreaks]                 = useState([])
  const [activeBreak, setActiveBreak]       = useState(null)
  const [history, setHistory]               = useState([])
  const [now, setNow]                       = useState(new Date())

  // Org data
  const [todayAll, setTodayAll]             = useState([])
  const [allUsers, setAllUsers]             = useState([])
  const [departments, setDepartments]       = useState([])
  const [breakSummary, setBreakSummary]     = useState([])

  // Leave
  const [myLeaves, setMyLeaves]             = useState([])
  const [managerLeaves, setManagerLeaves]   = useState([])
  const [showLeaveForm, setShowLeaveForm]   = useState(false)
  const [leavePanel, setLeavePanel]         = useState('approvals')
  const [leaveForm, setLeaveForm]           = useState({ leave_type: 'casual', leave_slot: 'full_day', from_date: '', to_date: '', reason: '' })

  // Meeting rooms
  const [rooms, setRooms]                   = useState([])
  const [bookings, setBookings]             = useState([])
  const [bookingDate, setBookingDate]       = useState(new Date().toISOString().slice(0,10))
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [startTime, setStartTime]           = useState('09:00')
  const [endTime, setEndTime]               = useState('10:00')
  const [purpose, setPurpose]               = useState('Director Meeting')
  const [bookingLoading, setBookingLoading] = useState(false)

  // UI
  const [loading, setLoading]               = useState(false)
  const [message, setMessage]               = useState({ text: '', type: 'success' })
  const [passwordForm, setPasswordForm]     = useState({ current_password: '', new_password: '', confirm_password: '' })

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    fetchPersonalAttendance()
    fetchHistory()
    fetchOrgData()
    fetchLeaves()
    fetchProfile()
  }, [])

  useEffect(() => {
    if (activeTab === 'bookings') { fetchRooms(); fetchBookings() }
  }, [bookingDate, activeTab])

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: 'success' }), 4000)
  }

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me')
      setUserProfile(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchPersonalAttendance = async () => {
    try {
      const res = await api.get('/attendances/today')
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
      const res = await api.get('/attendances')
      setHistory(res.data.slice(0, 30))
    } catch (err) { console.error(err) }
  }

  const fetchOrgData = async () => {
    try {
      const [attRes, userRes, deptRes, breakRes] = await Promise.all([
        api.get('/attendances/today'),
        api.get('/users'),
        api.get('/departments'),
        api.get('/breaks/department_summary'),
      ])
      setTodayAll(attRes.data)
      setAllUsers(userRes.data)
      setDepartments(deptRes.data)
      setBreakSummary(breakRes.data)
    } catch (err) { console.error(err) }
  }

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leave_requests')
      const all = res.data
      setMyLeaves(all.filter(l => l.user_id === user.id))
      setManagerLeaves(all.filter(l => l.user_id !== user.id && l.status === 'pending'))
    } catch (err) { console.error(err) }
  }

  const fetchRooms = async () => {
    try {
      const res = await api.get('/meeting_rooms', { params: { date: bookingDate } })
      setRooms(res.data)
      if (!selectedRoomId && res.data.length > 0) setSelectedRoomId(res.data[0].id)
    } catch (err) { console.error(err) }
  }

  const fetchBookings = async () => {
    try {
      const res = await api.get('/room_bookings')
      setBookings(res.data)
    } catch (err) { console.error(err) }
  }

  // Handlers
  const handleCheckIn = async () => {
    setLoading(true)
    try {
      const res = await api.post('/attendances/clock_in')
      setAttendance(res.data)
      await fetchPersonalAttendance()
      showMsg('✅ Checked in!')
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
    finally { setLoading(false) }
  }

  const handleCheckOut = async () => {
    if (activeBreak) return showMsg('⚠️ End your break first', 'error')
    setLoading(true)
    try {
      const res = await api.post('/attendances/clock_out')
      setAttendance(res.data)
      showMsg(res.data.message || '✅ Checked out!')
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
    finally { setLoading(false) }
  }

  const startBreak = async (breakType) => {
    setLoading(true)
    try {
      const res = await api.post('/breaks', { break_type: breakType })
      setActiveBreak(res.data)
      setBreaks(prev => [...prev, res.data])
      showMsg(`✅ ${breakType} break started!`)
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
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
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
    finally { setLoading(false) }
  }

  const handleLeaveAction = async (id, action) => {
    try {
      await api.patch(`/leave_requests/${id}/${action}`)
      showMsg(`✅ Leave ${action}d!`)
      fetchLeaves()
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
  }

  const submitLeave = async (e) => {
    e.preventDefault()
    try {
      const payload = leaveForm.leave_slot === 'full_day'
        ? leaveForm : { ...leaveForm, to_date: leaveForm.from_date }
      await api.post('/leave_requests', { leave_request: payload })
      showMsg('✅ Leave submitted!')
      setShowLeaveForm(false)
      setLeaveForm({ leave_type: 'casual', leave_slot: 'full_day', from_date: '', to_date: '', reason: '' })
      fetchLeaves()
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
  }

  const createBooking = async (e) => {
    e.preventDefault()
    setBookingLoading(true)
    try {
      await api.post('/room_bookings', {
        room_booking: { meeting_room_id: selectedRoomId, date: bookingDate, start_time: startTime, end_time: endTime, purpose }
      })
      showMsg('✅ Room booked!')
      fetchRooms(); fetchBookings()
    } catch (err) { showMsg(err.response?.data?.errors?.[0] || 'Booking failed', 'error') }
    finally { setBookingLoading(false) }
  }

  const cancelBooking = async (id) => {
    try {
      await api.delete(`/room_bookings/${id}`)
      showMsg('✅ Booking cancelled')
      fetchRooms(); fetchBookings()
    } catch (err) { showMsg('Failed to cancel', 'error') }
  }

  const exportAttendance = async () => {
    try {
      const res = await api.get('/attendances/export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `all_attendance_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
    } catch (err) { showMsg('Export failed', 'error') }
  }

  const submitPasswordChange = async (e) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password)
      return showMsg('Passwords do not match', 'error')
    setLoading(true)
    try {
      await api.patch('/auth/change_password', passwordForm)
      showMsg('✅ Password changed!')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setActiveTab('overview')
    } catch (err) { showMsg(err.response?.data?.error || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  // Computed
  const checkedIn  = !!attendance?.clock_in
  const checkedOut = !!attendance?.clock_out

  const activeSeconds      = activeBreak ? Math.floor((now - new Date(activeBreak.break_start)) / 1000) : 0
  const activeDurationMins = Math.floor(activeSeconds / 60)
  const activeSecsRemain   = activeSeconds % 60
  const totalBreakMin      = breaks.reduce((sum, b) => sum + (b.duration_mins || 0), 0) + activeDurationMins
  const breakStatusColor   = totalBreakMin > BREAK_LIMIT ? '#ef4444' : totalBreakMin > 60 ? '#f59e0b' : '#22c55e'
  const breakStatusLabel   = totalBreakMin > BREAK_LIMIT ? 'Break Exceeded' : totalBreakMin > 60 ? 'Approaching limit' : 'Within limit'

  const rawWorkSeconds = attendance?.clock_in && !attendance?.clock_out
    ? Math.max(0, Math.floor((now - new Date(attendance.clock_in)) / 1000)) : 0
  const netWorkSeconds = rawWorkSeconds
  const netWorkHrs     = (netWorkSeconds / 3600).toFixed(2)

  const WORK_DAY_SECS = 8 * 3600
  const progressPct   = Math.min(100, (netWorkSeconds / WORK_DAY_SECS) * 100)
  const circumference = 2 * Math.PI * 54
  const strokeDash    = (progressPct / 100) * circumference

  const todayActivity = []
  if (attendance?.clock_in) todayActivity.push({ type: 'in', time: new Date(attendance.clock_in), label: 'Punch In' })
  breaks.forEach(b => {
    if (b.break_start) todayActivity.push({ type: 'out', time: new Date(b.break_start), label: 'Break Start' })
    if (b.break_end)   todayActivity.push({ type: 'in',  time: new Date(b.break_end),   label: 'Break End' })
  })
  if (attendance?.clock_out) todayActivity.push({ type: 'out', time: new Date(attendance.clock_out), label: 'Punch Out' })
  todayActivity.sort((a, b) => a.time - b.time)

  const thisWeekHrs  = history.slice(0, 5).reduce((s, a) => s + (parseFloat(a.total_hours) || 0), 0).toFixed(1)
  const thisMonthHrs = history.slice(0, 22).reduce((s, a) => s + (parseFloat(a.total_hours) || 0), 0).toFixed(1)

  const managers   = allUsers.filter(u => u.role === 'manager')
  const employees  = allUsers.filter(u => u.role === 'employee')
  const totalUsers = allUsers.filter(u => u.role !== 'director')

  // Dept attendance chart
  const deptChartData = departments.map(d => {
    const deptUsers    = allUsers.filter(u => u.department_id === d.id)
    const deptPresent  = todayAll.filter(a => deptUsers.some(u => u.id === a.user_id)).length
    return { name: d.name?.split(' ')[0] || d.name, present: deptPresent, total: deptUsers.length }
  })

  // Pie chart data
  const presentCount = todayAll.length
  const absentCount  = Math.max(0, totalUsers.length - presentCount)
  const pieData = [
    { name: 'Present', value: presentCount, color: '#22c55e' },
    { name: 'Absent',  value: absentCount,  color: '#e2e8f0' },
  ]

  const today = now.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'short', year:'numeric' })

  const msgStyle = {
    ...styles.msgBox,
    background: message.type === 'error' ? '#fff0f0' : message.type === 'warning' ? '#fff9e6' : '#e1f5ee',
    color:      message.type === 'error' ? '#e53e3e' : message.type === 'warning' ? '#b7791f' : '#085041',
  }

  return (
    <div style={styles.layout}>

      {/* Icon Sidebar */}
      <div style={styles.sidebar}>
        <div>
          <div style={styles.sidebarLogo}>
            <img src={mfrLogo} alt="MFR" style={styles.sidebarLogoImg} />
          </div>
          {NAV_LINKS.map(link => (
            <button key={link.key}
              onClick={() => setActiveTab(link.key)}
              onMouseEnter={() => setHoveredTab(link.key)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                ...styles.navBtn,
                ...(activeTab === link.key ? styles.navBtnActive : {}),
                ...(hoveredTab === link.key && activeTab !== link.key ? styles.navBtnHover : {})
              }}>
              <span style={styles.navIcon}>{link.icon}</span>
              <span style={styles.navLabel}>{link.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={logout}
          onMouseEnter={() => setIsLogoutHovered(true)}
          onMouseLeave={() => setIsLogoutHovered(false)}
          style={{ ...styles.logoutBtn, ...(isLogoutHovered ? styles.logoutBtnHover : {}) }}>
          <span style={styles.navIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20 4H16C14.8954 4 14 4.89543 14 6V18C14 19.1046 14.8954 20 16 20H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span style={styles.navLabel}>Logout</span>
        </button>
      </div>

      {/* Profile Sidebar */}
      <div style={styles.profileSidebar}>
        <div style={styles.avatarWrap}>
          <div style={styles.avatarCircle}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</div>
        </div>
        <p style={styles.profileName}>{user?.name}</p>
        <p style={styles.profileId}>{userProfile?.employee_id || '—'}</p>
        <p style={styles.profileDesignation}>Director</p>

        <div style={styles.profileDivider} />
        <div style={styles.reportingWrap}>
          <p style={styles.reportingLabel}>Organization</p>
          <p style={styles.reportingValue}>Mindforce Research</p>
        </div>

        <div style={styles.profileDivider} />
        <p style={{ ...styles.profileStatus, color: checkedIn && !checkedOut ? '#22c55e' : '#e53e3e' }}>
          {checkedIn && !checkedOut ? 'In' : checkedOut ? 'Out' : 'Yet to check-in'}
        </p>

        <div style={styles.timerRow}>
          <div style={styles.timerBox}>{String(Math.floor(netWorkSeconds / 3600)).padStart(2,'0')}</div>
          <span style={styles.timerSep}>:</span>
          <div style={styles.timerBox}>{String(Math.floor((netWorkSeconds % 3600) / 60)).padStart(2,'00')}</div>
          <span style={styles.timerSep}>:</span>
          <div style={styles.timerBox}>{String(netWorkSeconds % 60).padStart(2,'00')}</div>
        </div>

        <div style={styles.profileDivider} />

        {checkedIn && !checkedOut && (
          <div style={{width:'100%'}}>
            <p style={styles.breakSectionLabel}>Breaks</p>
            {!activeBreak ? (
              BREAK_TYPES.map(bt => (
                <button key={bt.value} onClick={() => startBreak(bt.value)}
                  disabled={loading} style={styles.breakBtn}>
                  {bt.label}
                </button>
              ))
            ) : (
              <div style={styles.activeBreakWrap}>
                <p style={styles.activeBreakLabel}>
                  {activeBreak.break_type === 'lunch' ? '🍽️' : activeBreak.break_type === 'short' ? '☕' : '🚶'}
                  {' '}{activeBreak.break_type} — {activeDurationMins > 0 ? `${activeDurationMins}m ${activeSecsRemain}s` : `${activeSecsRemain}s`}
                </p>
                <button onClick={endBreak} style={styles.endBreakBtn}>⏹ End Break</button>
              </div>
            )}
          </div>
        )}

        <button onClick={() => setActiveTab('password')} style={styles.changePassBtn}>🔑 Change Password</button>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {message.text && <div style={msgStyle}>{message.text}</div>}

        {/* HOME */}
        {activeTab === 'overview' && (
          <div style={styles.homeGrid}>

            {/* Timesheet */}
            <div style={styles.timesheetCard}>
              <div style={styles.timesheetHeader}>
                <span style={styles.timesheetTitle}>Timesheet</span>
                <span style={styles.timesheetDate}>{today}</span>
              </div>
              {attendance?.clock_in && (
                <p style={styles.punchInTime}>
                  Punch In at {new Date(attendance.clock_in).toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'})} {new Date(attendance.clock_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                </p>
              )}
              <div style={styles.circleWrap}>
                <svg width="140" height="140" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10"/>
                  <circle cx="60" cy="60" r="54" fill="none"
                    stroke={progressPct >= 100 ? '#22c55e' : '#3b82f6'}
                    strokeWidth="10"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{transition:'stroke-dasharray 1s ease'}}
                  />
                  <text x="60" y="55" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1a1a2e">{netWorkHrs} hrs</text>
                  <text x="60" y="72" textAnchor="middle" fontSize="9" fill="#888">of 8 hrs</text>
                </svg>
              </div>
              {!checkedIn && <button onClick={handleCheckIn} disabled={loading} style={styles.punchInBtn}>✦ Punch In</button>}
              {checkedIn && !checkedOut && !activeBreak && <button onClick={handleCheckOut} disabled={loading} style={styles.punchOutBtn}>Punch Out</button>}
              {checkedIn && checkedOut && <div style={styles.doneChip}>✓ Done for today</div>}
              {checkedIn && !checkedOut && activeBreak && <div style={styles.onBreakChip}>☕ On Break</div>}
              <div style={styles.timesheetFooter}>
                <div style={styles.timesheetStat}>
                  <p style={styles.timesheetStatLabel}>BREAK</p>
                  <p style={{...styles.timesheetStatVal, color: breakStatusColor}}>{totalBreakMin} / {BREAK_LIMIT} mins</p>
                </div>
                <div style={styles.timesheetStat}>
                  <p style={styles.timesheetStatLabel}>STATUS</p>
                  <p style={{...styles.timesheetStatVal,
                    color: attendance?.status === 'present' ? '#22c55e' : attendance?.status === 'half_day' ? '#f59e0b' : '#e53e3e'
                  }}>{attendance?.status?.replace('_',' ') || '—'}</p>
                </div>
              </div>
            </div>

            {/* Org Stats */}
            <div style={styles.statsCard}>
              <p style={styles.statsTitle}>Organization Overview</p>
              {[
                { label:'Total Staff',      val: totalUsers.length,  color:'#3b82f6' },
                { label:'Managers',         val: managers.length,    color:'#a855f7' },
                { label:'Employees',        val: employees.length,   color:'#22c55e' },
                { label:'Present Today',    val: todayAll.length,    color:'#22c55e' },
                { label:'Absent Today',     val: absentCount,        color:'#e53e3e' },
                { label:'Pending Leaves',   val: managerLeaves.length, color:'#f59e0b' },
                { label:'Departments',      val: departments.length, color:'#3b82f6' },
                { label:'Meeting Rooms',    val: rooms.length,       color:'#06b6d4' },
              ].map((s, i) => (
                <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', paddingBottom:'10px', borderBottom: i < 7 ? '1px solid #f1f5f9' : 'none'}}>
                  <span style={{fontSize:'13px', color:'#334155'}}>{s.label}</span>
                  <span style={{fontSize:'16px', fontWeight:'700', color: s.color}}>{s.val}</span>
                </div>
              ))}
            </div>

            {/* Today Activity */}
            <div style={styles.activityCard}>
              <p style={styles.activityTitle}>My Activity Today</p>
              {todayActivity.length === 0 ? (
                <p style={{color:'#888', fontSize:'13px', textAlign:'center', marginTop:'2rem'}}>No activity yet</p>
              ) : (
                <div style={styles.timeline}>
                  {todayActivity.map((a, i) => (
                    <div key={i} style={styles.timelineItem}>
                      <div style={{...styles.timelineDot, background: a.type === 'in' ? '#22c55e' : '#e53e3e'}} />
                      <div>
                        <p style={styles.timelineLabel}>{a.label}</p>
                        <p style={styles.timelineTime}>{a.time.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dept Attendance Chart */}
            <div style={styles.attendanceListCard}>
              <div style={styles.cardHeader}>
                <p style={styles.cardTitle}>Department Attendance — Today</p>
                <button onClick={exportAttendance} style={styles.exportBtn}>⬇ Export All</button>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{fontSize:11}} />
                  <YAxis hide />
                  <Tooltip formatter={(val, name) => [val, name === 'present' ? 'Present' : 'Total']} />
                  <Bar dataKey="total"   fill="#e2e8f0" radius={[4,4,0,0]} />
                  <Bar dataKey="present" fill="#22c55e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Attendance Pie */}
            <div style={styles.chartCard}>
              <p style={styles.chartTitle}>Today's Attendance</p>
              <PieChart width={200} height={200}>
                <Pie data={pieData} cx={100} cy={100} innerRadius={50} outerRadius={80} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
              <p style={{textAlign:'center', fontSize:'13px', color:'#64748b', margin:'0'}}>
                {presentCount} present / {absentCount} absent
              </p>
            </div>

          </div>
        )}

        {/* ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <p style={styles.cardTitle}>All Staff Attendance — Today</p>
              <button onClick={exportAttendance} style={styles.exportBtn}>⬇ Export CSV</button>
            </div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Check In</th>
                  <th style={styles.th}>Check Out</th>
                  <th style={styles.th}>Hours</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAll.map(a => {
                  const empUser = allUsers.find(u => u.id === a.user_id)
                  return (
                    <tr key={a.id} style={styles.tr}>
                      <td style={styles.td}><strong>{a.user_name}</strong></td>
                      <td style={styles.td}>{empUser?.department || '—'}</td>
                      <td style={styles.td}>{a.clock_in ? new Date(a.clock_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                      <td style={styles.td}>{a.clock_out ? new Date(a.clock_out).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                      <td style={styles.td}>{a.total_hours || '-'}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge,
                          background: a.status==='present'?'#e1f5ee':a.status==='half_day'?'#fff9e6':a.status==='late'?'#e6f1fb':'#fff0f0',
                          color: a.status==='present'?'#085041':a.status==='half_day'?'#b7791f':a.status==='late'?'#0C447C':'#e53e3e'
                        }}>{a.status?.replace('_',' ')}</span>
                      </td>
                    </tr>
                  )
                })}
                {todayAll.length === 0 && <tr><td colSpan={6} style={{...styles.td, textAlign:'center', color:'#888'}}>No attendance records today</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ALL STAFF */}
        {activeTab === 'employees' && (
          <div>
            {/* Department Cards */}
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'1rem', marginBottom:'1.5rem'}}>
              {departments.map(d => {
                const deptUsers   = allUsers.filter(u => u.department_id === d.id)
                const deptPresent = todayAll.filter(a => deptUsers.some(u => u.id === a.user_id)).length
                return (
                  <div key={d.id} style={{...styles.card, marginBottom:0, borderTop:'3px solid #3b82f6'}}>
                    <p style={{margin:'0 0 4px', fontWeight:'700', fontSize:'14px', color:'#1a1a2e'}}>{d.name}</p>
                    <p style={{margin:'0 0 8px', fontSize:'12px', color:'#64748b'}}>Manager: {d.manager_name || '—'}</p>
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                      <span style={{fontSize:'12px', color:'#334155'}}>👥 {deptUsers.length} staff</span>
                      <span style={{fontSize:'12px', color:'#22c55e', fontWeight:'600'}}>✅ {deptPresent} present</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* All Users Table */}
            <div style={styles.card}>
              <p style={styles.cardTitle}>All Staff</p>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>Emp ID</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Department</th>
                    <th style={styles.th}>Job Title</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.filter(u => u.role !== 'director').map(u => (
                    <tr key={u.id} style={styles.tr}>
                      <td style={styles.td}><code style={{background:'#f1f5f9',padding:'2px 6px',borderRadius:'4px',fontSize:'12px'}}>{u.employee_id}</code></td>
                      <td style={styles.td}><strong>{u.name}</strong></td>
                      <td style={styles.td}>
                        <span style={{...styles.badge,
                          background: u.role==='manager'?'#e6f1fb':'#f1f5f9',
                          color: u.role==='manager'?'#0C447C':'#334155'
                        }}>{u.role}</span>
                      </td>
                      <td style={styles.td}>{u.department || '—'}</td>
                      <td style={styles.td}>{u.job_title || '—'}</td>
                      <td style={styles.td}>
                        <span style={{...styles.badge,
                          background: u.is_active?'#e1f5ee':'#fff0f0',
                          color: u.is_active?'#085041':'#e53e3e'
                        }}>{u.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LEAVE APPROVALS */}
        {activeTab === 'leaves' && (
          <div>
            <div style={{display:'flex', gap:'8px', marginBottom:'1rem'}}>
              {[
                { key:'approvals', label:'Manager Leave Approvals' },
                { key:'my',        label:'My Requests' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setLeavePanel(tab.key)}
                  style={{
                    padding:'8px 20px', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'600', fontSize:'13px',
                    background: leavePanel === tab.key ? '#3b82f6' : '#f1f5f9',
                    color: leavePanel === tab.key ? '#fff' : '#64748b'
                  }}>
                  {tab.label}
                  {tab.key === 'approvals' && managerLeaves.length > 0 && (
                    <span style={{marginLeft:'6px', background:'#e53e3e', color:'#fff', borderRadius:'50%', width:'18px', height:'18px', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'10px'}}>
                      {managerLeaves.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {leavePanel === 'approvals' && (
              <div style={styles.card}>
                <p style={styles.cardTitle}>Pending Manager Leave Requests</p>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.th}>Manager</th>
                      <th style={styles.th}>Department</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Duration</th>
                      <th style={styles.th}>From</th>
                      <th style={styles.th}>To</th>
                      <th style={styles.th}>Reason</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerLeaves.map(l => {
                      const mgr = allUsers.find(u => u.id === l.user_id)
                      return (
                        <tr key={l.id} style={styles.tr}>
                          <td style={styles.td}><strong>{l.user_name}</strong></td>
                          <td style={styles.td}>{mgr?.department || '—'}</td>
                          <td style={styles.td}>{l.leave_type}</td>
                          <td style={styles.td}>{l.leave_slot === 'first_half' ? 'First Half' : l.leave_slot === 'second_half' ? 'Second Half' : 'Full Day'}</td>
                          <td style={styles.td}>{l.from_date}</td>
                          <td style={styles.td}>{l.to_date}</td>
                          <td style={styles.td}>{l.reason}</td>
                          <td style={styles.td}>
                            <div style={{display:'flex', gap:'6px'}}>
                              <button onClick={() => handleLeaveAction(l.id, 'approve')} style={{padding:'5px 12px', background:'#22c55e', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600'}}>✓ Approve</button>
                              <button onClick={() => handleLeaveAction(l.id, 'reject')}  style={{padding:'5px 12px', background:'#e53e3e', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600'}}>✗ Reject</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {managerLeaves.length === 0 && <tr><td colSpan={8} style={{...styles.td, textAlign:'center', color:'#888'}}>No pending approvals</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {leavePanel === 'my' && (
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <p style={styles.cardTitle}>My Leave Requests</p>
                  <button onClick={() => setShowLeaveForm(!showLeaveForm)} style={styles.exportBtn}>+ Apply Leave</button>
                </div>
                {showLeaveForm && (
                  <form onSubmit={submitLeave} style={styles.leaveForm}>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1rem'}}>
                      <div style={styles.formField}>
                        <label style={styles.formLabel}>Leave Type</label>
                        <select style={styles.formInput} value={leaveForm.leave_type}
                          onChange={e => setLeaveForm({...leaveForm, leave_type: e.target.value})}>
                          <option value="casual">Casual</option>
                          <option value="sick">Sick</option>
                          <option value="earned">Earned</option>
                          <option value="unpaid">Unpaid</option>
                        </select>
                      </div>
                      <div style={styles.formField}>
                        <label style={styles.formLabel}>Duration</label>
                        <select style={styles.formInput} value={leaveForm.leave_slot}
                          onChange={e => setLeaveForm({...leaveForm, leave_slot: e.target.value})}>
                          <option value="full_day">Full Day</option>
                          <option value="first_half">First Half</option>
                          <option value="second_half">Second Half</option>
                        </select>
                      </div>
                      <div style={styles.formField}>
                        <label style={styles.formLabel}>From Date</label>
                        <input style={styles.formInput} type="date" required value={leaveForm.from_date}
                          onChange={e => setLeaveForm({...leaveForm, from_date: e.target.value,
                            to_date: leaveForm.leave_slot === 'full_day' ? leaveForm.to_date : e.target.value})} />
                      </div>
                      <div style={styles.formField}>
                        <label style={styles.formLabel}>To Date</label>
                        <input style={styles.formInput} type="date" required
                          disabled={leaveForm.leave_slot !== 'full_day'}
                          value={leaveForm.leave_slot === 'full_day' ? leaveForm.to_date : leaveForm.from_date}
                          onChange={e => setLeaveForm({...leaveForm, to_date: e.target.value})} />
                      </div>
                    </div>
                    <div style={styles.formField}>
                      <label style={styles.formLabel}>Reason</label>
                      <textarea style={{...styles.formInput, height:'70px', resize:'none'}} value={leaveForm.reason}
                        onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} />
                    </div>
                    <button type="submit" style={styles.submitBtn}>Submit Leave</button>
                  </form>
                )}
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Duration</th>
                      <th style={styles.th}>From</th>
                      <th style={styles.th}>To</th>
                      <th style={styles.th}>Reason</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.map(l => (
                      <tr key={l.id} style={styles.tr}>
                        <td style={styles.td}>{l.leave_type}</td>
                        <td style={styles.td}>{l.leave_slot === 'first_half' ? 'First Half' : l.leave_slot === 'second_half' ? 'Second Half' : 'Full Day'}</td>
                        <td style={styles.td}>{l.from_date}</td>
                        <td style={styles.td}>{l.to_date}</td>
                        <td style={styles.td}>{l.reason}</td>
                        <td style={styles.td}>
                          <span style={{...styles.badge,
                            background: l.status==='approved'?'#e1f5ee':l.status==='rejected'?'#fff0f0':'#fff9e6',
                            color: l.status==='approved'?'#085041':l.status==='rejected'?'#e53e3e':'#b7791f'
                          }}>{l.status}</span>
                        </td>
                      </tr>
                    ))}
                    {myLeaves.length === 0 && <tr><td colSpan={6} style={{...styles.td, textAlign:'center', color:'#888'}}>No leave requests yet</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* MEETING ROOMS */}
        {activeTab === 'bookings' && (
          <div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <p style={styles.cardTitle}>Meeting Rooms</p>
                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                  <label style={styles.formLabel}>Date</label>
                  <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} style={{...styles.formInput, width:'150px'}} />
                </div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:'1rem'}}>
                {rooms.map(room => (
                  <button key={room.id} onClick={() => setSelectedRoomId(room.id)}
                    style={{
                      border:`2px solid ${selectedRoomId === room.id ? '#3b82f6' : '#e2e8f0'}`,
                      background: selectedRoomId === room.id ? '#eff6ff' : '#fff',
                      borderRadius:'12px', padding:'1rem', textAlign:'left', cursor:'pointer'
                    }}>
                    <p style={{margin:'0 0 4px', fontWeight:'700', fontSize:'14px'}}>{room.name}</p>
                    <p style={{margin:'0 0 4px', fontSize:'12px', color:'#64748b'}}>📍 {room.location} · 👥 {room.capacity}</p>
                    <p style={{margin:0, fontSize:'11px', color: room.booked_slots?.length > 0 ? '#e53e3e' : '#22c55e', fontWeight:'600'}}>
                      {room.booked_slots?.length > 0 ? `${room.booked_slots.length} booking(s)` : 'Available'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.card}>
              <p style={styles.cardTitle}>Book a Room</p>
              <form onSubmit={createBooking}>
                <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1rem'}}>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Room</label>
                    <select style={styles.formInput} value={selectedRoomId || ''} onChange={e => setSelectedRoomId(Number(e.target.value))}>
                      <option value="">Select room</option>
                      {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Start Time</label>
                    <input type="time" style={styles.formInput} value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>End Time</label>
                    <input type="time" style={styles.formInput} value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Purpose</label>
                    <input style={styles.formInput} value={purpose} onChange={e => setPurpose(e.target.value)} />
                  </div>
                </div>
                <button type="submit" disabled={bookingLoading} style={styles.submitBtn}>
                  {bookingLoading ? 'Booking...' : '✅ Reserve Room'}
                </button>
              </form>
            </div>

            <div style={styles.card}>
              <p style={styles.cardTitle}>All Bookings</p>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>Room</th>
                    <th style={styles.th}>Booked By</th>
                    <th style={styles.th}>Department</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Purpose</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.id} style={styles.tr}>
                      <td style={styles.td}>{b.room_name}</td>
                      <td style={styles.td}>{b.booked_by}</td>
                      <td style={styles.td}>{b.department || '—'}</td>
                      <td style={styles.td}>{b.date}</td>
                      <td style={styles.td}>{b.start_time ? new Date(b.start_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '-'} - {b.end_time ? new Date(b.end_time).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                      <td style={styles.td}>{b.notes || b.purpose || '—'}</td>
                      <td style={styles.td}><span style={{...styles.badge, background: b.status==='confirmed'?'#e1f5ee':'#f1f5f9', color: b.status==='confirmed'?'#085041':'#64748b'}}>{b.status}</span></td>
                      <td style={styles.td}>
                        {b.status === 'confirmed' && <button onClick={() => cancelBooking(b.id)} style={{...styles.badge, background:'#fff0f0', color:'#e53e3e', cursor:'pointer', border:'none', padding:'5px 10px'}}>Cancel</button>}
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && <tr><td colSpan={8} style={{...styles.td, textAlign:'center', color:'#888'}}>No bookings yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BREAK MONITOR */}
        {activeTab === 'breaks' && (
          <div style={styles.card}>
            <p style={styles.cardTitle}>☕ Live Break Monitor — All Departments</p>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Total Break</th>
                  <th style={styles.th}>Breaks Taken</th>
                  <th style={styles.th}>On Break</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {breakSummary.map(s => {
                  const empUser = allUsers.find(u => u.id === s.user_id)
                  return (
                    <tr key={s.user_id} style={styles.tr}>
                      <td style={styles.td}><strong>{s.user_name}</strong></td>
                      <td style={styles.td}>{empUser?.department || '—'}</td>
                      <td style={styles.td}>{s.total_break_mins} mins</td>
                      <td style={styles.td}>{s.break_count}</td>
                      <td style={styles.td}>
                        {s.has_active_break
                          ? <span style={{color:'#e88c30', fontWeight:'600'}}>🟡 {s.active_type}</span>
                          : '—'}
                      </td>
                      <td style={styles.td}>
                        {s.flagged
                          ? <span style={{...styles.badge, background:'#fff0f0', color:'#e53e3e'}}>⚠️ Exceeded</span>
                          : <span style={{...styles.badge, background:'#e1f5ee', color:'#085041'}}>✅ OK</span>}
                      </td>
                    </tr>
                  )
                })}
                {breakSummary.length === 0 && <tr><td colSpan={6} style={{...styles.td, textAlign:'center', color:'#888'}}>No break data today</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* CHANGE PASSWORD */}
        {activeTab === 'password' && (
          <div style={styles.card}>
            <p style={styles.cardTitle}>Change Password</p>
            <form onSubmit={submitPasswordChange} style={{maxWidth:'400px'}}>
              <div style={styles.formField}>
                <label style={styles.formLabel}>Current Password</label>
                <input style={styles.formInput} type="password" required
                  value={passwordForm.current_password}
                  onChange={e => setPasswordForm({...passwordForm, current_password: e.target.value})} />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>New Password</label>
                <input style={styles.formInput} type="password" minLength={6} required
                  value={passwordForm.new_password}
                  onChange={e => setPasswordForm({...passwordForm, new_password: e.target.value})} />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>Confirm Password</label>
                <input style={styles.formInput} type="password" minLength={6} required
                  value={passwordForm.confirm_password}
                  onChange={e => setPasswordForm({...passwordForm, confirm_password: e.target.value})} />
              </div>
              <button type="submit" disabled={loading} style={styles.submitBtn}>
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  layout:             { display:'flex', minHeight:'100vh', background:'#f1f5f9' },
  sidebar:            { width:'80px', background:'linear-gradient(180deg,#2d3748 0%,#1a202c 100%)', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'1.5rem 0', flexShrink:0, alignItems:'center', boxShadow:'2px 0 12px rgba(0,0,0,0.15)' },
  sidebarLogo:        { width:'56px', height:'56px', marginBottom:'2rem', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'8px' },
  sidebarLogoImg:     { width:'100%', height:'100%', objectFit:'contain' },
  navBtn:             { display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', width:'100%', padding:'12px 0', background:'transparent', border:'none', color:'rgba(255,255,255,0.75)', fontSize:'10px', cursor:'pointer', borderLeft:'3px solid transparent', transition:'background 0.2s ease' },
  navBtnHover:        { background:'rgba(255,255,255,0.08)', color:'#fff' },
  navBtnActive:       { background:'rgba(59,130,246,0.2)', color:'#fff', borderLeft:'3px solid #60a5fa' },
  navIcon:            { fontSize:'20px' },
  navLabel:           { fontSize:'9px', textAlign:'center', lineHeight:'1.2' },
  logoutBtn:          { display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', width:'100%', padding:'12px 0', background:'transparent', border:'none', color:'rgba(255,255,255,0.6)', fontSize:'10px', cursor:'pointer' },
  logoutBtnHover:     { color:'#f87171', background:'rgba(248,113,113,0.1)' },
  profileSidebar:     { width:'220px', background:'#fff', borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', alignItems:'center', padding:'1.5rem 1rem', flexShrink:0, overflowY:'auto' },
  avatarWrap:         { marginBottom:'1rem' },
  avatarCircle:       { width:'80px', height:'80px', borderRadius:'50%', background:'linear-gradient(135deg,#f59e0b,#d97706)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontWeight:'700', color:'#fff', boxShadow:'0 8px 24px rgba(217,119,6,0.3)' },
  profileName:        { margin:'0 0 4px', fontSize:'18px', fontWeight:'800', color:'#111827', textAlign:'center' },
  profileId:          { margin:'0 0 4px', fontSize:'12px', color:'#6b7280', textAlign:'center' },
  profileDesignation: { margin:'0 0 14px', fontSize:'13px', color:'#374151', textAlign:'center', fontWeight:'600', background:'#fef3c7', padding:'3px 10px', borderRadius:'20px' },
  profileStatus:      { margin:'0 0 12px', fontSize:'13px', fontWeight:'700' },
  timerRow:           { display:'flex', alignItems:'center', gap:'4px', marginBottom:'1rem' },
  timerBox:           { background:'#f1f5f9', borderRadius:'6px', padding:'6px 10px', fontSize:'20px', fontWeight:'700', color:'#1a1a2e', fontVariantNumeric:'tabular-nums', minWidth:'44px', textAlign:'center' },
  timerSep:           { fontSize:'20px', fontWeight:'700', color:'#94a3b8' },
  profileDivider:     { width:'100%', height:'1px', background:'#e2e8f0', margin:'0.75rem 0' },
  reportingWrap:      { width:'100%', textAlign:'center' },
  reportingLabel:     { margin:'0 0 4px', fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em' },
  reportingValue:     { margin:0, fontSize:'13px', fontWeight:'600', color:'#1f2937' },
  breakSectionLabel:  { margin:'0 0 6px', fontSize:'11px', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em', alignSelf:'flex-start' },
  breakBtn:           { width:'100%', padding:'7px 10px', background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#334155', borderRadius:'8px', fontSize:'12px', cursor:'pointer', marginBottom:'4px' },
  activeBreakWrap:    { width:'100%', background:'#fff9e6', borderRadius:'8px', padding:'10px', textAlign:'center' },
  activeBreakLabel:   { margin:'0 0 8px', fontSize:'13px', fontWeight:'600', color:'#b7791f' },
  endBreakBtn:        { width:'100%', padding:'8px', background:'#e88c30', color:'#fff', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  changePassBtn:      { width:'100%', marginTop:'auto', padding:'8px', background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#64748b', borderRadius:'8px', fontSize:'12px', cursor:'pointer' },
  main:               { flex:1, padding:'1.5rem', overflowY:'auto' },
  msgBox:             { padding:'10px 16px', borderRadius:'8px', marginBottom:'1rem', fontSize:'14px' },
  homeGrid:           { display:'grid', gridTemplateColumns:'1fr 1fr 280px', gap:'1rem' },
  timesheetCard:      { background:'#fff', borderRadius:'16px', padding:'1.25rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', display:'flex', flexDirection:'column', alignItems:'center' },
  timesheetHeader:    { display:'flex', justifyContent:'space-between', width:'100%', marginBottom:'8px' },
  timesheetTitle:     { fontSize:'16px', fontWeight:'700', color:'#1a1a2e' },
  timesheetDate:      { fontSize:'12px', color:'#94a3b8' },
  punchInTime:        { fontSize:'12px', color:'#64748b', marginBottom:'8px' },
  circleWrap:         { margin:'0.5rem 0' },
  punchInBtn:         { padding:'10px 32px', background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'600', cursor:'pointer', marginBottom:'1rem' },
  punchOutBtn:        { padding:'10px 32px', background:'linear-gradient(135deg,#3b82f6,#2563eb)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'600', cursor:'pointer', marginBottom:'1rem' },
  doneChip:           { padding:'8px 24px', background:'#e1f5ee', color:'#085041', borderRadius:'8px', fontSize:'13px', fontWeight:'600', marginBottom:'1rem' },
  onBreakChip:        { padding:'8px 24px', background:'#fff9e6', color:'#b7791f', borderRadius:'8px', fontSize:'13px', fontWeight:'600', marginBottom:'1rem' },
  timesheetFooter:    { display:'flex', gap:'2rem', marginTop:'4px' },
  timesheetStat:      { textAlign:'center' },
  timesheetStatLabel: { margin:'0 0 2px', fontSize:'10px', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em' },
  timesheetStatVal:   { margin:0, fontSize:'14px', fontWeight:'700', color:'#1a1a2e' },
  statsCard:          { background:'#fff', borderRadius:'16px', padding:'1.25rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', overflowY:'auto' },
  statsTitle:         { margin:'0 0 1rem', fontSize:'16px', fontWeight:'700', color:'#1a1a2e' },
  activityCard:       { background:'#fff', borderRadius:'16px', padding:'1.25rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' },
  activityTitle:      { margin:'0 0 1rem', fontSize:'16px', fontWeight:'700', color:'#1a1a2e' },
  timeline:           { display:'flex', flexDirection:'column', gap:'12px' },
  timelineItem:       { display:'flex', alignItems:'center', gap:'10px' },
  timelineDot:        { width:'10px', height:'10px', borderRadius:'50%', flexShrink:0 },
  timelineLabel:      { margin:0, fontSize:'13px', fontWeight:'600', color:'#1a1a2e' },
  timelineTime:       { margin:0, fontSize:'11px', color:'#94a3b8' },
  attendanceListCard: { background:'#fff', borderRadius:'16px', padding:'1.25rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', gridColumn:'1 / 3' },
  chartCard:          { background:'#fff', borderRadius:'16px', padding:'1.25rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' },
  chartTitle:         { margin:'0 0 1rem', fontSize:'16px', fontWeight:'700', color:'#1a1a2e' },
  card:               { background:'#fff', padding:'1.5rem', borderRadius:'16px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1rem' },
  cardTitle:          { margin:'0 0 1rem', fontSize:'16px', fontWeight:'700', color:'#1a1a2e' },
  cardHeader:         { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' },
  exportBtn:          { padding:'7px 14px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'600' },
  submitBtn:          { padding:'10px 24px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'600' },
  table:              { width:'100%', borderCollapse:'collapse' },
  thead:              { background:'#f8fafc' },
  th:                 { padding:'10px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:'#64748b', borderBottom:'1px solid #e2e8f0', textTransform:'uppercase', letterSpacing:'0.05em' },
  tr:                 { borderBottom:'1px solid #f1f5f9' },
  td:                 { padding:'10px 12px', fontSize:'13px', color:'#334155' },
  badge:              { padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'500' },
  leaveForm:          { background:'#f8fafc', padding:'1.25rem', borderRadius:'10px', marginBottom:'1.5rem' },
  formField:          { marginBottom:'0.75rem' },
  formLabel:          { display:'block', fontSize:'12px', fontWeight:'500', color:'#64748b', marginBottom:'4px' },
  formInput:          { width:'100%', padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box' },
}