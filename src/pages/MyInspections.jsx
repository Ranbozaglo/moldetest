
import React, { useState, useEffect } from "react";
import { MoldInspection } from "@/api/entities";
import { Sample } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { generateReportHtmlContent } from "@/pages/AdminDashboard.jsx";
import { getDisplayNumber } from "@/utils/inspectionUtils";
import { resolveCoverAssets } from "@/utils/reportAssets";
import { sanitizeReportText } from "@/utils/reportText";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Plus,
  FlaskConical,
  Calendar,
  MapPin,
  Loader2,
  Eye
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from '@/contexts/AuthContext';
import { downloadPDF } from "@/utils/pdfDownload";
import { buildLabAnalysisFilesHtml, buildLabAnalysisIntroHtml } from "@/lib/labAnalysis.jsx";
// Removed requireSupabaseSession - using Flask backend authentication

export default function MyInspections() {
  const [inspections, setInspections] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState({});
  const [downloadStatus, setDownloadStatus] = useState(null);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // SECURITY: Early return if user is not authenticated
  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="text-center">
          <div className="text-lg text-slate-600">Please sign in to view your inspections.</div>
          <Button 
            onClick={() => navigate(createPageUrl("SignIn"))}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // SECURITY: Redirect admin users immediately
  if (currentUser && (currentUser.role === 'admin' || currentUser.is_admin)) {
    navigate(createPageUrl("AdminDashboard"));
    return null;
  }

  useEffect(() => {
    (async () => {
      try {
        // Skip Supabase session check - using Flask backend authentication
        const fetchUserData = async () => {
          try {
            setUser(currentUser);
            
            // Redirect admin users to AdminDashboard
            if (currentUser && (currentUser.role === 'admin' || currentUser.is_admin)) {
              console.log("🔍 DEBUG: Admin user detected, redirecting to AdminDashboard");
              navigate(createPageUrl("AdminDashboard"));
              return;
            }
            
            if (currentUser && currentUser.email) {
              console.log("🔍 SECURITY: Fetching inspections for user:", currentUser.email);
              
              // SECURITY: Use findMany with proper user filtering (not list which is for admins)
              try {
                const userInspections = await MoldInspection.findMany({
                  email: currentUser.email // Explicitly filter by current user's email
                });
                console.log("🔍 SECURITY: Found user-specific inspections:", userInspections?.length || 0);
                
                // SECURITY: Double-check that all returned inspections belong to current user
                if (userInspections && Array.isArray(userInspections)) {
                  const filteredInspections = userInspections.filter(inspection => 
                    inspection.email === currentUser.email
                  );
                  
                  if (filteredInspections.length !== userInspections.length) {
                    console.warn("🔍 SECURITY WARNING: Some inspections filtered out due to email mismatch");
                  }
                  
                  setInspections(filteredInspections);
                  console.log("🔍 SECURITY: Set", filteredInspections.length, "verified user inspections");
                } else {
                  console.log("🔍 SECURITY: No inspections found for user");
                  setInspections([]);
                }
              } catch (inspectionError) {
                console.error("🔍 SECURITY: Error fetching user inspections:", inspectionError);
                
                // Handle authentication errors
                if (inspectionError.message.includes('401') || inspectionError.message.includes('403')) {
                  setError("Authentication failed. Please sign in again.");
                  navigate(createPageUrl("SignIn"));
                } else {
                  setError("Failed to load your inspections. Please try refreshing the page.");
                }
              }
            } else {
              console.log("🔍 SECURITY: No authenticated user found, redirecting to SignIn");
              navigate(createPageUrl("SignIn"));
            }
          } catch (err) {
            console.error("🔍 DEBUG: Error loading user:", err);
            setError("Failed to load user information. Please try logging in again.");
            navigate(createPageUrl("SignIn"));
          } finally {
            setLoading(false);
          }
        };

        fetchUserData();
      } catch (err) {
        console.error('🔍 DEBUG: Auth check failed:', err);
        setError('You must be logged in to view this page.');
        setLoading(false);
      }
    })();
  }, [navigate, currentUser]);



  const getStatusInfo = (status) => {
    switch (status) {
      case "pending":
        return { icon: <Clock className="w-4 h-4" />, color: "bg-yellow-100 text-yellow-800", text: "Pending" };
      case "in_progress":
        return { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: "bg-blue-100 text-blue-800", text: "In Progress" };
      case "completed":
        return { icon: <CheckCircle className="w-4 h-4" />, color: "bg-green-100 text-green-800", text: "Completed" };
      case "report_ready":
        return { icon: <FileText className="w-4 h-4" />, color: "bg-indigo-100 text-indigo-800", text: "Report Ready" };
      default:
        return { icon: <Clock className="w-4 h-4" />, color: "bg-slate-100 text-slate-800", text: "Unknown" };
    }
  };
  
  const generateAndDownloadReport = async (inspection) => {
    try {
      // SECURITY: Verify inspection belongs to current user
      if (inspection.email !== currentUser.email) {
        console.error("🔍 SECURITY: Unauthorized report generation attempt for inspection:", inspection.id);
        alert("Access denied. You can only generate reports for your own inspections.");
        return;
      }

      console.log("🔍 SECURITY: Generating report for user's inspection:", inspection.id);
      
      // Always fetch detailed inspection data to ensure we have the latest lab analysis
      let detailedInspection = inspection;
      console.log("🔍 SECURITY: Fetching detailed inspection data for report generation");
      try {
        detailedInspection = await MoldInspection.getDetailed(inspection.id);
        
        // SECURITY: Double-check ownership after fetching detailed data
        if (detailedInspection.email !== currentUser.email) {
          console.error("🔍 SECURITY: Detailed inspection email mismatch in report generation");
          alert("Access denied. Inspection ownership verification failed.");
          return;
        }
        
        console.log("🔍 SECURITY: Retrieved and verified detailed inspection data");
        console.log("🔍 DEBUG: Lab conclusion:", detailedInspection.lab_conclusion);
        console.log("🔍 DEBUG: Lab recommendations:", detailedInspection.lab_recommendations);
        console.log("🔍 DEBUG: Lab analysis images:", detailedInspection.lab_analysis_images);
      } catch (detailError) {
        console.error("🔍 SECURITY: Error fetching detailed inspection data:", detailError);
        
        // Handle authentication errors
        if (detailError.message.includes('401') || detailError.message.includes('403')) {
          alert("Authentication failed. Please sign in again.");
          navigate(createPageUrl("SignIn"));
          return;
        }
        // Continue with current data if detailed fetch fails for other reasons
      }
      
      // Parse lab_analysis_images if it's a string
      if (detailedInspection.lab_analysis_images && typeof detailedInspection.lab_analysis_images === 'string') {
        try {
          detailedInspection.lab_analysis_images = JSON.parse(detailedInspection.lab_analysis_images);
        } catch (parseError) {
          console.error("❌ Error parsing lab images JSON:", parseError);
          detailedInspection.lab_analysis_images = [];
        }
      }
      
      // Parse mold_images if it's a string
      if (detailedInspection.mold_images && typeof detailedInspection.mold_images === 'string') {
        try {
          detailedInspection.mold_images = JSON.parse(detailedInspection.mold_images);
        } catch (parseError) {
          console.error("❌ Error parsing mold images JSON:", parseError);
          detailedInspection.mold_images = [];
        }
      }
      
      // Parse water_damage_images if it's a string
      if (detailedInspection.water_damage_images && typeof detailedInspection.water_damage_images === 'string') {
        try {
          detailedInspection.water_damage_images = JSON.parse(detailedInspection.water_damage_images);
        } catch (parseError) {
          console.error("❌ Error parsing water damage images JSON:", parseError);
          detailedInspection.water_damage_images = [];
        }
      }
      
      const samples = await Sample.findMany({ inspection_id: inspection.id });
      const displayNum = getDisplayNumber(inspection);
      const { logoSrc, coverKitSrc } = await resolveCoverAssets();
      
      console.log("🔍 DEBUG: Final data for report generation:");
      console.log("🔍 DEBUG: - Lab conclusion:", detailedInspection.lab_conclusion);
      console.log("🔍 DEBUG: - Lab recommendations:", detailedInspection.lab_recommendations);
      console.log("🔍 DEBUG: - Lab analysis images:", detailedInspection.lab_analysis_images);
      console.log("🔍 DEBUG: - Samples count:", samples.length);
      
      const disclaimerHtml = [
        'The Total Testing DIY Mold Test Kit is intended solely as a preliminary screening tool to help identify the possible presence of mold on sampled surfaces. It is designed to provide an initial understanding of potential mold contamination and should not be considered a substitute for a comprehensive mold assessment performed by a licensed mold professional.',
        'This service includes laboratory analysis of user-collected surface samples and a summary report based solely on the samples submitted. Results are limited to the specific areas tested and should not be interpreted as an evaluation of the entire property, indoor air quality, or the absence of mold in untested areas.',
        'The information provided is for educational and informational purposes only and does not constitute medical, environmental, legal, or professional advice. Laboratory findings should always be interpreted within the context of the property\'s history, moisture conditions, visible observations, and other relevant factors.',
        'If the results indicate elevated mold growth, if visible mold, water damage, musty odors, or ongoing moisture issues are present, or if occupants are experiencing health concerns that may be related to indoor environmental conditions, Total Testing strongly recommends obtaining a comprehensive inspection from a licensed mold assessment professional in accordance with applicable state and local regulations.',
        'By purchasing and using this kit, you acknowledge that the Total Testing DIY Mold Test Kit is intended as a first-step screening tool only. Total Testing makes no representation that this kit will identify all mold conditions or hidden contamination within a property. Users are solely responsible for any decisions or actions taken based on the results, and Total Testing shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of this kit, the interpretation of its results, or any actions taken in reliance upon the information provided.'
      ].map((paragraph) => `<p class="disclaimer-text">${paragraph}</p>`).join('');
      const limitationsHtml = [
        'This report is based on laboratory analysis of user-collected surface samples submitted through the Total Testing DIY Mold Test Kit. The findings represent only the specific surfaces sampled and the conditions present at the time the samples were collected.',
        'Because sample collection is performed by the user, the accuracy and reliability of the results depend on proper sample collection, handling, labeling, and submission. Areas that were not sampled have not been evaluated and may contain mold growth or other environmental conditions that are not reflected in this report.',
        'Surface sampling is intended to identify mold present on the sampled material only. It does not evaluate airborne mold spore concentrations, concealed mold growth within walls, ceilings, flooring, HVAC systems, or other inaccessible building components. In addition, this testing does not assess the source of moisture, determine the extent of contamination, evaluate indoor air quality, or identify all conditions that may contribute to mold growth.',
        'Mold conditions can change over time due to water intrusion, humidity, ventilation, cleaning, or remediation activities. Accordingly, the results of this report are valid only for the conditions that existed at the time the samples were collected.',
        'This report should be considered a preliminary screening tool and not a substitute for a comprehensive inspection performed by a licensed mold assessment professional. If elevated mold is identified, if visible mold, musty odors, water damage, or excessive moisture are present, or if occupants are experiencing health concerns that may be associated with the indoor environment, Total Testing recommends obtaining a comprehensive mold assessment by a licensed professional in accordance with applicable state and local regulations.'
      ].map((paragraph) => `<p class="limitations-text">${paragraph}</p>`).join('');

      const css = `
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #ffffff; color: #333; line-height: 1.6; }
          .page-break { page-break-after: always; }
          .report-page { page-break-after: always; break-after: page; }
          .disclaimer-page { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: stretch; padding: 40px 24px; }
          .disclaimer-page .disclaimer-box { margin: 0; width: 100%; }
          .client-info-page { page-break-after: always; break-after: page; }
          .cover-page { min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; text-align: center; background: white; padding: 36px 24px 56px; gap: 24px; page-break-after: always; break-after: page; }
          .cover-title { font-size: 34px; font-weight: bold; color: #004aac; margin: 0; text-shadow: 1px 1px 2px rgba(0,0,0,0.1); line-height: 1.25; max-width: 720px; }
          .cover-image { max-width: min(640px, 94vw); max-height: 520px; width: auto; height: auto; border-radius: 16px; margin: 0; box-shadow: 0 10px 28px rgba(0,0,0,0.18); border: 3px solid white; object-fit: contain; }
          .cover-details { background: rgba(255,255,255,0.95); padding: 22px 28px; border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); max-width: 520px; width: 100%; margin-top: auto; margin-bottom: 48px; }
          .cover-detail-item { margin: 10px 0; font-size: 16px; line-height: 1.45; }
          .cover-detail-label { font-weight: bold; color: #004aac; }
          .tt-mold-cover { align-items: stretch !important; text-align: left !important; padding: 36px 44px 32px !important; gap: 0 !important; justify-content: flex-start !important; box-sizing: border-box; overflow: hidden; }
          .tt-cover-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
          .tt-cover-logo { max-width: 168px; max-height: 56px; width: auto; height: auto; object-fit: contain; border: none !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; }
          .tt-cover-doc-type { font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #9AA3AF; padding-top: 6px; }
          .tt-cover-title { font-size: 32px; font-weight: 700; color: #0B2E59; margin: 0 0 6px 0; line-height: 1.2; text-align: center; text-shadow: none; max-width: none; }
          .tt-cover-subtitle { font-size: 14px; color: #6B7280; margin: 0 0 16px 0; line-height: 1.4; text-align: center; }
          .tt-cover-hero { width: 100%; max-width: 100% !important; max-height: 320px !important; height: auto; object-fit: contain; object-position: center bottom; border-radius: 14px !important; border: none !important; box-shadow: none !important; margin: 0 0 18px 0 !important; display: block; background: #fff; }
          .tt-cover-meta { background: #F3F5F8; border-radius: 12px; padding: 4px 24px; width: 100%; max-width: 520px; margin: 0 auto 16px auto; box-sizing: border-box; }
          .tt-cover-meta-row { display: flex; justify-content: flex-start; align-items: baseline; gap: 14px; padding: 12px 0; border-bottom: 1px solid #E5E7EB; }
          .tt-cover-meta-row:last-child { border-bottom: none; }
          .tt-cover-meta-label { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #6B7280; flex: 0 0 132px; width: 132px; }
          .tt-cover-meta-value { font-size: 14px; font-weight: 600; color: #0B2E59; text-align: left; line-height: 1.35; flex: 1 1 auto; min-width: 0; }
          .tt-cover-footer { margin-top: auto; }
          .tt-cover-accent { width: 48px; height: 3px; background: #14B8A6; border-radius: 2px; margin-bottom: 10px; }
          .tt-cover-tagline { font-size: 16px; font-weight: 700; color: #0B2E59; margin: 0; }
          .report-container { max-width: 100%; margin: 0 auto; background-color: #fff; padding: 20px; } 
          .section { margin-bottom: 25px; }
          .keep-together { page-break-inside: avoid; break-inside: avoid-page; display: block; }
          .sample-block { page-break-inside: avoid; break-inside: avoid-page; margin-bottom: 24px; }
          .section h2 { font-size: 20px; color: #004aac; border-bottom: 2px solid #dee2e6; padding-bottom: 12px; margin-bottom: 20px; page-break-after: avoid; break-after: avoid-page; }
          .section h2.report-section-title, .report-section-title { color: #004aac; font-size: 28px; font-weight: bold; margin: 0 0 16px 0; padding-bottom: 0; border-bottom: none; text-align: center; page-break-after: avoid; break-after: avoid-page; page-break-inside: avoid; break-inside: avoid-page; }
          .disclaimer-box { background: #f8f9fa; border: 2px solid #004aac; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .disclaimer-title { color: #004aac; font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center; }
          .disclaimer-text { font-size: 14px; line-height: 1.7; text-align: justify; margin: 0 0 14px 0; }
          .disclaimer-text:last-child { margin-bottom: 0; }
          .limitations-section { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .limitations-title { color: #004aac; font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center; }
          .limitations-text { font-size: 14px; line-height: 1.7; text-align: justify; margin: 0 0 14px 0; }
          .limitations-text:last-child { margin-bottom: 0; }
          .client-info-grid { display: grid; grid-template-columns: 1fr; gap: 15px; margin: 20px 0; }
          .client-info-item { padding: 10px; background: #f8f9fa; border-radius: 5px; }
          .client-info-label { font-weight: bold; color: #004aac; font-size: 14px; }
          .client-info-value { margin-top: 5px; font-size: 16px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #dee2e6; font-size: 14px; color: #6c757d; }
          img { max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #ddd; margin: 8px; }
          
          /* Print-specific styles to hide browser headers/footers */
          @media print {
            @page {
              margin: 0.3in 1in 0.3in 1in;
              size: A4;
            }
            
            .cover-page {
              min-height: 100vh !important;
              height: 100vh !important;
              page-break-after: always;
              break-after: page;
              padding: 28px 24px 40px !important;
              gap: 24px !important;
              justify-content: flex-start !important;
            }
            .disclaimer-page {
              min-height: auto !important;
              padding: 24px !important;
            }
            .report-page { page-break-after: always !important; break-after: page !important; }
            .cover-title { font-size: 34px !important; margin: 0 !important; }
            .cover-image { max-width: 620px !important; max-height: 500px !important; margin: 0 !important; }
            .cover-details { padding: 20px 24px !important; max-width: 520px !important; margin-top: auto !important; margin-bottom: 40px !important; }
            .cover-detail-item { font-size: 15px !important; margin: 8px 0 !important; }
            
            body {
              margin: 0 !important;
              padding: 20px !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            
            html {
              background: white !important;
            }
          }
          
          /* Mobile-specific improvements */
          @media (max-width: 768px) {
              .cover-title { font-size: 28px; }
              .cover-page { padding: 28px 16px; gap: 20px; }
              .cover-image { max-width: min(480px, 94vw); max-height: 380px; }
              .cover-details { padding: 18px 20px; max-width: 95%; margin-top: auto; margin-bottom: 32px; }
              .cover-detail-item { font-size: 15px; }
              .report-container { padding: 15px; }
              .section h2.report-section-title, .report-section-title { font-size: 28px; border-bottom: none; padding-bottom: 0; text-align: center; }
              .section h2 { font-size: 18px; }
              .disclaimer-box, .limitations-section { padding: 15px; }
              .disclaimer-title, .limitations-title { font-size: 16px; }
              .disclaimer-text, .limitations-text { font-size: 13px; }
              .client-info-item { padding: 8px; }
              .client-info-label { font-size: 13px; }
              .client-info-value { font-size: 14px; }
          }
          
          @media (min-width: 769px) {
              .cover-title { font-size: 40px; }
              .cover-page { padding: 44px 40px; gap: 28px; }
              .cover-image { max-width: 660px; max-height: 540px; }
              .cover-details { padding: 24px 32px; max-width: 560px; margin-top: auto; margin-bottom: 48px; }
              .cover-detail-item { font-size: 17px; }
              .report-container { max-width: 800px; padding: 40px; }
              .section h2.report-section-title, .report-section-title { font-size: 28px; border-bottom: none; padding-bottom: 0; text-align: center; }
              .section h2 { font-size: 22px; }
              .disclaimer-box, .limitations-section { padding: 25px; }
              .disclaimer-title, .limitations-title { font-size: 20px; }
              .disclaimer-text, .limitations-text { font-size: 14px; }
              .client-info-grid { grid-template-columns: 1fr 1fr; gap: 20px; }
              .client-info-item { padding: 10px; }
              .client-info-label { font-size: 14px; }
              .client-info-value { font-size: 16px; }
          }
      `;

      const createImageList = (images) => {
          if (!images || images.length === 0) return '<p>No photos provided.</p>';
          return images.map(img => `<img src="${img}" alt="Evidence" style="max-width: 100%; height: auto; object-fit: cover; margin: 5px; border-radius: 4px; border: 2px solid #ddd;" />`).join('');
      };

      const createPriorityBadge = (priority, text) => {
          const colors = {
              high: 'background-color: #dc2626; color: white;',
              medium: 'background-color: #ea580c; color: white;',
              low: 'background-color: #059669; color: white;'
          };
          return `<span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; ${colors[priority]}">${text}</span>`;
      };

      // Debug: Log inspection image data for report generation
      console.log("🔍 DEBUG: Report generation - detailedInspection.visible_mold_details:", detailedInspection.visible_mold_details);
      console.log("🔍 DEBUG: Report generation - detailedInspection.water_damage_details:", detailedInspection.water_damage_details);
      console.log("🔍 DEBUG: Report generation - detailedInspection.thermostat_image:", detailedInspection.thermostat_image);
      
      const visibleMoldHtml = detailedInspection.has_visible_mold && detailedInspection.visible_mold_details && detailedInspection.visible_mold_details.length > 0
        ? `<div style="margin-bottom: 20px;">
            <h3 style="color: #dc2626; font-size: 18px; margin-bottom: 15px;">
              Visible Mold Detected
            </h3>
            ${detailedInspection.visible_mold_details.map((d, i) => `
              <div class="keep-together" style="padding: 0 0 15px 0; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                  <h4 style="color: #004aac; font-weight: bold; margin: 0;">Location #${i + 1}: ${sanitizeReportText(d.location)}</h4>
                  ${createPriorityBadge('high', 'High Priority')}
                </div>
                <p style="color: #004aac; font-size: 14px; margin: 8px 0;">Visible mold detected - requires immediate attention</p>
                <div style="text-align: center; margin: 15px 0;">
                  ${createImageList(d.images)}
                </div>
              </div>
            `).join('')}
          </div>`
        : `<div class="keep-together" style="margin-bottom: 20px;">
            <h3 style="color: #059669; font-size: 18px; margin-bottom: 15px;">
              No Visible Mold Detected
            </h3>
            <p style="color: #059669; font-style: italic;">No visible mold was reported during this inspection.</p>
          </div>`;

      const waterDamageHtml = detailedInspection.has_water_damage && detailedInspection.water_damage_details && detailedInspection.water_damage_details.length > 0
        ? `<div style="margin-bottom: 20px;">
            <h3 style="color: #ea580c; font-size: 18px; margin-bottom: 15px;">
              Water Damage Detected
            </h3>
            ${detailedInspection.water_damage_details.map((d, i) => `
              <div class="keep-together" style="padding: 0 0 15px 0; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                  <h4 style="color: #ea580c; font-weight: bold; margin: 0;">Location #${i + 1}: ${sanitizeReportText(d.location)}</h4>
                  ${createPriorityBadge('medium', 'Medium Priority')}
                </div>
                <p style="color: #ea580c; font-size: 14px; margin: 8px 0;">Water damage detected - may contribute to mold growth</p>
                <div style="text-align: center; margin: 15px 0;">
                  ${createImageList(d.images)}
                </div>
              </div>
            `).join('')}
          </div>`
        : `<div class="keep-together" style="margin-bottom: 20px;">
            <h3 style="color: #059669; font-size: 18px; margin-bottom: 15px;">
              No Water Damage Detected
            </h3>
            <p style="color: #059669; font-style: italic;">No recent water damage was reported during this inspection.</p>
          </div>`;
      
      let environmentalHtml = '';
      if (detailedInspection.environmental_data_method === 'photo' && detailedInspection.thermostat_image) {
          environmentalHtml = `<div style="margin-bottom: 20px;">
            <h3 style="color: #2563eb; font-size: 18px; margin-bottom: 15px;">
              Environmental Conditions
            </h3>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px;">
              <h4 style="color: #2563eb; font-weight: bold; margin-bottom: 10px;">Thermostat Reading</h4>
              <div style="text-align: center;">
                <img src="${detailedInspection.thermostat_image}" alt="Thermostat" style="max-width: 300px; height: auto; border-radius: 8px; border: 2px solid #bfdbfe;" />
              </div>
            </div>
          </div>`;
      } else if (detailedInspection.environmental_data_method === 'manual') {
          const humidity = detailedInspection.humidity || 'N/A';
          const temperature = detailedInspection.temperature || 'N/A';
          const isHighHumidity = humidity !== 'N/A' && parseFloat(humidity) > 60;
          
          environmentalHtml = `<div style="margin-bottom: 20px;">
            <h3 style="color: #2563eb; font-size: 18px; margin-bottom: 15px;">
              Environmental Conditions
            </h3>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                <div>
                  <p style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">Temperature</p>
                  <p style="font-size: 18px; font-weight: bold;">${temperature} F</p>
                </div>
                <div>
                  <p style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">Humidity</p>
                  <p style="font-size: 18px; font-weight: bold; ${isHighHumidity ? 'color: #dc2626;' : ''}">${humidity}%</p>
                </div>
              </div>
              ${isHighHumidity ? `
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-top: 15px;">
                  <p style="color: #92400e; font-weight: bold; margin: 0; font-size: 14px;">
                    HUMIDITY WARNING: The EPA recommends relative humidity levels at or below 60% to prevent mold growth. 
                    Current humidity of ${humidity}% may contribute to mold development.
                  </p>
                </div>
              ` : ''}
            </div>
          </div>`;
      } else {
          environmentalHtml = `<div style="margin-bottom: 20px;">
            <h3 style="color: #6b7280; font-size: 18px; margin-bottom: 15px;">
              Environmental Conditions
            </h3>
            <p style="color: #6b7280; font-style: italic;">Environmental data not provided during this inspection.</p>
          </div>`;
      }
      

      const samplesHtml = samples.length > 0
        ? samples.map((s, i) => `<div class="keep-together sample-block">
            <h4>Sample #${i + 1}: ${sanitizeReportText(s.location)}</h4>
            <p>${sanitizeReportText(s.description) || 'No description provided.'}</p>
            <div>${s.sample_image ? `<img src="${s.sample_image}" alt="Sample Photo" />` : ''}</div>
          </div>`).join('')
        : '<p>No samples were documented for this inspection.</p>';

      const labAnalysisHtml = `${buildLabAnalysisIntroHtml(
        Array.isArray(inspection.lab_analysis_images) && inspection.lab_analysis_images.length > 0
      )}${buildLabAnalysisFilesHtml(inspection.lab_analysis_images)}${
        inspection.conclusion
          ? `<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #004aac;">
              <h4 style="color: #004aac; margin-bottom: 10px;">Analysis Summary</h4>
              <p style="line-height: 1.6;">${sanitizeReportText(inspection.conclusion)}</p>
            </div>`
          : ''
      }`;

      const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
          <title></title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="robots" content="noindex">
          <style>${css}</style>
      </head>
      <body>
          <div class="cover-page tt-mold-cover">
              <div class="tt-cover-header">
                  <img src="${logoSrc}" alt="Total Testing" class="tt-cover-logo" />
                  <div class="tt-cover-doc-type">Laboratory Report</div>
              </div>
              <h1 class="tt-cover-title">Mold Surface Testing Report</h1>
              <p class="tt-cover-subtitle">User-Collected Sampling &amp; Independent Laboratory Analysis</p>
              <img src="${coverKitSrc}" alt="Total Testing sample kit" class="tt-cover-hero" />
              <div class="tt-cover-meta">
                  <div class="tt-cover-meta-row"><span class="tt-cover-meta-label">Report Number</span><span class="tt-cover-meta-value">${displayNum}</span></div>
                  <div class="tt-cover-meta-row"><span class="tt-cover-meta-label">Customer</span><span class="tt-cover-meta-value">${sanitizeReportText(inspection.full_name) || 'N/A'}</span></div>
                  <div class="tt-cover-meta-row"><span class="tt-cover-meta-label">Property</span><span class="tt-cover-meta-value">${sanitizeReportText([[inspection.street_address, inspection.unit_number].filter(Boolean).join(', '), [inspection.city, [inspection.state, inspection.zip_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')].filter(Boolean).join(', ')) || 'N/A'}</span></div>
                  <div class="tt-cover-meta-row"><span class="tt-cover-meta-label">Collection Date</span><span class="tt-cover-meta-value">${inspection.created_at ? format(new Date(inspection.created_at), "MMMM d, yyyy") : 'N/A'}</span></div>
              </div>
              <div class="tt-cover-footer">
                  <div class="tt-cover-accent"></div>
                  <p class="tt-cover-tagline">Test Before You Guess.</p>
              </div>
          </div>

          <div class="report-page disclaimer-page report-container">
              <div class="disclaimer-box">
                  <h3 class="disclaimer-title">Disclaimer</h3>
                  ${disclaimerHtml}
              </div>
          </div>

          <div class="report-page client-info-page report-container">
              <div class="section">
                  <h2 class="report-section-title">Client Information</h2>
                  <div class="client-info-grid">
                      <div class="client-info-item"><div class="client-info-label">Customer:</div><div class="client-info-value">${(inspection.full_name || '').toUpperCase()}</div></div>
                      <div class="client-info-item"><div class="client-info-label">Email:</div><div class="client-info-value">${(inspection.email || '').toUpperCase()}</div></div>
                      <div class="client-info-item"><div class="client-info-label">Client Type:</div><div class="client-info-value">${(inspection.client_type || '').toUpperCase()}</div></div>
                      <div class="client-info-item"><div class="client-info-label">Address:</div><div class="client-info-value">${((inspection.street_address || '') + (inspection.unit_number ? ', ' + inspection.unit_number : '') + ', ' + (inspection.city || '') + ', ' + (inspection.state || '') + ' ' + (inspection.zip_code || '')).toUpperCase()}</div></div>
                      <div class="client-info-item"><div class="client-info-label">Property Type:</div><div class="client-info-value">${(inspection.property_type || '').toUpperCase()}</div></div>
                      <div class="client-info-item"><div class="client-info-label">Square Footage:</div><div class="client-info-value">${inspection.square_footage} SQ FT</div></div>
                      ${inspection.background_info ? `<div class="client-info-item" style="grid-column: 1 / -1;"><div class="client-info-label">Background Information:</div><div class="client-info-value" style="text-transform: none; white-space: pre-wrap;">${inspection.background_info}</div></div>` : ''}
                  </div>
              </div>
          </div>

          <div class="report-page findings-page report-container">
              <div class="section findings-section">
                  <h2 class="report-section-title">Findings</h2>
                  ${visibleMoldHtml}
                  ${waterDamageHtml}
                  ${environmentalHtml}
              </div>
          </div>

          <div class="report-page samples-page report-container">
              <div class="section">
                  <h2 class="report-section-title">Samples Collected</h2>
                  ${samplesHtml}
              </div>
          </div>

          <div class="report-container">
              ${labAnalysisHtml}

              <div class="post-lab-section">
              ${inspection.conclusion ? `
              <div class="section keep-together">
                  <h2 class="report-section-title">Conclusion</h2>
                  <p>${inspection.conclusion}</p>
              </div>
              ` : ''}

              ${(inspection.recommendations || inspection.lab_recommendations) ? `
              <div class="section keep-together">
                  <h2 class="report-section-title">Recommendations</h2>
                  <p>${inspection.recommendations || inspection.lab_recommendations}</p>
              </div>
              ` : ''}
              </div>

              <div class="limitations-section">
                  <h3 class="limitations-title">Limitations of DIY Mold Testing</h3>
                  ${limitationsHtml}
              </div>

              <div class="footer">
                  <p>Total Testing</p>
                  <p>Report generated on ${format(new Date(), "MMMM d, yyyy")}</p>
              </div>
          </div>
      </body>
      </html>
      `;

      const blob = new Blob([reportHtml], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mold_Inspection_Report_${displayNum.replace(/[^a-zA-Z0-9]/g, '_')}_${inspection.full_name.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating report:", error);
      alert(`Failed to generate report: ${error.message}`);
    }
  };

  const handleDownloadReport = async (inspection) => {
    setDownloading(prev => ({ ...prev, [inspection.id]: true }));
    
    try {
      // Always generate a fresh report to ensure latest lab analysis is included
      await generateAndDownloadReport(inspection);
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Could not download the report. Please try again.");
    } finally {
      setDownloading(prev => ({ ...prev, [inspection.id]: false }));
    }
  };

  const handleViewReport = async (inspection) => {
    try {
      // SECURITY: Verify inspection belongs to current user
      if (inspection.email !== currentUser.email) {
        console.error("🔍 SECURITY: Unauthorized access attempt to inspection:", inspection.id);
        alert("Access denied. You can only view your own inspection reports.");
        return;
      }

      console.log("🔍 SECURITY: Generating view report for user's inspection:", inspection.id);
      
      // Get detailed inspection data first
      let detailedInspection = inspection;
      try {
        detailedInspection = await MoldInspection.getDetailed(inspection.id);
        
        // SECURITY: Double-check ownership after fetching detailed data
        if (detailedInspection.email !== currentUser.email) {
          console.error("🔍 SECURITY: Detailed inspection email mismatch");
          alert("Access denied. Inspection ownership verification failed.");
          return;
        }
        
        console.log("🔍 SECURITY: Retrieved and verified detailed inspection data");
      } catch (detailError) {
        console.error("🔍 SECURITY: Error fetching detailed inspection data:", detailError);
        
        // Handle authentication errors
        if (detailError.message.includes('401') || detailError.message.includes('403')) {
          alert("Authentication failed. Please sign in again.");
          navigate(createPageUrl("SignIn"));
          return;
        }
        // Continue with current data if detailed fetch fails for other reasons
      }
      
      // Get samples for this inspection
      const samples = await Sample.findMany({ inspection_id: inspection.id });
      console.log("🔍 DEBUG: Retrieved samples for view report:", samples);
      
      // Generate the same HTML content as the download function
      console.log("🔍 DEBUG: About to generate report HTML content...");
      const reportHtml = await generateReportHtmlContent(detailedInspection, samples);
      console.log("🔍 DEBUG: Successfully generated HTML content, length:", reportHtml.length);
      
      // Create blob URL for better browser compatibility and reliability
      const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      
      console.log("🔍 DEBUG: Created blob URL, attempting to open window...");
      
      // Try opening with blob URL first (most reliable)
      let reportWindow = window.open(blobUrl, '_blank', 'width=1200,height=900,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes');
      
      if (!reportWindow || reportWindow.closed) {
        console.log("🔍 DEBUG: Blob URL blocked, trying about:blank approach...");
        
        // Fallback 1: Try about:blank
        reportWindow = window.open('about:blank', '_blank', 'width=1200,height=900,scrollbars=yes,resizable=yes,toolbar=yes');
        
        if (!reportWindow || reportWindow.closed) {
          // Fallback 2: Create temporary download link
          console.log("🔍 DEBUG: All popup methods blocked, creating download link...");
          
          const downloadLink = document.createElement('a');
          downloadLink.href = blobUrl;
          downloadLink.download = `Mold_Inspection_Report_${inspection.inspection_number || inspection.id}.html`;
          downloadLink.style.display = 'none';
          document.body.appendChild(downloadLink);
          
          // Inform user and provide download option
          const userChoice = confirm(
            'Popup blocker detected! Would you like to:\n\n' +
            'OK = Download the report as HTML file\n' +
            'Cancel = Try opening in same tab (will navigate away)'
          );
          
          if (userChoice) {
            // Download the file
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(blobUrl);
            alert('Report downloaded! Open the HTML file in your browser to view.');
          } else {
            // Open in same tab
            document.body.removeChild(downloadLink);
            window.location.href = blobUrl;
          }
          return;
        }
        
        // Write content to about:blank window
        console.log("🔍 DEBUG: Writing HTML content to window...");
        try {
          reportWindow.document.write(reportHtml);
          reportWindow.document.close();
          
          // Clean up blob URL after a delay
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 5000);
          
          console.log("🔍 DEBUG: Report successfully written to window");
        } catch (writeError) {
          console.error("❌ Error writing to window:", writeError);
          reportWindow.close();
          throw new Error("Failed to write content to window. Please try again.");
        }
      } else {
        console.log("🔍 DEBUG: Blob URL window opened successfully");
        
        // Clean up blob URL after window loads
        reportWindow.addEventListener('load', () => {
          setTimeout(() => {
            URL.revokeObjectURL(blobUrl);
          }, 2000);
        });
        
        // Fallback cleanup in case load event doesn't fire
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 10000);
      }
    } catch (error) {
      console.error("❌ Error viewing report:", error);
      alert("Failed to generate report view. Please try again.");
    }
  };

  const handleDownloadPDF = async (inspection) => {
    try {
      // SECURITY: Verify inspection belongs to current user
      if (inspection.email !== currentUser.email) {
        console.error("🔍 SECURITY: Unauthorized PDF download attempt for inspection:", inspection.id);
        alert("Access denied. You can only download your own inspection reports.");
        return;
      }

      console.log("🔍 SECURITY: Generating PDF for user's inspection:", inspection.id);
      
      // Use the existing generateReportHtmlContent function from MyInspections
      await downloadPDF(
        inspection,
        [], // samples will be fetched inside downloadPDF
        generateReportHtmlContent,
        getDisplayNumber,
        setDownloadStatus
      );
    } catch (error) {
      console.error("❌ Error in handleDownloadPDF:", error);
      
      // Handle authentication errors
      if (error.message.includes('401') || error.message.includes('403')) {
        setDownloadStatus({ type: 'error', message: 'Authentication failed. Please sign in again.' });
        setTimeout(() => navigate(createPageUrl("SignIn")), 2000);
      } else {
        setDownloadStatus({ type: 'error', message: `Failed to generate PDF: ${error.message}` });
      }
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  };



  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="text-center">
          <div className="text-lg text-slate-600">Loading your inspections...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6">
        <div className="text-center">
          <div className="text-lg text-red-600">Please log in to view your inspections.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">My Inspections</h1>
            <p className="text-slate-600 mt-2 text-sm sm:text-base">Welcome back, {user?.full_name || (inspections.length > 0 ? inspections[0]?.full_name : null) || user?.email || 'User'}</p>
          </div>
        </div>
          
        {/* Inspections List */}
        {inspections.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FlaskConical className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Inspections Yet</h3>
            <p className="text-slate-600 mb-6">You haven't submitted any mold inspections yet.</p>

          </div>
        ) : (
          <div className="space-y-6">
            {inspections.map((inspection) => {
              const statusInfo = getStatusInfo(inspection.status);
              const displayNum = getDisplayNumber(inspection);
              const isReportReady = inspection.status === 'completed' || inspection.status === 'report_ready';
              
              return (
                <motion.div
                  key={inspection.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="flex flex-row items-center justify-between bg-slate-50 p-4 border-b">
                      <CardTitle className="text-lg font-semibold text-slate-800">{displayNum}</CardTitle>
                      <Badge className={`flex items-center gap-2 text-sm ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.text}
                      </Badge>
                    </CardHeader>
                    
                    <CardContent className="p-4">
                      <div className="space-y-4">
                        {/* Status Detail */}
                        <div className="bg-slate-100 rounded-lg p-3">
                          <p className="text-sm font-medium text-slate-700">Current Status:</p>
                          <p className="text-sm text-slate-600">
                            {inspection.client_status_detail || (() => {
                              switch (inspection.status) {
                                case 'pending':
                                  return 'Lab analysis pending - Please send your samples to the lab using the prepaid shipping label';
                                case 'in_progress':
                                  return 'Lab analysis in progress - Your samples are being analyzed by our certified lab technicians';
                                case 'completed':
                                  return 'Lab analysis completed - Your results have been processed and report is being generated';
                                case 'report_ready':
                                  return 'Lab analysis report is ready - You can now view and download your detailed report';
                                default:
                                  return 'Inspection submitted - awaiting next steps';
                              }
                            })()}
                          </p>
                        </div>

                        {/* Inspection Summary */}
                        <div className="text-sm text-slate-600">
                          <p><strong>Property:</strong> {inspection.street_address}{inspection.unit_number ? `, ${inspection.unit_number}` : ''}, {inspection.city}</p>
                          <p><strong>Submission Date:</strong> {format(new Date(inspection.created_at), "MMMM d, yyyy")}</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                          {isReportReady ? (
                            <>
                              <Button
                                onClick={() => handleViewReport(inspection)}
                                variant="outline"
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Report
                              </Button>
                              <Button
                                onClick={() => handleDownloadPDF(inspection)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                Download PDF
                              </Button>
                            </>
                          ) : (
                             <Button variant="outline" disabled>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Report in Progress
                             </Button>
                          )}
                        </div>

                        {/* Next Steps - Only show for non-completed inspections */}
                        {inspection.status !== 'completed' && inspection.status !== 'report_ready' && (
                          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <h4 className="font-medium text-blue-900 mb-2">What's Next?</h4>
                            <p className="text-blue-800 text-sm">
                              {inspection.status === 'pending' && 
                                "Please send the collected samples to our lab using the prepaid shipping label. We will notify you by email as soon as we receive them."}
                              {inspection.status === 'in_progress' && 
                                "Your samples are being processed. We'll notify you when the analysis is complete."}
                            </p>
                          </div>
                        )}

                        {/* Show completion message for completed inspections */}
                        {isReportReady && (
                          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <h4 className="font-medium text-green-900 mb-2">Report Ready</h4>
                            <p className="text-green-800 text-sm">
                              Your detailed analysis report is complete and available for download.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Information Section */}
        <div className="mt-12 bg-amber-50 rounded-xl p-6 border border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-3">Need Help?</h3>
          <ul className="text-amber-800 text-sm space-y-2">
            <li>• <strong>Sample Collection:</strong> Use a new swab for each sample location and place it in a Ziploc bag</li>
            <li>• <strong>Sample Labeling & Documentation:</strong> Clearly label each sample bag (e.g., “Living Room Vent”) and write the same name on your COC (Chain of Custody) form.</li>
            <li>• <strong>COC Form:</strong> Complete the Chain of Custody with your contact info, sample names, collection date, and signature. This ensures proper lab processing.</li>
            <li>• <strong>Bagging Samples:</strong> Place all samples and the signed COC form in an envelope and seal it securely</li>
            <li>• <strong>Shipping Samples:</strong> Use the prepaid FedEx label and drop the envelope off at any FedEx location. Ship within 24 hours of collecting your samples, if possible.</li>
            <li>• <strong>Results Timeline:</strong> Once your samples arrive at the lab, expect results within 2-3 business days, delivered to your portal.</li>
          </ul>
        </div>
      </motion.div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mt-8">
<Button 
              onClick={() => window.open('https://buy.stripe.com/6oU28r2Wb2KF9Tv3xEabK01', '_blank')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Start New Testing
            </Button>
          </div>
    </div>
    
    
  );
}
