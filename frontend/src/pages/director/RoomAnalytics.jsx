import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { Building, Users, Clock, TrendingUp, Download } from "lucide-react"
import api from "../../api/axios"

export function RoomAnalytics() {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await api.get("/room_bookings/utilization")
      setStats(res.data)
    } catch (err) {
      console.error("Failed to fetch room analytics", err)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8']

  if (loading) return <div className="p-8 text-center text-slate-500">Loading analytics...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Room Utilization Analytics</h2>
          <p className="text-sm text-slate-500 mt-0.5">Performance and usage metrics for all meeting rooms.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Download Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Bookings Chart */}
        <Card className="md:col-span-2 border-slate-200/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Bookings by Room</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="room_name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="total_bookings" fill="#0f172a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Occupancy Share */}
        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Occupancy Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats}
                    dataKey="occupied_mins"
                    nameKey="room_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                  >
                    {stats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {stats.map((item, index) => (
                <div key={item.room_id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-600">{item.room_name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{Math.round(item.occupied_mins / 60)} hrs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

