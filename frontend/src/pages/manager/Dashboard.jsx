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
  const { user, logout } = useAuth()
  
  // Tab & UI State
  const [activeTab, setActiveTab] = useState('overview')
  const [showProfile, setShowProfile] = useState(false)
  const [leavePanel, setLeavePanel] = useState('summary')
  const [showAddUser, setShowAddUser] = useState(false)
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [editUser, setEditUser] = useState(null)
  
  // Data State
  const [attendance, setAttendance] = useState(null)
  const [todayAll, setTodayAll] = useState([])
  const [employees, setEmployees] = useState([])
  const [leaves, setLeaves] = useState([])
  const [breakSummary, setBreakSummary] = useState([])
  const [myLeaves, setMyLeaves] = useState([])
  
  // Form & Interaction State
  const [loading, setLoading] = useState(false)
  const [loadingLeaves, setLoadingLeaves] = useState(true)
  const [message, setMessage] = useState({ text: '', type: 'success' })
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', joined_at: '', employee_id: '' })
  const [leaveForm, setLeaveForm] = useState({ leave_type: 'casual', leave_slot: 'full_day', from_date: '', to_date: '', reason: '' })
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [hoveredRow, setHoveredRow] = useState(null)
  const [hoveredApplyBtn, setHoveredApplyBtn] = useState(false)

  useEffect(() => {
    fetchAll()
    fetchMyLeaves()
  }, [])

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: 'success' }), 4000)
  }

  // --- Data Fetching ---
  const fetchAll = async () => {
    try {
      const [attRes, userRes, breakRes] = await Promise.all([
        api.get('/attendances/today'),
        api.get('/users'),
        api.get('/breaks/department_summary'),
      ])
      
      const mine = attRes.data.find(x => x.user_id === user.id)
      setAttendance(mine || null)
      setTodayAll(attRes.data)
      setEmployees(userRes.data.filter(u => u.role === 'employee'))
      setBreakSummary(breakRes.data)
    } catch (err) {
      console.error("Fetch All Error:", err)
    }
  }

  const fetchMyLeaves = async () => {
    setLoadingLeaves(true)
    try {
      const res = await api.get('/leave_requests')
      const all = res.data
      setMyLeaves(all.filter(l => l.user_id === user.id))
      // Pending leaves for manager to approve (others in department)
      setLeaves(all.filter(l => l.user_id !== user.id && l.status === 'pending'))
    } catch (err) {
      console.error("Fetch Leaves Error:", err)
    } finally {
      setLoadingLeaves(false)
    }
  }

  // --- Attendance Handlers ---
  const handleCheckIn = async () => {
    setLoading(true)
    try {
      const res = await api.post('/attendances/clock_in')
      setAttendance(res.data)
      showMsg('✅ Checked in!')
      fetchAll()
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setLoading(true)
    try {
      const res = await api.post('/attendances/clock_out')
      setAttendance(res.data)
      showMsg('✅ Checked out!')
      fetchAll()
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error', 'error')
    } finally {
      setLoading(false)
    }
  }

  // --- Employee Management ---
  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      await api.post('/users', { user: { ...newUser, department_id: user.department_id, role: 'employee' } })
      showMsg('✅ Employee added!')
      setShowAddUser(false)
      setNewUser({ name: '', email: '', password: '', joined_at: '', employee_id: '' })
      fetchAll()
    } catch (err) {
      showMsg(err.response?.data?.errors?.join(', ') || 'Error', 'error')
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    try {
      await api.patch(`/users/${editUser.id}`, { 
        user: {
          name: editUser.name,
          email: editUser.email,
          job_title: editUser.job_title,
          employee_id: editUser.employee_id,
          joined_at: editUser.joined_at,
        }
      })
      showMsg('✅ Employee updated!')
      setEditUser(null)
      fetchAll()
    } catch (err) {
      showMsg(err.response?.data?.errors?.join(', ') || 'Error', 'error')
    }
  }

  const handleDeactivate = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this user?")) return
    try {
      await api.delete(`/users/${id}`)
      showMsg('✅ User deactivated!')
      fetchAll()
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error', 'error')
    }
  }

  // --- Leave Management ---
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
      fetchMyLeaves()
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error', 'error')
    }
  }

  const handleLeaveAction = async (id, action) => {
    try {
      await api.patch(`/leave_requests/${id}/${action}`)
      showMsg(`✅ Leave ${action}d!`)
      fetchMyLeaves()
    } catch (err) {
      showMsg(err.response?.data?.error || 'Error', 'error')
    }
  }

  // --- Password & Profile ---
  const submitPasswordChange = async (e) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return showMsg('Passwords do not match', 'error')
    }
    setLoading(true)
    try {
      await api.patch('/auth/change_password', passwordForm)
      showMsg('✅ Password changed successfully!')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setActiveTab('overview')
    } catch (err) {
      showMsg(err.response?.data?.error || 'Failed to change password', 'error')
    } finally {
      setLoading(false)
    }
  }

  const exportAttendance = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:3000/api/v1/attendances/export', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
    } catch (err) {
      showMsg('Failed to export', 'error')
    }
  }

  // --- UI Helpers ---
  const checkedIn = !!attendance?.clock_in
  const checkedOut = !!attendance?.clock_out
  const chartData = employees.map(e => {
    const isPresent = todayAll.some(a => a.user_id === e.id)
    return { name: e.name.split(' ')[0], present: isPresent ? 1 : 0 }
  })

  // Hardcoded placeholders for UI logic
  const leaveSummaryData = { planned: { available: '8.21', booked: 1 }, unplanned: { available: '1.5', booked: 0 } }
  const leaveBalanceRows = [
    { id: 1, label: 'Planned Leave', total: '12.00', used: '3.79', remaining: '8.21' },
    { id: 2, label: 'Unplanned Leave', total: '3.00', used: '1.50', remaining: '1.50' },
  ]
  const upcomingLeaves = [
    { id: 1, date: '15-Aug-2026, Saturday', event: 'Independence Day' },
    { id: 2, date: '02-Oct-2026, Wednesday', event: 'Gandhi Jayanti' },
  ]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: 200px 0; } }
      `}} />
      <div style={styles.layout}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarTop}>
            <div style={styles.sidebarTitle}>
              <span style={{ fontSize: '20px' }}>🎯</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>MFR WorkTrackr</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Manager Portal</div>
              </div>
            </div>
            <nav style={{ padding: '0.5rem 0' }}>
              {SIDEBAR_LINKS.map(link => (
                <button key={link.key} onClick={() => setActiveTab(link.key)}
                  style={{ ...styles.navBtn, ...(activeTab === link.key ? styles.navBtnActive : {}) }}>
                  <span>{link.icon}</span> <span>{link.label}</span>
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

        {/* Main Content */}
        <div style={styles.main}>
          <div style={styles.topBar}>
            <h1 style={styles.welcome}>Welcome, {user?.name} 👋</h1>
            <div style={styles.profileWrap} onMouseEnter={() => setShowProfile(true)} onMouseLeave={() => setShowProfile(false)}>
              <button style={styles.profileAvatarBtn}>{user?.name?.charAt(0).toUpperCase()}</button>
              {showProfile && (
                <div style={styles.profileCard}>
                  <div style={styles.profileHeader}>
                    <div style={styles.profileAvatarLarge}>{user?.name?.charAt(0).toUpperCase()}</div>
                    <div>
                      <p style={styles.profileName}>{user?.name}</p>
                      <p style={styles.profileRole}>{user?.role}</p>
                    </div>
                  </div>
                  <div style={styles.profileActions}>
                    <button style={styles.profileBtn} onClick={() => setActiveTab('password')}>Change Password</button>
                    <button style={styles.profileBtnDanger} onClick={logout}>Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {message.text && (
            <div style={{ ...styles.msgBox, background: message.type === 'error' ? '#fff0f0' : '#e1f5ee', color: message.type === 'error' ? '#e53e3e' : '#085041' }}>
              {message.text}
            </div>
          )}

          {/* Tab Views */}
          {activeTab === 'overview' && (
            <div>
              <div style={styles.statsRow}>
                <div style={styles.statCard}><p style={styles.statNum}>{employees.length}</p><p style={styles.statLabel}>Total Employees</p></div>
                <div style={styles.statCard}><p style={styles.statNum}>{todayAll.length}</p><p style={styles.statLabel}>Present Today</p></div>
                <div style={styles.statCard}><p style={styles.statNum}>{Math.max(0, employees.length - todayAll.length)}</p><p style={styles.statLabel}>Absent Today</p></div>
                <div style={styles.statCard}><p style={styles.statNum}>{leaves.length}</p><p style={styles.statLabel}>Pending Approvals</p></div>
              </div>
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>Department Attendance — Today</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="present" fill="#2d6bcf" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Today's Logs</h3>
                <button onClick={exportAttendance} style={styles.addBtn}>⬇ Export CSV</button>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Check In</th>
                    <th style={styles.th}>Check Out</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAll.map(a => (
                    <tr key={a.id} style={styles.tr}>
                      <td style={styles.td}>{a.user_name}</td>
                      <td style={styles.td}>{a.clock_in ? new Date(a.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td style={styles.td}>{a.clock_out ? new Date(a.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td style={styles.td}><span style={{ ...styles.badge, background: '#e1f5ee', color: '#085041' }}>{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'employees' && (
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Manage Team</h3>
                <button onClick={() => setShowAddUser(!showAddUser)} style={styles.addBtn}>+ Add Employee</button>
              </div>

              {showAddUser && (
                <form onSubmit={handleAddUser} style={styles.leaveForm}>
                  <div style={styles.formRow}>
                    <div style={styles.formField}>
                      <label style={styles.formLabel}>Emp ID</label>
                      <input style={styles.formInput} value={newUser.employee_id} onChange={e => setNewUser({ ...newUser, employee_id: e.target.value })} placeholder="MFR-001" />
                    </div>
                    <div style={styles.formField}>
                      <label style={styles.formLabel}>Name</label>
                      <input style={styles.formInput} required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                    </div>
                    <div style={styles.formField}>
                      <label style={styles.formLabel}>Email</label>
                      <input style={styles.formInput} type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                    </div>
                    <div style={styles.formField}>
                      <label style={styles.formLabel}>Password</label>
                      <input style={styles.formInput} type="password" required value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" style={styles.submitBtn}>Save Employee</button>
                </form>
              )}

              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id} style={styles.tr}>
                      <td style={styles.td}><code>{e.employee_id}</code></td>
                      <td style={styles.td}>{e.name}</td>
                      <td style={styles.td}>{e.email}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => setEditUser(e)} style={styles.editBtn}>Edit</button>
                          <button onClick={() => handleDeactivate(e.id)} style={styles.deactivateBtn}>Deactivate</button>
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
                <p style={styles.leaveHeadline}>Review and Apply for Leaves</p>
                <button style={styles.applyLeaveBtn} onClick={() => setShowLeaveForm(true)}>+ Apply Leave</button>
              </div>

              <LeaveTabs
                tabs={[
                  { key: 'summary', label: 'Summary' },
                  { key: 'balance', label: 'Balance' },
                  { key: 'requests', label: 'My Requests' },
                ]}
                activeTab={leavePanel}
                onChange={setLeavePanel}
              />

              {leavePanel === 'summary' && (
                <>
                  <div style={styles.leaveCardsRow}>
                    <LeaveCard variant="planned" title="Planned" available={leaveSummaryData.planned.available} booked={leaveSummaryData.planned.booked} />
                    <LeaveCard variant="unplanned" title="Unplanned" available={leaveSummaryData.unplanned.available} booked={leaveSummaryData.unplanned.booked} />
                  </div>
                  <LeaveTable rows={upcomingLeaves} />
                </>
              )}

              {leavePanel === 'requests' && (
                <div style={styles.requestsSection}>
                  {showLeaveForm && (
                    <form onSubmit={submitLeave} style={styles.leaveForm}>
                      <div style={styles.formRow}>
                        <div style={styles.formField}>
                          <label style={styles.formLabel}>Type</label>
                          <select style={styles.formInput} value={leaveForm.leave_type} onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}>
                            <option value="casual">Casual</option><option value="sick">Sick</option>
                          </select>
                        </div>
                        <div style={styles.formField}>
                          <label style={styles.formLabel}>From</label>
                          <input style={styles.formInput} type="date" required value={leaveForm.from_date} onChange={e => setLeaveForm({ ...leaveForm, from_date: e.target.value })} />
                        </div>
                        <div style={styles.formField}>
                          <label style={styles.formLabel}>To</label>
                          <input style={styles.formInput} type="date" required value={leaveForm.to_date} onChange={e => setLeaveForm({ ...leaveForm, to_date: e.target.value })} />
                        </div>
                      </div>
                      <button type="submit" style={styles.submitBtn}>Submit Request</button>
                    </form>
                  )}
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.thead}>
                        <th style={styles.th}>Type</th>
                        <th style={styles.th}>From</th>
                        <th style={styles.th}>To</th>
                        <th style={styles.th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myLeaves.map(r => (
                        <tr key={r.id} style={styles.tr}>
                          <td style={styles.td}>{r.leave_type}</td>
                          <td style={styles.td}>{r.from_date}</td>
                          <td style={styles.td}>{r.to_date}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.badge, background: r.status === 'approved' ? '#e1f5ee' : '#fff9e6', color: r.status === 'approved' ? '#085041' : '#b7791f' }}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'password' && (
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Security</h3>
              <form onSubmit={submitPasswordChange} style={{ maxWidth: '400px' }}>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Current Password</label>
                  <input style={styles.formInput} type="password" required value={passwordForm.current_password} onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>New Password</label>
                  <input style={styles.formInput} type="password" required value={passwordForm.new_password} onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} />
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel}>Confirm Password</label>
                  <input style={styles.formInput} type="password" required value={passwordForm.confirm_password} onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} />
                </div>
                <button type="submit" disabled={loading} style={styles.submitBtn}>Update Password</button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editUser && (
        <div style={styles.editModal}>
          <div style={styles.editModalBox}>
            <div style={styles.editModalHeader}>
              <h3 style={{ margin: 0 }}>Edit Employee</h3>
              <button onClick={() => setEditUser(null)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleEditUser}>
              <div style={styles.formField}><label style={styles.formLabel}>Name</label>
                <input style={styles.formInput} value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} />
              </div>
              <div style={styles.formField}><label style={styles.formLabel}>Email</label>
                <input style={styles.formInput} value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} />
              </div>
              <button type="submit" style={styles.submitBtn}>Save Changes</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

const styles = {
  layout: { display: 'flex', minHeight: '100vh', background: '#f8fafc' },
  sidebar: { width: '260px', background: '#0f172a', display: 'flex', flexDirection: 'column', color: '#fff' },
  sidebarTop: { flex: 1 },
  sidebarTitle: { padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' },
  navBtn: { width: '100%', padding: '12px 1.5rem', background: 'transparent', border: 'none', color: '#94a3b8', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: '12px' },
  navBtnActive: { background: '#1e293b', color: '#fff', borderLeft: '4px solid #3b82f6' },
  sidebarBottom: { padding: '1.5rem' },
  checkInBtn: { width: '100%', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  checkOutBtn: { width: '100%', padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
  doneBtn: { textAlign: 'center', padding: '12px', background: '#1e293b', color: '#10b981', borderRadius: '8px' },
  main: { flex: 1, padding: '2rem', overflowY: 'auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
  welcome: { fontSize: '24px', fontWeight: '700' },
  profileWrap: { position: 'relative' },
  profileAvatarBtn: { width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' },
  profileCard: { position: 'absolute', right: 0, top: '50px', width: '240px', background: '#fff', padding: '1rem', borderRadius: '12px', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', zIndex: 100, color: '#334155' },
  profileHeader: { display: 'flex', gap: '10px', marginBottom: '1rem' },
  profileAvatarLarge: { width: '40px', height: '40px', borderRadius: '50%', background: '#3b82f6', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' },
  profileName: { margin: 0, fontWeight: '600' },
  profileRole: { margin: 0, fontSize: '12px', color: '#64748b' },
  profileActions: { display: 'flex', flexDirection: 'column', gap: '8px' },
  profileBtn: { padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' },
  profileBtnDanger: { padding: '8px', borderRadius: '6px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' },
  statCard: { background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' },
  statNum: { fontSize: '28px', fontWeight: '800', color: '#3b82f6', margin: '0 0 5px' },
  statLabel: { fontSize: '12px', color: '#64748b', textTransform: 'uppercase' },
  card: { background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  cardTitle: { margin: '0 0 1rem' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' },
  addBtn: { padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f1f5f9' },
  th: { padding: '12px', textAlign: 'left', fontSize: '13px', color: '#64748b' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px', fontSize: '14px' },
  badge: { padding: '4px 10px', borderRadius: '999px', fontSize: '12px' },
  leaveSection: { background: '#fff', padding: '1.5rem', borderRadius: '12px' },
  leaveHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' },
  applyLeaveBtn: { padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  leaveCardsRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  leaveForm: { padding: '1rem', background: '#f8fafc', borderRadius: '8px', marginBottom: '1rem' },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' },
  formField: { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' },
  formLabel: { fontSize: '12px', fontWeight: '600' },
  formInput: { padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' },
  submitBtn: { padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  editBtn: { background: '#f1f5f9', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' },
  deactivateBtn: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' },
  editModal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  editModalBox: { background: '#fff', padding: '2rem', borderRadius: '12px', width: '400px' },
  editModalHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' },
  closeBtn: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' },
}