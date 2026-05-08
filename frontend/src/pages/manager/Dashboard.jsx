import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import LeaveCard from '../../components/LeaveCard'
import LeaveTable from '../../components/LeaveTable'

const SIDEBAR_LINKS = [
  { key: 'overview',   label: 'Overview',        icon: '🏠' },
  { key: 'attendance', label: 'Attendance',       icon: '📅' },
  { key: 'breaks',     label: 'Break Monitor',    icon: '☕' },
  { key: 'employees',  label: 'Manage Users',     icon: '👥' },
  { key: 'leaves',     label: 'Leave Requests',   icon: '📋' },
]

// --- Timeline Component for Attendance ---
const TimelineRow = ({ day, date, checkIn, checkOut, hrsWorked, isWeekend, lateBy, earlyBy }) => (
  <div style={styles.timelineRow}>
    <div style={styles.dateCol}>
      <div style={styles.dayText}>{day}</div>
      <div style={styles.dateText}>{date}</div>
    </div>
    <div style={styles.timelineContent}>
      {isWeekend ? (
        <div style={styles.weekendWrapper}>
          <div style={styles.weekendLine} /><span style={styles.weekendBadge}>Weekend</span><div style={styles.weekendLine} />
        </div>
      ) : (
        <div style={styles.activeRowContent}>
          <div style={styles.timeInfo}>
            <div style={styles.mainTime}>{checkIn || '--:--'}</div>
            {lateBy && <div style={styles.lateText}>Late by <span style={{ fontWeight: '600' }}>{lateBy}</span></div>}
          </div>
          <div style={styles.barContainer}>
             <div style={styles.bgLine} />
             <div style={{...styles.dot, left: '20%'}} /><div style={{...styles.dot, right: '20%'}} />
             <div style={styles.workBar}>
               <div style={styles.workDotStart} /><div style={styles.workDotEnd} />
             </div>
          </div>
          <div style={styles.timeInfo}>
            <div style={styles.mainTime}>{checkOut || '--:--'}</div>
            {earlyBy && <div style={styles.earlyText}>Early by <span style={{ fontWeight: '600' }}>{earlyBy}</span></div>}
          </div>
        </div>
      )}
    </div>
    <div style={styles.totalCol}>
      <div style={styles.hrsValue}>{hrsWorked}</div>
      <div style={styles.hrsLabel}>Hrs worked</div>
    </div>
  </div>
)

