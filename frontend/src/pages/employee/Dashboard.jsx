import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SIDEBAR_LINKS = [
  { key: 'overview', label: 'Overview',        icon: '🏠' },
  { key: 'breaks',   label: 'Break Tracking',  icon: '☕' },
  { key: 'history',  label: 'History',         icon: '🕐' },
  { key: 'leaves',   label: 'Leave Requests',  icon: '📋' },
]

const BREAK_TYPES = [
  { value: 'lunch',    label: '🍽️ Lunch',       max: 45, maxCount: 1  },
  { value: 'short',    label: '☕ Short Break',  max: 15, maxCount: 2  },
  { value: 'personal', label: '🚶 Personal',     max: null, maxCount: null },
]

export default function EmployeeDashboard() {
  const { user, logout }              = useAuth()
  const [activeTab, setActiveTab]     = useState('overview')
  const [showProfile, setShowProfile] = useState(false)
  const [attendance, setAttendance]   = useState(null)
  const [breaks, setBreaks]           = useState([])
  const [activeBreak, setActiveBreak] = useState(null)
  const [history, setHistory]         = useState([])
  const [leaves, setLeaves]           = useState([])
  const [loading, setLoading]         = useState(false)
  const [message, setMessage]         = useState({ text: '', type: 'success' })
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [leaveForm, setLeaveForm]     = useState({ leave_type: 'casual', leave_slot: 'full_day', from_date: '', to_date: '', reason: '' })
  const [now, setNow]                 = useState(new Date())
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { fetchToday(); fetchHistory(); fetchLeaves() }, [])

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
      const active = res.data.find(b => b.is_active)
      setActiveBreak(active || null)
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

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      const res = await api.post('/attendances/clock_in')
      setAttendance(res.data)
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
      showMsg('✅ Checked out successfully!')
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
      setActiveTab('breaks')
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
      if (res.data.warning) {
        showMsg(res.data.warning, 'warning')
      } else {
        showMsg(`✅ Break ended — ${res.data.duration_mins} mins`)
      }
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

  const checkedIn  = !!attendance?.clock_in
  const checkedOut = !!attendance?.clock_out

  const handleChangePassword = () => {
    setActiveTab('password')
    setShowProfile(false)
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
      showMsg(err.response?.data?.error || err.response?.data?.errors?.join(', ') || 'Failed to change password', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Break counts
  const lunchCount    = breaks.filter(b => b.break_type === 'lunch').length
  const shortCount    = breaks.filter(b => b.break_type === 'short').length
  const totalBreakMin = breaks.reduce((sum, b) => sum + (b.duration_mins || 0), 0)

  // Active break duration live
  const activeSeconds    = activeBreak ? Math.floor((now - new Date(activeBreak.break_start)) / 1000) : 0
  const activeDurationMins = Math.floor(activeSeconds / 60)
  const activeSecsRemain = activeSeconds % 60 
// live work hours counter 
const rawWorkSeconds     = attendance?.clock_in && !attendance?.clock_out
? Math.max(0, Math.floor((now - new Date(attendance.clock_in)) / 1000))
: 0
const completedBreakSecs = totalBreakMin * 60
const activeBreakSecs    = activeBreak ? Math.floor((now - new Date(activeBreak.break_start)) / 1000) : 0
const netWorkSeconds     = Math.max(0, rawWorkSeconds - completedBreakSecs - activeBreakSecs)

const liveWorkHrs = attendance?.clock_in && !attendance?.clock_out
? `${Math.floor(netWorkSeconds / 3600)}h ${Math.floor((netWorkSeconds % 3600) / 60)}m ${netWorkSeconds % 60}s`
: attendance?.total_hours
  ? `${parseFloat(attendance.total_hours).toFixed(2)}h`
  : '0h 0m 0s'

  const chartData = history.slice(0, 7).reverse().map(a => ({
    date: a.date?.slice(5),
    hours: parseFloat(a.total_hours) || 0
  }))

  const msgStyle = {
    ...styles.msgBox,
    background: message.type === 'error' ? '#fff0f0' : message.type === 'warning' ? '#fff9e6' : '#e1f5ee',
    color: message.type === 'error' ? '#e53e3e' : message.type === 'warning' ? '#b7791f' : '#085041',
  }

  return (
    <div style={styles.layout}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.sidebarTitle}>
            <span style={{ fontSize:'20px' }}>🎯</span>
            <div>
              <div style={{ fontSize:'14px', fontWeight:'700', color:'#fff', letterSpacing:'0.03em' }}>MFR WorkTrackr</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.4)', fontWeight:'400' }}>Attendance System</div>
            </div>
          </div>
          <nav style={{ padding:'0.5rem 0' }}>
            {SIDEBAR_LINKS.map(link => (
              <button key={link.key} onClick={() => setActiveTab(link.key)}
                style={{ ...styles.navBtn, ...(activeTab === link.key ? styles.navBtnActive : {}) }}>
                <span style={{ fontSize:'16px', width:'20px', textAlign:'center' }}>{link.icon}</span>
                <span>{link.label}</span>
                {link.key === 'breaks' && activeBreak && (
                  <span style={styles.activeDot}></span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div style={styles.sidebarBottom}>
          {/* Check In/Out */}
          {!checkedIn && (
            <button onClick={handleCheckIn} disabled={loading} style={styles.checkInBtn}>
              ✦ Check In
            </button>
          )}
          {checkedIn && !checkedOut && !activeBreak && (
            <button onClick={handleCheckOut} disabled={loading} style={styles.checkOutBtn}>
              ✦ Check Out
            </button>
          )}
          {checkedIn && checkedOut && (
            <div style={styles.doneBtn}>✓ Done for today</div>
          )}

          {/* Break Buttons */}
          {checkedIn && !checkedOut && (
            <div style={styles.breakSection}>
              {!activeBreak ? (
                <>
                  <p style={styles.breakLabel}>Start Break</p>
                  {BREAK_TYPES.map(bt => {
                    const count = bt.value === 'lunch' ? lunchCount : bt.value === 'short' ? shortCount : 0
                    const maxed = bt.maxCount && count >= bt.maxCount
                    return (
                      <button
                        key={bt.value}
                        onClick={() => startBreak(bt.value)}
                        disabled={loading || maxed}
                        style={{ ...styles.breakBtn, opacity: maxed ? 0.4 : 1 }}
                      >
                        {bt.label}
                        {bt.max && <span style={styles.breakMax}>{bt.max}m</span>}
                        {maxed && <span style={{ ...styles.breakMax, color:'#ff6b6b' }}>✗ used</span>}
                      </button>
                    )
                  })}
                </>
              ) : (
                <div>
                  <div style={styles.activeBreakCard}>
                    <p style={styles.activeBreakType}>
                      {activeBreak.break_type === 'lunch' ? '🍽️' : activeBreak.break_type === 'short' ? '☕' : '🚶'}
                      {' '}{activeBreak.break_type} break
                    </p>
                    <p style={{
                      ...styles.activeBreakTimer,
                      color: activeDurationMins > (BREAK_TYPES.find(b => b.value === activeBreak.break_type)?.max || 999)
                        ? '#ff6b6b' : '#1D9E75'
                    }}>
                      {activeDurationMins > 0 ? `${activeDurationMins}m ${activeSecsRemain}s` : `${activeSecsRemain}s`}
                    </p>
                    {BREAK_TYPES.find(b => b.value === activeBreak.break_type)?.max && (
                      <p style={styles.activeBreakLimit}>
                        limit: {BREAK_TYPES.find(b => b.value === activeBreak.break_type).max} min
                      </p>
                    )}
                  </div>
                  <button onClick={endBreak} disabled={loading} style={styles.endBreakBtn}>
                    ⏹ End Break
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        <div style={styles.topBar}>
          <h1 style={styles.welcome}>Welcome, {user?.name} 👋</h1>
          <div style={styles.topBarRight}>
            <div
              style={styles.profileWrap}
              onMouseEnter={() => setShowProfile(true)}
              onMouseLeave={() => setShowProfile(false)}
            >
              <div style={styles.profileAvatarBtn}>
  {user?.name?.charAt(0)?.toUpperCase() || '?'}
</div>
              {showProfile && (
                <div style={styles.profileCard}>
                  <div style={styles.profileHeader}>
                    <div style={styles.profileAvatarLarge}>{user?.name?.charAt(0)?.toUpperCase()}</div>
                    <div>
                      <p style={styles.profileName}>{user?.name}</p>
                      <p style={styles.profileRole}>{user?.role}</p>
                    </div>
                  </div>
                  <p style={styles.profileEmail}>{user?.email}</p>
                  <div style={styles.profileActions}>
                    <button style={styles.profileBtn} onClick={handleChangePassword}>Change Password</button>
                    <button style={styles.profileBtnDanger} onClick={logout}>Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {message.text && <div style={msgStyle}>{message.text}</div>}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div style={styles.statsRow}>
              <div style={styles.statCard}>
                <p style={styles.statNum}>{attendance ? '✅' : '❌'}</p>
                <p style={styles.statLabel}>Today's Status</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statNum}>{attendance?.clock_in ? new Date(attendance.clock_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '--:--'}</p>
                <p style={styles.statLabel}>Check In</p>
              </div>
              <div style={styles.statCard}>
  <p style={styles.statNum}>
    {attendance?.clock_out
      ? new Date(attendance.clock_out).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
      : checkedIn ? '⏳ Working' : '--:--'}
  </p>
  <p style={styles.statLabel}>Check Out</p>
</div>
              <div style={styles.statCard}>
                <p style={styles.statNum}>{totalBreakMin}m</p>
                <p style={styles.statLabel}>Break Time</p>
              </div>
              <div style={{...styles.statCard, borderTop: checkedIn && !checkedOut ? '3px solid #2d6bcf' : 'none'}}>
  <p style={{...styles.statNum, fontSize:'15px', fontVariantNumeric:'tabular-nums'}}>
    {liveWorkHrs}
  </p>
  <p style={styles.statLabel}>
    {checkedIn && !checkedOut ? '⏱ Live Hours' : 'Work Hours'}
  </p>
</div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Last 7 Days — Working Hours</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#2d6bcf" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* BREAK TRACKING */}
        {activeTab === 'breaks' && (
          <div>
            <div style={styles.statsRow}>
              {BREAK_TYPES.map(bt => {
                const count = bt.value === 'lunch' ? lunchCount : bt.value === 'short' ? shortCount : breaks.filter(b => b.break_type === bt.value).length
                const totalMins = breaks.filter(b => b.break_type === bt.value).reduce((s, b) => s + (b.duration_mins || 0), 0)
                const exceeded = bt.max && totalMins > bt.max
                return (
                  <div key={bt.value} style={{ ...styles.statCard, borderTop: `3px solid ${exceeded ? '#e53e3e' : '#2d6bcf'}` }}>
                    <p style={styles.statNum}>{totalMins}m</p>
                    <p style={styles.statLabel}>{bt.label}</p>
                    <p style={{ fontSize:'11px', color: exceeded ? '#e53e3e' : '#888', margin:'4px 0 0' }}>
                      {bt.max ? `limit: ${bt.max}m` : 'no limit'}
                      {bt.maxCount ? ` · ${count}/${bt.maxCount} used` : ''}
                    </p>
                    {exceeded && <p style={{ fontSize:'11px', color:'#e53e3e', margin:'2px 0 0', fontWeight:'600' }}>⚠️ Exceeded</p>}
                  </div>
                )
              })}
              <div style={styles.statCard}>
                <p style={styles.statNum}>{totalBreakMin}m</p>
                <p style={styles.statLabel}>Total Break Time</p>
              </div>
            </div>

            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Today's Break Log</h3>
              {breaks.length === 0 ? (
                <p style={{ color:'#888', textAlign:'center', padding:'2rem' }}>No breaks taken today</p>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.thead}>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Start Time</th>
                      <th style={styles.th}>End Time</th>
                      <th style={styles.th}>Duration</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breaks.map((b, i) => {
                      const limit = BREAK_TYPES.find(bt => bt.value === b.break_type)?.max
                      const exceeded = limit && b.duration_mins > limit
                      return (
                        <tr key={b.id} style={styles.tr}>
                          <td style={styles.td}>{i + 1}</td>
                          <td style={styles.td}>
                            {b.break_type === 'lunch' ? '🍽️' : b.break_type === 'short' ? '☕' : '🚶'} {b.break_type}
                          </td>
                          <td style={styles.td}>{new Date(b.break_start).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                          <td style={styles.td}>{b.break_end ? new Date(b.break_end).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                          <td style={styles.td}>
                            {b.is_active ? (
  <span style={{ color:'#2d6bcf', fontWeight:'600' }}>
    {activeDurationMins > 0 ? `${activeDurationMins}m ${activeSecsRemain}s` : `${activeSecsRemain}s`} (live)
  </span>
) : (
                              <span style={{ color: exceeded ? '#e53e3e' : '#333', fontWeight: exceeded ? '600' : '400' }}>
                                {b.duration_mins}m
                              </span>
                            )}
                          </td>
                          <td style={styles.td}>
                            {b.is_active ? (
                              <span style={{...styles.badge, background:'#e6f1fb', color:'#0C447C'}}>Active</span>
                            ) : exceeded ? (
                              <span style={{...styles.badge, background:'#fff0f0', color:'#e53e3e'}}>⚠️ Exceeded</span>
                            ) : (
                              <span style={{...styles.badge, background:'#e1f5ee', color:'#085041'}}>OK</span>
                            )}
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

        {/* HISTORY */}
        {activeTab === 'history' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Attendance History</h3>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Check In</th>
                  <th style={styles.th}>Check Out</th>
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
                    <td style={styles.td}><span style={{...styles.badge, background:'#e1f5ee', color:'#085041'}}>{a.status}</span></td>
                  </tr>
                ))}
                {history.length === 0 && <tr><td colSpan={5} style={{...styles.td, color:'#888', textAlign:'center'}}>No records yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* LEAVES */}
        {activeTab === 'leaves' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Leave Requests</h3>
              <button onClick={() => setShowLeaveForm(!showLeaveForm)} style={styles.addBtn}>+ New Request</button>
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
                    <select
                      style={styles.formInput}
                      value={leaveForm.leave_slot}
                      onChange={e => setLeaveForm({ ...leaveForm, leave_slot: e.target.value })}
                    >
                      <option value="full_day">Full Day</option>
                      <option value="first_half">First Half (Sunrise)</option>
                      <option value="second_half">Second Half (Sunset)</option>
                    </select>
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>From Date</label>
                    <input style={styles.formInput} type="date" required value={leaveForm.from_date}
                      onChange={e => setLeaveForm({
                        ...leaveForm,
                        from_date: e.target.value,
                        to_date: leaveForm.leave_slot === 'full_day' ? leaveForm.to_date : e.target.value,
                      })} />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>To Date</label>
                    <input
                      style={styles.formInput}
                      type="date"
                      required
                      disabled={leaveForm.leave_slot !== 'full_day'}
                      value={leaveForm.leave_slot === 'full_day' ? leaveForm.to_date : leaveForm.from_date}
                      onChange={e => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                    />
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
                    <td style={styles.td}>
  {l.leave_slot === 'first_half' ? 'First Half' : l.leave_slot === 'second_half' ? 'Second Half' : 'Full Day'}
</td>
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

        {activeTab === 'password' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Change Password</h3>
            <form onSubmit={submitPasswordChange} style={styles.leaveForm}>
              <div style={styles.formField}>
                <label style={styles.formLabel}>Current Password</label>
                <input
                  style={styles.formInput}
                  type="password"
                  required
                  value={passwordForm.current_password}
                  onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>New Password</label>
                <input
                  style={styles.formInput}
                  type="password"
                  minLength={6}
                  required
                  value={passwordForm.new_password}
                  onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                />
              </div>
              <div style={styles.formField}>
                <label style={styles.formLabel}>Confirm New Password</label>
                <input
                  style={styles.formInput}
                  type="password"
                  minLength={6}
                  required
                  value={passwordForm.confirm_password}
                  onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                />
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

  layout:        { display:'flex', minHeight:'100vh', background:'#f0f2f5' },
  sidebar:       { width:'260px', background:'linear-gradient(180deg, #0f0c29 0%, #1a1a4e 50%, #24243e 100%)', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'0', flexShrink:0, overflowY:'hidden', boxShadow:'4px 0 24px rgba(0,0,0,0.3)' },
  sidebarTop:    { padding:'0' },
  sidebarTitle:  { color:'#fff', fontSize:'16px', fontWeight:'700', padding:'1.5rem 1.25rem 0.5rem', letterSpacing:'0.02em', borderBottom:'1px solid rgba(255,255,255,0.08)', marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:'8px' },
  navBtn:        { display:'flex', alignItems:'center', gap:'12px', width:'100%', padding:'11px 1.25rem', background:'transparent', border:'none', color:'rgba(255,255,255,0.55)', fontSize:'13.5px', cursor:'pointer', borderRadius:'0', marginBottom:'2px', textAlign:'left', transition:'all 0.15s', borderLeft:'3px solid transparent' },
  navBtnActive:  { background:'rgba(255,255,255,0.08)', color:'#fff', borderLeft:'3px solid #7F77DD' },
  sidebarBottom: { padding:'1rem 1.25rem', display:'flex', flexDirection:'column', gap:'8px', borderTop:'1px solid rgba(255,255,255,0.08)' },
  checkInBtn:    { width:'100%', padding:'11px', background:'linear-gradient(135deg,#1D9E75,#0F6E56)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.02em' },
  checkOutBtn:   { width:'100%', padding:'11px', background:'linear-gradient(135deg,#e53e3e,#c53030)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.02em' },
  doneBtn:       { width:'100%', padding:'11px', background:'rgba(29,158,117,0.15)', color:'#1D9E75', border:'1px solid rgba(29,158,117,0.3)', borderRadius:'8px', fontSize:'13px', fontWeight:'600', textAlign:'center' },
  logoutBtn:     { width:'100%', padding:'11px', background:'rgba(229,62,62,0.1)', color:'#ff6b6b', border:'1px solid rgba(229,62,62,0.2)', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  // 



  // layout:          { display:'flex', minHeight:'100vh', background:'#f0f2f5' },
  // sidebar:         { width:'240px', background:'#1a1a2e', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'1.5rem 0', flexShrink:0, overflowY:'auto' },
  // sidebarTop:      { padding:'0 1rem' },
  // sidebarTitle:    { color:'#fff', fontSize:'20px', fontWeight:'700', marginBottom:'2rem', padding:'0 0.5rem' },
  // navBtn:          { display:'flex', alignItems:'center', gap:'10px', width:'100%', padding:'10px 14px', background:'transparent', border:'none', color:'#aaa', fontSize:'14px', cursor:'pointer', borderRadius:'8px', marginBottom:'4px', textAlign:'left' },
  // navBtnActive:    { background:'rgba(255,255,255,0.1)', color:'#fff' },
  activeDot:       { marginLeft:'auto', width:'7px', height:'7px', borderRadius:'50%', background:'#1D9E75', display:'inline-block' },
  // sidebarBottom:   { padding:'0 1rem', display:'flex', flexDirection:'column', gap:'8px' },
  // checkInBtn:      { width:'100%', padding:'11px', background:'linear-gradient(135deg,#2d6bcf,#6b3fcf)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  // checkOutBtn:     { width:'100%', padding:'11px', background:'linear-gradient(135deg,#e53e3e,#c53030)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  // doneBtn:         { width:'100%', padding:'11px', background:'#1D9E75', color:'#fff', borderRadius:'8px', fontSize:'13px', fontWeight:'600', textAlign:'center' },
  breakSection:    { borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:'10px' },
  breakLabel:      { color:'rgba(255,255,255,0.4)', fontSize:'10px', fontWeight:'600', letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 6px' },
  breakBtn:        { width:'100%', padding:'8px 12px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.75)', borderRadius:'8px', fontSize:'12px', cursor:'pointer', marginBottom:'4px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  breakMax:        { fontSize:'10px', color:'rgba(255,255,255,0.4)', background:'rgba(0,0,0,0.2)', padding:'2px 6px', borderRadius:'10px' },
  activeBreakCard: { background:'rgba(255,255,255,0.05)', borderRadius:'8px', padding:'10px', marginBottom:'8px', textAlign:'center', border:'1px solid rgba(255,255,255,0.1)' },
  activeBreakType: { margin:'0 0 4px', color:'rgba(255,255,255,0.6)', fontSize:'11px', textTransform:'capitalize' },
  activeBreakTimer:{ margin:'0 0 2px', fontSize:'26px', fontWeight:'700' },
  activeBreakLimit:{ margin:0, fontSize:'10px', color:'rgba(255,255,255,0.35)' },
  endBreakBtn:     { width:'100%', padding:'10px', background:'rgba(232,140,48,0.15)', color:'#e88c30', border:'1px solid rgba(232,140,48,0.3)', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  // logoutBtn:       { width:'100%', padding:'11px', background:'#e53e3e', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer' },
  main:            { flex:1, padding:'2rem', overflowY:'auto' },
  topBar:          { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' },
  topBarRight:     { display:'flex', alignItems:'center', gap:'12px' },
  welcome:         { fontSize:'24px', fontWeight:'700', color:'#1a1a2e', margin:0 },
  profileWrap:      { position:'relative' },
  profileAvatarBtn: { width:'40px', height:'40px', borderRadius:'50%', border:'none', background:'linear-gradient(135deg,#7F77DD,#534AB7)', color:'#fff', fontWeight:'700', fontSize:'16px', cursor:'pointer', boxShadow:'0 4px 12px rgba(83,74,183,0.35)', display:'flex', alignItems:'center', justifyContent:'center' },
  profileCard:      { position:'absolute', top:'48px', right:0, width:'250px', background:'#fff', border:'1px solid #e6ebf2', borderRadius:'12px', padding:'12px', boxShadow:'0 10px 28px rgba(30,41,59,0.18)', zIndex:20 },
  profileHeader:    { display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' },
  profileAvatarLarge:{ width:'38px', height:'38px', borderRadius:'50%', background:'linear-gradient(135deg,#7F77DD,#534AB7)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700' },
  profileName:      { margin:0, fontSize:'14px', fontWeight:'700', color:'#1a1a2e' },
  profileRole:      { margin:0, fontSize:'11px', color:'#64748b', textTransform:'capitalize' },
  profileEmail:     { margin:0, fontSize:'12px', color:'#334155', wordBreak:'break-all' },
  profileActions:   { marginTop:'10px', display:'grid', gap:'6px' },
  profileBtn:       { width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid #d7e3f4', background:'#f8fbff', color:'#2d6bcf', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  profileBtnDanger: { width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid #ffd8d8', background:'#fff5f5', color:'#e53e3e', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  msgBox:          { padding:'10px 16px', borderRadius:'8px', marginBottom:'1rem', fontSize:'14px' },
  statsRow:        { display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'1rem', marginBottom:'1.5rem' },
  statCard:        { background:'#fff', padding:'1.25rem', borderRadius:'12px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', textAlign:'center' },
  statNum:         { margin:'0 0 4px', fontSize:'20px', fontWeight:'700', color:'#2d6bcf' },
  statLabel:       { margin:0, color:'#888', fontSize:'12px' },
  card:            { background:'#fff', padding:'1.5rem', borderRadius:'12px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1.5rem' },
  cardTitle:       { margin:'0 0 1rem', fontSize:'17px', fontWeight:'600', color:'#1a1a2e' },
  cardHeader:      { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' },
  addBtn:          { padding:'8px 16px', background:'#2d6bcf', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' },
  table:           { width:'100%', borderCollapse:'collapse' },
  thead:           { background:'#f8f9fa' },
  th:              { padding:'10px 14px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:'#555', borderBottom:'1px solid #eee' },
  tr:              { borderBottom:'1px solid #f0f0f0' },
  td:              { padding:'10px 14px', fontSize:'13px', color:'#333' },
  badge:           { padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'500' },
  leaveForm:       { background:'#f8f9fa', padding:'1.25rem', borderRadius:'10px', marginBottom:'1.5rem' },
  formRow:         { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1rem' },
  formField:       { marginBottom:'0.75rem' },
  formLabel:       { display:'block', fontSize:'12px', fontWeight:'500', color:'#555', marginBottom:'4px' },
  formInput:       { width:'100%', padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  submitBtn:       { padding:'10px 24px', background:'#2d6bcf', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'600' },
}