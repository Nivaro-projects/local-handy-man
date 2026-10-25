import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-[#2D2A26]">
      <header className="border-b border-[#E7E2DA] bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight text-[#C85A32]">
            Nivaro / CLR
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link to="/services" className="hover:text-[#C85A32]">Services</Link>
            <Link to="/technicians" className="hover:text-[#C85A32]">Technicians</Link>
            <Link to="/book" className="hover:text-[#C85A32]">Book Now</Link>
            <Link to="/login" className="px-3 py-1.5 rounded bg-[#2D2A26] text-white hover:bg-neutral-800">
              Sign In
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full p-6">
        <Outlet />
      </main>
      <footer className="border-t border-[#E7E2DA] bg-white py-6 text-center text-xs text-neutral-500">
        © 2026 Nivaro / CLR Services. Chirala, Andhra Pradesh.
      </footer>
    </div>
  );
};
