import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';

export const TechShell: React.FC = () => {
  const navItems = [
    { to: '/tech/overview', label: 'Dashboard' },
    { to: '/tech/jobs', label: 'Job Queue' },
    { to: '/tech/payouts', label: 'Earnings & Payouts' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FDFBF7] text-[#2D2A26]">
      <aside className="w-full md:w-64 border-r border-[#E7E2DA] bg-white p-6">
        <div className="font-bold text-lg text-[#2E5A44] mb-6">Technician Workspace</div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm font-medium transition-colors ${
                  isActive ? 'bg-[#EAF2ED] text-[#2E5A44]' : 'text-neutral-600 hover:bg-neutral-100'
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
