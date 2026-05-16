import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { 
  Calendar, Clock, Users, MapPin, Plus, X, Search, 
  Info, AlertCircle, CheckCircle, ChevronLeft, ChevronRight,
  Filter, Monitor, Layout, List
} from "lucide-react"
import api from "../../api/axios"

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 || 12
  const ampm = i < 12 ? 'AM' : 'PM'
  return { value: i, label: `${hour}:00 ${ampm}` }
})

const STATUS_COLORS = {
  Available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Occupied: "bg-red-50 text-red-700 border-red-200",
  Upcoming: "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-slate-50 text-slate-700 border-slate-200",
  Cancelled: "bg-slate-50 text-slate-400 border-slate-100",
}

export function MeetingScheduler({ role = "employee" }) {
  const [rooms, setRooms] = useState([])
  const [bookings, setBookings] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState("timeline") // timeline or list
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [message, setMessage] = useState({ text: "", type: "" })
  
  const [formData, setFormData] = useState({
    meeting_room_id: "",
    title: "",
    purpose: "",
    date: selectedDate,
    start_time: "09:00",
    end_time: "10:00",
    participant_ids: [],
    notes: "",
    selectedRoom: null
  })

  useEffect(() => {
    fetchData()
  }, [selectedDate])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [roomsRes, bookingsRes, usersRes] = await Promise.all([
        api.get("/meeting_rooms"),
        api.get(`/room_bookings?date=${selectedDate}`),
        api.get("/users")
      ])
      setRooms(roomsRes.data)
      setBookings(bookingsRes.data)
      setUsers(usersRes.data)
    } catch (err) {
      console.error("Failed to fetch scheduling data", err)
    } finally {
      setLoading(false)
    }
  }

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => 
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.location?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [rooms, searchQuery])

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    if (formData.selectedRoom && (formData.participant_ids.length + 1) > formData.selectedRoom.capacity) {
      setMessage({ text: `Participant count exceeds room capacity (${formData.selectedRoom.capacity} pax).`, type: "error" })
      setLoading(false)
      return
    }

    try {
      const payload = { ...formData }
      delete payload.selectedRoom
      await api.post("/room_bookings", { room_booking: payload })
      setMessage({ text: "Meeting booked successfully!", type: "success" })
      fetchData()
      setIsModalOpen(false)
      resetForm()
    } catch (err) {
      setMessage({ text: err.response?.data?.errors?.join(", ") || "Failed to book meeting", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      meeting_room_id: "",
      title: "",
      purpose: "",
      date: selectedDate,
      start_time: "09:00",
      end_time: "10:00",
      participant_ids: [],
      notes: "",
      selectedRoom: null
    })
  }

  const handleRoomChange = (roomId) => {
    const room = rooms.find(r => r.id === parseInt(roomId))
    setFormData({
      ...formData,
      meeting_room_id: roomId,
      selectedRoom: room || null
    })
  }

  const getRoomBookings = (roomId) => {
    return bookings.filter(b => b.meeting_room_id === roomId || b.room_id === roomId)
  }

  const isSlotOccupied = (roomId, hour) => {
    const roomBookings = getRoomBookings(roomId)
    return roomBookings.find(b => {
      const start = new Date(b.start_time).getUTCHours()
      const end = new Date(b.end_time).getUTCHours()
      return hour >= start && hour < end
    })
  }

  const getSlotDetails = (roomId, hour) => {
    const roomBookings = getRoomBookings(roomId)
    return roomBookings.find(b => {
      const start = new Date(b.start_time).getUTCHours()
      const end = new Date(b.end_time).getUTCHours()
      return hour >= start && hour < end
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Meeting Rooms</h2>
          <p className="text-sm text-slate-500 mt-1">Schedule and manage your team meetings.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
            <button 
              onClick={() => setViewMode("timeline")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "timeline" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Layout className="h-4 w-4" />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40 h-10"
          />
          <Button onClick={() => setIsModalOpen(true)} className="bg-slate-900 hover:bg-slate-800 gap-2">
            <Plus className="h-4 w-4" /> Book Room
          </Button>
        </div>
      </div>

      {message.text && (
        <div className={`rounded-lg p-4 flex items-center gap-3 border ${message.type === "error" ? "bg-red-50 border-red-100 text-red-900" : "bg-emerald-50 border-emerald-100 text-emerald-900"}`}>
          {message.type === "error" ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Room Filters & Search */}
      <Card className="border-slate-200/60 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search rooms by name or location..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-50/50 border-slate-200"
            />
          </div>
        </CardContent>
      </Card>

      {viewMode === "timeline" ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="min-w-[1200px]">
            {/* Timeline Header */}
            <div className="flex border-b border-slate-100">
              <div className="w-64 p-4 font-bold text-slate-900 border-r border-slate-100 bg-slate-50/50 sticky left-0 z-10">
                Rooms
              </div>
              <div className="flex-1 flex">
                {TIME_SLOTS.map(slot => (
                  <div key={slot.value} className="flex-1 p-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider border-r border-slate-50 last:border-0">
                    {slot.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Room Rows */}
            <div className="divide-y divide-slate-100">
              {filteredRooms.map(room => (
                <div key={room.id} className="flex group">
                  <div className="w-64 p-4 border-r border-slate-100 bg-white sticky left-0 z-10 group-hover:bg-slate-50/50 transition-colors">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{room.name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                      <MapPin className="h-3 w-3" />
                      <span className="text-[11px] truncate">{room.location}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                      <Users className="h-3 w-3" />
                      <span className="text-[11px]">Cap: {room.capacity}</span>
                    </div>
                  </div>
                  <div className="flex-1 flex bg-slate-50/30">
                    {TIME_SLOTS.map(slot => {
                      const booking = getSlotDetails(room.id, slot.value)
                      return (
                        <div key={slot.value} className="flex-1 h-20 border-r border-slate-100 last:border-0 relative p-1">
                          {booking && (
                            <div className="absolute inset-1 rounded-md bg-slate-900/5 border border-slate-200 flex flex-col justify-center p-2 overflow-hidden cursor-pointer hover:bg-slate-900/10 transition-all">
                              <span className="text-[9px] font-bold text-slate-900 truncate leading-tight">{booking.title}</span>
                              <span className="text-[8px] text-slate-500 truncate leading-tight mt-0.5">{booking.booked_by}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRooms.map(room => {
            const roomBookings = getRoomBookings(room.id)
            return (
              <Card key={room.id} className="border-slate-200/60 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-64 p-6 bg-slate-50/50 border-b md:border-b-0 md:border-r border-slate-100">
                    <h3 className="font-bold text-slate-900 text-lg">{room.name}</h3>
                    <div className="space-y-3 mt-4">
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="text-sm">{room.location}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-sm">Up to {room.capacity} people</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-slate-600">
                        <Monitor className="h-4 w-4 text-slate-400" />
                        <span className="text-sm">Video enabled</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => {
                        setFormData({...formData, meeting_room_id: room.id})
                        setIsModalOpen(true)
                      }}
                      variant="outline" 
                      className="w-full mt-6 bg-white"
                    >
                      Book This Room
                    </Button>
                  </div>
                  <div className="flex-1 p-6">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Today's Schedule</h4>
                    {roomBookings.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                        <Calendar className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm font-medium">No meetings scheduled today</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {roomBookings.map(b => (
                          <div key={b.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm transition-all">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                <Clock className="h-5 w-5" />
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-900">{b.title}</h5>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-semibold text-slate-500">
                                    {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-xs text-slate-400">By {b.booked_by}</span>
                                </div>
                              </div>
                            </div>
                            <Badge className={STATUS_COLORS.Upcoming}>Upcoming</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl bg-white shadow-xl animate-in fade-in zoom-in-95 duration-200 my-auto">
            <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold">Schedule a Meeting</CardTitle>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 p-1">
                <X className="h-6 w-6" />
              </button>
            </CardHeader>
            <CardContent className="pt-4 max-h-[75vh] overflow-y-auto">
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <select
                      name="meeting_room_id"
                      value={formData.meeting_room_id}
                      onChange={(e) => handleRoomChange(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="">Choose a room...</option>
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room Email (Readonly)</label>
                    <Input 
                      value={formData.selectedRoom?.email || "—"} 
                      readOnly 
                      className="bg-slate-50 text-slate-500 border-slate-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room Capacity</label>
                    <div className="flex h-10 w-full items-center rounded-md border border-slate-100 bg-slate-50 px-3 text-sm font-semibold text-slate-600">
                      <Users className="h-4 w-4 mr-2 opacity-50" />
                      {formData.selectedRoom?.capacity ? `${formData.selectedRoom.capacity} People` : "—"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Availability Status</label>
                    <div className="flex h-10 w-full items-center">
                      {formData.selectedRoom ? (
                        (() => {
                          const roomBookings = getRoomBookings(formData.selectedRoom.id)
                          const start = formData.start_time
                          const end = formData.end_time
                          const conflict = roomBookings.find(b => {
                            const bStart = new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                            const bEnd = new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                            return (start < bEnd && end > bStart)
                          })
                          
                          return conflict ? (
                            <Badge className="bg-red-50 text-red-700 border-red-200 gap-1.5 py-1.5 px-3">
                              <AlertCircle className="h-3.5 w-3.5" /> Occupied for this slot
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 py-1.5 px-3">
                              <CheckCircle className="h-3.5 w-3.5" /> Available
                            </Badge>
                          )
                        })()
                      ) : (
                        <span className="text-xs text-slate-400 italic">Select a room to check availability</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meeting Title</label>
                    <Input 
                      placeholder="e.g. Weekly Sync" 
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
                    <Input 
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time</label>
                      <Input 
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Time</label>
                      <Input 
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Participants</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.participant_ids.map(id => {
                        const u = users.find(user => user.id === id)
                        return (
                          <Badge key={id} className="bg-slate-100 text-slate-700 border-slate-200 gap-1 pr-1">
                            {u?.name}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-red-500" 
                              onClick={() => setFormData({
                                ...formData, 
                                participant_ids: formData.participant_ids.filter(pid => pid !== id)
                              })} 
                            />
                          </Badge>
                        )
                      })}
                    </div>
                    <select
                      onChange={(e) => {
                        const val = parseInt(e.target.value)
                        if (val && !formData.participant_ids.includes(val)) {
                          setFormData({
                            ...formData, 
                            participant_ids: [...formData.participant_ids, val]
                          })
                        }
                      }}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="">Add participants...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.job_title})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Purpose / Notes</label>
                    <Input 
                      placeholder="Meeting agenda..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={loading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]">
                    {loading ? "Processing..." : "Schedule Meeting"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
