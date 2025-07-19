
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, ShieldCheck, FileText, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { user, signOut } = useAuth();

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
      <header className="glass-effect border-b border-blue-100/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Empty div to keep nav on the right */}
            <div></div>
            
            <nav className="hidden md:flex items-center gap-6">
              {user && (
                <>
                  <Link 
                    to={createPageUrl("MyInspections")} 
                    className={`px-4 py-2 rounded-lg transition-all duration-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50`}
                  >
                    <FileText className="w-4 h-4 inline mr-2" />
                    My Inspections
                  </Link>
                  {user.role === 'admin' && (
                    <Link 
                      to={createPageUrl("AdminDashboard")} 
                      className={`px-4 py-2 rounded-lg transition-all duration-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50`}
                    >
                      <ShieldCheck className="w-4 h-4 inline mr-2" />
                      Admin
                    </Link>
                  )}
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <span className="text-lg font-semibold">Mold Testing Houston</span>
            </div>
            <p className="text-slate-400 text-sm">
              Professional mold inspection and testing solutions
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
