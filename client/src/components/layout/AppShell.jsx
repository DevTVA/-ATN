import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard', adminOnly: true },
  { to: '/pos', icon: 'ti-device-desktop', label: 'Bán hàng (POS)' },
  { to: '/products', icon: 'ti-coffee', label: 'Sản phẩm', adminOnly: true },
  { to: '/orders', icon: 'ti-receipt', label: 'Đơn hàng', adminOnly: true },
  { to: '/tables', icon: 'ti-armchair', label: 'Bàn', adminOnly: true },
  { to: '/users', icon: 'ti-users', label: 'Nhân viên', adminOnly: true },
  { to: '/revenue', icon: 'ti-chart-bar', label: 'Doanh thu', adminOnly: true },
]

export default function AppShell({ children }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = user?.name?.split(' ').slice(-2).map(n => n[0]).join('').toUpperCase() || 'U'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-brown-900 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-4 border-b border-brown-700 flex items-center gap-3">
          <div className="w-9 h-9 bg-brown-700 rounded-lg flex items-center justify-center text-xl">☕</div>
          <div>
            <div className="text-brown-100 font-serif text-[15px]">Brew & Co.</div>
            <div className="text-brown-500 text-[10px] tracking-wide">Quản lý quán</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {/* Nhóm Bán hàng */}
          {navItems.slice(0, 2).some(item => !item.adminOnly || user?.role === 'admin') && (
            <>
              <div className="px-4 py-1 text-[10px] tracking-widest text-brown-600 uppercase mb-1">Bán hàng</div>
              {navItems.slice(0, 2).map(item => (
                <NavItem key={item.to} {...item} user={user} />
              ))}
            </>
          )}

          {/* Nhóm Quản lý */}
          {navItems.slice(2, 5).some(item => !item.adminOnly || user?.role === 'admin') && (
            <>
              <div className="px-4 py-1 text-[10px] tracking-widest text-brown-600 uppercase mt-3 mb-1">Quản lý</div>
              {navItems.slice(2, 5).map(item => (
                <NavItem key={item.to} {...item} user={user} />
              ))}
            </>
          )}

          {/* Nhóm Báo cáo */}
          {navItems.slice(5).some(item => !item.adminOnly || user?.role === 'admin') && (
            <>
              <div className="px-4 py-1 text-[10px] tracking-widest text-brown-600 uppercase mt-3 mb-1">Báo cáo</div>
              {navItems.slice(5).map(item => (
                <NavItem key={item.to} {...item} user={user} />
              ))}
            </>
          )}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-brown-700 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brown-600 flex items-center justify-center text-xs text-brown-100 font-semibold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-brown-100 text-xs font-medium truncate">{user?.name}</div>
            <div className="text-brown-500 text-[10px] capitalize">{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="text-brown-500 hover:text-brown-300 transition-colors" title="Đăng xuất">
            <i className="ti ti-logout text-base" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-brown-50">
        <div className="max-w-7xl mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}

function NavItem({ to, icon, label, end, adminOnly, user }) {
  if (adminOnly && user?.role !== 'admin') return null
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `sidebar-item ${isActive ? 'active' : ''}`
      }
    >
      <i className={`ti ${icon} text-base`} />
      <span>{label}</span>
    </NavLink>
  )
}
