import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import RoutesPage from './pages/Routes'
import RouteDetail from './pages/RouteDetail'
import StopDetail from './pages/StopDetail'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Privacy from './pages/Privacy'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route path="/" element={<Home />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/routes/detail" element={<RouteDetail />} />
          <Route path="/stops/:stopId" element={<StopDetail />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
