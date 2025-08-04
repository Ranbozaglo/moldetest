import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input  } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger , DropdownMenuLabel , DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoldInspection, Sample, EmailService } from "@/api/entities";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";
import { getDisplayNumber } from "@/utils/inspectionUtils";
import { downloadPDF, downloadHTML } from "@/utils/pdfDownload";
import EmailTemplateManager from "@/components/EmailTemplateManager";

import { MoreHorizontal, Download, Trash2, Eye, FileText, Filter, Search, Calendar, User, MapPin, Home, AlertTriangle, Droplets, Thermometer, Package, CheckCircle, Clock, XCircle, Mail, Star, PlayCircle, PauseCircle, RefreshCw, BarChart3, FlaskConical, RotateCcw, File, Database, Zap, CheckCircle2, X, Loader2, Info} from "lucide-react";

// Export this function for use in other components
export const generateReportHtmlContent = async (inspection, samples) => {
    const displayNum = getDisplayNumber(inspection);
    
    // Helper function to format recommendations text (same as in analysis functions)
    const formatRecommendationsText = (text) => {
      if (!text) return text;
      
      // Remove asterisks and clean up formatting
      return text
        .replace(/\*\*/g, '') // Remove bold asterisks
        .replace(/\*/g, '') // Remove single asterisks
        .replace(/(\d+\.)\s*([^:]+:)/g, '$2') // Remove numbers from headers, keep just the header with colon
        .split(/([A-Z][^:]*:)/) // Split by section headers (words ending with colon)
        .filter(part => part.trim().length > 0)
        .map(part => part.trim())
        .join('\n')
        .trim();
    };
    
    const disclaimerText = "The Total Testing DIY Mold Test Kit is intended as a preliminary screening tool to help individuals identify the possible presence of mold in their environment. It is not a substitute for a licensed mold assessment, professional inspection, or full indoor air quality evaluation as defined by state or federal regulations. This service is designed to provide basic laboratory analysis and a summary report based on surface sampling. The results and interpretations are intended for informational purposes only and do not constitute legal, environmental, or medical advice. If elevated mold levels are detected, or if there are known health concerns, water damage, or visible mold growth, we strongly recommend a licensed mold assessment by a certified professional in accordance with your state's regulations. By purchasing and using this kit, the user acknowledges and agrees that Total Testing is not liable for decisions made based on this preliminary testing, and that the DIY kit is best used as an initial 'first-aid' tool to gain awareness and guide next steps.";
    const limitationsText = "This report is based on a Do-It-Yourself (DIY) mold surface testing kit and is subject to certain inherent limitations. Results reflect conditions only at the specific locations and times the samples were collected. Mold presence can vary with environmental changes and may not be uniform throughout the property. This testing method does not detect airborne mold spores, mold hidden within walls or inaccessible areas, or other indoor air quality concerns. Therefore, this report should be considered a preliminary screening tool, not a substitute for a licensed mold assessment or comprehensive indoor environmental inspection. If health concerns persist, or if visible mold, water damage, or elevated moisture is suspected, we strongly recommend consulting a licensed mold professional.";

    const css = `
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #ffffff; color: #333; line-height: 1.6; }
        .page-break { page-break-after: always; }
        .cover-page { min-height: 100vh; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; text-align: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 30px 20px; }
        .cover-title { font-size: 32px; font-weight: bold; color: #004aac; margin-top: 20px; margin-bottom: 30px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1); }
        .cover-image { max-width: 90%; max-height: 400px; height: auto; border-radius: 20px; margin: 30px 0; box-shadow: 0 12px 35px rgba(0,0,0,0.2); border: 4px solid white; object-fit: contain; }
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
        img { max-width: 350px; max-height: 350px ; border-radius: 8px; border: 1px solid #ddd; margin: 8px; }
        
        /* Mobile-specific improvements */
        @media (max-width: 768px) {
            .cover-title { font-size: 26px; margin-top: 15px; margin-bottom: 25px; }
            .cover-page { padding: 25px 15px; }
            .cover-image { max-width: 95%; max-height: 300px; margin: 25px 0; }
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
            .cover-image { max-width: 95%; max-height: 500px; margin: 40px 0; }
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
    console.log("🔍 DEBUG: Admin report generation - inspection.mold_images:", inspection.mold_images);
    console.log("🔍 DEBUG: Admin report generation - inspection.mold_locations:", inspection.mold_locations);
    console.log("🔍 DEBUG: Admin report generation - inspection.water_damage_images:", inspection.water_damage_images);
    console.log("🔍 DEBUG: Admin report generation - inspection.water_damage_locations:", inspection.water_damage_locations);
    console.log("🔍 DEBUG: Admin report generation - inspection.thermostat_image:", inspection.thermostat_image);
    console.log("🔍 DEBUG: Admin report generation - inspection.lab_conclusion:", inspection.lab_conclusion);
    console.log("🔍 DEBUG: Admin report generation - inspection.lab_recommendations:", inspection.lab_recommendations);
    console.log("🔍 DEBUG: Admin report generation - inspection.lab_analysis_images:", inspection.lab_analysis_images);
    
    // Parse JSON strings to arrays
    let moldLocations = [];
    let waterDamageLocations = [];
    
    try {
      if (inspection.mold_locations && typeof inspection.mold_locations === 'string') {
        moldLocations = JSON.parse(inspection.mold_locations);
      } else if (Array.isArray(inspection.mold_locations)) {
        moldLocations = inspection.mold_locations;
      }
    } catch (e) {
      console.error("❌ Error parsing mold_locations:", e);
    }
    
    try {
      if (inspection.water_damage_locations && typeof inspection.water_damage_locations === 'string') {
        waterDamageLocations = JSON.parse(inspection.water_damage_locations);
      } else if (Array.isArray(inspection.water_damage_locations)) {
        waterDamageLocations = inspection.water_damage_locations;
      }
    } catch (e) {
      console.error("❌ Error parsing water_damage_locations:", e);
    }
    
    console.log("🔍 DEBUG: Parsed moldLocations:", moldLocations);
    console.log("🔍 DEBUG: Parsed waterDamageLocations:", waterDamageLocations);
    
    const visibleMoldHtml = inspection.mold_images && inspection.mold_images.length > 0 && moldLocations.length > 0
      ? moldLocations.map((location, i) => {
          const locationImage = inspection.mold_images[i] || null;
          return `<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <h4 style="color: #dc2626; font-weight: bold; margin: 0;">Location #${i + 1}: ${location || 'N/A'}</h4>
              ${createPriorityBadge('medium', 'high Priority')}
            </div>
            <p style="color: #dc2626; font-size: 14px; margin: 8px 0;">Visible mold detected - requires immediate attention</p>
            <div style="text-align: center; margin: 15px 0;">
              ${locationImage ? `<img src="${locationImage}" alt="Mold Photo" style="max-width: 300px; height: auto; border-radius: 8px; border: 2px solid #fecaca;" />` : ''}
            </div>
          </div>`;
        }).join('')
      : '<p>No visible mold was reported during this inspection.</p>';

    const waterDamageHtml = inspection.water_damage_images && inspection.water_damage_images.length > 0 && waterDamageLocations.length > 0
      ? `<div style="margin-bottom: 20px;">
          <h3 style="color: #ea580c; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
            💧 Water Damage Detected
          </h3>
          ${waterDamageLocations.map((location, i) => `
            <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <h4 style="color: #ea580c; font-weight: bold; margin: 0;">Location #${i + 1}: ${location || 'N/A'}</h4>
                ${createPriorityBadge('medium', 'Medium Priority')}
              </div>
              <p style="color: #ea580c; font-size: 14px; margin: 8px 0;">💧 Water damage detected - may contribute to mold growth</p>
              <div style="text-align: center; margin: 15px 0;">
                ${createImageList(inspection.water_damage_images)}
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
    if (inspection.environmental_data_method === 'photo' && inspection.thermostat_image) {
        environmentalHtml = `<div style="margin-bottom: 20px;">
          <h3 style="color: #2563eb; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
            🌡️ Environmental Conditions
          </h3>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px;">
            <h4 style="color: #2563eb; font-weight: bold; margin-bottom: 10px;">Thermostat Reading</h4>
            <div style="text-align: center;">
              <img src="${inspection.thermostat_image}" alt="Thermostat" style="max-width: 300px; height: auto; border-radius: 8px; border: 2px solid #bfdbfe;" />
            </div>
          </div>
        </div>`;
    } else if (inspection.environmental_data_method === 'manual') {
        const humidity = inspection.humidity || 'N/A';
        const temperature = inspection.temperature || 'N/A';
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
    
    // Use AI-generated recommendations if available, otherwise generate based on findings
    const getRecommendationsHtml = () => {
        // First, check if we have AI-generated recommendations from lab analysis
        if (inspection.recommendations && inspection.recommendations.trim().length > 0) {
            console.log("🔍 DEBUG: Admin report using AI-generated recommendations:", inspection.recommendations);
            // Format the AI recommendations as HTML, preserving line breaks and ensuring proper spacing
            const lines = inspection.recommendations.split('\n');
            const formattedRecommendations = lines
                .filter(line => line.trim().length > 0)
                .map((line, index) => {
                    const trimmedLine = line.trim();
                    // Check if this line is a bolded section header (contains **)
                    const isBoldedSection = trimmedLine.includes('**') && trimmedLine.includes('**');
                    
                    if (isBoldedSection) {
                        // Add extra spacing before bolded sections (except the first one)
                        const extraSpacing = index > 0 ? '<div style="height: 20px;"></div>' : '';
                        return `${extraSpacing}<p style="margin: 8px 0; line-height: 1.5; color: #374151; font-weight: bold;">${trimmedLine}</p>`;
                    } else {
                        return `<p style="margin: 8px 0; line-height: 1.5; color: #374151;">${trimmedLine}</p>`;
                    }
                })
                .join('');
            
            return `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px;">
              <h4 style="color: #059669; margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                🤖 AI-Generated Recommendations (Based on Lab Analysis)
              </h4>
              ${formattedRecommendations}
            </div>`;
        }
        
        // Fallback to generic recommendations if no AI recommendations available
        console.log("🔍 DEBUG: Admin report no AI recommendations found, using generic recommendations");
        const recommendations = [];
        
        if (inspection.has_visible_mold) {
            recommendations.push({
                priority: 'high',
                icon: '🔴',
                title: 'Immediate Action Required',
                description: 'Visible mold detected. Consider professional mold assessment and remediation.'
            });
        }
        
        if (inspection.has_water_damage) {
            recommendations.push({
                priority: 'medium',
                icon: '🟠',
                title: 'Water Damage',
                description: 'Address water damage promptly to prevent mold growth.'
            });
        }
        
        if (inspection.humidity && parseFloat(inspection.humidity) > 60) {
            recommendations.push({
                priority: 'medium',
                icon: '🟡',
                title: 'High Humidity',
                description: 'Consider dehumidification and HVAC system maintenance.'
            });
        }
        
        if (recommendations.length === 0) {
            recommendations.push({
                priority: 'low',
                icon: '🟢',
                title: 'Good Conditions',
                description: 'No immediate concerns detected. Continue regular monitoring.'
            });
        }
        
        const recommendationsHtml = recommendations.map(rec => `
          <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${rec.priority === 'high' ? '#dc2626' : rec.priority === 'medium' ? '#ea580c' : '#059669'}; margin-top: 6px; flex-shrink: 0;"></div>
            <div>
              <p style="font-weight: bold; color: #374151; margin: 0 0 4px 0; font-size: 14px;">
                ${rec.icon} ${rec.title}
              </p>
              <p style="color: #6b7280; margin: 0; font-size: 13px; line-height: 1.4;">
                ${rec.description}
              </p>
            </div>
          </div>
        `).join('');
        
        return `<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px;">
          <h4 style="color: #059669; margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center; gap: 8px;">
            📋 General Recommendations
          </h4>
          ${recommendationsHtml}
        </div>`;
    };
    
    const recommendationsHtml = getRecommendationsHtml();
    
    const recommendationsSection = `<div style="margin-bottom: 20px;">
      <h3 style="color: #059669; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
        📋 Recommendations
      </h3>
      ${recommendationsHtml}
    </div>`;
    
    const samplesHtml = samples && samples.length > 0
      ? samples.map((s, i) => `<h4>Sample #${i + 1}: ${s.location || 'N/A'}</h4><p>${s.description || ''}</p><div>${s.sample_image ? `<img src="${s.sample_image}" alt="Sample Photo" />` : ''}</div>`).join('')
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
          </div>`
        : `<div class="lab-analysis-section">
            <h3 style="color: #004aac; font-size: 18px; margin-bottom: 15px;">Laboratory Analysis Results</h3>
            <p style="color: #666; font-style: italic;">Lab analysis results have not been uploaded yet.</p>
          </div>`;

    return `
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
<img src="https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/reportlogo.jpeg" alt="TT Logo" class="cover-image" />    
           <div class="cover-details">
                <div class="cover-detail-item"><span class="cover-detail-label">Report Number:</span> ${displayNum}</div>
                <div class="cover-detail-item"><span class="cover-detail-label">Inspection Date:</span> ${format(new Date(inspection.created_date), "MMMM d, yyyy")}</div>
                <div class="cover-detail-item"><span class="cover-detail-label">Property Address:</span> ${inspection.street_address}${inspection.unit_number ? ', ' + inspection.unit_number : ''}, ${inspection.city}, ${inspection.state} ${inspection.zip_code}</div>
            </div>
        </div>
        <div class="page-break"></div>

        <div class="report-container">
            <div class="disclaimer-box">
                <h3 class="disclaimer-title">Disclaimer</h3>
                <p class="disclaimer-text">${disclaimerText}</p>
            </div>
                <h2>Client Information</h2>
                <div class="client-info-grid">
                    <div class="client-info-item"><div class="client-info-label">Customer:</div><div class="client-info-value">${inspection.full_name || 'N/A'}</div></div>
                    <div class="client-info-item"><div class="client-info-label">Email:</div><div class="client-info-value">${inspection.email || 'N/A'}</div></div>
                    <div class="client-info-item"><div class="client-info-label">Client Type:</div><div class="client-info-value">${inspection.client_type || 'N/A'}</div></div>
                    <div class="client-info-item"><div class="client-info-label">Address:</div><div class="client-info-value">${inspection.street_address}${inspection.unit_number ? ', ' + inspection.unit_number : ''}, ${inspection.city}, ${inspection.state} ${inspection.zip_code}</div></div>
                    <div class="client-info-item"><div class="client-info-label">Property Type:</div><div class="client-info-value">${inspection.property_type || 'N/A'}</div></div>
                    <div class="client-info-item"><div class="client-info-label">Square Footage:</div><div class="client-info-value">${inspection.square_footage || 'N/A'} sq ft</div></div>
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
                <div>
                  ${
                    (inspection.lab_conclusion || inspection.conclusion)
                      ? formatRecommendationsText(inspection.lab_conclusion || inspection.conclusion)
                          .split('\n')
                          .filter(line => line.trim().length > 0)
                          .map(line => {
                            // Check if line is a section header (words ending with colon)
                            if (line.trim().match(/^[A-Z][^:]*:$/)) {
                              return `<p style="margin: 12px 0 8px 0; line-height: 1.5; color: #1f2937; font-weight: bold; font-size: 14px;">${line.trim()}</p>`;
                            }
                            // Regular line
                            return `<p style="margin: 8px 0; line-height: 1.5; color: #374151;">${line.trim()}</p>`;
                          })
                          .join('')
                      : '<p>Pending conclusion.</p>'
                  }
                </div>
            </div>

            <div class="section">
                <h2>Recommendations</h2>
                <div>
                  ${
                    (inspection.lab_recommendations || inspection.recommendations)
                      ? formatRecommendationsText(inspection.lab_recommendations || inspection.recommendations)
                          .split('\n')
                          .filter(line => line.trim().length > 0)
                          .map(line => {
                            // Check if line is a section header (words ending with colon)
                            if (line.trim().match(/^[A-Z][^:]*:$/)) {
                              return `<p style="margin: 12px 0 8px 0; line-height: 1.5; color: #1f2937; font-weight: bold; font-size: 14px;">${line.trim()}</p>`;
                            }
                            // Regular line
                            return `<p style="margin: 8px 0; line-height: 1.5; color: #374151;">${line.trim()}</p>`;
                          })
                          .join('')
                      : '<p>Pending recommendations.</p>'
                  }
                </div>
            </div>
            <div class="limitations-section">
                <h3 class="limitations-title">Limitations of DIY Mold Testing</h3>
                <p class="limitations-text">${limitationsText}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  };

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState([]);
  const [selectedInspections, setSelectedInspections] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [emailStatus, setEmailStatus] = useState({});
  
  // Cache management
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const [lastUpdateCheck, setLastUpdateCheck] = useState(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [moldFilter, setMoldFilter] = useState("all");
  const [waterDamageFilter, setWaterDamageFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [stats, setStats] = useState({
    total: 0,
    withMold: 0,
    withWaterDamage: 0,
    samples: 0,
    pending: 0,
    completed: 0,
    propertyTypes: {},
    clientTypes: {},
    cities: {}
  });
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Optimize auth checking - only run when authUser ID changes, not on every property change
  useEffect(() => {
    // Debounce auth checks to prevent excessive calls
    const timeoutId = setTimeout(() => {
      checkUser();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [authUser?.id]); // Only depend on user ID, not full user object

  const checkUser = useCallback(async () => {
    try {
      // Use the authenticated user from AuthContext instead of calling User.me()
      if (!authUser) {
        navigate(createPageUrl("Welcome"));
        return;
      }
      
      // Check if user is admin
      if (authUser.role !== 'admin' && !authUser.is_admin) {
        navigate(createPageUrl("Welcome"));
        return;
      }
      
      setUser(authUser);
      smartRefresh();
    } catch (error) {
      navigate(createPageUrl("Welcome"));
    } finally {
      setLoading(false);
    }
  }, [authUser, navigate]);

  const loadInspections = async (forceRefresh = false) => {
    try {
      const now = Date.now();
      
      // Check if we have cached data and it's still valid
      if (!forceRefresh && cacheTimestamp && inspections.length > 0) {
        const cacheAge = now - cacheTimestamp;
        if (cacheAge < CACHE_DURATION) {
          console.log("🔍 CACHE: Using cached inspections data (age:", Math.round(cacheAge / 1000), "seconds)");
          return;
        }
      }
      
      console.log("🔍 CACHE: Loading fresh inspections data from server");
      setLoading(true);
      
      const allInspections = await MoldInspection.list('-created_at', 50, false); // Use lightweight endpoint for better performance
      
      console.log("🔍 DEBUG: Raw inspections data:", allInspections);
      console.log("🔍 DEBUG: Number of inspections:", allInspections?.length);
      
      // Check if allInspections is an array
      if (!Array.isArray(allInspections)) {
        console.error("❌ ERROR: allInspections is not an array:", typeof allInspections);
        setInspections([]);
        return;
      }
      
      // Debug: Check the first inspection object structure
      if (allInspections.length > 0) {
        console.log("🔍 DEBUG: First inspection object:", JSON.stringify(allInspections[0], null, 2));
        console.log("🔍 DEBUG: First inspection keys:", Object.keys(allInspections[0]));
      }
      
      // For lightweight data, we don't need to parse heavy fields
      setInspections(allInspections);
      setSelectedInspections(new Set());
      setCacheTimestamp(now);
      setLastUpdateCheck(now);
      
      // Load stats after inspections are loaded
      const dashboardStats = await getDashboardStats(allInspections);
      setStats(dashboardStats);
    } catch (error) {
      console.error("Error loading inspections:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      setInspections([]);
      alert("Failed to load inspections. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    try {
      const dashboardStats = await getDashboardStats(inspections);
      setStats(dashboardStats);
    } catch (error) {
      console.error("Error refreshing stats:", error);
    }
  };

  // Cache invalidation function
  const invalidateCache = () => {
    console.log("🔍 CACHE: Invalidating cache due to data changes");
    setCacheTimestamp(null);
    setLastUpdateCheck(null);
  };

  // Smart refresh function that only loads if cache is invalid
  const smartRefresh = async () => {
    await loadInspections(false); // Don't force refresh, let cache logic decide
  };
  


  // Calculate dashboard statistics
  const getDashboardStats = async (inspectionsList = inspections) => {
    // Apply month filtering
    let filteredInspections = inspectionsList;
    
    if (selectedMonth !== "all" && selectedYear !== "all") {
      filteredInspections = inspectionsList.filter(inspection => {
        const inspectionDate = new Date(inspection.created_date);
        const inspectionMonth = inspectionDate.getMonth() + 1; // getMonth() returns 0-11
        const inspectionYear = inspectionDate.getFullYear();
        
        return inspectionMonth === parseInt(selectedMonth) && inspectionYear === parseInt(selectedYear);
      });
    }
    
    const total = filteredInspections.length;
    const withMold = filteredInspections.filter(i => i.has_visible_mold).length;
    const withWaterDamage = filteredInspections.filter(i => i.has_water_damage).length;
    const pending = filteredInspections.filter(i => i.status === 'pending').length;
    const completed = filteredInspections.filter(i => i.status === 'completed').length;

    // Count actual samples from all inspections
    let totalSamples = 0;
    try {
      for (const inspection of filteredInspections) {
        const samples = await Sample.findMany({ inspection_id: inspection.id });
        totalSamples += samples.length;
      }
    } catch (error) {
      console.error("Error fetching samples for stats:", error);
      // Fallback to counting inspections with is_sample
      totalSamples = filteredInspections.filter(i => i.is_sample).length;
    }
    
    const propertyTypes = {};
    const clientTypes = {};
    const cities = {};
    
    filteredInspections.forEach(inspection => {
      if (inspection.property_type) {
        propertyTypes[inspection.property_type] = (propertyTypes[inspection.property_type] || 0) + 1;
      }
      if (inspection.client_type) {
        clientTypes[inspection.client_type] = (clientTypes[inspection.client_type] || 0) + 1;
      }
      if (inspection.city) {
        cities[inspection.city] = (cities[inspection.city] || 0) + 1;
      }
    });

    return {
      total,
      withMold,
      withWaterDamage,
      samples: totalSamples,
      pending,
      completed,
      propertyTypes,
      clientTypes,
      cities
    };
  };




  // Filter inspections based on all filters
  const filteredInspections = inspections.filter(inspection => {
    const statusMatch = statusFilter === 'all' || inspection.status === statusFilter;
    const propertyTypeMatch = propertyTypeFilter === 'all' || inspection.property_type === propertyTypeFilter;
    const clientTypeMatch = clientTypeFilter === 'all' || inspection.client_type === clientTypeFilter;
    const moldMatch = moldFilter === 'all' || 
      (moldFilter === 'yes' && inspection.has_visible_mold) || 
      (moldFilter === 'no' && !inspection.has_visible_mold);
    const waterDamageMatch = waterDamageFilter === 'all' || 
      (waterDamageFilter === 'yes' && inspection.has_water_damage) || 
      (waterDamageFilter === 'no' && !inspection.has_water_damage);

    const term = searchTerm.toLowerCase();
    const searchMatch = !term ||
      (getDisplayNumber(inspection) || '').toLowerCase().includes(term) ||
      (inspection.full_name || '').toLowerCase().includes(term) ||
      (inspection.street_address || '').toLowerCase().includes(term) ||
      (inspection.email || '').toLowerCase().includes(term) ||
      (inspection.city || '').toLowerCase().includes(term) ||
      (inspection.state || '').toLowerCase().includes(term);

    return statusMatch && propertyTypeMatch && clientTypeMatch && moldMatch && waterDamageMatch && searchMatch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredInspections.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInspections = filteredInspections.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, propertyTypeFilter, clientTypeFilter, moldFilter, waterDamageFilter]);

  // Periodic cache refresh every 10 minutes when page is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && cacheTimestamp) {
        const cacheAge = Date.now() - cacheTimestamp;
        if (cacheAge > CACHE_DURATION) {
          console.log("🔍 CACHE: Auto-refreshing expired cache");
          smartRefresh();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [cacheTimestamp]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleSelectAll = (checked) => {
    // Select/deselect all currently visible inspections (current page)
    const idsToSelect = currentInspections.map(insp => insp.id);
    if (checked) {
      setSelectedInspections(prev => new Set([...prev, ...idsToSelect]));
    } else {
      setSelectedInspections(prev => {
        const newSet = new Set(prev);
        idsToSelect.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handleSelectInspection = (inspectionId, checked) => {
    if (checked) {
      setSelectedInspections(prev => new Set([...prev, inspectionId]));
    } else {
      setSelectedInspections(prev => {
        const newSet = new Set(prev);
        newSet.delete(inspectionId);
        return newSet;
      });
    }
  };

  const handleDeleteSelected = async (idsToDelete = null) => {
    const ids = idsToDelete || Array.from(selectedInspections);
    if (ids.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${ids.length} inspection(s)? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      // Delete inspections one by one with a small delay to avoid rate limiting
      for (const id of ids) {
        await MoldInspection.delete(id);
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Invalidate cache and reload the inspections list
      invalidateCache();
      await smartRefresh();
      
      alert(`Successfully deleted ${ids.length} inspection(s).`);
    } catch (error) {
      alert("Failed to delete some inspections. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "InspectionNumber", "ID", "CreationDate", "FullName", "Email", "ClientType", "Address",
      "SquareFootage", "Status", "VisibleMold", "WaterDamage"
    ];

    const rows = inspections.map((insp, index) => {
      const displayNum = getDisplayNumber(insp);
      
      return [
        displayNum,
        insp.id,
        format(new Date(insp.created_date), "yyyy-MM-dd HH:mm"),
        `"${insp.full_name}"`,
        insp.email,
        insp.client_type,
        `"${insp.street_address}, ${insp.city}, ${insp.state} ${insp.zip_code}"`,
        insp.square_footage,
        insp.status,
        insp.has_visible_mold,
        insp.has_water_damage
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inspections_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  

  const sendLabReceivedEmail = async (inspection) => {
    // Debug: Log the inspection object to see what fields are available
    console.log("🔍 DEBUG: Full inspection object:", JSON.stringify(inspection, null, 2));
    console.log("🔍 DEBUG: Inspection ID:", inspection.id);
    console.log("🔍 DEBUG: Inspection Number:", inspection.inspection_number);
    console.log("🔍 DEBUG: All inspection keys:", Object.keys(inspection));
    
    // Try multiple possible ID fields - prioritize inspection_number as it's the primary identifier
    const inspectionId = inspection.inspection_number || 
                        inspection.id || 
                        inspection.inspection_id ||
                        inspection.number ||
                        null;
    
    console.log("🔍 DEBUG: Final inspectionId being used:", inspectionId);
    console.log("🔍 DEBUG: Type of inspectionId:", typeof inspectionId);
    
    if (!inspectionId) {
      console.error("❌ ERROR: No valid inspection ID found");
      console.error("❌ ERROR: Available fields:", Object.keys(inspection));
      console.error("❌ ERROR: inspection.id =", inspection.id);
      console.error("❌ ERROR: inspection.inspection_number =", inspection.inspection_number);
      alert("Error: Could not identify the inspection. Please try again.");
      return;
    }
    

    
    try {
      console.log(`🔍 DEBUG: Sending lab received email for inspection ${inspectionId}`);
      
      // Send email using the backend email service
      const emailResponse = await EmailService.sendLabReceivedEmail(inspectionId);
      console.log("Email service response:", emailResponse);
      
      // Update inspection status to 'in_progress' in the database
      // Debug the inspection object to see what's available
      console.log(`🔍 DEBUG: Full inspection object:`, inspection);
      console.log(`🔍 DEBUG: inspection.id:`, inspection.id);
      console.log(`🔍 DEBUG: inspection.inspection_number:`, inspection.inspection_number);
      console.log(`🔍 DEBUG: Available keys:`, Object.keys(inspection));
      
      // Use the database ID for the update, not the inspection_number
      let dbId = inspection.id;
      
      // If database ID is not available, try to get it by fetching detailed inspection data
      if (!dbId) {
        console.log(`🔍 DEBUG: Database ID not found, trying to get detailed inspection data using inspection_number: ${inspectionId}`);
        try {
          const detailedInspection = await MoldInspection.getDetailed(inspectionId);
          dbId = detailedInspection.id;
          console.log(`🔍 DEBUG: Retrieved database ID from detailed inspection: ${dbId}`);
        } catch (detailError) {
          console.error(`🔍 DEBUG: Error getting detailed inspection:`, detailError);
          console.log(`🔍 DEBUG: Skipping status update due to missing database ID, but email was sent successfully`);
          // Don't throw error - email was sent successfully, just skip the status update
          dbId = null;
        }
      }
      
      console.log(`🔍 DEBUG: About to call MoldInspection.update with database ID: ${dbId}`);
      console.log(`🔍 DEBUG: inspection_number being used for email: ${inspectionId}`);
      
      // Only update status if we have a valid database ID
      if (dbId) {
        const updatedInspection = await MoldInspection.update(dbId, { 
        status: 'in_progress',
          client_status_detail: "Your samples have been received and are now in lab analysis.",
          updated_date: new Date().toISOString()
        });
        
        console.log("🔍 DEBUG: MoldInspection.update response:", updatedInspection);
        
        // Update the local state immediately
        // Use the same database ID for matching
        setInspections(prevInspections => 
          prevInspections.map(insp => 
            insp.id === dbId
              ? { ...insp, status: 'in_progress', client_status_detail: "Your samples have been received and are now in lab analysis." }
              : insp
          )
        );
      } else {
        console.log(`🔍 DEBUG: Skipping status update - no valid database ID available`);
        alert("Email sent successfully, but status update failed. Please refresh the page to see the latest status.");
      }
      
      // Invalidate cache and reload inspections to ensure we have the latest data
      invalidateCache();
      await smartRefresh();
      
      console.log("🔍 DEBUG: Successfully updated inspection status to 'in_progress'");
      
    } catch (error) {
      console.error("❌ Error sending lab received email:", error);
      
      // Show error to user
      alert(`Failed to send lab email and update status: ${error.message}`);
    }
  };

  const sendReportReadyEmail = async (inspection) => {
    // Debug the inspection object
    console.log("🔍 DEBUG: sendReportReadyEmail inspection object:", inspection);
    console.log("🔍 DEBUG: inspection.id:", inspection.id);
    console.log("🔍 DEBUG: inspection.inspection_number:", inspection.inspection_number);
    console.log("🔍 DEBUG: Available keys:", Object.keys(inspection));
    
    // Use inspection_number as fallback if id is undefined
    const inspectionId = inspection.inspection_number || inspection.id;
    
    console.log("🔍 DEBUG: Final inspectionId being sent to backend:", inspectionId);
    
    if (!inspectionId) {
      console.error("❌ ERROR: No valid inspection ID found");
      alert("Error: Could not identify the inspection. Please try again.");
      return;
    }
    

    setEmailSending(inspectionId, 'report');
    
    try {
      const displayNum = getDisplayNumber(inspection);
      
      // Step 1: Generate the report
      setDownloadStatus({ type: 'info', message: `Generating report for ${displayNum}...` });
      const samples = await Sample.findMany({ inspection_id: inspectionId });
      const reportHtml = await generateReportHtmlContent(inspection, samples);
      
      // Mock file upload since LLMService is removed
      const reportUrl = `https://storage.moldtestinghouston.com/reports/report-${inspectionId}.html`;
      setDownloadStatus({ type: 'success', message: 'Report generated successfully.' });
      setTimeout(() => setDownloadStatus(null), 3000);

      // Step 2: Send the email notification
      console.log(`🔍 DEBUG: Sending report ready email for inspection ${inspectionId}`);
      const emailResponse = await EmailService.sendReportReadyEmail(inspectionId);
      console.log("Email service response:", emailResponse);
      
      // Step 3: Update the inspection status to 'completed' in the database
      const dbId = inspection.id;
      if (dbId) {
        await MoldInspection.update(dbId, { 
        status: 'completed',
        client_status_detail: "Your detailed analysis and report are complete and available for download.",
          report_html_url: reportUrl,
          updated_date: new Date().toISOString()
        });
        
        // Step 4: Update the local state immediately
        setInspections(prevInspections => 
          prevInspections.map(insp => 
            insp.id === dbId
              ? { ...insp, status: 'completed', client_status_detail: "Your detailed analysis and report are complete and available for download." }
              : insp
          )
        );
      }
      
      // Step 5: Invalidate cache and refresh the UI to ensure we have the latest data
      invalidateCache();
      await smartRefresh();
      
      setEmailComplete(inspectionId, 'report');
      
    } catch (error) {
      console.error("❌ Error sending report ready email:", error);
      setEmailError(inspectionId, 'report');
      setDownloadStatus({ type: 'error', message: `Failed to prepare report: ${error.message}` });
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  };

  const sendReviewRequestEmail = async (inspection) => {
    // Use inspection_number as fallback if id is undefined
    const inspectionId = inspection.id || inspection.inspection_number;
    
    if (!inspectionId) {
      console.error("❌ ERROR: No valid inspection ID found");
      alert("Error: Could not identify the inspection. Please try again.");
      return;
    }
    

    
    try {
      console.log(`🔍 DEBUG: Sending review request email for inspection ${inspectionId}`);
      const emailResponse = await EmailService.sendReviewRequestEmail(inspectionId);
      console.log("Email service response:", emailResponse);
      
    } catch (error) {
      console.error("❌ Error sending review request email:", error);
    }
  };

  // Email status management
  const setEmailSending = (inspectionId, emailType) => {
    const key = `${emailType}_${inspectionId}`;
    setEmailStatus(prev => ({ ...prev, [key]: 'sending' }));
  };

  const setEmailComplete = (inspectionId, emailType) => {
    const key = `${emailType}_${inspectionId}`;
    setEmailStatus(prev => ({ ...prev, [key]: 'sent' }));
    setTimeout(() => {
      setEmailStatus(prev => ({ ...prev, [key]: null }));
    }, 2000);
  };

  const setEmailError = (inspectionId, emailType) => {
    const key = `${emailType}_${inspectionId}`;
    setEmailStatus(prev => ({ ...prev, [key]: 'error' }));
    setTimeout(() => {
      setEmailStatus(prev => ({ ...prev, [key]: null }));
    }, 3000);
  };

  const getEmailStatus = (inspectionId, emailType) => {
    const key = `${emailType}_${inspectionId}`;
    return emailStatus[key] || 'idle';
  };

  // Download functions
  const handleDownloadPDF = async (inspection) => {
    try {
      await downloadPDF(
        inspection,
        [], // samples will be fetched inside downloadPDF
        generateReportHtmlContent,
        getDisplayNumber,
        setDownloadStatus
      );
    } catch (error) {
      console.error("❌ Error in handleDownloadPDF:", error);
      setDownloadStatus({ type: 'error', message: `Failed to generate PDF: ${error.message}` });
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  };

  const handleDownloadHTML = async (inspection) => {
    try {
      await downloadHTML(
        inspection,
        [], // samples will be fetched inside downloadHTML
        generateReportHtmlContent,
        getDisplayNumber,
        setDownloadStatus
      );
    } catch (error) {
      console.error("❌ Error in handleDownloadHTML:", error);
      setDownloadStatus({ type: 'error', message: `Failed to generate HTML: ${error.message}` });
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  };

  // Status switching functionality
  const updateInspectionStatus = async (inspectionId, newStatus) => {
    try {
      // Validate inputs
      if (!inspectionId) {
        throw new Error("Inspection ID is required");
      }
      
      if (!newStatus) {
        throw new Error("New status is required");
      }
      
      // Convert to string if needed
      const inspectionIdStr = String(inspectionId);
      const statusStr = String(newStatus);
      
      const updatedInspection = await MoldInspection.update(inspectionIdStr, { 
        status: statusStr,
        updated_date: new Date().toISOString() // Add update timestamp
      });
      
      // Update the local state
      setInspections(prevInspections => 
        prevInspections.map(inspection => 
          inspection.id === inspectionId || inspection.id === inspectionIdStr
            ? { ...inspection, status: statusStr }
            : inspection
        )
      );
      
      alert(`Status updated to ${statusStr}`);
    } catch (error) {
      console.error("❌ Error updating inspection status:", error);
      alert(`Failed to update status: ${error.message}`);
    }
  };

  // Get status badge variant and icon
  const getStatusDisplay = (status) => {
    const statusConfig = {
      pending: {
        variant: "secondary",
        icon: Clock,
        label: "Pending",
        color: "text-yellow-600"
      },
      in_progress: {
        variant: "default",
        icon: PlayCircle,
        label: "In Progress",
        color: "text-blue-600"
      },
      completed: {
        variant: "default",
        icon: CheckCircle2,
        label: "Completed",
        color: "text-green-600"
      },
      cancelled: {
        variant: "destructive",
        icon: XCircle,
        label: "Cancelled",
        color: "text-red-600"
      },
      on_hold: {
        variant: "outline",
        icon: PauseCircle,
        label: "On Hold",
        color: "text-orange-600"
      }
    };
    
    return statusConfig[status] || statusConfig.pending;
  };

  // Get available status options for switching
  const getAvailableStatuses = (currentStatus) => {
    const allStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'];
    return allStatuses.filter(status => status !== currentStatus);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2  rounded-lg">
              <img 
                src="https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/logos.png" 
                  alt="Total Testing Logo" 
                className="w-8 h-8 object-contain"
              />
                </div>
              Admin Dashboard
            </h1>
              <p className="text-slate-600 mt-2 flex items-center gap-2">
                <Database className="w-4 h-4" />
              Manage all inspections and generate comprehensive reports
            </p>
          </div>
          <div className="flex gap-3">
                              <Button onClick={() => loadInspections(true)} variant="outline" className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
              <Button onClick={exportToCSV} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200">
              <FileText className="w-4 h-4" />
              Export CSV
            </Button>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {downloadStatus && (
          <Alert variant={downloadStatus.type === 'error' ? 'destructive' : downloadStatus.type === 'success' ? 'default' : 'default'}>
            <AlertDescription className="flex items-center gap-2">
              {downloadStatus.type === 'error' && <AlertTriangle className="w-4 h-4" />}
              {downloadStatus.type === 'success' && <CheckCircle className="w-4 h-4" />}
              {downloadStatus.type === 'info' && <Loader2 className="w-4 h-4 animate-spin" />}
              {downloadStatus.message}
            </AlertDescription>
          </Alert>
        )}

        {/* PDF Download Instructions */}
        {downloadStatus?.type === 'error' && downloadStatus.message.includes('PDF') && (
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <AlertDescription className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-800 mb-1">PDF Download Troubleshooting:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Allow popups for this website in your browser settings</li>
                  <li>• Try the "Download HTML" option instead - you can then print it as PDF</li>
                  <li>• Use "View Report" and print directly from the browser</li>
                  <li>• Check your browser's print dialog if it opened automatically</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="bg-white rounded-xl p-2 shadow-sm border border-slate-200">
            <TabsList className="grid w-full grid-cols-3 bg-slate-100">
              <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
              <TabsTrigger value="inspections" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
              <Database className="w-4 h-4" />
              All Inspections
            </TabsTrigger>

              <TabsTrigger value="emails" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200">
              <Mail className="w-4 h-4" />
              Email Settings
            </TabsTrigger>
          </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Month Filter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Month Filter
                </CardTitle>
                <CardDescription>
                  Filter statistics by month and year
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Month</label>
                    <Select
                      value={selectedMonth}
                      onValueChange={(value) => {
                        setSelectedMonth(value);
                        setTimeout(refreshStats, 100);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All months</SelectItem>
                        <SelectItem value="1">January</SelectItem>
                        <SelectItem value="2">February</SelectItem>
                        <SelectItem value="3">March</SelectItem>
                        <SelectItem value="4">April</SelectItem>
                        <SelectItem value="5">May</SelectItem>
                        <SelectItem value="6">June</SelectItem>
                        <SelectItem value="7">July</SelectItem>
                        <SelectItem value="8">August</SelectItem>
                        <SelectItem value="9">September</SelectItem>
                        <SelectItem value="10">October</SelectItem>
                        <SelectItem value="11">November</SelectItem>
                        <SelectItem value="12">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Year</label>
                    <Select
                      value={selectedYear}
                      onValueChange={(value) => {
                        setSelectedYear(value);
                        setTimeout(refreshStats, 100);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All years</SelectItem>
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedMonth("all");
                        setSelectedYear("all");
                        setTimeout(refreshStats, 100);
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-900">Total Inspections</CardTitle>
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Database className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-900 mb-1">{stats.total}</div>
                  <p className="text-xs text-blue-700">All time inspections</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-900">Total Samples</CardTitle>
                  <div className="p-2 bg-green-500 rounded-lg">
                    <FlaskConical className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-900 mb-1">{stats.samples}</div>
                  <p className="text-xs text-green-700">All time samples</p>
                </CardContent>
              </Card>

    
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <Clock className="w-5 h-5" />
                    Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm font-medium">Pending</span>
                  </div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{stats.pending}</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                    <Badge variant="default" className="bg-green-100 text-green-800">{stats.completed}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <MapPin className="w-5 h-5" />
                    Top Cities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(stats.cities)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([city, count], index) => (
                      <div key={city} className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-200 px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-medium">{city}</span>
                        </div>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">{count}</Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Zap className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Common admin tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    onClick={exportToCSV} 
                    variant="outline" 
                    className="h-24 flex flex-col gap-3 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                  >
                    <FileText className="w-8 h-8 text-blue-600" />
                    <span className="text-sm font-medium">Export All Data</span>
                    <span className="text-xs text-slate-500">Download CSV</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setActiveTab("inspections")} 
                    variant="outline" 
                    className="h-24 flex flex-col gap-3 bg-white hover:bg-green-50 hover:border-green-300 transition-all duration-200"
                  >
                    <Database className="w-8 h-8 text-green-600" />
                    <span className="text-sm font-medium">Manage Inspections</span>
                    <span className="text-xs text-slate-500">View all inspections</span>
                  </Button>


                  <Button 
                    onClick={() => loadInspections(true)} 
                    variant="outline" 
                    className="h-24 flex flex-col gap-3 bg-white hover:bg-orange-50 hover:border-orange-300 transition-all duration-200"
                  >
                    <RefreshCw className="w-8 h-8 text-orange-600" />
                    <span className="text-sm font-medium">Refresh Data</span>
                    <span className="text-xs text-slate-500">Update dashboard</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inspections Tab */}
          <TabsContent value="inspections" className="space-y-6">
            {/* Enhanced Filters */}
            <Card className="bg-white from-slate-50 to-slate-100 border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Filter className="w-5 h-5" />
                  Advanced Filters
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Filter and search through all inspections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search inspections..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-10 pl-10 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-10 bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  






                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-200">
                  <div className="text-sm text-slate-600">
                    Showing {filteredInspections.length} of {inspections.length} inspections
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setPropertyTypeFilter("all");
                      setClientTypeFilter("all");
                      setMoldFilter("all");
                      setWaterDamageFilter("all");
                    }}
                    className="flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear All Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Inspections Table */}
            <Card className="border-slate-200">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Database className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-slate-800">All Inspections ({filteredInspections.length})</CardTitle>
                      <p className="text-sm text-slate-600 mt-1">
                        Manage and monitor all mold inspection records
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSelectAll(true)}
                      variant="outline"
                      size="sm"
                      className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Select All
                    </Button>

                    {selectedInspections.size > 0 && (
                      <Button
                        onClick={handleDeleteSelected}
                        variant="destructive"
                        size="sm"
                        disabled={isDeleting}
                        className="hover:bg-red-700 transition-all duration-200"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete {selectedInspections.size}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Mobile Card Layout */}
                <div className="block md:hidden">
                  <div className="p-4 border-b bg-slate-50">
                    <Checkbox
                      checked={currentInspections.length > 0 && currentInspections.every(insp => selectedInspections.has(insp.id))}
                      onCheckedChange={handleSelectAll}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-slate-700">Select All</span>
                  </div>
                  <div className="space-y-4 p-4">
                    {currentInspections.map((inspection, index) => (
                      <div 
                        key={inspection.id} 
                        className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedInspections.has(inspection.id)}
                              onCheckedChange={(checked) => handleSelectInspection(inspection.id, checked)}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-blue-600 font-semibold text-sm">{getDisplayNumber(inspection)}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {inspection.created_date ? format(new Date(inspection.created_date), "MMM dd, yyyy") : 'N/A'}
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant={getStatusDisplay(inspection.status).variant}
                            className={`px-2 py-1 text-xs font-medium ${
                              inspection.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                              inspection.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                              inspection.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {React.createElement(getStatusDisplay(inspection.status).icon, { className: "w-3 h-3 mr-1" })}
                            {getStatusDisplay(inspection.status).label}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <div className="font-medium text-slate-900 text-sm">{inspection.full_name}</div>
                            <div className="text-xs text-slate-600 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {inspection.email}
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-medium text-slate-900 text-sm">{inspection.street_address}</div>
                            <div className="text-xs text-slate-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {inspection.city}, {inspection.state} {inspection.zip_code}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex gap-1">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                              {inspection.property_type || 'N/A'}
                            </span>
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs">
                              {inspection.client_type?.replace('_', ' ') || 'N/A'}
                            </span>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              <DropdownMenuLabel className="font-semibold text-slate-800">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem 
                                onClick={() => {
                                  try {
                                    const url = createPageUrl('InspectionDetails', { id: inspection.id || inspection.inspection_number });
                                    navigate(url);
                                  } catch (error) {
                                    console.error("Failed to navigate to inspection details:", error);
                                    alert("Failed to open inspection details. Please try again.");
                                  }
                                }}
                                className="flex items-center gap-2 hover:bg-blue-50 text-blue-700"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => handleDownloadPDF(inspection)}
                                className="flex items-center gap-2 hover:bg-green-50 text-green-700"
                              >
                                <File className="w-4 h-4" />
                                Download PDF
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => sendLabReceivedEmail(inspection)}
                                disabled={getEmailStatus(inspection.inspection_number || inspection.id, 'lab') === 'sending'}
                                className="flex items-center gap-2 hover:bg-purple-50 text-purple-700 disabled:opacity-50"
                              >
                                <Mail className="w-4 h-4" />
                                {getEmailStatus(inspection.inspection_number || inspection.id, 'lab') === 'sending' ? 'Sending...' : 'Send Lab Email'}
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                onClick={() => sendReportReadyEmail(inspection)}
                                disabled={getEmailStatus(inspection.inspection_number || inspection.id, 'report') === 'sending'}
                                className="flex items-center gap-2 hover:bg-green-50 text-green-700 disabled:opacity-50"
                              >
                                <CheckCircle className="w-4 h-4" />
                                {getEmailStatus(inspection.inspection_number || inspection.id, 'report') === 'sending' ? 'Sending...' : 'Send Report Email'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-100">
                        <TableHead className="w-12 bg-slate-100">
                          <Checkbox
                            checked={currentInspections.length > 0 && currentInspections.every(insp => selectedInspections.has(insp.id))}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="bg-slate-100 font-semibold text-slate-700">Inspection #</TableHead>
                        <TableHead className="bg-slate-100 font-semibold text-slate-700">Client</TableHead>
                        <TableHead className="bg-slate-100 font-semibold text-slate-700">Property</TableHead>
                        <TableHead className="bg-slate-100 font-semibold text-slate-700">Status</TableHead>
                        <TableHead className="bg-slate-100 font-semibold text-slate-700">Created</TableHead>
                        <TableHead className="bg-slate-100 font-semibold text-slate-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentInspections.map((inspection, index) => (
                        <TableRow 
                          key={inspection.id} 
                          className={`hover:bg-slate-50 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}
                        >
                          <TableCell className="border-r border-slate-200">
                            <Checkbox
                              checked={selectedInspections.has(inspection.id)}
                              onCheckedChange={(checked) => handleSelectInspection(inspection.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-blue-600 font-semibold">{getDisplayNumber(inspection)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">{inspection.full_name}</div>
                              <div className="text-sm text-slate-600 flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {inspection.email}
                              </div>
                              <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full inline-block">
                                {inspection.client_type?.replace('_', ' ') || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-slate-900">{inspection.street_address}</div>
                              <div className="text-sm text-slate-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {inspection.city}, {inspection.state} {inspection.zip_code}
                              </div>
                              <div className="text-xs text-slate-500">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full mr-1">
                                  {inspection.property_type || 'N/A'}
                                </span>
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                  {inspection.square_footage} sq ft
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={getStatusDisplay(inspection.status).variant}
                                className={`px-3 py-1 font-medium ${
                                  inspection.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                                  inspection.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                                  inspection.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                  'bg-slate-100 text-slate-800 border-slate-200'
                                }`}
                              >
                                {React.createElement(getStatusDisplay(inspection.status).icon, { className: "w-3 h-3 mr-1" })}
                                {getStatusDisplay(inspection.status).label}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-100">
                                    <RotateCcw className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel className="font-semibold">Change Status</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {getAvailableStatuses(inspection.status).map((status) => (
                                    <DropdownMenuItem 
                                      key={status}
                                      onClick={() => {
                                        updateInspectionStatus(inspection.id, status);
                                      }}
                                      className="flex items-center gap-2 hover:bg-slate-50"
                                    >
                                      {React.createElement(getStatusDisplay(status).icon, { className: "w-4 h-4" })}
                                      {getStatusDisplay(status).label}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>                       
             
                    
                          <TableCell>
                            <div className="text-sm text-slate-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {inspection.created_date ? format(new Date(inspection.created_date), "MMM dd, yyyy") : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-64">
                                <DropdownMenuLabel className="font-semibold text-slate-800">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                
                                {/* View and Download Actions */}
                                <DropdownMenuItem 
                                  onClick={() => {
                                    try {
                                      console.log("🔍 DEBUG: View Details clicked for inspection:", inspection);
                                      console.log("🔍 DEBUG: Inspection ID:", inspection.id);
                                      console.log("🔍 DEBUG: Inspection Number:", inspection.inspection_number);
                                      
                                      // Use React Router navigation instead of window.open
                                      const url = createPageUrl('InspectionDetails', { id: inspection.id || inspection.inspection_number });
                                      console.log("🔍 DEBUG: Navigating to URL:", url);
                                      navigate(url);
                                    } catch (error) {
                                      console.error("🔍 ERROR: Failed to navigate to inspection details:", error);
                                      alert("Failed to open inspection details. Please try again.");
                                    }
                                  }}
                                  className="flex items-center gap-2 hover:bg-blue-50 text-blue-700"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={() => handleDownloadPDF(inspection)}
                                  className="flex items-center gap-2 hover:bg-green-50 text-green-700"
                                >
                                  <File className="w-4 h-4" />
                                  Download PDF
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={() => handleDownloadHTML(inspection)}
                                  className="flex items-center gap-2 hover:bg-blue-50 text-blue-700"
                                >
                                  <FileText className="w-4 h-4" />
                                  Download HTML
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                {/* Email Actions */}
                                <DropdownMenuItem 
                                  onClick={() => sendLabReceivedEmail(inspection)}
                                  disabled={getEmailStatus(inspection.inspection_number || inspection.id, 'lab') === 'sending'}
                                  className="flex items-center gap-2 hover:bg-purple-50 text-purple-700 disabled:opacity-50"
                                >
                                  <Mail className="w-4 h-4" />
                                  {getEmailStatus(inspection.inspection_number || inspection.id, 'lab') === 'sending' ? 'Sending...' : 'Send Lab Received Email'}
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={() => sendReportReadyEmail(inspection)}
                                  disabled={getEmailStatus(inspection.inspection_number || inspection.id, 'report') === 'sending'}
                                  className="flex items-center gap-2 disabled:opacity-50"
                                >
                                  <Mail className="w-4 h-4" />
                                  {getEmailStatus(inspection.inspection_number || inspection.id, 'report') === 'sending' ? 'Sending...' : 'Send Report Ready Email'}
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={() => sendReviewRequestEmail(inspection)}
                                  className="flex items-center gap-2"
                                >
                                  <Star className="w-4 h-4" />
                                  Send Review Request
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem 
                                  onClick={async () => {
                                    try {
                                      console.log("🔍 DEBUG: Generating comprehensive report for inspection:", inspection.id);
                                      
                                      // Get detailed inspection data first
                                      let detailedInspection = inspection;
                                      try {
                                        const inspectionId = inspection.id || inspection.inspection_number;
                                        detailedInspection = await MoldInspection.getDetailed(inspectionId);
                                        console.log("🔍 DEBUG: Retrieved detailed inspection data:", detailedInspection);
                                      } catch (detailError) {
                                        console.error("🔍 DEBUG: Error fetching detailed inspection data:", detailError);
                                        // Continue with current data if detailed fetch fails
                                      }
                                      
                                                                              // Get samples for this inspection
                                        const samples = await Sample.findMany({ inspection_id: inspection.id });
                                      console.log("🔍 DEBUG: Retrieved samples for report:", samples);
                                      
                                      // Generate comprehensive report HTML
                                      const reportHtml = await generateReportHtmlContent(detailedInspection, samples);
                                      
                                      // Open in new window using data URL to avoid about:blank
                                      const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(reportHtml)}`;
                                      const newWindow = window.open(dataUrl, '_blank');
                                    } catch (error) {
                                      console.error("❌ Error viewing report:", error);
                                      alert("Failed to generate report. Please try again.");
                                    }
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Report
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                {/* Delete Action */}
                                <DropdownMenuItem 
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete inspection ${getDisplayNumber(inspection)}?`)) {
                                      handleDeleteSelected([inspection.id]);
                                    }
                                  }}
                                  className="flex items-center gap-2 text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Inspection
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm text-slate-600">Show</span>
                        <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
                          <SelectTrigger className="w-16 sm:w-20 h-8 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5</SelectItem>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-xs sm:text-sm text-slate-600">per page</span>
                      </div>
                      
                      <div className="text-xs sm:text-sm text-slate-600">
                        <span className="hidden sm:inline">Showing </span>
                        <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredInspections.length)}</span>
                        <span className="hidden sm:inline"> of </span>
                        <span className="sm:hidden"> / </span>
                        <span className="font-medium">{filteredInspections.length}</span>
                        <span className="hidden sm:inline"> inspections</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {/* Mobile: Show 3 pages, Desktop: Show 5 pages */}
                        <div className="flex items-center gap-1 sm:hidden">
                          {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage <= 2) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 1) {
                              pageNum = totalPages - 2 + i;
                            } else {
                              pageNum = currentPage - 1 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className="h-8 w-7 p-0 text-xs"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        
                        <div className="hidden sm:flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className="h-8 w-8 p-0 text-sm"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden">Next</span>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Email Settings Tab */}
          <TabsContent value="emails" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Email Settings
                  </CardTitle>
                  <CardDescription>
                    Edit email settings for different stages of the inspection process
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmailTemplateManager />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Function is already exported at declaration above
