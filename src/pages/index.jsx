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

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

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
                
                    <Route path="/" element={<Welcome />} />
                
                
                <Route path="/Welcome" element={<Welcome />} />
                
                <Route path="/Inspection" element={<Inspection />} />
                
                <Route path="/Sampling" element={<Sampling />} />
                
                <Route path="/AdminDashboard" element={<AdminDashboard />} />
                
                <Route path="/InspectionDetails" element={<InspectionDetails />} />
                
                <Route path="/SamplingGuide" element={<SamplingGuide />} />
                
                <Route path="/ThankYou" element={<ThankYou />} />
                
                <Route path="/MyInspections" element={<MyInspections />} />
                
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