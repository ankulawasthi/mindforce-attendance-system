import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card"
import { Badge } from "../ui/badge"
import { Users, Clock, AlertCircle } from "lucide-react"
import api from "../../api/axios"

export function OccupancyWidget() {
  const [occupancy, setOccupancy] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOccupancy()
    const interval = setInterval(fetchOccupancy, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const fetchOccupancy = async () => {
    try {
      // We'll calculate occupancy based on today's bookings
      const today = new Date().toISOString().split('T')[0]
      const [roomsRes, bookingsRes] = await Promise.all([
        api.get("/meeting_rooms"),
        api.get(`/room_bookings?date=${today}`)
      ])
      
      const now = new Date()
      const currentHour = now.getHours()
      const currentMin = now.getMinutes()
      const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`

      const roomsWithStatus = roomsRes.data.map(room => {
        const activeBooking = bookingsRes.data.find(b => {
          if (b.room_id !== room.id) return false
          
          // Simple time comparison
          const start = new Date(b.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
          const end = new Date(b.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
          
          return currentTimeString >= start && currentTimeString < end
        })

        return {
          ...room,
          status: activeBooking ? "Occupied" : "Available",
          currentMeeting: activeBooking?.title || null,
          bookedBy: activeBooking?.booked_by || null
        }
      })

      setOccupancy(roomsWithStatus)
    } catch (err) {
      console.error("Failed to fetch room occupancy", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  return (
    <Card className="border-slate-200/60 shadow-sm bg-white overflow-hidden">
      <CardHeader className="border-b border-slate-50 pb-3 bg-slate-50/30">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Room Occupancy
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-50">
          {occupancy.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">No rooms configured</div>
          ) : (
            occupancy.map(room => (
              <div key={room.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${room.status === "Occupied" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{room.name}</h4>
                    {room.status === "Occupied" ? (
                      <p className="text-[11px] text-red-500 font-medium truncate max-w-[150px]">
                        In use: {room.currentMeeting}
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-600 font-medium">Available Now</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`text-[10px] font-bold ${room.status === "Occupied" ? "bg-red-50 text-red-700 border-red-100" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                    {room.status}
                  </Badge>
                  {room.status === "Occupied" && (
                    <div className="flex items-center justify-end gap-1 mt-1 text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span className="text-[10px] font-medium">Until finish</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
