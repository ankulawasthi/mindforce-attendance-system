import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import mfrLogo from '../../assets/mfr-logo.png'

const NAV_LINKS = [
  { key: 'overview',  label: 'Home',         icon: '🏠' },
  { key: 'history',   label: 'Attendance',    icon: '📅' },
  { key: 'bookings', label: 'Meeting Rooms', icon: '🏢' },
  { key: 'leaves',    label: 'Leave Tracker', icon: '🏖️' },
  { key: 'breaks',    label: 'Time Tracker',  icon: '⏱️' },
  
]

const BREAK_TYPES = [
  { value: 'lunch',    label: '🍽️ Lunch' },
  { value: 'short',    label: '☕ Short Break' },
  { value: 'personal', label: '🚶 Personal' },
]

export default function EmployeeDashboard() {
  const [userProfile, setUserProfile] = useState(null)
  const { user, logout }                  = useAuth()
  const [activeTab, setActiveTab]         = useState('overview')
  const [hoveredTab, setHoveredTab]       = useState(null)
  const [isLogoutHovered, setIsLogoutHovered] = useState(false)
  const [showProfile, setShowProfile]     = useState(false)
  const [attendance, setAttendance]       = useState(null)
  const [breaks, setBreaks]               = useState([])
  const [activeBreak, setActiveBreak]     = useState(null)
  const [history, setHistory]             = useState([])
  const [leaves, setLeaves]               = useState([])
  const [loading, setLoading]             = useState(false)
  const [message, setMessage]             = useState({ text: '', type: 'success' })
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [leaveForm, setLeaveForm]         = useState({ leave_type: 'casual', leave_slot: 'full_day', from_date: '', to_date: '', reason: '' })
  const [rooms, setRooms]                 = useState([])
  const [bookings, setBookings]           = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [bookingDate, setBookingDate]     = useState(new Date().toISOString().slice(0,10))
  const [startTime, setStartTime]         = useState('09:00')
  const [endTime, setEndTime]             = useState('10:00')
  const [purpose, setPurpose]             = useState('Team sync')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [now, setNow]                     = useState(new Date())
  const [passwordForm, setPasswordForm]   = useState({ current_password: '', new_password: '', confirm_password: '' })

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { fetchToday(); fetchHistory(); fetchLeaves(); fetchProfile() }, [])
  useEffect(() => { if (activeTab === 'bookings') { fetchRooms(); fetchBookings() } }, [bookingDate, activeTab])

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: 'success' }), 4000)
  }

  const fetchToday = async () => {
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

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leave_requests')
      setLeaves(res.data)
    } catch (err) { console.error(err) }
  }

  const fetchProfile = async () => {
  try {
    const res = await api.get('/auth/me')
    setUserProfile(res.data)
  } catch (err) { console.error(err) }
}

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      const res = await api.post('/attendances/clock_in')
      setAttendance(res.data)
      await fetchToday()
      showMsg('✅ Checked in successfully!')
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
    finally { setLoading(false) }
  }

  const handleCheckOut = async () => {
    if (activeBreak) return showMsg('⚠️ Please end your break before checking out', 'error')
    setLoading(true)
    try {
      const res = await api.post('/attendances/clock_out')
      setAttendance(res.data)
      showMsg(res.data.message || '✅ Checked out successfully!')
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
    finally { setLoading(false) }
  }

  const startBreak = async (breakType) => {
    setLoading(true)
    try {
      const res = await api.post('/breaks', { break_type: breakType })
      setActiveBreak(res.data)
      setBreaks(prev => [...prev, res.data])
      showMsg(`✅ ${breakType.charAt(0).toUpperCase() + breakType.slice(1)} break started!`)
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
      if (res.data.warning) showMsg(res.data.warning, 'warning')
      else showMsg(`✅ Break ended — ${res.data.duration_mins} mins`)
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
    finally { setLoading(false) }
  }

  const submitLeave = async (e) => {
    e.preventDefault()
    try {
      const payload = leaveForm.leave_slot === 'full_day'
        ? leaveForm
        : { ...leaveForm, to_date: leaveForm.from_date }
      await api.post('/leave_requests', { leave_request: payload })
      showMsg('✅ Leave request submitted!')
      setShowLeaveForm(false)
      setLeaveForm({ leave_type: 'casual', leave_slot: 'full_day', from_date: '', to_date: '', reason: '' })
      fetchLeaves()
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
  }

  const fetchRooms = async () => {
    try {
      const res = await api.get('/meeting_rooms', { params: { date: bookingDate } })
      setRooms(res.data)
      if (!selectedRoomId && res.data.length > 0) setSelectedRoomId(res.data[0].id)
    } catch (err) {
      showMsg(err.response?.data?.error || 'Unable to load rooms', 'error')
    }
  }

  const fetchBookings = async () => {
    try {
      const res = await api.get('/room_bookings')
      setBookings(res.data)
    } catch (err) {
      showMsg(err.response?.data?.error || 'Unable to load bookings', 'error')
    }
  }

  const createBooking = async (e) => {
    e.preventDefault()
    if (!selectedRoomId) {
      showMsg('Select a room to book', 'error')
      return
    }
    if (startTime >= endTime) {
      showMsg('End time must be after start time', 'error')
      return
    }
    const selectedRoom = rooms.find(room => room.id === selectedRoomId)
    const conflict = selectedRoom?.booked_slots?.some(slot => !(endTime <= slot.start_time || startTime >= slot.end_time))
    if (conflict) {
      showMsg('Selected slot conflicts with an existing booking', 'error')
      return
    }
    setBookingLoading(true)
    try {
      await api.post('/room_bookings', {
        room_booking: {
          meeting_room_id: selectedRoomId,
          date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          purpose
        }
      })
      showMsg('✅ Room booked successfully!')
      setPurpose('Team sync')
      fetchRooms()
      fetchBookings()
    } catch (err) {
      showMsg(err.response?.data?.errors?.[0] || 'Unable to create booking', 'error')
    } finally {
      setBookingLoading(false)
    }
  }

  const cancelBooking = async (bookingId) => {
    setBookingLoading(true)
    try {
      await api.delete(`/room_bookings/${bookingId}`)
      showMsg('✅ Booking cancelled')
      fetchRooms()
      fetchBookings()
    } catch (err) {
      showMsg(err.response?.data?.error || 'Unable to cancel booking', 'error')
    } finally {
      setBookingLoading(false)
    }
  }

  const submitPasswordChange = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.patch('/auth/change_password', passwordForm)
      showMsg('✅ Password changed successfully!')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setActiveTab('overview')
    } catch (err) {
      showMsg(err.response?.data?.error || 'Failed to change password', 'error')
    } finally { setLoading(false) }
  }

  const exportAttendance = async () => {
    try {
      const res = await api.get('/attendances/export', { responseType: 'blob' })
      const url  = window.URL.createObjectURL(new Blob([res.data]))
      const a    = document.createElement('a')
      a.href     = url
      a.download = `my_attendance_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) { showMsg('Failed to export', 'error') }
  }

  const checkedIn  = !!attendance?.clock_in
  const checkedOut = !!attendance?.clock_out

  const lunchCount    = breaks.filter(b => b.break_type === 'lunch').length
  const shortCount    = breaks.filter(b => b.break_type === 'short').length

  const activeSeconds      = activeBreak ? Math.floor((now - new Date(activeBreak.break_start)) / 1000) : 0
  const activeDurationMins = Math.floor(activeSeconds / 60)
  const activeSecsRemain   = activeSeconds % 60

  const BREAK_LIMIT      = 90
  const totalBreakMin    = breaks.reduce((sum, b) => sum + (b.duration_mins || 0), 0) + activeDurationMins
  const breakUsagePct    = Math.min(100, (totalBreakMin / BREAK_LIMIT) * 100)
  const breakStatusColor = totalBreakMin > BREAK_LIMIT ? '#ef4444' : totalBreakMin > 60 ? '#f59e0b' : '#22c55e'
  const breakStatusLabel = totalBreakMin > BREAK_LIMIT ? 'Break Exceeded' : totalBreakMin > 60 ? 'Approaching limit' : 'Within limit'

  const rawWorkSeconds = attendance?.clock_in && !attendance?.clock_out
    ? Math.max(0, Math.floor((now - new Date(attendance.clock_in)) / 1000))
    : 0
  const netWorkSeconds = rawWorkSeconds
  const netWorkHrs     = (netWorkSeconds / 3600).toFixed(2)

  // Progress circle calculations (8hr work day)
  const WORK_DAY_SECS  = 8 * 3600
  const progressPct    = Math.min(100, (netWorkSeconds / WORK_DAY_SECS) * 100)
  const circumference  = 2 * Math.PI * 54
  const strokeDash     = (progressPct / 100) * circumference

  // Today's activity timeline
  const todayActivity = []
  if (attendance?.clock_in) todayActivity.push({ type: 'in',  time: new Date(attendance.clock_in),  label: 'Punch In' })
  breaks.forEach(b => {
    if (b.break_start) todayActivity.push({ type: 'out', time: new Date(b.break_start), label: 'Break Start' })
    if (b.break_end)   todayActivity.push({ type: 'in',  time: new Date(b.break_end),   label: 'Break End' })
  })
  if (attendance?.clock_out) todayActivity.push({ type: 'out', time: new Date(attendance.clock_out), label: 'Punch Out' })
  todayActivity.sort((a, b) => a.time - b.time)

  // Weekly stats
  const thisWeekHrs  = history.slice(0, 5).reduce((s, a) => s + (parseFloat(a.total_hours) || 0), 0).toFixed(1)
  const thisMonthHrs = history.slice(0, 22).reduce((s, a) => s + (parseFloat(a.total_hours) || 0), 0).toFixed(1)

  const chartData = history.slice(0, 7).reverse().map(a => ({
    date:  a.date?.slice(5),
    hours: parseFloat(a.total_hours) || 0
  }))

  const msgStyle = {
    ...styles.msgBox,
    background: message.type === 'error' ? '#fff0f0' : message.type === 'warning' ? '#fff9e6' : '#e1f5ee',
    color:      message.type === 'error' ? '#e53e3e' : message.type === 'warning' ? '#b7791f' : '#085041',
  }

  const today = now.toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'short', year:'numeric' })

  return (
    <div style={styles.layout}>

      {/* ── Icon Sidebar ── */}
      <div style={styles.sidebar}>
        <div>
          <div style={styles.sidebarLogo}>
            <img src={mfrLogo} alt="MFR logo" style={styles.sidebarLogoImg} />
          </div>
          {NAV_LINKS.map(link => (
    
            <button key={link.key}
              onClick={() => setActiveTab(link.key)}
              onMouseEnter={() => setHoveredTab(link.key)}
              onMouseLeave={() => setHoveredTab(null)}
              style={{
                ...styles.navBtn,
                ...(activeTab === link.key ? styles.navBtnActive : {}),
                ...(hoveredTab === link.key ? styles.navBtnHover : {})
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
          style={{
            ...styles.logoutBtn,
            ...(isLogoutHovered ? styles.logoutBtnHover : {})
          }}>
          <span style={styles.navIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M20 4H16C14.8954 4 14 4.89543 14 6V18C14 19.1046 14.8954 20 16 20H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span style={styles.navLabel}>Logout</span>
        </button>
      </div>

      {/* ── Profile Sidebar ── */}
      <div style={styles.profileSidebar}>
        {/* Avatar */}
        <div style={styles.avatarWrap}>
          <div style={styles.avatarCircle}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        </div>

        {/* Name & Title */}
        <p style={styles.profileName}>{user?.name || 'Employee Name'}</p>
        <p style={styles.profileId}>{user?.employee_id || 'ID not assigned'}</p>
        <p style={styles.profileDesignation}>{user?.job_title || 'Employee'}</p>
        
        <div style={styles.profileDivider} />

        <div style={styles.reportingWrap}>
          <p style={styles.reportingLabel}>Reporting Manager</p>
          <p style={styles.reportingValue}>{user?.manager_name || user?.reporting_manager || '—'}</p>
        </div>

        <div style={styles.profileDivider} />

        {/* Status */}
        <p style={{
          ...styles.profileStatus,
          color: checkedIn && !checkedOut ? '#22c55e' : '#e53e3e'
        }}>
          {checkedIn && !checkedOut ? 'In' : checkedOut ? 'Out' : 'Yet to check-in'}
        </p>

        {/* HH:MM:SS Timer */}
        <div style={styles.timerRow}>
          <div style={styles.timerBox}>{String(Math.floor(netWorkSeconds / 3600)).padStart(2,'0')}</div>
          <span style={styles.timerSep}>:</span>
          <div style={styles.timerBox}>{String(Math.floor((netWorkSeconds % 3600) / 60)).padStart(2,'0')}</div>
          <span style={styles.timerSep}>:</span>
          <div style={styles.timerBox}>{String(netWorkSeconds % 60).padStart(2,'00')}</div>
        </div>

        <div style={styles.profileDivider} />

        {/* Reporting To */}
        {/* <div style={styles.reportingWrap}>
          <p style={styles.reportingLabel}>Reporting Manager</p>
<p style={styles.reportingValue}>
  {userProfile?.manager_id ? `${userProfile.manager_id} - ${userProfile.manager}` : '—'}
</p>
<div style={styles.profileDivider} />
<p style={styles.reportingLabel}>Department</p>
<p style={styles.reportingValue}>{userProfile?.department || '—'}</p>
        </div> */}

        <div style={styles.profileDivider} />

        {/* Break Buttons */}
        {checkedIn && !checkedOut && (
          <div style={{width:'100%'}}>
            <p style={styles.breakSectionLabel}>Breaks</p>
            {!activeBreak ? (
              BREAK_TYPES.map(bt => (
                <button key={bt.value} onClick={() => startBreak(bt.value)}
                  disabled={loading}
                  style={styles.breakBtn}>
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

        {/* Change Password */}
        <button onClick={() => setActiveTab('password')} style={styles.changePassBtn}>🔑 Change Password</button>
      </div>

      {/* ── Main Content ── */}
      <div style={styles.main}>

        {message.text && <div style={msgStyle}>{message.text}</div>}

        {/* ── HOME ── */}
        {activeTab === 'overview' && (
          <div style={styles.homeGrid}>

            {/* Timesheet Card */}
            <div style={styles.timesheetCard}>
              <div style={styles.timesheetHeader}>
                <span style={styles.timesheetTitle}>Timesheet</span>
                <span style={styles.timesheetDate}>{today}</span>
              </div>
              {attendance?.clock_in && (
                <p style={styles.punchInTime}>
                  Punch In at {new Date(attendance.clock_in).toLocaleDateString('en-US', {weekday:'short', day:'numeric', month:'short', year:'numeric'})} {new Date(attendance.clock_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                </p>
              )}

              {/* Circular Progress */}
              <div style={styles.circleWrap}>
                <svg width="140" height="140" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                  <circle cx="60" cy="60" r="54" fill="none"
                    stroke={progressPct >= 100 ? '#22c55e' : '#3b82f6'}
                    strokeWidth="10"
                    strokeDasharray={`${strokeDash} ${circumference}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{transition:'stroke-dasharray 1s ease'}}
                  />
                  <text x="60" y="55" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1a1a2e">
                    {netWorkHrs} hrs
                  </text>
                  <text x="60" y="72" textAnchor="middle" fontSize="9" fill="#888">
                    of 8 hrs
                  </text>
                </svg>
              </div>

              {/* Punch In/Out Button */}
              {!checkedIn && (
                <button onClick={handleCheckIn} disabled={loading} style={styles.punchInBtn}>
                  ✦ Punch In
                </button>
              )}
              {checkedIn && !checkedOut && !activeBreak && (
                <button onClick={handleCheckOut} disabled={loading} style={styles.punchOutBtn}>
                  Punch Out
                </button>
              )}
              {checkedIn && checkedOut && (
                <div style={styles.doneChip}>✓ Done for today</div>
              )}
              {checkedIn && !checkedOut && activeBreak && (
                <div style={styles.onBreakChip}>☕ On Break</div>
              )}

              {/* Break & Overtime */}
              <div style={styles.timesheetFooter}>
                <div style={styles.timesheetStat}>
                  <p style={styles.timesheetStatLabel}>BREAK</p>
                  <p style={{...styles.timesheetStatVal, color: breakStatusColor}}>{totalBreakMin} mins / {BREAK_LIMIT} mins</p>
                  <p style={{margin:0, fontSize:'11px', color: breakStatusColor, fontWeight:'600'}}>{breakStatusLabel}</p>
                </div>
                <div style={styles.timesheetStat}>
                  <p style={styles.timesheetStatLabel}>STATUS</p>
                  <p style={{...styles.timesheetStatVal,
                    color: attendance?.status === 'present' ? '#22c55e'
                         : attendance?.status === 'half_day' ? '#f59e0b'
                         : attendance?.status === 'late' ? '#3b82f6' : '#e53e3e'
                  }}>{attendance?.status?.replace('_',' ') || '—'}</p>
                </div>
              </div>
            </div>

            {/* Statistics Card */}
            <div style={styles.statsCard}>
              <p style={styles.statsTitle}>Statistics</p>
              {[
                { label:'Today',      val: netWorkHrs,     max: 8,   color:'#22c55e' },
                { label:'This Week',  val: thisWeekHrs,    max: 40,  color:'#e53e3e' },
                { label:'This Month', val: thisMonthHrs,   max: 180, color:'#3b82f6' },
                { label:'Remaining',  val: Math.max(0, 180 - parseFloat(thisMonthHrs)).toFixed(1), max: 180, color:'#a855f7' },
              ].map((s, i) => (
                <div key={i} style={styles.statRow}>
                  <div style={styles.statRowLeft}>
                    <span style={styles.statRowLabel}>{s.label}</span>
                    <span style={styles.statRowVal}>{s.val} / {s.max} hrs</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${Math.min(100, (parseFloat(s.val) / s.max) * 100)}%`,
                      background: s.color
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Today Activity */}
            <div style={styles.activityCard}>
              <p style={styles.activityTitle}>Today Activity</p>
              {todayActivity.length === 0 ? (
                <p style={{color:'#888', fontSize:'13px', textAlign:'center', marginTop:'2rem'}}>No activity yet</p>
              ) : (
                <div style={styles.timeline}>
                  {todayActivity.map((a, i) => (
                    <div key={i} style={styles.timelineItem}>
                      <div style={{
                        ...styles.timelineDot,
                        background: a.type === 'in' ? '#22c55e' : '#e53e3e'
                      }} />
                      <div>
                        <p style={styles.timelineLabel}>{a.label}</p>
                        <p style={styles.timelineTime}>
                          {a.time.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance List */}
            <div style={styles.attendanceListCard}>
              <div style={styles.cardHeader}>
                <p style={styles.cardTitle}>Attendance List</p>
                <button onClick={exportAttendance} style={styles.exportBtn}>⬇ Export</button>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>S.No</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Punch In</th>
                    <th style={styles.th}>Punch Out</th>
                    <th style={styles.th}>Production</th>
                    <th style={styles.th}>Break</th>
                    
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 10).map((a, i) => {
                    const breakMins = a.total_break_mins || 0
                    return (
                      <tr key={a.id} style={styles.tr}>
                        <td style={styles.td}>{i + 1}</td>
                        <td style={styles.td}>{a.date}</td>
                        <td style={styles.td}>{a.clock_in ? new Date(a.clock_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                        <td style={styles.td}>{a.clock_out ? new Date(a.clock_out).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                        <td style={styles.td}>{a.total_hours ? `${a.total_hours} hrs` : '-'}</td>
                        <td style={styles.td}>{totalBreakMin} mins </td>
                        <td style={styles.td}>
                          <span style={{...styles.badge,
                            background: a.status==='present'?'#e1f5ee':a.status==='half_day'?'#fff9e6':a.status==='late'?'#e6f1fb':'#fff0f0',
                            color: a.status==='present'?'#085041':a.status==='half_day'?'#b7791f':a.status==='late'?'#0C447C':'#e53e3e'
                          }}>{a.status?.replace('_',' ')}</span>
                        </td>
                      </tr>
                    )
                  })}
                  {history.length === 0 && (
                    <tr><td colSpan={7} style={{...styles.td, color:'#888', textAlign:'center'}}>No records yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Daily Records Chart */}
            <div style={styles.chartCard}>
              <p style={styles.chartTitle}>Daily Records</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize:11}} />
                  <YAxis tick={{fontSize:11}} />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

          </div>
        )}

        {/* ── ROOM BOOKING ── */}
        {activeTab === 'bookings' && (
          <div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <p style={styles.cardTitle}>Meeting Rooms</p>
                <div style={styles.roomHeaderActions}>
                  <label style={styles.formLabel}>Date</label>
                  <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} style={styles.formInput} />
                </div>
              </div>
              <div style={styles.roomGrid}>
                {rooms.map(room => (
                  <button key={room.id} onClick={() => setSelectedRoomId(room.id)}
                    style={{
                      ...styles.roomCard,
                      borderColor: selectedRoomId === room.id ? '#3b82f6' : '#e2e8f0',
                      background: selectedRoomId === room.id ? '#eff6ff' : '#fff'
                    }}>
                    <div style={styles.roomTitle}>{room.name}</div>
                    <div style={styles.roomMeta}>{room.location}</div>
                    <div style={styles.roomStats}>
                      <span>{room.capacity} seats</span>
                      <span style={{ color: room.available ? '#16a34a' : '#dc2626' }}>
                        {room.available ? 'Available' : 'Booked'}
                      </span>
                    </div>
                    {room.booked_slots?.length > 0 && (
                      <div style={styles.slotSummary}>
                        {room.booked_slots.map((slot, index) => (
                          <span key={index} style={styles.slotBadge}>{slot.start_time} - {slot.end_time}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
                {rooms.length === 0 && (
                  <div style={{ gridColumn:'1 / -1', color:'#64748b', textAlign:'center', padding:'1.5rem' }}>No rooms available for the selected date.</div>
                )}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <p style={styles.cardTitle}>Book a Room</p>
                <span style={styles.subtitle}>Reserve an available room and protect your schedule</span>
              </div>
              <form onSubmit={createBooking} style={styles.bookingForm}>
                <div style={styles.formRow}>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Meeting Room</label>
                    <select style={styles.formInput} value={selectedRoomId || ''} onChange={e => setSelectedRoomId(Number(e.target.value))}>
                      <option value="">Select a room</option>
                      {rooms.map((room, index) => (
                        <option key={room.id} value={room.id}>{`Meeting Room ${index + 1}`}</option>
                      ))}
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
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Purpose</label>
                  <input style={styles.formInput} value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Team sync, review, client call" />
                </div>
                <button type="submit" disabled={bookingLoading} style={styles.submitBtn}>
                  {bookingLoading ? 'Booking...' : 'Reserve Room'}
                </button>
              </form>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <p style={styles.cardTitle}>Your Bookings</p>
                <span style={styles.subtitle}>Manage reservations and cancel if plans change</span>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>Room</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Purpose</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(booking => (
                    <tr key={booking.id} style={styles.tr}>
                      <td style={styles.td}>{booking.meeting_room?.name}</td>
                      <td style={styles.td}>{booking.date}</td>
                      <td style={styles.td}>{booking.start_time} - {booking.end_time}</td>
                      <td style={styles.td}>{booking.purpose}</td>
                      <td style={styles.td}><span style={{...styles.badge, background:'#e1f5ee', color:'#085041'}}>Confirmed</span></td>
                      <td style={styles.td}><button onClick={() => cancelBooking(booking.id)} style={styles.cancelBtn}>Cancel</button></td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr><td colSpan={6} style={{...styles.td, textAlign:'center', color:'#64748b'}}>You have no room bookings yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── LEAVE TRACKER ── */}
        {activeTab === 'leaves' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <p style={styles.cardTitle}>Leave Requests</p>
              <button onClick={() => setShowLeaveForm(!showLeaveForm)} style={styles.exportBtn}>+ New Request</button>
            </div>

            {showLeaveForm && (
              <form onSubmit={submitLeave} style={styles.leaveForm}>
                <div style={styles.formRow}>
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
                      <option value="first_half">First Half (Sunrise)</option>
                      <option value="second_half">Second Half (Sunset)</option>
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
                <button type="submit" style={styles.submitBtn}>Submit Request</button>
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
                {leaves.map(l => (
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
                {leaves.length === 0 && <tr><td colSpan={6} style={{...styles.td, color:'#888', textAlign:'center'}}>No requests yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TIME TRACKER (BREAKS) ── */}
        {activeTab === 'breaks' && (
          <div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.5rem'}}>
              {BREAK_TYPES.map(bt => {
                const totalMins = breaks.filter(b => b.break_type === bt.value).reduce((s, b) => s + (b.duration_mins || 0), 0) + (activeBreak?.break_type === bt.value ? activeDurationMins : 0)
                return (
                  <div key={bt.value} style={{...styles.card, borderTop:`3px solid #3b82f6`}}>
                    <p style={{margin:'0 0 4px', fontSize:'20px', fontWeight:'700', color:'#3b82f6'}}>{totalMins}m</p>
                    <p style={{margin:0, color:'#888', fontSize:'12px'}}>{bt.label}</p>
                    <p style={{fontSize:'11px', color:'#64748b', margin:'4px 0 0'}}>
                      Unlimited
                    </p>
                  </div>
                )
              })}
              <div style={{...styles.card, borderTop:`3px solid ${breakStatusColor}`}}>
                <p style={{margin:'0 0 4px', fontSize:'20px', fontWeight:'700', color:breakStatusColor}}>{totalBreakMin}m</p>
                <p style={{margin:0, color:'#888', fontSize:'12px'}}>Total Break</p>
                <p style={{margin:'6px 0 0', fontSize:'12px', color:breakStatusColor, fontWeight:'600'}}>
                  {breakStatusLabel}
                </p>
                <p style={{margin:'4px 0 0', fontSize:'11px', color:'#64748b'}}>Limit: {BREAK_LIMIT}m</p>
              </div>
            </div>

            <div style={styles.card}>
              <p style={styles.cardTitle}>Today's Break Log</p>
              {breaks.length === 0 ? (
                <p style={{color:'#888', textAlign:'center', padding:'2rem'}}>No breaks taken today</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Start</th>
                      <th style={styles.th}>End</th>
                      <th style={styles.th}>Duration</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breaks.map((b, i) => {
                      const totalExceeded = totalBreakMin > BREAK_LIMIT
                      return (
                        <tr key={b.id} style={styles.tr}>
                          <td style={styles.td}>{i + 1}</td>
                          <td style={styles.td}>{b.break_type === 'lunch' ? '🍽️' : b.break_type === 'short' ? '☕' : '🚶'} {b.break_type}</td>
                          <td style={styles.td}>{new Date(b.break_start).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                          <td style={styles.td}>{b.break_end ? new Date(b.break_end).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                          <td style={styles.td}>
                            {b.is_active
                              ? <span style={{color:'#3b82f6', fontWeight:'600'}}>{activeDurationMins > 0 ? `${activeDurationMins}m ${activeSecsRemain}s` : `${activeSecsRemain}s`} (live)</span>
                              : <span style={{color: '#333'}}>{b.duration_mins}m</span>
                            }
                          </td>
                          <td style={styles.td}>
                            {b.is_active ? <span style={{...styles.badge, background: totalExceeded ? '#fff0f0' : '#e6f1fb', color: totalExceeded ? '#e53e3e' : '#0C447C'}}>{totalExceeded ? 'Exceeded' : 'Active'}</span>
                              : <span style={{...styles.badge, background:'#e1f5ee', color:'#085041'}}>Completed</span>
                            }
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {activeTab === 'history' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <p style={styles.cardTitle}>Attendance History</p>
              <button onClick={exportAttendance} style={styles.exportBtn}>⬇ Export CSV</button>
            </div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Punch In</th>
                  <th style={styles.th}>Punch Out</th>
                  <th style={styles.th}>Hours</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map(a => (
                  <tr key={a.id} style={styles.tr}>
                    <td style={styles.td}>{a.date}</td>
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
                ))}
                {history.length === 0 && <tr><td colSpan={5} style={{...styles.td, color:'#888', textAlign:'center'}}>No records yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── CHANGE PASSWORD ── */}
        {activeTab === 'password' && (
          <div style={styles.card}>
            <p style={styles.cardTitle}>Change Password</p>
            <form onSubmit={submitPasswordChange} style={styles.leaveForm}>
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
                <label style={styles.formLabel}>Confirm New Password</label>
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

  // Icon sidebar
  sidebar:            { width:'80px', background:'linear-gradient(180deg, #2d3748 0%, #1a202c 100%)', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'1.5rem 0', flexShrink:0, alignItems:'center', boxShadow:'2px 0 12px rgba(0,0,0,0.15)' },
  sidebarLogo:        { width:'56px', height:'56px', marginBottom:'2rem', display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,0.1)', borderRadius:'12px', padding:'8px' },
  sidebarLogoImg:     { width:'100%', height:'100%', objectFit:'contain', filter:'brightness(1.1)' },
  navBtn:             { display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', width:'100%', padding:'12px 0', background:'transparent', border:'none', color:'rgba(255,255,255,0.75)', fontSize:'10px', cursor:'pointer', borderLeft:'3px solid transparent', transition:'background 0.2s ease, color 0.2s ease' },
  navBtnHover:        { background:'rgba(255,255,255,0.08)', color:'#fff' },
  navBtnActive:       { background:'rgba(59,130,246,0.2)', color:'#fff', borderLeft:'3px solid #60a5fa' },
  navIcon:            { fontSize:'20px' },
  navLabel:           { fontSize:'9px', textAlign:'center', lineHeight:'1.2' },
  logoutBtn:          { display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', width:'100%', padding:'12px 0', background:'transparent', border:'none', color:'rgba(255,255,255,0.6)', fontSize:'10px', cursor:'pointer', transition:'color 0.2s ease, background 0.2s ease' },
  logoutBtnHover:     { color:'#f87171', background:'rgba(248,113,113,0.1)' },

  // Profile sidebar
  profileSidebar:     { width:'220px', background:'#fff', borderRight:'1px solid #e2e8f0', display:'flex', flexDirection:'column', alignItems:'center', padding:'1.5rem 1rem', flexShrink:0, overflowY:'auto' },
  avatarWrap:         { marginBottom:'1rem' },
  avatarCircle:       { width:'80px', height:'80px', borderRadius:'50%', background:'linear-gradient(135deg,#7F77DD,#534AB7)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', fontWeight:'700', color:'#fff', boxShadow:'0 8px 24px rgba(83,74,183,0.3)' },
  profileName:        { margin:'0 0 4px', fontSize:'20px', fontWeight:'800', color:'#111827', textAlign:'center', lineHeight:'1.1' },
  profileId:          { margin:'0 0 8px', fontSize:'12px', color:'#6b7280', textAlign:'center' },
  profileDesignation: { margin:'0 0 14px', fontSize:'13px', color:'#374151', textAlign:'center', fontWeight:'600' },
  profileStatus:      { margin:'0 0 12px', fontSize:'13px', fontWeight:'700' },
  timerRow:           { display:'flex', alignItems:'center', gap:'4px', marginBottom:'1rem' },
  timerBox:           { background:'#f1f5f9', borderRadius:'6px', padding:'6px 10px', fontSize:'20px', fontWeight:'700', color:'#1a1a2e', fontVariantNumeric:'tabular-nums', minWidth:'44px', textAlign:'center' },
  timerSep:           { fontSize:'20px', fontWeight:'700', color:'#94a3b8' },
  profileDivider:     { width:'100%', height:'1px', background:'#e2e8f0', margin:'0.75rem 0' },
  reportingWrap:      { width:'100%', textAlign:'center', padding:'0 0.25rem' },
  reportingLabel:     { margin:'0 0 4px', fontSize:'11px', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.08em' },
  reportingValue:     { margin:0, fontSize:'13px', fontWeight:'600', color:'#1f2937' },
  breakSectionLabel:  { margin:'0 0 6px', fontSize:'11px', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em', alignSelf:'flex-start' },
  breakBtn:           { width:'100%', padding:'7px 10px', background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#334155', borderRadius:'8px', fontSize:'12px', cursor:'pointer', marginBottom:'4px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  breakMax:           { fontSize:'10px', color:'#94a3b8', background:'#e2e8f0', padding:'2px 6px', borderRadius:'8px' },
  activeBreakWrap:    { width:'100%', background:'#fff9e6', borderRadius:'8px', padding:'10px', textAlign:'center' },
  activeBreakLabel:   { margin:'0 0 8px', fontSize:'13px', fontWeight:'600', color:'#b7791f' },
  endBreakBtn:        { width:'100%', padding:'8px', background:'#e88c30', color:'#fff', border:'none', borderRadius:'8px', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  changePassBtn:      { width:'100%', marginTop:'auto', padding:'8px', background:'#f1f5f9', border:'1px solid #e2e8f0', color:'#64748b', borderRadius:'8px', fontSize:'12px', cursor:'pointer' },

  // Main
  main:               { flex:1, padding:'1.5rem', overflowY:'auto' },
  msgBox:             { padding:'10px 16px', borderRadius:'8px', marginBottom:'1rem', fontSize:'14px' },

  // Home Grid
  homeGrid:           { display:'grid', gridTemplateColumns:'1fr 1fr 280px', gridTemplateRows:'auto auto', gap:'1rem' },
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

  statsCard:          { background:'#fff', borderRadius:'16px', padding:'1.25rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' },
  statsTitle:         { margin:'0 0 1rem', fontSize:'16px', fontWeight:'700', color:'#1a1a2e' },
  statRow:            { marginBottom:'1rem' },
  statRowLeft:        { display:'flex', justifyContent:'space-between', marginBottom:'4px' },
  statRowLabel:       { fontSize:'13px', color:'#334155' },
  statRowVal:         { fontSize:'13px', color:'#64748b' },
  progressBar:        { height:'6px', background:'#e2e8f0', borderRadius:'3px', overflow:'hidden' },
  progressFill:       { height:'100%', borderRadius:'3px', transition:'width 0.5s ease' },

  activityCard:       { background:'#fff', borderRadius:'16px', padding:'1.25rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', gridRow:'1', gridColumn:'3' },
  activityTitle:      { margin:'0 0 1rem', fontSize:'16px', fontWeight:'700', color:'#1a1a2e' },
  timeline:           { display:'flex', flexDirection:'column', gap:'12px' },
  timelineItem:       { display:'flex', alignItems:'center', gap:'10px' },
  timelineDot:        { width:'10px', height:'10px', borderRadius:'50%', flexShrink:0 },
  timelineLabel:      { margin:0, fontSize:'13px', fontWeight:'600', color:'#1a1a2e' },
  timelineTime:       { margin:0, fontSize:'11px', color:'#94a3b8' },

  attendanceListCard: { background:'#fff', borderRadius:'16px', padding:'1.25rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', gridColumn:'1 / 3' },
  chartCard:          { background:'#fff', borderRadius:'16px', padding:'1.25rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', gridColumn:'3' },
  chartTitle:         { margin:'0 0 1rem', fontSize:'16px', fontWeight:'700', color:'#1a1a2e' },

  card:               { background:'#fff', padding:'1.5rem', borderRadius:'16px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1rem' },
  cardTitle:          { margin:'0 0 1rem', fontSize:'16px', fontWeight:'700', color:'#1a1a2e' },
  cardHeader:         { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' },
  exportBtn:          { padding:'7px 14px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'12px', fontWeight:'600' },
  table:              { width:'100%', borderCollapse:'collapse' },
  thead:              { background:'#f8fafc' },
  th:                 { padding:'10px 12px', textAlign:'left', fontSize:'11px', fontWeight:'600', color:'#64748b', borderBottom:'1px solid #e2e8f0', textTransform:'uppercase', letterSpacing:'0.05em' },
  tr:                 { borderBottom:'1px solid #f1f5f9' },
  td:                 { padding:'10px 12px', fontSize:'13px', color:'#334155' },
  badge:              { padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'500' },
  leaveForm:          { background:'#f8fafc', padding:'1.25rem', borderRadius:'10px', marginBottom:'1.5rem' },
  bookingForm:        { background:'#f8fafc', padding:'1.25rem', borderRadius:'10px', marginBottom:'1.5rem' },
  roomGrid:           { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:'1rem' },
  roomCard:           { border:'1px solid #e2e8f0', borderRadius:'16px', padding:'1rem', display:'flex', flexDirection:'column', gap:'0.75rem', textAlign:'left', cursor:'pointer', transition:'all 0.2s ease' },
  roomTitle:          { fontSize:'15px', fontWeight:'700', color:'#1f2937' },
  roomMeta:           { fontSize:'12px', color:'#64748b' },
  roomStats:          { display:'flex', justifyContent:'space-between', gap:'0.5rem', fontSize:'12px', color:'#475569', fontWeight:'600' },
  slotSummary:        { display:'flex', flexWrap:'wrap', gap:'6px', marginTop:'0.5rem' },
  slotBadge:          { background:'#eef2ff', color:'#3730a3', fontSize:'11px', padding:'4px 8px', borderRadius:'999px' },
  cancelBtn:          { padding:'6px 12px', background:'#f8fafc', border:'1px solid #cbd5e1', borderRadius:'8px', color:'#1f2937', cursor:'pointer', fontSize:'12px' },
  roomHeaderActions:  { display:'flex', alignItems:'flex-end', gap:'0.75rem' },
  subtitle:           { fontSize:'12px', color:'#64748b' },
  formRow:            { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1rem' },
  formField:          { marginBottom:'0.75rem' },
  formLabel:          { display:'block', fontSize:'12px', fontWeight:'500', color:'#64748b', marginBottom:'4px' },
  formInput:          { width:'100%', padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  submitBtn:          { padding:'10px 24px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'600' },
}