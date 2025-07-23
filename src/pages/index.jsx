import Layout from "./Layout.jsx";

import Welcome from "./Welcome";

import Inspection from "./Inspection";

import Sampling from "./Sampling";

import AdminDashboard from "./AdminDashboard";

import InspectionDetails from "./InspectionDetails";

import SamplingGuide from "./SamplingGuide";

import ThankYou from "./ThankYou";

import MyInspections from "./MyInspections";

import SignIn from "./SignIn";

import SignUp from "./SignUp";

import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";

// Component to redirect admin users to AdminDashboard
function AdminRedirect() {
  const { user, loading } = useAuth();
  
  console.log('🔍 PROD DEBUG: AdminRedirect - user:', user, 'loading:', loading);
  
  // Show loading while auth is being determined
  if (loading) {
    console.log('🔍 PROD DEBUG: AdminRedirect - showing loading spinner');
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }
  
  // If user is admin, redirect to AdminDashboard
  if (user && (user.role === 'admin' || user.is_admin)) {
    console.log('🔍 PROD DEBUG: AdminRedirect - redirecting admin to AdminDashboard');
    return <Navigate to="/AdminDashboard" replace />;
  }
  
  // Otherwise, show the intended page
  console.log('🔍 PROD DEBUG: AdminRedirect - showing Welcome page');
  return <Welcome />;
}

// Component to guard routes for admin users
function AdminRouteGuard({ children, allowAdmin = false }) {
  const { user, loading } = useAuth();
  
  console.log('🔍 PROD DEBUG: AdminRouteGuard - user:', user, 'loading:', loading, 'allowAdmin:', allowAdmin);
  
  // Show loading while auth is being determined
  if (loading) {
    console.log('🔍 PROD DEBUG: AdminRouteGuard - showing loading spinner');
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>;
  }
  
  // Check if user is not authenticated at all
  if (!user) {
    console.log('🔍 PROD DEBUG: AdminRouteGuard - no user found, redirecting to SignIn');
    return <Navigate to="/SignIn" replace />;
  }
  
  // If user is admin and this route doesn't allow admin access, redirect to AdminDashboard
  if (user && (user.role === 'admin' || user.is_admin) && !allowAdmin) {
    console.log('🔍 PROD DEBUG: AdminRouteGuard - admin user accessing non-admin route, redirecting to AdminDashboard');
    return <Navigate to="/AdminDashboard" replace />;
  }
  
  // Otherwise, show the intended component
  console.log('🔍 PROD DEBUG: AdminRouteGuard - showing protected content');
  return children;
}

const PAGES = {
    
    Welcome: Welcome,
    
    Inspection: Inspection,
    
    Sampling: Sampling,
    
    AdminDashboard: AdminDashboard,
    
    InspectionDetails: InspectionDetails,
    
    SamplingGuide: SamplingGuide,
    
    ThankYou: ThankYou,
    
    MyInspections: MyInspections,
    
    SignIn: SignIn,
    
    SignUp: SignUp,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<AdminRedirect />} />
                
                
                <Route path="/Welcome" element={<AdminRedirect />} />
                
                <Route path="/Inspection" element={<AdminRouteGuard><Inspection /></AdminRouteGuard>} />
                
                <Route path="/Sampling" element={<AdminRouteGuard><Sampling /></AdminRouteGuard>} />
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/InspectionDetails" element={<AdminRouteGuard allowAdmin={true}><InspectionDetails /></AdminRouteGuard>} />
                
                <Route path="/SamplingGuide" element={<AdminRouteGuard><SamplingGuide /></AdminRouteGuard>} />
                
                <Route path="/ThankYou" element={<AdminRouteGuard><ThankYou /></AdminRouteGuard>} />
                
                <Route path="/MyInspections" element={<AdminRouteGuard><MyInspections /></AdminRouteGuard>} />
                
                <Route path="/SignIn" element={<SignIn />} />
                
                <Route path="/SignUp" element={<SignUp />} />
                
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