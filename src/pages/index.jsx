import Layout from "./Layout.jsx";

import Welcome from "./Welcome";
import Inspection from "./Inspection";
// import Sampling from "./Sampling";
import AdminDashboard from "./AdminDashboard";
import InspectionDetails from "./InspectionDetails";
import SamplingGuide from "./SamplingGuide";
import ThankYou from "./ThankYou";
import MyInspections from "./MyInspections";
import SignIn from "./SignIn";
import SignUp from "./SignUp";
import ForgotPassword from "./ForgotPassword";
import ResetPassword from "./ResetPassword";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";

// Protected Route Component - handles all authentication
function ProtectedRoute({ children, requireAdmin = false, allowAdmin = true, redirectTo = "/SignIn" }) {
  const { user, loading } = useAuth();
  const isProduction = window.location.hostname !== 'localhost';
  const logPrefix = isProduction ? '🔍 PROD DEBUG:' : '🔍 DEV DEBUG:';
  
  console.log(`${logPrefix} ProtectedRoute - user:`, user, 'loading:', loading, 'requireAdmin:', requireAdmin, 'allowAdmin:', allowAdmin);
  
  // Show loading while auth is being determined
  if (loading) {
    console.log(`${logPrefix} ProtectedRoute - showing loading spinner`);
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full w-10 h-10 border-b-2 border-blue-600"></div>
    </div>;
  }
  
  // Check if user is authenticated
  if (!user) {
    console.log(`${logPrefix} ProtectedRoute - no user found, redirecting to:`, redirectTo);
    return <Navigate to={redirectTo} replace />;
  }
  
  const isAdmin = user.role === 'admin' || user.is_admin;
  
  // If admin access is required but user is not admin
  if (requireAdmin && !isAdmin) {
    console.log(`${logPrefix} ProtectedRoute - admin required but user is not admin, redirecting to Welcome`);
    return <Navigate to="/Welcome" replace />;
  }
  
  // If admin access is not allowed and user is admin
  if (!allowAdmin && isAdmin) {
    console.log(`${logPrefix} ProtectedRoute - admin not allowed, redirecting to AdminDashboard`);
    return <Navigate to="/AdminDashboard" replace />;
  }
  
  // All checks passed, show the protected content
  console.log(`${logPrefix} ProtectedRoute - access granted, showing protected content`);
  return children;
}

// Public Route Component - handles public pages with admin redirect
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  const isProduction = window.location.hostname !== 'localhost';
  const logPrefix = isProduction ? '🔍 PROD DEBUG:' : '🔍 DEV DEBUG:';
  
  console.log(`${logPrefix} PublicRoute - user:`, user, 'loading:', loading);
  
  // Show loading while auth is being determined
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }
  
  // If user is admin, redirect to AdminDashboard
  if (user && (user.role === 'admin' || user.is_admin)) {
    console.log(`${logPrefix} PublicRoute - admin user detected, redirecting to AdminDashboard`);
    return <Navigate to="/AdminDashboard" replace />;
  }
  
  // Show the public content
  console.log(`${logPrefix} PublicRoute - showing public content`);
  return children;
}

const PAGES = {
    Welcome: Welcome,
    Inspection: Inspection,
    AdminDashboard: AdminDashboard,
    InspectionDetails: InspectionDetails,
    SamplingGuide: SamplingGuide,
    ThankYou: ThankYou,
    MyInspections: MyInspections,
    SignIn: SignIn,
    SignUp: SignUp,
    ForgotPassword: ForgotPassword,
    ResetPassword: ResetPassword,
}

/**
 * Get current page from URL with improved validation
 * @param {string} url - The current URL
 * @returns {string} The page name or default
 */
function _getCurrentPage(url) {
    if (!url || typeof url !== 'string') {
        console.warn('_getCurrentPage: Invalid URL provided:', url);
        return 'Welcome';
    }

    // Clean up the URL
    let cleanUrl = url;
    if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
    }
    
    // Get the last segment of the path
    let urlLastPart = cleanUrl.split('/').pop() || '';
    
    // Remove query parameters if present
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }
    
    // Handle empty path (root)
    if (!urlLastPart) {
        return 'Welcome';
    }

    // Find matching page (case-insensitive)
    const pageName = Object.keys(PAGES).find(page => 
        page.toLowerCase() === urlLastPart.toLowerCase()
    );
    
    if (pageName) {
        console.log('🔍 DEBUG: Current page resolved to:', pageName);
        return pageName;
    }
    
    // Log warning for unrecognized pages
    console.warn('_getCurrentPage: Unrecognized page:', urlLastPart, 'defaulting to Welcome');
    return 'Welcome';
}

// Main Routes Component
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    console.log('🔍 DEBUG: PagesContent - pathname:', location.pathname, 'currentPage:', currentPage);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                {/* Public Routes */}
                <Route path="/" element={<PublicRoute><Welcome /></PublicRoute>} />
                <Route path="/Welcome" element={<PublicRoute><Welcome /></PublicRoute>} />
                <Route path="/SignIn" element={<SignIn />} />
                <Route path="/SignUp" element={<SignUp />} />
                <Route path="/ForgotPassword" element={<ForgotPassword />} />
                <Route path="/ResetPassword" element={<ResetPassword />} />
                
                {/* Protected Routes - Regular Users Only */}
                <Route path="/Inspection" element={
                    <ProtectedRoute allowAdmin={false}>
                        <Inspection />
                    </ProtectedRoute>
                } />
                
             
                
                <Route path="/SamplingGuide" element={
                    <ProtectedRoute allowAdmin={false}>
                        <SamplingGuide />
                    </ProtectedRoute>
                } />
                
                <Route path="/ThankYou" element={
                    <ProtectedRoute allowAdmin={false}>
                        <ThankYou />
                    </ProtectedRoute>
                } />
                
                <Route path="/MyInspections" element={
                    <ProtectedRoute allowAdmin={false}>
                        <MyInspections />
                    </ProtectedRoute>
                } />
                
                {/* Admin-Only Routes */}
                <Route path="/AdminDashboard" element={
                    <ProtectedRoute requireAdmin={true}>
                        <AdminDashboard />
                    </ProtectedRoute>
                } />
                
                <Route path="/InspectionDetails" element={
                    <ProtectedRoute requireAdmin={true}>
                        <InspectionDetails />
                    </ProtectedRoute>
                } />
                
                {/* 404 Fallback - Improved */}
                <Route path="*" element={
                    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
                        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
                            <h1 className="text-3xl font-bold text-slate-900 mb-4">404 - Page Not Found</h1>
                            <p className="text-slate-600 mb-6">
                                The page you're looking for doesn't exist or has been moved.
                            </p>
                            <div className="space-y-4">
                                <Navigate to="/Welcome" replace />
                                <p className="text-sm text-slate-500">
                                    Redirecting you to the home page...
                                </p>
                            </div>
                        </div>
                    </div>
                } />
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}