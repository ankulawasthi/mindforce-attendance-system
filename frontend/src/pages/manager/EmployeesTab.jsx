import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table"
import { Plus, Edit2, CheckCircle, AlertCircle, Users, Mail, Briefcase, Hash, Clock, Shield, Building, Calendar } from "lucide-react"
import api from "../../api/axios"
import { useAuth } from "../../context/AuthContext"
import { SHIFT_OPTIONS } from "../../lib/shifts"

export function EmployeesTab() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    email: "",
    employee_id: "",
    job_title: "",
    shift_timing: "",
    joined_at: "",
    password: "",
    is_active: true
  })

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const res = await api.get("/users")
      setEmployees(res.data.filter((u) => u.role === "employee"))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = () => {
    setEditMode(false)
    setFormData({ id: null, name: "", email: "", employee_id: "", job_title: "", shift_timing: SHIFT_OPTIONS[0]?.value || "", joined_at: new Date().toISOString().split('T')[0], password: "", is_active: true })
    setModalOpen(true)
    setMessage({ text: "", type: "" })
  }

  const openEditModal = (emp) => {
    setEditMode(true)
    setFormData({ 
      id: emp.id, 
      name: emp.name, 
      email: emp.email, 
      employee_id: emp.employee_id, 
      job_title: emp.job_title || "", 
      shift_timing: emp.shift_timing || "", 
      joined_at: emp.joined_at ? new Date(emp.joined_at).toISOString().split('T')[0] : "",
      password: "", 
      is_active: emp.is_active 
    })
    setModalOpen(true)
    setMessage({ text: "", type: "" })
  }

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({ ...prev, [e.target.name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage({ text: "", type: "" })
    try {
      if (editMode) {
        const payload = { ...formData }
        if (!payload.password) delete payload.password // Don't send empty password on edit
        await api.put(`/users/${formData.id}`, { user: payload })
        setMessage({ text: "Employee updated successfully", type: "success" })
      } else {
        await api.post("/users", { user: formData })
        setMessage({ text: "Employee created successfully", type: "success" })
      }
      fetchEmployees()
      setModalOpen(false)
    } catch (err) {
      setMessage({ text: err.response?.data?.errors?.join(", ") || "Failed to save employee", type: "error" })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Employees</h2>
          <p className="text-sm text-slate-500 mt-1">Manage your team members and onboarding.</p>
        </div>
        <Button onClick={openAddModal} className="bg-slate-900 hover:bg-slate-800 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      {message.text && (
        <div className={`rounded-md p-4 flex items-center gap-3 ${message.type === "error" ? "bg-red-50 text-red-900" : "bg-green-50 text-green-900"}`}>
          {message.type === "error" ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <Card className="border-slate-200/60 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Employee ID</TableHead>
                  <TableHead className="font-semibold text-slate-600">Name</TableHead>
                  <TableHead className="font-semibold text-slate-600">Email</TableHead>
                  <TableHead className="font-semibold text-slate-600">Designation</TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Loading...</TableCell></TableRow>
                ) : employees.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No employees found in your department.</TableCell></TableRow>
                ) : (
                  employees.map((emp) => (
                    <TableRow key={emp.id} className="hover:bg-slate-50/50">
                      <TableCell className="font-medium text-slate-600">{emp.employee_id}</TableCell>
                      <TableCell className="font-bold text-slate-900">{emp.name}</TableCell>
                      <TableCell className="text-slate-600">{emp.email}</TableCell>
                      <TableCell className="text-slate-600">{emp.job_title}</TableCell>
                      <TableCell>
                        <Badge variant={emp.is_active ? "success" : "secondary"} className={emp.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                          {emp.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(emp)} className="text-slate-500 hover:text-slate-900">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg font-bold">{editMode ? "Edit Employee" : "Onboard New Employee"}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Hash className="h-3.5 w-3.5"/> Employee ID</label>
                    <Input name="employee_id" value={formData.employee_id} onChange={handleChange} required placeholder="EMP-001" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Users className="h-3.5 w-3.5"/> Full Name</label>
                    <Input name="name" value={formData.name} onChange={handleChange} required placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Mail className="h-3.5 w-3.5"/> Official Email</label>
                    <Input name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="john.doe@mindforce.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5"/> Designation</label>
                    <Input name="job_title" value={formData.job_title} onChange={handleChange} required placeholder="Software Engineer" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Clock className="h-3.5 w-3.5"/> Shift Timing</label>
                    <select
                      name="shift_timing"
                      value={formData.shift_timing}
                      onChange={handleChange}
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    >
                      {SHIFT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5"/> Joining Date</label>
                    <Input name="joined_at" type="date" value={formData.joined_at} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Building className="h-3.5 w-3.5"/> Department</label>
                    <Input value={user?.department || "No Department"} disabled className="bg-slate-50 text-slate-500 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><Shield className="h-3.5 w-3.5"/> {editMode ? "Reset Password" : "Temporary Password"}</label>
                    <Input name="password" type="password" value={formData.password} onChange={handleChange} required={!editMode} placeholder={editMode ? "Leave blank to keep unchanged" : "Temp@123"} />
                  </div>
                  {editMode && (
                    <div className="space-y-2 md:col-span-2 flex items-center gap-2 mt-2">
                      <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                      <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Active Account</label>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white">{editMode ? "Save Changes" : "Create Employee"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
