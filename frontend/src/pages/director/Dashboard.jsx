import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const SIDEBAR_LINKS = [
  { key: 'overview',   label: 'Overview',       icon: '🏠' },
  { key: 'attendance', label: 'Attendance',      icon: '📅' },
  { key: 'managers',   label: 'Managers',        icon: '👔' },
  { key: 'employees',  label: 'All Employees',   icon: '👥' },
  { key: 'leaves',     label: 'Leave Requests',  icon: '📋' },
  { key: 'holidays',   label: 'Manage Holidays', icon: '🗓️' },
]

const COLORS = ['#2d6bcf', '#1D9E75', '#e88c30', '#e53e3e', '#6b3fcf']

export default function DirectorDashboard() {
  const { user, logout }            = useAuth()
  const [activeTab, setActiveTab]   = useState('overview')
  const [showProfile, setShowProfile] = useState(false)
  const [attendance, setAttendance] = useState(null)
  const [allUsers, setAllUsers]     = useState([])
  const [todayAll, setTodayAll]     = useState([])
  const [leaves, setLeaves]         = useState([])
  const [holidays, setHolidays]     = useState([])
  const [loading, setLoading]       = useState(false)
  const [message, setMessage]       = useState('')
  const [searchEmp, setSearchEmp]   = useState('')
  const [searchMgr, setSearchMgr]   = useState('')
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [u, t, l] = await Promise.all([
        api.get('/users'),
        api.get('/attendances/today'),
        api.get('/leave_requests'),
      ])
      const mine = t.data.find(x => x.user_id === user.id)
      setAttendance(mine || null)
      setAllUsers(u.data)
      setTodayAll(t.data)
      setLeaves(l.data)
    } catch (err) { console.error(err) }
  }

  const handleLeave = async (id, action) => {
    try {
      await api.patch(`/leave_requests/${id}/${action}`)
      setMessage(`✅ Leave ${action}d!`)
      fetchAll()
    } catch (err) { console.error(err) }
  }

  const handleCheckIn = async () => {
    setLoading(true)
    try {
      const res = await api.post('/attendances/clock_in')
      setAttendance(res.data)
      setMessage('✅ Checked in!')
    } catch (err) { setMessage(err.response?.data?.error || 'Error') }
    finally { setLoading(false) }
  }

  const handleCheckOut = async () => {
    setLoading(true)
    try {
      const res = await api.post('/attendances/clock_out')
      setAttendance(res.data)
      setMessage('✅ Checked out!')
    } catch (err) { setMessage(err.response?.data?.error || 'Error') }
    finally { setLoading(false) }
  }

  const managers  = allUsers.filter(u => u.role === 'manager')
  const employees = allUsers.filter(u => u.role === 'employee')
  const pending   = leaves.filter(l => l.status === 'pending')
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
      setMessage('✅ Password changed successfully!')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setActiveTab('overview')
    } catch (err) {
      setMessage(err.response?.data?.error || err.response?.data?.errors?.join(', ') || 'Failed to change password')
    } finally {
      setLoading(false)
    }
  }

  const deptData = managers.map(m => ({
    name: m.department?.split(' ')[0] || m.name,
    employees: employees.filter(e => e.department_id === m.department_id).length
  }))

  const pieData = [
    { name: 'Present', value: todayAll.length },
    { name: 'Absent',  value: Math.max(0, employees.length - todayAll.length) },
  ]

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
        {message && <div style={styles.msgBox}>{message}</div>}

        {activeTab === 'overview' && (
          <div>
            <div style={styles.statsRow}>
              {[
                { num: managers.length,   label: 'Managers',       color: '#7F77DD' },
                { num: employees.length,  label: 'Employees',      color: '#1D9E75' },
                { num: todayAll.length,   label: 'Present Today',  color: '#2d6bcf' },
                { num: pending.length,    label: 'Pending Leaves', color: '#e88c30' },
              ].map((s, i) => (
                <div key={i} style={styles.statCard}>
                  <p style={{ ...styles.statNum, color: s.color }}>{s.num}</p>
                  <p style={styles.statLabel}>{s.label}</p>
                </div>
              ))}
            </div>

            <div style={styles.chartsRow}>
              <div style={{ ...styles.card, flex: 1 }}>
                <h3 style={styles.cardTitle}>Employees by Department</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deptData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="employees" fill="#2d6bcf" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ ...styles.card, width: '280px' }}>
                <h3 style={styles.cardTitle}>Today's Attendance</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Today's Attendance — All Departments</h3>
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
                {todayAll.map(a => (
                  <tr key={a.id} style={styles.tr}>
                    <td style={styles.td}>{a.user_name}</td>
                    <td style={styles.td}>{allUsers.find(u => u.id === a.user_id)?.department || '-'}</td>
                    <td style={styles.td}>{a.clock_in ? new Date(a.clock_in).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                    <td style={styles.td}>{a.clock_out ? new Date(a.clock_out).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '-'}</td>
                    <td style={styles.td}>{a.total_hours || '-'}</td>
                    <td style={styles.td}><span style={{...styles.badge, background:'#e1f5ee', color:'#085041'}}>{a.status}</span></td>
                  </tr>
                ))}
                {todayAll.length === 0 && <tr><td colSpan={6} style={{...styles.td, color:'#888', textAlign:'center'}}>No records today</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'managers' && (
  <div style={styles.card}>
    <div style={styles.cardHeader}>
      <h3 style={styles.cardTitle}>All Managers</h3>
      <input
        style={styles.searchInput}
        placeholder="🔍 Search managers..."
        value={searchMgr}
        onChange={e => setSearchMgr(e.target.value)}
      />
    </div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {managers.filter(m =>
  m.name.toLowerCase().includes(searchMgr.toLowerCase()) ||
  (m.department || '').toLowerCase().includes(searchMgr.toLowerCase())
).map(m => (
                  <tr key={m.id} style={styles.tr}>
                    <td style={styles.td}><strong>{m.name}</strong></td>
                    <td style={styles.td}>{m.email}</td>
                    <td style={styles.td}>{m.department}</td>
                    <td style={styles.td}><span style={{...styles.badge, background:'#e1f5ee', color:'#085041'}}>Active</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'employees' && (
  <div style={styles.card}>
    <div style={styles.cardHeader}>
      <h3 style={styles.cardTitle}>All Employees</h3>
      <input
        style={styles.searchInput}
        placeholder="🔍 Search employees..."
        value={searchEmp}
        onChange={e => setSearchEmp(e.target.value)}
      />
    </div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Joined</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.filter(e =>
  e.name.toLowerCase().includes(searchEmp.toLowerCase()) ||
  e.email.toLowerCase().includes(searchEmp.toLowerCase()) ||
  (e.department || '').toLowerCase().includes(searchEmp.toLowerCase())
).map(e => (
                  <tr key={e.id} style={styles.tr}>
                    <td style={styles.td}>{e.name}</td>
                    <td style={styles.td}>{e.email}</td>
                    <td style={styles.td}>{e.department}</td>
                    <td style={styles.td}>{e.joined_at}</td>
                    <td style={styles.td}><span style={{...styles.badge, background: e.is_active?'#e1f5ee':'#fff0f0', color: e.is_active?'#085041':'#e53e3e'}}>{e.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

{activeTab === 'leaves' && (
  <div>
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>⏳ Pending Manager Leave Requests</h3>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            <th style={styles.th}>Manager</th>
            <th style={styles.th}>Department</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>From</th>
            <th style={styles.th}>To</th>
            <th style={styles.th}>Reason</th>
            <th style={styles.th}>Action</th>
          </tr>
        </thead>
        <tbody>
          {leaves.filter(l => l.user_role === 'manager' && l.status === 'pending').map(l => (
            <tr key={l.id} style={styles.tr}>
              <td style={styles.td}><strong>{l.user_name}</strong></td>
              <td style={styles.td}>{l.department}</td>
              <td style={styles.td}>{l.leave_type}</td>
              <td style={styles.td}>{l.from_date}</td>
              <td style={styles.td}>{l.to_date}</td>
              <td style={styles.td}>{l.reason}</td>
              <td style={styles.td}>
                <div style={{display:'flex', gap:'6px'}}>
                  {/* <button onClick={() => handleLeave(l.id, 'approve')} style={styles.approveBtn}>Approve</button>
                  <button onClick={() => handleLeave(l.id, 'reject')} style={styles.rejectBtn}>Reject</button> */}
                  <button 
  onClick={() => handleLeave(l.id, 'approve')} 
  style={{padding:'6px 14px', background:'#1D9E75', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600'}}>
  ✓ Approve
</button>
<button 
  onClick={() => handleLeave(l.id, 'reject')} 
  style={{padding:'6px 14px', background:'#e53e3e', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'600'}}>
  ✗ Reject
</button>
                </div>
              </td>
            </tr>
          ))}
          {leaves.filter(l => l.user_role === 'manager' && l.status === 'pending').length === 0 && (
            <tr><td colSpan={7} style={{...styles.td, color:'#888', textAlign:'center'}}>No pending manager leave requests</td></tr>
          )}
        </tbody>
      </table>
    </div>

    <div style={styles.card}>
      <h3 style={styles.cardTitle}>📋 All Leave Requests</h3>
      <table style={styles.table}>
        <thead>
          <tr style={styles.thead}>
            <th style={styles.th}>Employee</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Department</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>From</th>
            <th style={styles.th}>To</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {leaves.map(l => (
            <tr key={l.id} style={styles.tr}>
              <td style={styles.td}>{l.user_name}</td>
              <td style={styles.td}>
                <span style={{...styles.badge,
                  background: l.user_role==='manager' ? '#e1f5ee' : '#f0f0f0',
                  color: l.user_role==='manager' ? '#085041' : '#555'
                }}>{l.user_role}</span>
              </td>
              <td style={styles.td}>{l.department}</td>
              <td style={styles.td}>{l.leave_type}</td>
              <td style={styles.td}>{l.from_date}</td>
              <td style={styles.td}>{l.to_date}</td>
              <td style={styles.td}>
                <span style={{...styles.badge,
                  background: l.status==='approved'?'#e1f5ee':l.status==='rejected'?'#fff0f0':'#fff9e6',
                  color: l.status==='approved'?'#085041':l.status==='rejected'?'#e53e3e':'#b7791f'
                }}>{l.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}

        {activeTab === 'holidays' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Holidays 2026</h3>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thead}>
                  <th style={styles.th}>Holiday</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Type</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name:'New Year',         date:'2026-01-01', optional: false },
                  { name:'Republic Day',     date:'2026-01-26', optional: false },
                  { name:'Holi',             date:'2026-03-14', optional: false },
                  { name:'Independence Day', date:'2026-08-15', optional: false },
                  { name:'Gandhi Jayanti',   date:'2026-10-02', optional: false },
                  { name:'Diwali',           date:'2026-10-20', optional: false },
                  { name:'Christmas',        date:'2026-12-25', optional: false },
                ].map((h, i) => (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}>{h.name}</td>
                    <td style={styles.td}>{h.date}</td>
                    <td style={styles.td}><span style={{...styles.badge, background:'#EEEDFE', color:'#3C3489'}}>{h.optional ? 'Optional' : 'Mandatory'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'password' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Change Password</h3>
            <form onSubmit={submitPasswordChange}>
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
  msgBox:        { background:'#e1f5ee', color:'#085041', padding:'10px 16px', borderRadius:'8px', marginBottom:'1rem', fontSize:'14px' },
  statsRow:      { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'1rem', marginBottom:'1.5rem' },
  statCard:      { background:'#fff', padding:'1.25rem', borderRadius:'12px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', textAlign:'center' },
  statNum:       { margin:'0 0 4px', fontSize:'28px', fontWeight:'700' },
  statLabel:     { margin:0, color:'#888', fontSize:'12px' },
  chartsRow:     { display:'flex', gap:'1rem', marginBottom:'1.5rem', flexWrap:'wrap' },
  card:          { background:'#fff', padding:'1.5rem', borderRadius:'12px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'1.5rem' },
  cardTitle:     { margin:'0 0 1rem', fontSize:'17px', fontWeight:'600', color:'#1a1a2e' },
  formField:     { marginBottom:'0.75rem' },
  formLabel:     { display:'block', fontSize:'12px', fontWeight:'500', color:'#555', marginBottom:'4px' },
  formInput:     { width:'100%', padding:'8px 12px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', outline:'none', boxSizing:'border-box' },
  submitBtn:     { padding:'10px 24px', background:'#2d6bcf', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'600' },
  table:         { width:'100%', borderCollapse:'collapse' },
  thead:         { background:'#f8f9fa' },
  th:            { padding:'10px 14px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:'#555', borderBottom:'1px solid #eee' },
  tr:            { borderBottom:'1px solid #f0f0f0' },
  td:            { padding:'10px 14px', fontSize:'13px', color:'#333' },
  badge:         { padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'500' },
  searchInput:   { padding:'8px 14px', border:'1.5px solid #e2e8f0', borderRadius:'8px', fontSize:'13px', outline:'none', width:'220px' },
}