export default function ManagerDashboard() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [leavePanel, setLeavePanel] = useState('summary')
  const [showProfile, setShowProfile] = useState(false)
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [editUser, setEditUser] = useState(null)
  
  const [attendance, setAttendance] = useState(null)
  const [todayAll, setTodayAll] = useState([])
  const [employees, setEmployees] = useState([])
  const [leaves, setLeaves] = useState([])
  const [myLeaves, setMyLeaves] = useState([])
  const [breakSummary, setBreakSummary] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text:'', type:'success' })

  const [leaveForm, setLeaveForm] = useState({ leave_type:'casual', leave_slot:'full_day', from_date:'', to_date:'', reason:'' })
  const [newUser, setNewUser] = useState({ name:'', email:'', password:'', joined_at:'', employee_id:'' })

  useEffect(() => { fetchAll(); fetchMyLeaves(); }, [])

  const fetchAll = async () => {
    try {
      const [a, u, b] = await Promise.all([
        api.get('/attendances/today'),
        api.get('/users'),
        api.get('/breaks/department_summary'),
      ])
      setAttendance(a.data.find(x => x.user_id === user.id) || null)
      setTodayAll(a.data)
      setEmployees(u.data.filter(u => u.role === 'employee'))
      setBreakSummary(b.data)
    } catch (err) { console.error(err) }
  }

  const fetchMyLeaves = async () => {
    try {
      const res = await api.get('/leave_requests')
      setMyLeaves(res.data.filter(l => l.user_id === user.id))
      setLeaves(res.data.filter(l => l.user_id !== user.id && l.status === 'pending'))
    } catch (err) { console.error(err) }
  }

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text:'', type:'success' }), 4000)
  }

  const handleApplyLeaveClick = () => {
    setLeavePanel('myrequests')
    setShowLeaveForm(true)
  }

  const submitLeave = async (e) => {
    e.preventDefault()
    try {
      const payload = leaveForm.leave_slot === 'full_day' ? leaveForm : { ...leaveForm, to_date: leaveForm.from_date }
      await api.post('/leave_requests', { leave_request: payload })
      showMsg('✅ Leave request submitted!')
      setShowLeaveForm(false)
      setLeaveForm({ leave_type:'casual', leave_slot:'full_day', from_date:'', to_date:'', reason:'' })
      fetchMyLeaves()
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
  }

  const handleCheckIn = async () => {
    try {
      const res = await api.post('/attendances/clock_in')
      setAttendance(res.data); showMsg('✅ Checked in!'); fetchAll()
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
  }

  const handleCheckOut = async () => {
    try {
      const res = await api.post('/attendances/clock_out')
      setAttendance(res.data); showMsg('✅ Checked out!'); fetchAll()
    } catch (err) { showMsg(err.response?.data?.error || 'Error', 'error') }
  }

  const leaveSummaryData = { planned: { available: '8.21', booked: 1 }, unplanned: { available: '1.5', booked: 0 } }

  return (
    <div style={styles.layout}>
      <div style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.sidebarTitle}>🎯 MFR WorkTrackr</div>
          <nav>
            {SIDEBAR_LINKS.map(link => (
              <button key={link.key} onClick={() => setActiveTab(link.key)}
                style={{ ...styles.navBtn, ...(activeTab === link.key ? styles.navBtnActive : {}) }}>
                {link.icon} {link.label}
              </button>
            ))}
          </nav>
        </div>
        <div style={styles.sidebarBottom}>
          {!attendance?.clock_in && <button onClick={handleCheckIn} style={styles.checkInBtn}>➡️ Check In</button>}
          {attendance?.clock_in && !attendance?.clock_out && <button onClick={handleCheckOut} style={styles.checkOutBtn}>⬅️ Check Out</button>}
          {attendance?.clock_out && <div style={styles.doneBtn}>✅ Done</div>}
        </div>
      </div>

      <div style={styles.main}>
        <div style={styles.topBar}>
          <h1 style={styles.welcome}>Welcome, {user?.name} 👋</h1>
          <button style={styles.profileBtn} onClick={() => setShowProfile(!showProfile)}>{user?.name?.charAt(0)}</button>
        </div>

        {message.text && <div style={{...styles.msgBox, background: message.type==='error'?'#fff0f0':'#e1f5ee'}}>{message.text}</div>}

        {activeTab === 'attendance' && (
          <div style={styles.card}>
            <div style={styles.calendarHeader}>📅 03-May-2026 - 09-May-2026</div>
            <div style={styles.timelineContainer}>
              <TimelineRow day="Sun" date="03" isWeekend={true} hrsWorked="00:00" />
              <TimelineRow day="Mon" date="04" checkIn="01:07 PM" lateBy="08:07" checkOut="09:53 PM" earlyBy="07:06" hrsWorked="08:46" />
              <TimelineRow day="Tue" date="05" checkIn="01:03 PM" lateBy="08:03" checkOut="09:54 PM" earlyBy="07:05" hrsWorked="08:51" />
              <TimelineRow day="Wed" date="06" checkIn="01:12 PM" lateBy="08:12" checkOut="10:09 PM" earlyBy="06:50" hrsWorked="08:57" />
            </div>
          </div>
        )}

        {activeTab === 'leaves' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={{fontWeight:'500'}}>Review and Apply for Leaves</h3>
              <button onClick={handleApplyLeaveClick} style={styles.applyBtnMain}>+ Apply Leave</button>
            </div>

            <div style={styles.pillTabContainer}>
              {['Summary', 'Balance', 'My Requests'].map(tab => {
                const key = tab.toLowerCase().replace(' ', '');
                const isActive = leavePanel === key;
                return (
                  <button key={key} onClick={() => setLeavePanel(key)}
                    style={{...styles.pillTab, background: isActive?'#1d4ed8':'#e2e8f0', color: isActive?'#fff':'#475569'}}>
                    {tab}
                  </button>
                )
              })}
            </div>

            {leavePanel === 'summary' && (
              <div style={styles.leaveGrid}>
                <LeaveCard variant="planned" title="Planned" available={leaveSummaryData.planned.available} booked={leaveSummaryData.planned.booked} icon="☀️" />
                <LeaveCard variant="unplanned" title="Unplanned" available={leaveSummaryData.unplanned.available} booked={leaveSummaryData.unplanned.booked} icon="⛅" />
              </div>
            )}

            {leavePanel === 'myrequests' && (
              <div>
                {showLeaveForm && (
                  <form onSubmit={submitLeave} style={styles.leaveForm}>
                    <div style={styles.formRow}>
                      <div style={styles.formField}><label>Type</label><select style={styles.formInput} onChange={e=>setLeaveForm({...leaveForm, leave_type:e.target.value})}><option value="casual">Casual</option><option value="sick">Sick</option></select></div>
                      <div style={styles.formField}><label>From</label><input type="date" style={styles.formInput} required onChange={e=>setLeaveForm({...leaveForm, from_date:e.target.value})} /></div>
                      <div style={styles.formField}><label>To</label><input type="date" style={styles.formInput} required onChange={e=>setLeaveForm({...leaveForm, to_date:e.target.value})} /></div>
                    </div>
                    <button type="submit" style={styles.applyBtnMain}>Submit</button>
                  </form>
                )}
                <LeaveTable rows={myLeaves} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  layout: { display:'flex', minHeight:'100vh', background:'#f1f5f9' },
  sidebar: { width:'250px', background:'#0f172a', color:'#fff', display:'flex', flexDirection:'column' },
  sidebarTop: { flex:1, padding:'20px' },
  sidebarTitle: { fontSize:'18px', fontWeight:'700', marginBottom:'30px' },
  navBtn: { width:'100%', padding:'12px', background:'transparent', border:'none', color:'#94a3b8', textAlign:'left', cursor:'pointer', borderRadius:'8px' },
  navBtnActive: { background:'#1e293b', color:'#fff' },
  sidebarBottom: { padding:'20px' },
  checkInBtn: { width:'100%', padding:'12px', background:'#10b981', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' },
  checkOutBtn: { width:'100%', padding:'12px', background:'#ef4444', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer' },
  doneBtn: { textAlign:'center', color:'#10b981', padding:'10px' },
  main: { flex:1, padding:'40px', overflowY:'auto' },
  topBar: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px' },
  welcome: { fontSize:'28px', margin:0 },
  profileBtn: { width:'40px', height:'40px', borderRadius:'50%', background:'#3b82f6', color:'#fff', border:'none', cursor:'pointer' },
  card: { background:'#fff', padding:'25px', borderRadius:'16px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' },
  cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' },
  msgBox: { padding:'15px', borderRadius:'8px', marginBottom:'20px' },
  
  // Attendance Timeline Styles
  calendarHeader: { textAlign:'center', padding:'10px', background:'#f8fafc', borderRadius:'8px', fontSize:'14px', fontWeight:'600', marginBottom:'15px' },
  timelineContainer: { border:'1px solid #e2e8f0', borderRadius:'12px', overflow:'hidden' },
  timelineRow: { display:'flex', padding:'15px 20px', borderBottom:'1px solid #f1f5f9', alignItems:'center' },
  dateCol: { width:'50px', textAlign:'center' },
  dayText: { fontSize:'14px', fontWeight:'600', color:'#475569' },
  dateText: { fontSize:'12px', color:'#94a3b8' },
  timelineContent: { flex:1, padding:'0 30px' },
  activeRowContent: { display:'flex', alignItems:'center', justifyContent:'space-between' },
  timeInfo: { width:'100px' },
  mainTime: { fontWeight:'700', fontSize:'14px' },
  lateText: { fontSize:'11px', color:'#f59e0b' },
  earlyText: { fontSize:'11px', color:'#f59e0b' },
  barContainer: { flex:1, position:'relative', height:'2px', background:'#f1f5f9', margin:'0 20px' },
  bgLine: { width:'100%', height:'100%', background:'#f1f5f9' },
  dot: { position:'absolute', width:'6px', height:'6px', background:'#cbd5e1', borderRadius:'50%', top:'-2px' },
  workBar: { position:'absolute', left:'30%', right:'30%', height:'2px', background:'#86efac' },
  workDotStart: { position:'absolute', left:'0', width:'6px', height:'6px', background:'#22c55e', borderRadius:'50%', top:'-2px' },
  workDotEnd: { position:'absolute', right:'0', width:'6px', height:'6px', background:'#ef4444', borderRadius:'50%', top:'-2px' },
  weekendWrapper: { display:'flex', alignItems:'center', gap:'10px' },
  weekendLine: { flex:1, height:'1px', background:'#fef3c7' },
  weekendBadge: { padding:'2px 10px', border:'1px solid #fef3c7', borderRadius:'4px', fontSize:'11px', color:'#92400e' },
  totalCol: { width:'100px', textAlign:'right' },
  hrsValue: { fontWeight:'700' },
  hrsLabel: { fontSize:'11px', color:'#94a3b8' },

  // Leave Styles
  applyBtnMain: { background:'#6366f1', color:'#fff', border:'none', padding:'10px 20px', borderRadius:'8px', cursor:'pointer', fontWeight:'600' },
  pillTabContainer: { display:'flex', gap:'10px', marginBottom:'25px' },
  pillTab: { padding:'8px 20px', borderRadius:'20px', border:'none', cursor:'pointer', fontWeight:'600', fontSize:'13px' },
  leaveGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' },
  leaveForm: { background:'#f8fafc', padding:'20px', borderRadius:'12px', border:'1px solid #e2e8f0', marginBottom:'20px' },
  formRow: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'15px', marginBottom:'15px' },
  formField: { display:'flex', flexDirection:'column', gap:'5px' },
  formInput: { padding:'8px', borderRadius:'6px', border:'1px solid #cbd5e1' }
}