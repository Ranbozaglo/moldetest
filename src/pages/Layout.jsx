
import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, FileText, LogOut, User, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef(null);

  const handleSignOut = () => {
    setMobileMenuOpen(false);
    signOut();
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <style>
        {`
          :root {
            --primary-blue: #1e40af;
            --accent-blue: #3b82f6;
            --soft-gray: #f8fafc;
            --text-primary: #1e293b;
            --text-secondary: #64748b;
          }
          
          .glass-effect {
            backdrop-filter: blur(20px);
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
        `}
      </style>
      
      {/* Header */}
      <header className="glass-effect border-b border-blue-100/50 sticky top-0 z-50" ref={mobileMenuRef}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo/Brand - Left side */}
            <div className="flex items-center">
              <img
                src="/logos.png"
                alt="Total Testing"
                className="h-9 w-auto max-w-[180px] object-contain"
              />
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              {!loading && user && (
                <>
                  {/* Only show navigation for non-admin users */}
                  {!(user.role === 'admin' || user.is_admin) && (
                    <>
                      <Link 
                        to={createPageUrl("MyInspections")} 
                        className={`px-4 py-2 rounded-lg transition-all duration-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50`}
                      >
                        <FileText className="w-4 h-4 inline mr-2" />
                        My Inspections
                      </Link>
                    </>
                  )}
                  {/* Show user info and logout */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">
                      <User className="w-4 h-4 inline mr-1" />
                      {user.name}
                    </span>
                    <button
                      onClick={signOut}
                      className="px-3 py-2 rounded-lg transition-all duration-200 text-slate-600 hover:text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            {!loading && user && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg transition-all duration-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>

          {/* Mobile Navigation Menu */}
          {!loading && user && mobileMenuOpen && (
            <div className="md:hidden mt-4 pt-4 border-t border-blue-100/50">
              <div className="flex flex-col space-y-3">
                {/* User Info */}
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">{user.name}</span>
                  {(user.role === 'admin' || user.is_admin) && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">Admin</span>
                  )}
                </div>

                {/* Navigation Links for non-admin users */}
                {!(user.role === 'admin' || user.is_admin) && (
                  <Link 
                    to={createPageUrl("MyInspections")} 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                  >
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">My Inspections</span>
                  </Link>
                )}

                {/* Logout Button */}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-slate-600 hover:text-red-600 hover:bg-red-50 w-full text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <img
              src="/logos.png"
              alt="Total Testing"
              className="h-10 w-auto max-w-[180px] object-contain"
            />
            <p className="text-slate-500 text-sm text-center md:text-right">
              Professional mold inspection and testing solutions
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
