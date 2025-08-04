
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
              console.log("🔍 SECURITY: No authenticated user found, redirecting to Welcome");
              navigate(createPageUrl("Welcome"));
            }
          } catch (err) {
            console.error("🔍 DEBUG: Error loading user:", err);
            setError("Failed to load user information. Please try logging in again.");
            navigate(createPageUrl("Welcome"));
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
      
      console.log("🔍 DEBUG: Final data for report generation:");
      console.log("🔍 DEBUG: - Lab conclusion:", detailedInspection.lab_conclusion);
      console.log("🔍 DEBUG: - Lab recommendations:", detailedInspection.lab_recommendations);
      console.log("🔍 DEBUG: - Lab analysis images:", detailedInspection.lab_analysis_images);
      console.log("🔍 DEBUG: - Samples count:", samples.length);
      
      const disclaimerText = "The Total Testing DIY Mold Test Kit is intended as a preliminary screening tool to help individuals identify the possible presence of mold in their environment. It is not a substitute for a licensed mold assessment, professional inspection, or full indoor air quality evaluation as defined by state or federal regulations. This service is designed to provide basic laboratory analysis and a summary report based on surface sampling. The results and interpretations are intended for informational purposes only and do not constitute legal, environmental, or medical advice. If elevated mold levels are detected, or if there are known health concerns, water damage, or visible mold growth, we strongly recommend a licensed mold assessment by a certified professional in accordance with your state's regulations. By purchasing and using this kit, the user acknowledges and agrees that Total Testing is not liable for decisions made based on this preliminary testing, and that the DIY kit is best used as an initial 'first-aid' tool to gain awareness and guide next steps.";
      const limitationsText = "This report is based on a Do-It-Yourself (DIY) mold surface testing kit and is subject to certain inherent limitations. Results reflect conditions only at the specific locations and times the samples were collected. Mold presence can vary with environmental changes and may not be uniform throughout the property. This testing method does not detect airborne mold spores, mold hidden within walls or inaccessible areas, or other indoor air quality concerns. Therefore, this report should be considered a preliminary screening tool, not a substitute for a licensed mold assessment or comprehensive indoor environmental inspection. If health concerns persist, or if visible mold, water damage, or elevated moisture is suspected, we strongly recommend consulting a licensed mold professional.";

      const css = `
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #ffffff; color: #333; line-height: 1.6; }
          .page-break { page-break-after: always; }
          .cover-page { min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; text-align: center; background: white; padding: 30px 20px; }
          .cover-title { font-size: 32px; font-weight: bold; color: #004aac; margin-top: 20px; margin-bottom: 30px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1); }
          .cover-image { max-width: 100%; max-height: 600px; height: auto; border-radius: 20px; margin: 30px 0; box-shadow: 0 12px 35px rgba(0,0,0,0.2); border: 4px solid white; object-fit: contain; }
          .cover-details { background: rgba(255,255,255,0.95); padding: 25px; border-radius: 20px; box-shadow: 0 6px 20px rgba(0,0,0,0.15); max-width: 90%; width: 100%; }
          .cover-detail-item { margin: 10px 0; font-size: 16px; }
          .cover-detail-label { font-weight: bold; color: #004aac; }
          .report-container { max-width: 100%; margin: 0 auto; background-color: #fff; padding: 20px; } 
          .section { margin-bottom: 25px; }
          .section h2 { font-size: 20px; color: #004aac; border-bottom: 2px solid #dee2e6; padding-bottom: 12px; margin-bottom: 20px; }
          .disclaimer-box { background: #f8f9fa; border: 2px solid #004aac; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .disclaimer-title { color: #004aac; font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center; }
          .disclaimer-text { font-size: 14px; line-height: 1.7; text-align: justify; }
          .limitations-section { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .limitations-title { color: #004aac; font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center; }
          .limitations-text { font-size: 14px; line-height: 1.7; text-align: justify; }
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
              .cover-title { font-size: 26px; margin-top: 15px; margin-bottom: 25px; }
              .cover-page { padding: 25px 15px; }
              .cover-image { max-width: 100%; max-height: 450px; margin: 25px 0; }
              .cover-details { padding: 20px; max-width: 95%; }
              .cover-detail-item { font-size: 14px; }
              .report-container { padding: 15px; }
              .section h2 { font-size: 18px; }
              .disclaimer-box, .limitations-section { padding: 15px; }
              .disclaimer-title, .limitations-title { font-size: 16px; }
              .disclaimer-text, .limitations-text { font-size: 13px; }
              .client-info-item { padding: 8px; }
              .client-info-label { font-size: 13px; }
              .client-info-value { font-size: 14px; }
          }
          
          @media (min-width: 769px) {
              .cover-title { font-size: 52px; margin-top: 30px; margin-bottom: 40px; }
              .cover-page { padding: 50px; }
              .cover-image { max-width: 100%; max-height: 700px; margin: 40px 0; }
              .cover-details { padding: 35px; max-width: 85%; }
              .cover-detail-item { font-size: 18px; }
              .report-container { max-width: 800px; padding: 40px; }
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
            <h3 style="color: #dc2626; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
              ⚠️ Visible Mold Detected
            </h3>
            ${detailedInspection.visible_mold_details.map((d, i) => `
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                  <h4 style="color: #dc2626; font-weight: bold; margin: 0;">Location #${i + 1}: ${d.location}</h4>
                  ${createPriorityBadge('high', 'High Priority')}
                </div>
                <p style="color: #dc2626; font-size: 14px; margin: 8px 0;">⚠️ Visible mold detected - requires immediate attention</p>
                <div style="text-align: center; margin: 15px 0;">
                  ${createImageList(d.images)}
                </div>
              </div>
            `).join('')}
          </div>`
        : `<div style="margin-bottom: 20px;">
            <h3 style="color: #059669; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
              ✅ No Visible Mold Detected
            </h3>
            <p style="color: #059669; font-style: italic;">No visible mold was reported during this inspection.</p>
          </div>`;

      const waterDamageHtml = detailedInspection.has_water_damage && detailedInspection.water_damage_details && detailedInspection.water_damage_details.length > 0
        ? `<div style="margin-bottom: 20px;">
            <h3 style="color: #ea580c; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
              💧 Water Damage Detected
            </h3>
            ${detailedInspection.water_damage_details.map((d, i) => `
              <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                  <h4 style="color: #ea580c; font-weight: bold; margin: 0;">Location #${i + 1}: ${d.location}</h4>
                  ${createPriorityBadge('medium', 'Medium Priority')}
                </div>
                <p style="color: #ea580c; font-size: 14px; margin: 8px 0;">💧 Water damage detected - may contribute to mold growth</p>
                <div style="text-align: center; margin: 15px 0;">
                  ${createImageList(d.images)}
                </div>
              </div>
            `).join('')}
          </div>`
        : `<div style="margin-bottom: 20px;">
            <h3 style="color: #059669; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
              ✅ No Water Damage Detected
            </h3>
            <p style="color: #059669; font-style: italic;">No recent water damage was reported during this inspection.</p>
          </div>`;
      
      let environmentalHtml = '';
      if (detailedInspection.environmental_data_method === 'photo' && detailedInspection.thermostat_image) {
          environmentalHtml = `<div style="margin-bottom: 20px;">
            <h3 style="color: #2563eb; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
              🌡️ Environmental Conditions
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
            <h3 style="color: #2563eb; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
              🌡️ Environmental Conditions
            </h3>
            <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
                <div>
                  <p style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">Temperature</p>
                  <p style="font-size: 18px; font-weight: bold;">${temperature}°F</p>
                </div>
                <div>
                  <p style="font-weight: bold; color: #2563eb; margin-bottom: 5px;">Humidity</p>
                  <p style="font-size: 18px; font-weight: bold; ${isHighHumidity ? 'color: #dc2626;' : ''}">${humidity}%</p>
                </div>
              </div>
              ${isHighHumidity ? `
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-top: 15px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #d97706;">⚠️</span>
                    <p style="color: #92400e; font-weight: bold; margin: 0; font-size: 14px;">
                      HUMIDITY WARNING: The EPA recommends relative humidity levels at or below 60% to prevent mold growth. 
                      Current humidity of ${humidity}% may contribute to mold development.
                    </p>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>`;
      } else {
          environmentalHtml = `<div style="margin-bottom: 20px;">
            <h3 style="color: #6b7280; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
              🌡️ Environmental Conditions
            </h3>
            <p style="color: #6b7280; font-style: italic;">Environmental data not provided during this inspection.</p>
          </div>`;
      }
      
      // Always use standard template for recommendations
      const getRecommendationsHtml = () => {
          console.log("🔍 DEBUG: Using standard template recommendations for report");
          
          // Standard template recommendations
          const standardRecommendations = `<strong>Immediate Actions</strong>
1. Fix Moisture & Humidity Issues
Address any leaks, water intrusion, or ventilation problems as soon as possible. Mold thrives in damp conditions, eliminating the source is the first step toward resolution.

2. Avoid Impacted Areas
Until the issue is resolved, limit access to areas where mold may be present, especially for individuals with allergies, asthma, or weakened immune systems.

<strong>Next Steps</strong>
1. Consult a Mold Professional
To fully understand the extent of the issue, we recommend hiring a certified mold professional. They can perform an on-site inspection, identify hidden growth, and provide a detailed remediation plan tailored to your situation.

2. Re-Testing
After resolving moisture issues and completing cleanup or remediation, re-testing can verify that mold levels are back to normal and your environment is safe.

<strong>Prevention Tips</strong>
• Act Quickly on Leaks
Whether from pipes, AC units, or roofing, repair leaks immediately to prevent moisture buildup.

• Monitor Humidity
Aim to keep indoor humidity below 50%. Use dehumidifiers or exhaust fans as needed, especially in bathrooms, kitchens, and basements.

• Look for Early Signs
Watch for discoloration, musty odors, or spots on ceilings and walls, these may indicate hidden issues.

• Promote Airflow
Open windows when weather allows, use ceiling fans, and keep vents unobstructed to maintain proper circulation.

• Inspect After Water Events
After flooding or water damage, inspect and dry affected areas promptly, and consider testing again if you're unsure.`;

          // Format the standard recommendations as HTML
          const lines = standardRecommendations.split('\n');
          const formattedRecommendations = lines
              .filter(line => line.trim().length > 0)
              .map((line, index) => {
                  const trimmedLine = line.trim();
                  // Check if line is a main header (no numbers but followed by content)
                  if ((trimmedLine === '<strong>Immediate Actions</strong>' || trimmedLine === '<strong>Next Steps</strong>' || trimmedLine === '<strong>Prevention Tips</strong>')) {
                      const extraSpacing = index > 0 ? '<div style="height: 15px;"></div>' : '';
                      // Extract the text from between strong tags for display
                      const headerText = trimmedLine.replace(/<\/?strong>/g, '');
                      return `${extraSpacing}<h4 style="margin: 10px 0 8px 0; font-weight: bold; color: #1e40af; font-size: 16px;">${headerText}</h4>`;
                  }
                  // Check if line starts with number (1. 2.)
                  if (/^\d+\./.test(trimmedLine)) {
                      return `<h5 style="margin: 12px 0 6px 0; font-weight: bold; color: #374151; font-size: 14px;">${trimmedLine}</h5>`;
                  }
                  // Check if line starts with bullet point
                  if (trimmedLine.startsWith('•')) {
                      return `<p style="margin: 6px 0 6px 20px; line-height: 1.5; color: #374151;"><strong>${trimmedLine.substring(1).trim().split(' ')[0]}</strong> ${trimmedLine.substring(1).trim().split(' ').slice(1).join(' ')}</p>`;
                  }
                  // Regular paragraph
                  return `<p style="margin: 6px 0; line-height: 1.5; color: #374151;">${trimmedLine}</p>`;
              })
              .join('');
          
          return `<div style="background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px;">
            <h4 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
              📋 Standard Recommendations
            </h4>
            ${formattedRecommendations}
          </div>`;
        // Standard template already returned above, no need for fallback logic
      };
      
      const recommendationsHtml = getRecommendationsHtml();
      
      const recommendationsSection = `<div style="margin-bottom: 20px;">
        <h3 style="color: #059669; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
          📋 Recommendations
        </h3>
        ${recommendationsHtml}
      </div>`;

      const samplesHtml = samples.length > 0
        ? samples.map((s, i) => `<h4>Sample #${i + 1}: ${s.location}</h4><p>${s.description || 'No description provided.'}</p><div>${s.sample_image ? `<img src="${s.sample_image}" alt="Sample Photo" />` : ''}</div>`).join('')
        : '<p>No samples were documented for this inspection.</p>';

      const labAnalysisHtml = inspection.lab_analysis_images && inspection.lab_analysis_images.length > 0
        ? `<div class="lab-analysis-section">
            <h3 style="color: #004aac; font-size: 18px; margin-bottom: 15px;">Laboratory Analysis Results</h3>
            <div style="text-align: center; margin: 20px 0;">
              ${inspection.lab_analysis_images.map((imageUrl, index) => `
                <div style="margin-bottom: 20px;">
                  <img src="${imageUrl}" alt="Lab Analysis Results ${index + 1}" style="max-width: 100%; height: auto; border: 2px solid #ddd; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
                  <p style="color: #666; font-size: 14px; margin-top: 10px; font-style: italic;">Laboratory mold analysis report ${inspection.lab_analysis_images.length > 1 ? `- Image ${index + 1}` : ''}</p>
                </div>
              `).join('')}
            </div>
            ${inspection.conclusion ? `<div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #004aac;">
              <h4 style="color: #004aac; margin-bottom: 10px;">Analysis Summary</h4>
              <p style="line-height: 1.6;">${inspection.conclusion}</p>
            </div>` : ''}
          </div>`
        : `<div class="lab-analysis-section">
            <h3 style="color: #004aac; font-size: 18px; margin-bottom: 15px;">Laboratory Analysis Results</h3>
            <p style="color: #666; font-style: italic;">Lab analysis results have not been uploaded yet.</p>
          </div>`;

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
          <div class="cover-page">
              <h1 class="cover-title">DIY Mold Inspection and Testing Report</h1>
                <img src="https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/reportlogo.jpeg" alt="Total Testing Logo" class="cover-image" />
              <div class="cover-details">
                  <div class="cover-detail-item"><span class="cover-detail-label">Report Number:</span> ${displayNum}</div>
                  <div class="cover-detail-item"><span class="cover-detail-label">Inspection Date:</span> ${format(new Date(inspection.created_date), "MMMM d, yyyy")}</div>
                  <div class="cover-detail-item"><span class="cover-detail-label">Property Address:</span> ${((inspection.street_address || '') + (inspection.unit_number ? ', ' + inspection.unit_number : '') + ', ' + (inspection.city || '') + ', ' + (inspection.state || '') + ' ' + (inspection.zip_code || '')).toUpperCase()}</div>
              </div>
              <p style="margin-top: 50px; font-size: 16px; color: #555;">Total Testing</p>
          </div>

          <div class="report-container">
              <div class="disclaimer-box">
                  <h3 class="disclaimer-title">Disclaimer</h3>
                  <p class="disclaimer-text">${disclaimerText}</p>
              </div>

              <div class="section">
                  <h2>Client Information</h2>
                  <div class="client-info-grid">
                      <div class="client-info-item"><div class="client-info-label">Customer:</div><div class="client-info-value">${(inspection.full_name || '').toUpperCase()}</div></div>
                      <div class="client-info-item"><div class="client-info-label">Email:</div><div class="client-info-value">${(inspection.email || '').toUpperCase()}</div></div>
                      <div class="client-info-item"><div class="client-info-label">Client Type:</div><div class="client-info-value">${(inspection.client_type || '').toUpperCase()}</div></div>
                      <div class="client-info-item"><div class="client-info-label">Address:</div><div class="client-info-value">${((inspection.street_address || '') + (inspection.unit_number ? ', ' + inspection.unit_number : '') + ', ' + (inspection.city || '') + ', ' + (inspection.state || '') + ' ' + (inspection.zip_code || '')).toUpperCase()}</div></div>
                      <div class="client-info-item"><div class="client-info-label">Property Type:</div><div class="client-info-value">${(inspection.property_type || '').toUpperCase()}</div></div>
                      <div class="client-info-item"><div class="client-info-label">Square Footage:</div><div class="client-info-value">${inspection.square_footage} SQ FT</div></div>
                  </div>
              </div>
              
              <div class="section">
                  <h2>Findings</h2>
                  ${visibleMoldHtml}
                  ${waterDamageHtml}
                  ${environmentalHtml}
              </div>
              
              <div class="section">
                  <h2>Samples Collected</h2>
                  ${samplesHtml}
              </div>

              <div class="page-break"></div>
              
              <div class="section">
                  <h2>Lab Analysis</h2>
                  ${labAnalysisHtml}
              </div>

              <div class="page-break"></div>

              <div class="section">
                  <h2>Conclusion</h2>
                  <p>${inspection.conclusion || 'Pending conclusion.'}</p>
              </div>

              <div class="section">
                  <h2>Recommendations</h2>
                  ${recommendationsSection}
              </div>

              <div class="page-break"></div>

              <div class="limitations-section">
                  <h3 class="limitations-title">Limitations of DIY Total Testing</h3>
                  <p class="limitations-text">${limitationsText}</p>
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
            <p className="text-slate-600 mt-2 text-sm sm:text-base">Welcome back, {user.name || user.email}</p>
          </div>
          
          <Button 
            onClick={() => window.open('https://buy.stripe.com/YOUR_STRIPE_PAYMENT_LINK', '_blank')}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
            Start New Testing
          </Button>
        </div>

        {/* Inspections List */}
        {inspections.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FlaskConical className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Inspections Yet</h3>
            <p className="text-slate-600 mb-6">You haven't submitted any mold inspections yet.</p>
            <Button 
              onClick={() => window.open('https://buy.stripe.com/YOUR_STRIPE_PAYMENT_LINK', '_blank')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Start Your First Testing
            </Button>
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
                          <p className="text-sm text-slate-600">{inspection.client_status_detail || 
                             (inspection.status === 'completed' ? 'Inspection completed - samples documented' :
                              inspection.status === 'report_ready' ? 'Your detailed report is ready for download' :
                              'Inspection submitted - awaiting sample collection')}
                          </p>
                        </div>

                        {/* Inspection Summary */}
                        <div className="text-sm text-slate-600">
                          <p><strong>Property:</strong> {inspection.street_address}{inspection.unit_number ? `, ${inspection.unit_number}` : ''}, {inspection.city}</p>
                          <p><strong>Submission Date:</strong> {format(new Date(inspection.created_date), "MMMM d, yyyy")}</p>
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
            <li>• <strong>Sample Collection:</strong> Follow the step-by-step guide provided in your email to ensure accurate results. Use a new swab for each sample location and place it in a Ziploc bag</li>
            <li>• <strong>Sample Labeling & Documentation:</strong> Clearly label each sample bag (e.g., “Living Room Vent”) and write the same name on your COC (Chain of Custody) form. Every sample must match what's listed on the form.</li>
            <li>• <strong>COC Form:</strong> Complete the Chain of Custody with your contact info, sample names, collection date, and signature. This ensures proper lab processing.</li>
            <li>• <strong>Bagging Samples:</strong> Place all samples and the signed COC form in an envelope and seal it securely</li>
            <li>• <strong>Shipping Samples:</strong> Use the prepaid FedEx label and drop the envelope off at any FedEx location. Ship within 24 hours of collecting your samples, if possible.</li>
            <li>• <strong>Results Timeline:</strong> Once your samples arrive at the lab, expect results within 2-3 business days, delivered to your portal.</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}