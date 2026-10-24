import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

export const AdminShell: React.FC = () => {
  const navItems = [
    { to: '/admin/overview', label: 'Overview' },
    { to: '/admin/bookings', label: 'Bookings' },
    { to: '/admin/dispatch', label: 'Dispatch Board' },
    { to: '/admin/technicians', label: 'Technician Approvals' },
    { to: '/admin/support', label: 'Support SLA Inbox' },
    { to: '/admin/audit', label: 'Audit Trail' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FDFBF7] text-[#2D2A26]">
      <aside className="w-full md:w-64 border-r border-[#E7E2DA] bg-white p-6">
        <div className="font-bold text-lg text-[#1F2937] mb-6">Admin Console</div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive ? 'bg-neutral-200 text-neutral-900 font-semibold' : 'text-neutral-600 hover:bg-neutral-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};
