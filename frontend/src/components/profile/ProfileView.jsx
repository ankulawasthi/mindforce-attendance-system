import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { User, Phone, Mail, MapPin, Briefcase, Calendar, Clock, AlertCircle, CheckCircle, Shield } from "lucide-react"
import api from "../../api/axios"

export function ProfileView({ user, onProfileUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  const [formData, setFormData] = useState({
    profile_photo_url: user?.profile_photo_url || "",
    mobile_number: user?.mobile_number || "",
    address: user?.address || "",
    emergency_contact: user?.emergency_contact || "",
    personal_email: user?.personal_email || "",
  })

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: "", type: "" })
    try {
      const res = await api.put(`/users/${user.id}`, { user: formData })
      setMessage({ text: "Profile updated successfully!", type: "success" })
      setIsEditing(false)
      if (onProfileUpdate) onProfileUpdate(res.data)
    } catch (err) {
      setMessage({ text: err.response?.data?.errors?.join(", ") || "Failed to update profile", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState({ text: "", type: "" })

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwordData.new_password !== passwordData.confirm_password) {
      return setPasswordMessage({ text: "Passwords do not match", type: "error" })
    }
    setPasswordLoading(true)
    setPasswordMessage({ text: "", type: "" })
    try {
      await api.patch('/auth/change_password', passwordData)
      setPasswordMessage({ text: "Password changed successfully!", type: "success" })
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" })
    } catch (err) {
      setPasswordMessage({ text: err.response?.data?.error || "Failed to change password", type: "error" })
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your personal and work information.</p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>Save Changes</Button>
          </div>
        )}
      </div>

      {message.text && (
        <div className={`rounded-md p-4 flex items-center gap-3 ${message.type === "error" ? "bg-red-50 text-red-900" : "bg-green-50 text-green-900"}`}>
          {message.type === "error" ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Photo & Basic Summary */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-slate-200/60 bg-white shadow-none text-center overflow-hidden">
            <div className="h-24 bg-gradient-to-r from-slate-900 to-slate-700 w-full" />
            <CardContent className="px-6 pb-6 pt-0">
              <div className="mx-auto h-24 w-24 rounded-full border-4 border-white bg-slate-100 shadow-sm -mt-12 overflow-hidden flex items-center justify-center mb-4">
                {formData.profile_photo_url ? (
                  <img src={formData.profile_photo_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-slate-400" />
                )}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{user?.name}</h2>
              <p className="text-sm font-medium text-slate-500 mb-2">{user?.job_title || "Employee"}</p>
              <Badge variant="outline" className="bg-slate-50">{user?.department || "No Department"}</Badge>
            </CardContent>
          </Card>

          {isEditing && (
            <Card className="border-slate-200/60 bg-white shadow-none">
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wider text-slate-500 font-bold">Profile Photo URL</CardTitle>
              </CardHeader>
              <CardContent>
                <Input 
                  name="profile_photo_url"
                  placeholder="https://example.com/photo.jpg"
                  value={formData.profile_photo_url}
                  onChange={handleChange}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Details */}
        <div className="md:col-span-2 space-y-6">
          
          <Card className="border-slate-200/60 bg-white shadow-none">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                <Briefcase className="h-4 w-4" /> Work Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Employee ID</p>
                  <p className="text-sm font-semibold text-slate-900">{user?.employee_id || "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Official Email</p>
                  <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Joining Date</p>
                  <p className="text-sm font-semibold text-slate-900">{user?.joined_at ? new Date(user.joined_at).toLocaleDateString() : "—"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Shift Timing</p>
                  <p className="text-sm font-semibold text-slate-900">{user?.shift_timing || "09:00 AM - 06:00 PM"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 bg-white shadow-none">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                <Phone className="h-4 w-4" /> Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Mobile Number</p>
                  {isEditing ? (
                    <Input name="mobile_number" value={formData.mobile_number} onChange={handleChange} placeholder="+1 234 567 890" />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">{user?.mobile_number || "—"}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Personal Email</p>
                  {isEditing ? (
                    <Input name="personal_email" type="email" value={formData.personal_email} onChange={handleChange} placeholder="personal@example.com" />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">{user?.personal_email || "—"}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Emergency Contact</p>
                  {isEditing ? (
                    <Input name="emergency_contact" value={formData.emergency_contact} onChange={handleChange} placeholder="Name - Phone" />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">{user?.emergency_contact || "—"}</p>
                  )}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Residential Address</p>
                  {isEditing ? (
                    <Input name="address" value={formData.address} onChange={handleChange} placeholder="123 Main St, City, Country" />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900">{user?.address || "—"}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200/60 bg-white shadow-none">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500 font-bold flex items-center gap-2">
                <Shield className="h-4 w-4" /> Account Security
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {passwordMessage.text && (
                <div className={`rounded-md p-3 mb-4 flex items-center gap-3 text-xs ${passwordMessage.type === "error" ? "bg-red-50 text-red-900" : "bg-green-50 text-green-900"}`}>
                  {passwordMessage.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  <span>{passwordMessage.text}</span>
                </div>
              )}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Current Password</p>
                    <Input 
                      type="password" 
                      value={passwordData.current_password} 
                      onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})} 
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">New Password</p>
                    <Input 
                      type="password" 
                      value={passwordData.new_password} 
                      onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})} 
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Confirm New Password</p>
                    <Input 
                      type="password" 
                      value={passwordData.confirm_password} 
                      onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})} 
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={passwordLoading} className="bg-slate-900 hover:bg-slate-800">
                    {passwordLoading ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
