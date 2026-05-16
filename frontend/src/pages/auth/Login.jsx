import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Fingerprint, Mail, Lock, AlertCircle } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await login(email, password)
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <Card className="border-slate-200 shadow-md">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 shadow-sm">
              <Fingerprint className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl">Attendance System</CardTitle>
              <CardDescription>Sign in to your account</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-slate-700">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input
                    type="email"
                    className="pl-9"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-slate-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input
                    type="password"
                    className="pl-9"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}