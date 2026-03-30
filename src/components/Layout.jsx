import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/routes', icon: 'directions_bus', label: 'Routes' },
  { to: '/metro', icon: 'train', label: 'Metro' },
  { to: '/profile', icon: 'person', label: 'Profile' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleProfileClick = () => {
    navigate('/profile')
  }

  return (
    <div className="bg-background font-body text-on-surface antialiased min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#f8f9ff]/70 backdrop-blur-xl flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>directions_transit</span>
          </div>
          <h1 className="font-headline font-bold tracking-tight text-xl text-[#121c2a]">The Urban Pulse</h1>
        </div>
        <button onClick={handleProfileClick} className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary-fixed flex items-center justify-center">
          {user?.photoURL ? (
            <img alt="Profile" className="w-full h-full object-cover" src={user.photoURL} />
          ) : (
            <span className="material-symbols-outlined text-on-surface-variant text-xl">person</span>
          )}
        </button>
      </header>

      {/* Page Content */}
      <Outlet />

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-2 pb-6 pt-3 bg-[#f8f9ff]/70 backdrop-blur-xl rounded-t-3xl shadow-[0_-4px_24px_rgba(18,28,42,0.06)] z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-2 transition-all duration-300 ease-out ${
                isActive
                  ? 'bg-[#1a56db] text-white rounded-2xl scale-105'
                  : 'text-[#434654] hover:text-[#003fb1] active:scale-90'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-xl"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="font-label text-[10px] font-semibold mt-0.5">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
