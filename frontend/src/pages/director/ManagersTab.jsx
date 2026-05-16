import { useState, useEffect } from "react"
import api from "../../api/axios"
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import {
  Plus, Edit2, CheckCircle, XCircle, AlertCircle, Search,
  Hash, Users, Mail, Phone, Briefcase, Building, Calendar,
  Clock, Shield, Layers, Monitor, UserCheck
} from "lucide-react"

import { SHIFT_OPTIONS } from "../../lib/shifts"

const EMPLOYMENT_TYPES = ["Full-Time", "Part-Time", "Contract", "Intern"]
const WORK_MODES = ["On-Site", "Remote", "Hybrid"]

const EMPTY_FORM = {
  id: null,
  employee_id: "",
  name: "",
  email: "",
  mobile_number: "",
  department_id: "",
  job_title: "",
  joined_at: "",
  shift_timing: SHIFT_OPTIONS[0]?.value || "",
  employment_type: "Full-Time",
  work_mode: "On-Site",
  password: "",
  is_active: true,
}

function Field({ label, icon: Icon, children }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      {children}
    </div>
  )
}

function Select({ value, onChange, name, children, required }) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:border-slate-400"
    >
      {children}
    </select>
  )
}

export function ManagersTab() {
  const [managers, setManagers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: "", type: "" })

  useEffect(() => {
    fetchManagers()
    fetchDepartments()
  }, [])

  const fetchManagers = async () => {
    setLoading(true)
    try {
      const res = await api.get("/users")
      setManagers(res.data.filter(u => u.role === "manager"))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchDepartments = async () => {
    try {
      const res = await api.get("/departments")
      setDepartments(res.data)
    } catch (err) { console.error(err) }
  }

  const showMsg = (text, type = "success") => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: "", type: "" }), 4000)
  }

  const openAdd = () => {
    setEditMode(false)
    setForm(EMPTY_FORM)
    setMsg({ text: "", type: "" })
    setModalOpen(true)
  }

  const openEdit = (mgr) => {
    setEditMode(true)
    setForm({
      id: mgr.id,
      employee_id: mgr.employee_id || "",
      name: mgr.name || "",
      email: mgr.email || "",
      mobile_number: mgr.mobile_number || "",
      department_id: mgr.department_id || "",
      job_title: mgr.job_title || "",
      joined_at: mgr.joined_at ? mgr.joined_at.slice(0, 10) : "",
      shift_timing: mgr.shift_timing || (SHIFT_OPTIONS[0]?.value || ""),
      employment_type: mgr.employment_type || "Full-Time",
      work_mode: mgr.work_mode || "On-Site",
      password: "",
      is_active: mgr.is_active,
    })
    setMsg({ text: "", type: "" })
    setModalOpen(true)
  }

  const handleChange = (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value
    setForm(prev => ({ ...prev, [e.target.name]: val }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg({ text: "", type: "" })
    try {
      const payload = {
        ...form,
        role: "manager",
      }
      if (!payload.password) delete payload.password

      if (editMode) {
        await api.put(`/users/${form.id}`, { user: payload })
        showMsg("Manager updated successfully.")
      } else {
        await api.post("/users", { user: payload })
        showMsg("Manager created. They can now log in.")
      }
      await fetchManagers()
      setModalOpen(false)
    } catch (err) {
      setMsg({ text: err.response?.data?.errors?.join(", ") || "Failed to save manager.", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (mgr) => {
    try {
      await api.put(`/users/${mgr.id}`, { user: { is_active: !mgr.is_active } })
      showMsg(`${mgr.name} ${!mgr.is_active ? "activated" : "deactivated"}.`)
      fetchManagers()
    } catch (err) {
      showMsg("Failed to update status.", "error")
    }
  }

  const filtered = managers.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    m.department?.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount   = managers.filter(m => m.is_active).length
  const inactiveCount = managers.length - activeCount

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manager Management</h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {managers.length} managers · {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Manager
        </Button>
      </div>

      {/* Global message */}
      {msg.text && !modalOpen && (
        <div className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 text-[13px] font-medium ${
          msg.type === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
        }`}>
          {msg.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Managers", value: managers.length, icon: UserCheck, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Active",         value: activeCount,      icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Inactive",       value: inactiveCount,    icon: XCircle,     color: "text-slate-500",   bg: "bg-slate-100" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <p className="text-2xl font-bold font-mono text-slate-900 mt-0.5">{value}</p>
              </div>
              <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search + table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Managers</CardTitle>
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search by name, email, ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-y border-slate-100">
                <tr>
                  {["Emp ID", "Name", "Department", "Designation", "Email", "Shift", "Work Mode", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400 text-sm">No managers found</td></tr>
                ) : filtered.map(mgr => (
                  <tr key={mgr.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{mgr.employee_id || "—"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{mgr.name}</td>
                    <td className="px-4 py-3 text-slate-600">{mgr.department || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{mgr.job_title || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{mgr.email}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{mgr.shift_timing || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px]">{mgr.work_mode || "On-Site"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={mgr.is_active ? "success" : "outline"} className="text-[10px]">
                        {mgr.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(mgr)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(mgr)}
                          className={`p-1.5 rounded-md transition-colors ${
                            mgr.is_active
                              ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                              : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={mgr.is_active ? "Deactivate" : "Activate"}
                        >
                          {mgr.is_active ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
            <span className="text-[11px] text-slate-400">Showing {filtered.length} of {managers.length} managers</span>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-start justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8">
            <Card className="bg-white shadow-2xl border-slate-200">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{editMode ? "Edit Manager" : "Onboard New Manager"}</CardTitle>
                    <p className="text-[12px] text-slate-400 mt-0.5">
                      {editMode ? "Update manager details below." : "Role will be set to Manager automatically."}
                    </p>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                {/* Modal message */}
                {msg.text && (
                  <div className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[12px] font-medium mb-4 ${
                    msg.type === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  }`}>
                    {msg.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0" />}
                    {msg.text}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Section: Identity */}
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Identity</p>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <Field label="Employee ID" icon={Hash}>
                      <Input name="employee_id" value={form.employee_id} onChange={handleChange} placeholder="MGR-001" required />
                    </Field>
                    <Field label="Full Name" icon={Users}>
                      <Input name="name" value={form.name} onChange={handleChange} placeholder="Jane Smith" required />
                    </Field>
                    <Field label="Official Email" icon={Mail}>
                      <Input name="email" type="email" value={form.email} onChange={handleChange} placeholder="jane@mindforce.com" required />
                    </Field>
                    <Field label="Mobile Number" icon={Phone}>
                      <Input name="mobile_number" value={form.mobile_number} onChange={handleChange} placeholder="+91 98765 43210" />
                    </Field>
                  </div>

                  {/* Section: Role & Work */}
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Role & Work</p>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <Field label="Department" icon={Building}>
                      <Select name="department_id" value={form.department_id} onChange={handleChange} required>
                        <option value="">Select department…</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Designation" icon={Briefcase}>
                      <Input name="job_title" value={form.job_title} onChange={handleChange} placeholder="Department Manager" required />
                    </Field>
                    <Field label="Joining Date" icon={Calendar}>
                      <Input name="joined_at" type="date" value={form.joined_at} onChange={handleChange} />
                    </Field>
                    <Field label="Shift Timing" icon={Clock}>
                      <Select name="shift_timing" value={form.shift_timing} onChange={handleChange}>
                        {SHIFT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </Select>
                    </Field>
                    <Field label="Employment Type" icon={Layers}>
                      <Select name="employment_type" value={form.employment_type} onChange={handleChange}>
                        {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </Select>
                    </Field>
                    <Field label="Work Mode" icon={Monitor}>
                      <Select name="work_mode" value={form.work_mode} onChange={handleChange}>
                        {WORK_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                      </Select>
                    </Field>
                  </div>

                  {/* Section: Security */}
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Security</p>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <Field label={editMode ? "Reset Password" : "Temporary Password"} icon={Shield}>
                      <Input
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        required={!editMode}
                        placeholder={editMode ? "Leave blank to keep current" : "Temp@123"}
                      />
                    </Field>
                    {editMode && (
                      <Field label="Account Status" icon={UserCheck}>
                        <div className="flex items-center gap-2.5 h-9">
                          <input
                            type="checkbox"
                            id="is_active_mgr"
                            name="is_active"
                            checked={form.is_active}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <label htmlFor="is_active_mgr" className="text-sm text-slate-700 font-medium">
                            {form.is_active ? "Active — can log in" : "Inactive — login blocked"}
                          </label>
                        </div>
                      </Field>
                    )}
                  </div>

                  {/* Role badge (read-only indicator) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-500" />
                    <span className="text-[12px] text-slate-600 font-medium">
                      Role: <span className="font-bold text-slate-900">Manager</span> — assigned automatically
                    </span>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving…" : editMode ? "Save Changes" : "Create Manager"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
