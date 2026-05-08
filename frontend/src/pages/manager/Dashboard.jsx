import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import LeaveCard from '../../components/LeaveCard'
import LeaveTabs from '../../components/LeaveTabs'
import LeaveTable from '../../components/LeaveTable'

const SIDEBAR_LINKS = [
  { key: 'overview',   label: 'Overview',        icon: '🏠' },
  { key: 'attendance', label: 'Attendance',       icon: '📅' },
  { key: 'breaks',     label: 'Break Monitor',    icon: '☕' },
  { key: 'employees',  label: 'Manage Users',     icon: '👥' },
  { key: 'leaves',     label: 'Leave Requests',   icon: '📋' },
]

export default function ManagerDashboard() {
  const [editUser, setEditUser] = useState(null) //for editing user
  const { user, logout }              = useAuth()
  const [activeTab, setActiveTab]     = useState('overview')
  const [showProfile, setShowProfile] = useState(false)
  const [attendance, setAttendance]   = useState(null)
  const [todayAll, setTodayAll]       = useState([])
  const [employees, setEmployees]     = useState([])
  const [leaves, setLeaves]           = useState([])
  const [breakSummary, setBreakSummary] = useState([])
  const [loading, setLoading]         = useState(false)
  const [message, setMessage]         = useState({ text:'', type:'success' })
  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ name:'', email:'', password:'', joined_at:'', employee_id:'' })
  //leave apply req 
  const [myLeaves, setMyLeaves]           = useState([])
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [leavePanel, setLeavePanel] = useState('summary')
  const [leaveForm, setLeaveForm]         = useState({ leave_type:'casual', leave_slot:'full_day', from_date:'', to_date:'', reason:'' })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })

  useEffect(() => { fetchAll(); fetchMyLeaves() }, [])

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text:'', type:'success' }), 4000)
  }

  const leaveSummaryData = {
    planned: { available: '8.21', booked: 1 },
    unplanned: { available: '1.5', booked: 0 },
  }

  const upcomingLeaves = [
    { id: 1, date: '15-Aug-2026, Saturday', event: 'Independence Day' },
    { id: 2, date: '28-Aug-2026, Friday', event: 'Raksha Bandhan' },
    { id: 3, date: '02-Oct-2026, Wednesday', event: 'Gandhi Jayanti' },
    { id: 4, date: '25-Dec-2026, Saturday', event: 'Christmas Day' },
  ]

  const leaveBalanceRows = [
    { id: 1, label: 'Planned Leave', total: '12.00', used: '3.79', remaining: '8.21' },
    { id: 2, label: 'Unplanned Leave', total: '3.00', used: '1.50', remaining: '1.50' },
  ]

  const leaveRequestsRows = myLeaves.length > 0 ? myLeaves : [
    { id: 1, leave_type: 'casual', leave_slot: 'full_day', from_date: '10-Jul-2026', to_date: '10-Jul-2026', status: 'approved' },
    { id: 2, leave_type: 'sick', leave_slot: 'half_day', from_date: '05-Jun-2026', to_date: '05-Jun-2026', status: 'pending' },
  ]

  const fetchAll = async () => {
    try {
      const [a, u,t, b] = await Promise.all([
        api.get('/attendances/today'),
        api.get('/users'),
        // api.get('/leave_requests?status=pending'),
        api.get('/attendances/today'),
        api.get('/breaks/department_summary'),
      ])
      const mine = a.data.find(x => x.user_id === user.id)
      setAttendance(mine || null)
      setTodayAll(t.data)
      setEmployees(u.data.filter(u => u.role === 'employee'))
      // setLeaves(l.data)
      setBreakSummary(b.data)
    } catch (err) { console.error(err) }
  }

  //chnage leave status   
  const fetchMyLeaves = async () => {
    try {
      const res = await api.get('/leave_requests')
      const all = res.data
      setMyLeaves(all.filter(l => l.user_id === user.id))
      setLeaves(all.filter(l => l.user_id !== user.id && l.status === 'pending'))
    } catch (err) { console.error(err) }
  }

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      const res = await api.post('/attendances/clock_in')
      setAttendance(res.data)
      showMsg('✅ Checked in!')
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
    finally { setLoading(false) }
  }

  const handleCheckOut = async () => {
    setLoading(true)
    try {
      const res = await api.post('/attendances/clock_out')
      setAttendance(res.data)
      showMsg('✅ Checked out!')
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
    finally { setLoading(false) }
  }

  const handleLeave = async (id, action) => {
    try {
      await api.patch(`/leave_requests/${id}/${action}`)
      showMsg(`✅ Leave ${action}d!`)
      fetchMyLeaves()
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      await api.post('/users', { user: { ...newUser, department_id: user.department_id, role: 'employee' } })
      showMsg('✅ Employee added!')
      setShowAddUser(false)
      setNewUser({ name:'', email:'', password:'', joined_at:'' })
      fetchAll()
    } catch (err) { showMsg(err.response?.data?.errors?.join(', ') || 'Error', 'error') }
  }

  const handleDeactivate = async (id) => {
    try {
      await api.delete(`/users/${id}`)
      showMsg('✅ User deactivated!')
      fetchAll()
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
  }
  
  const handleEditUser = async (e) => {
    e.preventDefault()
    try {
      await api.patch(`/users/${editUser.id}`, { user: {
        name:        editUser.name,
        email:       editUser.email,
        job_title:   editUser.job_title,
        employee_id: editUser.employee_id,
        joined_at:   editUser.joined_at,
      }})
      showMsg('✅ Employee updated!')
      setEditUser(null)
      fetchAll()
    } catch (err) { showMsg(err.response?.data?.errors?.join(', ') || 'Error', 'error') }
  }
  const submitLeave = async (e) => {
    e.preventDefault()
    try {
      const payload = leaveForm.leave_slot === 'full_day'
        ? leaveForm
        : { ...leaveForm, to_date: leaveForm.from_date }
      await api.post('/leave_requests', { leave_request: payload })
      showMsg('✅ Leave request submitted to Director!')
      setShowLeaveForm(false)
      setLeaveForm({ leave_type:'casual', leave_slot:'full_day', from_date:'', to_date:'', reason:'' })
      fetchMyLeaves()
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
  }

  const checkedIn  = !!attendance?.clock_in
  const checkedOut = !!attendance?.clock_out

  const exportAttendance = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:3000/api/v1/attendances/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const blob = await res.blob()
      const url  = window.URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `department_attendance_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      showMsg('Failed to export', 'error')
    }
  }

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

  const chartData = employees.map(e => {
    const present = todayAll.find(a => a.user_id === e.id)
    return { name: e.name.trim().split(' ')[0], present: present ? 1 : 0 }
  })

  const msgStyle = {
    ...styles.msgBox,
    background: message.type === 'error' ? '#fff0f0' : '#e1f5ee',
    color: message.type === 'error' ? '#e53e3e' : '#085041',
  }

  return (
    <div style={styles.layout}>
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
              </button>
            ))}
          </nav>
        </div>
        <div style={styles.sidebarBottom}>
          {!checkedIn && <button onClick={handleCheckIn} disabled={loading} style={styles.checkInBtn}>➡️ Check In</button>}
          {checkedIn && !checkedOut && <button onClick={handleCheckOut} disabled={loading} style={styles.checkOutBtn}>⬅️ Check Out</button>}
          {checkedIn && checkedOut && <div style={styles.doneBtn}>✅ Done for today</div>}
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.topBar}>
          <h1 style={styles.welcome}>Welcome, {user?.name} 👋</h1>
          <div
            style={styles.profileWrap}
            onMouseEnter={() => setShowProfile(true)}
            onMouseLeave={() => setShowProfile(false)}
          >
            <button style={styles.profileAvatarBtn}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </button>
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
        {message.text && <div style={msgStyle}>{message.text}</div>}

        {activeTab === 'overview' && (
          <div>
            <div style={styles.statsRow}>
              {[
                { num: employees.length,                        label: 'Total Employees' },
                { num: todayAll.length,                         label: 'Present Today' },
                { num: Math.max(0, employees.length - todayAll.length), label: 'Absent Today' },
                { num: leaves.length,                           label: 'Pending Leaves' },
              ].map((s, i) => (
                <div key={i} style={styles.statCard}>
                  <p style={styles.statNum}>{s.num}</p>
                  <p style={styles.statLabel}>{s.label}</p>
                </div>
              ))}
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Department Attendance — Today</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="present" fill="#2d6bcf" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
  <h3 style={styles.cardTitle}>Today's Attendance</h3>
  <button onClick={exportAttendance} style={styles.addBtn}>⬇ Export CSV</button>
</div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Check In</th>
                  <th style={styles.th}>Check Out</th>
                  <th style={styles.th}>Hours</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAll.map(a => (
                  <tr key={a.id} style={styles.tr}>
                    <td style={styles.td}>{a.user_name}</td>
                    <td style={styles.td}>{a.clock_in ? new Date(a.clock_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                    <td style={styles.td}>{a.clock_out ? new Date(a.clock_out).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                    <td style={styles.td}>{a.total_hours || '-'}</td>
                    <td style={styles.td}><span style={{...styles.badge, background:'#e1f5ee', color:'#085041'}}>{a.status}</span></td>
                  </tr>
                ))}
                {todayAll.length === 0 && <tr><td colSpan={5} style={{...styles.td, color:'#888', textAlign:'center'}}>No attendance records today</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'breaks' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>☕ Break Monitor — Today</h3>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Total Break</th>
                  <th style={styles.th}>Breaks Taken</th>
                  <th style={styles.th}>Currently On Break</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {breakSummary.map(s => (
                  <tr key={s.user_id} style={styles.tr}>
                    <td style={styles.td}><strong>{s.user_name}</strong></td>
                    <td style={styles.td}>{s.total_break_mins} mins</td>
                    <td style={styles.td}>{s.break_count}</td>
                    <td style={styles.td}>
                      {s.has_active_break ? (
                        <span style={{color:'#e88c30', fontWeight:'600'}}>
                          🟡 {s.active_type} ({Math.floor((new Date() - new Date(s.active_since)) / 60000)}m ago)
                        </span>
                      ) : '—'}
                    </td>
                    <td style={styles.td}>
                      {s.flagged ? (
                        <span style={{...styles.badge, background:'#fff0f0', color:'#e53e3e'}}>⚠️ Exceeded</span>
                      ) : (
                        <span style={{...styles.badge, background:'#e1f5ee', color:'#085041'}}>✅ OK</span>
                      )}
                    </td>
                  </tr>
                ))}
                {breakSummary.length === 0 && (
                  <tr><td colSpan={5} style={{...styles.td, color:'#888', textAlign:'center'}}>No break data today</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {editUser && (
  <div style={styles.editModal}>
    <div style={styles.editModalBox}>
      <div style={styles.editModalHeader}>
        <h3 style={{margin:0, fontSize:'16px', fontWeight:'600'}}>Edit Employee</h3>
        <button onClick={() => setEditUser(null)} style={styles.closeBtn}>✕</button>
      </div>
      <form onSubmit={handleEditUser}>
        <div style={styles.formField}>
          <label style={styles.formLabel}>Full Name</label>
          <input style={styles.formInput} value={editUser.name}
            onChange={e => setEditUser({...editUser, name: e.target.value})} />
        </div>
        <div style={styles.formField}>
          <label style={styles.formLabel}>Email</label>
          <input style={styles.formInput} type="email" value={editUser.email}
            onChange={e => setEditUser({...editUser, email: e.target.value})} />
        </div>
        <div style={styles.formField}>
          <label style={styles.formLabel}>Job Title</label>
          <input style={styles.formInput} value={editUser.job_title || ''}
            onChange={e => setEditUser({...editUser, job_title: e.target.value})} />
        </div>
        <div style={styles.formField}>
          <label style={styles.formLabel}>Employee ID</label>
          <input style={styles.formInput} value={editUser.employee_id || ''}
            onChange={e => setEditUser({...editUser, employee_id: e.target.value})} />
        </div>
        <div style={styles.formField}>
          <label style={styles.formLabel}>Joining Date</label>
          <input style={styles.formInput} type="date" value={editUser.joined_at || ''}
            onChange={e => setEditUser({...editUser, joined_at: e.target.value})} />
        </div>
        <div style={{display:'flex', gap:'8px', marginTop:'1rem'}}>
          <button type="submit" style={styles.submitBtn}>Save Changes</button>
          <button type="button" onClick={() => setEditUser(null)}
            style={{...styles.submitBtn, background:'#f0f0f0', color:'#333'}}>Cancel</button>
        </div>
      </form>
    </div>
  </div>
)}

        {activeTab === 'employees' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Manage Users</h3>
              <button onClick={() => setShowAddUser(!showAddUser)} style={styles.addBtn}>+ Add Employee</button>
            </div>

            {showAddUser && (
              <form onSubmit={handleAddUser} style={styles.leaveForm}>
                <div style={styles.formRow}>
		  <div style={styles.formField}>
  <label style={styles.formLabel}>Employee ID *</label>
  <input style={styles.formInput} value={newUser.employee_id}
    onChange={e => setNewUser({...newUser, employee_id: e.target.value})}
    placeholder="Auto-generated if empty" />
</div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Full Name</label>
                    <input style={styles.formInput} required value={newUser.name}
                      onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="John Doe" />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Email</label>
                    <input style={styles.formInput} type="email" required value={newUser.email}
                      onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="john@mindforce.com" />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Password</label>
                    <input style={styles.formInput} type="password" required value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="••••••••" />
                  </div>
                  <div style={styles.formField}>
                    <label style={styles.formLabel}>Joining Date</label>
                    <input style={styles.formInput} type="date" value={newUser.joined_at}
                      onChange={e => setNewUser({...newUser, joined_at: e.target.value})} />
                  </div>
		  
                </div>
                <button type="submit" style={styles.submitBtn}>Add Employee</button>
              </form>
            )}

            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
		  <th style={styles.th}>Emp ID</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Joined</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} style={styles.tr}>
		    <td style={styles.td}><code>{e.employee_id}</code></td>
                    <td style={styles.td}>{e.name}</td>
                    <td style={styles.td}>{e.email}</td>
                    <td style={styles.td}>{e.joined_at}</td>
                    <td style={styles.td}>
                      <span style={{...styles.badge, background: e.is_active?'#e1f5ee':'#fff0f0', color: e.is_active?'#085041':'#e53e3e'}}>
                        {e.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={styles.td}>
                    <div style={{display:'flex', gap:'6px'}}>
  <button onClick={() => setEditUser(e)} style={styles.editBtn}>Edit</button>
  {e.is_active && <button onClick={() => handleDeactivate(e.id)} style={styles.deactivateBtn}>Deactivate</button>}
</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div style={styles.leaveSection}>
            <div style={styles.leaveHeader}>
              <div>
                <p style={styles.leaveHeadline}>
                  Leave booked this year: <span style={styles.leaveHeadlineStrong}>1 day(s)</span>
                  <span style={styles.leaveHeadlineDivider}>|</span>
                  Absent: <span style={styles.leaveHeadlineStrong}>0</span>
                </p>
              </div>
              <div style={styles.leaveHeaderActions}>
                <div style={styles.dateRange}>01-Apr-2026 - 31-Mar-2027</div>
                <button style={styles.applyLeaveBtn} onClick={() => setShowLeaveForm(true)}>Apply Leave</button>
              </div>
            </div>

            <LeaveTabs
              tabs={[
                { key: 'summary', label: 'Leave Summary' },
                { key: 'balance', label: 'Leave Balance' },
                { key: 'requests', label: 'Leave Requests' },
              ]}
              activeTab={leavePanel}
              onChange={setLeavePanel}
            />

            {leavePanel === 'summary' && (
              <>
                <div style={styles.leaveCardsRow}>
                  <LeaveCard variant="planned" title="Planned Leave" available={leaveSummaryData.planned.available} booked={leaveSummaryData.planned.booked} />
                  <LeaveCard variant="unplanned" title="Unplanned Leave" available={leaveSummaryData.unplanned.available} booked={leaveSummaryData.unplanned.booked} />
                </div>
                <LeaveTable rows={upcomingLeaves} />
              </>
            )}

            {leavePanel === 'balance' && (
              <div style={styles.leaveBalanceGrid}>
                {leaveBalanceRows.map(row => (
                  <div key={row.id} style={styles.balanceCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <p style={styles.balanceTitle}>{row.label}</p>
                      <span style={styles.balanceBadge}>Balance</span>
                    </div>
                    <div style={styles.balanceMetrics}>
                      <div>
                        <p style={styles.balanceLabel}>Total</p>
                        <p style={styles.balanceValue}>{row.total}</p>
                      </div>
                      <div>
                        <p style={styles.balanceLabel}>Used</p>
                        <p style={styles.balanceValue}>{row.used}</p>
                      </div>
                      <div>
                        <p style={styles.balanceLabel}>Remaining</p>
                        <p style={styles.balanceValue}>{row.remaining}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {leavePanel === 'requests' && (
              <div style={styles.requestsSection}>
                <div style={styles.requestsHeader}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#102a43' }}>My Leave Requests</h3>
                    <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>Track your requests and status here.</p>
                  </div>
                  <button style={styles.applyLeaveBtn} onClick={() => setShowLeaveForm(true)}>Apply Leave</button>
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
                          <option value="first_half">First Half</option>
                          <option value="second_half">Second Half</option>
                        </select>
                      </div>
                      <div style={styles.formField}>
                        <label style={styles.formLabel}>From Date</label>
                        <input style={styles.formInput} type="date" required value={leaveForm.from_date}
                          onChange={e => setLeaveForm({...leaveForm, from_date: e.target.value})} />
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
                      <textarea style={{...styles.formInput, height:'70px', resize:'none'}}
                        value={leaveForm.reason}
                        onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} />
                    </div>
                    <button type="submit" style={styles.submitBtn}>Submit</button>
                  </form>
                )}

                <div style={{ overflowX:'auto', marginTop:'1rem', background:'#fff', borderRadius:'20px', padding:'1rem', boxShadow:'0 18px 45px rgba(15,23,42,0.08)' }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.thead}>
                        <th style={styles.th}>Type</th>
                        <th style={styles.th}>Duration</th>
                        <th style={styles.th}>From</th>
                        <th style={styles.th}>To</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveRequestsRows.map(request => (
                        <tr key={request.id} style={styles.tr}>
                          <td style={styles.td}>{request.leave_type}</td>
                          <td style={styles.td}>{request.leave_slot === 'half_day' ? 'Half Day' : 'Full Day'}</td>
                          <td style={styles.td}>{request.from_date}</td>
                          <td style={styles.td}>{request.to_date}</td>
                          <td style={styles.td}>
                            <span style={{...styles.badge,
                              background: request.status === 'approved' ? '#e1f5ee' : request.status === 'rejected' ? '#fff0f0' : '#fff9e6',
                              color: request.status === 'approved' ? '#085041' : request.status === 'rejected' ? '#e53e3e' : '#b7791f'
                            }}>{request.status}</span>
                          </td>
                        </tr>
                      ))}
                      {leaveRequestsRows.length === 0 && <tr><td colSpan={5} style={{...styles.td, color:'#888', textAlign:'center'}}>No requests yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
  // layout:        { display:'flex', minHeight:'100vh', background:'#f0f2f5' },
  // sidebar:       { width:'240px', background:'#1a1a2e', display:'flex', flexDirection:'column', justifyContent:'space-between', padding:'1.5rem 0', flexShrink:0 },
  // sidebarTop:    { padding:'0 1rem' },
  // sidebarTitle:  { color:'#fff', fontSize:'20px', fontWeight:'700', marginBottom:'2rem', padding:'0 0.5rem' },
  // navBtn:        { display:'flex', alignItems:'center', gap:'10px', width:'100%', padding:'10px 14px', background:'transparent', border:'none', color:'#aaa', fontSize:'14px', cursor:'pointer', borderRadius:'8px', marginBottom:'4px', textAlign:'left' },
  // navBtnActive:  { background:'rgba(255,255,255,0.1)', color:'#fff' },
  // sidebarBottom: { padding:'0 1rem', display:'flex', flexDirection:'column', gap:'8px' },
  // checkInBtn:    { width:'100%', padding:'12px', background:'linear-gradient(135deg,#2d6bcf,#6b3fcf)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
  // checkOutBtn:   { width:'100%', padding:'12px', background:'linear-gradient(135deg,#e53e3e,#c53030)', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
  // doneBtn:       { width:'100%', padding:'12px', background:'#1D9E75', color:'#fff', borderRadius:'8px', fontSize:'14px', fontWeight:'600', textAlign:'center' },
  // logoutBtn:     { width:'100%', padding:'12px', background:'#e53e3e', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
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
  main:          { flex:1, padding:'2rem', overflowY:'auto' },
  topBar:        { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' },
  welcome:       { fontSize:'24px', fontWeight:'700', marginBottom:'1.5rem', color:'#1a1a2e' },
  profileWrap:      { position:'relative' },
  profileAvatarBtn: { width:'40px', height:'40px', borderRadius:'50%', border:'none', background:'linear-gradient(135deg,#7F77DD,#534AB7)', color:'#fff', fontWeight:'700', fontSize:'15px', cursor:'pointer', boxShadow:'0 4px 12px rgba(83,74,183,0.35)' },
  profileCard:      { position:'absolute', top:'48px', right:0, width:'250px', background:'#fff', border:'1px solid #e6ebf2', borderRadius:'12px', padding:'12px', boxShadow:'0 10px 28px rgba(30,41,59,0.18)', zIndex:20 },
  profileHeader:    { display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px' },
  profileAvatarLarge:{ width:'38px', height:'38px', borderRadius:'50%', background:'linear-gradient(135deg,#7F77DD,#534AB7)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700' },
  profileName:      { margin:0, fontSize:'14px', fontWeight:'700', color:'#1a1a2e' },
  profileRole:      { margin:0, fontSize:'11px', color:'#64748b', textTransform:'capitalize' },
  profileEmail:     { margin:0, fontSize:'12px', color:'#334155', wordBreak:'break-all' },
  profileActions:   { marginTop:'10px', display:'grid', gap:'6px' },
  profileBtn:       { width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid #d7e3f4', background:'#f8fbff', color:'#2d6bcf', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  profileBtnDanger: { width:'100%', padding:'8px 10px', borderRadius:'8px', border:'1px solid #ffd8d8', background:'#fff5f5', color:'#e53e3e', fontSize:'12px', fontWeight:'600', cursor:'pointer' },
  msgBox:        { padding:'10px 16px', borderRadius:'8px', marginBottom:'1rem', fontSize:'14px' },
  statsRow:      { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.5rem' },
  statCard:      { background:'#fff', padding:'1.25rem', borderRadius:'12px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', textAlign:'center' },
  statNum:       { margin:'0 0 4px', fontSize:'28px', fontWeight:'700', color:'#2d6bcf' },
  statLabel:     { margin:0, color:'#888', fontSize:'12px' },
  card:          { background:'#fff', padding:'1.5rem', borderRadius:'12px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1.5rem' },
  cardTitle:     { margin:'0 0 1rem', fontSize:'17px', fontWeight:'600', color:'#1a1a2e' },
  cardHeader:    { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' },
  addBtn:        { padding:'8px 16px', background:'#2d6bcf', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600' },
  leaveSection:  { background:'#fff', padding:'1.75rem', borderRadius:'24px', boxShadow:'0 22px 50px rgba(15,23,42,0.08)', marginTop:'1rem' },
  leaveHeader:   { display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem', flexWrap:'wrap', marginBottom:'1.5rem' },
  leaveHeadline: { margin:0, fontSize:'15px', color:'#475569', lineHeight:'1.6' },
  leaveHeadlineStrong: { fontWeight:700, color:'#0f172a' },
  leaveHeadlineDivider: { margin:'0 0.75rem', color:'#cbd5e1' },
  leaveHeaderActions: { display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' },
  dateRange:     { padding:'8px 12px', background:'#f1f5f9', borderRadius:'999px', fontSize:'13px', color:'#475569' },
  applyLeaveBtn: { padding:'10px 18px', background:'linear-gradient(135deg,#4f46e5,#8b5cf6)', color:'#fff', border:'none', borderRadius:'999px', cursor:'pointer', fontSize:'13px', fontWeight:'600', boxShadow:'0 14px 28px rgba(79,70,229,0.18)' },
  leaveCardsRow: { display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:'1rem', marginBottom:'1.5rem' },
  leaveBalanceGrid:{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'1rem' },
  balanceCard:   { background:'#fff', border:'1px solid #e2e8f0', borderRadius:'18px', padding:'1.25rem', boxShadow:'0 12px 28px rgba(15,23,42,0.06)' },
  balanceTitle:  { margin:0, fontSize:'14px', fontWeight:'700', color:'#102a43' },
  balanceBadge:  { padding:'4px 10px', background:'#eef2ff', borderRadius:'999px', fontSize:'11px', fontWeight:'700', color:'#4338ca' },
  balanceMetrics:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem' },
  requestsSection:{ background:'#f8fafc', borderRadius:'24px', padding:'1.5rem', boxShadow:'0 20px 40px rgba(15,23,42,0.05)' },
  requestsHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem', marginBottom:'1.25rem', flexWrap:'wrap' },
  table:         { width:'100%', borderCollapse:'collapse' },
  thead:         { background:'#f8f9fa' },
  th:            { padding:'10px 14px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:'#555', borderBottom:'1px solid #eee' },
  tr:            { borderBottom:'1px solid #f0f0f0' },
  td:            { padding:'10px 14px', fontSize:'13px', color:'#333' },
  badge:         { padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'500' },
  leaveForm:     { background:'#f8f9fa', padding:'1.25rem', borderRadius:'10px', marginBottom:'1.5rem' },
  formRow:       { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1rem' },
  formField:     { marginBottom:'0.75rem' },
  formLabel:     { display:'block', fontSize:'12px', fontWeight:'500', color:'#555', marginBottom:'4px' },
  formInput:     { width:'100%', padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  submitBtn:     { padding:'10px 24px', background:'#2d6bcf', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'600' },
  approveBtn:    { padding:'5px 12px', background:'#1D9E75', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px' },
  rejectBtn:     { padding:'5px 12px', background:'#e53e3e', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px' },
  deactivateBtn: { padding:'5px 12px', background:'#e53e3e', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px' },
}