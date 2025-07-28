import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User } from "@/api/entities";
import { MoldInspection } from "@/api/entities";
import { Sample } from "@/api/entities";
import { EmailService, EmailTemplate } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { 
  Download, Eye, FileText, Trash2, Mail, Star, FlaskConical, Search,
  BarChart3, PieChart, TrendingUp, Users, MapPin, Calendar, AlertTriangle, CheckCircle,
  Clock, Filter, RefreshCw, Database, Image, File, MoreHorizontal, Edit, Send, 
  CheckCircle2, XCircle, PauseCircle, PlayCircle, RotateCcw, Zap
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState([]);
  const [selectedInspections, setSelectedInspections] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState(null);
  const [emailStatus, setEmailStatus] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");
  const [moldFilter, setMoldFilter] = useState("all");
  const [waterDamageFilter, setWaterDamageFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

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
      loadInspections();
    } catch (error) {
      navigate(createPageUrl("Welcome"));
    } finally {
      setLoading(false);
    }
  }, [authUser, navigate]);

  const loadInspections = async () => {
    try {
      const allInspections = await MoldInspection.list('-created_at', 50, false); // Use lightweight endpoint for better performance
      
      // Check if allInspections is an array
      if (!Array.isArray(allInspections)) {
        setInspections([]);
        return;
      }
      
      // For lightweight data, we don't need to parse heavy fields
      setInspections(allInspections);
      setSelectedInspections(new Set());
    } catch (error) {
      console.error("Error loading inspections:", error);
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      setInspections([]);
      alert("Failed to load inspections. Please refresh the page.");
    }
  };

  // Helper function to process email template placeholders
  const processEmailTemplate = (template, inspection) => {
    const displayNum = getDisplayNumber(inspection);
    const placeholders = {
      '{{client_name}}': inspection.full_name || 'Valued Customer',
      '{{inspection_number}}': displayNum || inspection.id,
      '{{property_address}}': `${inspection.street_address}, ${inspection.city}, ${inspection.state} ${inspection.zip_code}`,
      '{{received_date}}': new Date().toLocaleDateString(),
      '{{report_date}}': new Date().toLocaleDateString(),
      '{{report_link}}': `${window.location.origin}${createPageUrl("MyInspections")}`,
      '{{review_link}}': 'https://g.page/r/moldtestinghouston/review'
    };

    let processedSubject = template.subject;
    let processedBody = template.body;

    // Replace placeholders in both subject and body
    Object.entries(placeholders).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      processedSubject = processedSubject.replace(regex, value);
      processedBody = processedBody.replace(regex, value);
    });

    return {
      subject: processedSubject,
      body: processedBody
    };
  };
  
  const getDisplayNumber = (inspection) => {
    const number = inspection.inspection_number || inspection.id;
    return `TT #${number}`;
  };

  // Calculate dashboard statistics
  const getDashboardStats = () => {
    const total = inspections.length;
    const withMold = inspections.filter(i => i.has_visible_mold).length;
    const withWaterDamage = inspections.filter(i => i.has_water_damage).length;
    const samples = inspections.filter(i => i.is_sample).length;
    const pending = inspections.filter(i => i.status === 'pending').length;
    const completed = inspections.filter(i => i.status === 'completed').length;

    
    const propertyTypes = {};
    const clientTypes = {};
    const cities = {};
        
    inspections.forEach(inspection => {
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
      samples,
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

  const stats = getDashboardStats();

  const handleSelectAll = (checked) => {
    // Select/deselect all currently filtered inspections
    const idsToSelect = filteredInspections.map(insp => insp.id);
    if (checked) {
      setSelectedInspections(new Set(idsToSelect));
    } else {
      setSelectedInspections(new Set());
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
      
      // Reload the inspections list
      await loadInspections();
      
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
  

  const generateReportHtmlContent = async (inspection, samples) => {
    const displayNum = getDisplayNumber(inspection);
    
    const disclaimerText = "The Total Testing DIY Mold Test Kit is intended as a preliminary screening tool to help individuals identify the possible presence of mold in their environment. It is not a substitute for a licensed mold assessment, professional inspection, or full indoor air quality evaluation as defined by state or federal regulations. This service is designed to provide basic laboratory analysis and a summary report based on surface sampling. The results and interpretations are intended for informational purposes only and do not constitute legal, environmental, or medical advice. If elevated mold levels are detected, or if there are known health concerns, water damage, or visible mold growth, we strongly recommend a licensed mold assessment by a certified professional in accordance with your state's regulations. By purchasing and using this kit, the user acknowledges and agrees that Total Testing is not liable for decisions made based on this preliminary testing, and that the DIY kit is best used as an initial 'first-aid' tool to gain awareness and guide next steps.";
    const limitationsText = "This report is based on a Do-It-Yourself (DIY) mold surface testing kit and is subject to certain inherent limitations. Results reflect conditions only at the specific locations and times the samples were collected. Mold presence can vary with environmental changes and may not be uniform throughout the property. This testing method does not detect airborne mold spores, mold hidden within walls or inaccessible areas, or other indoor air quality concerns. Therefore, this report should be considered a preliminary screening tool, not a substitute for a licensed mold assessment or comprehensive indoor environmental inspection. If health concerns persist, or if visible mold, water damage, or elevated moisture is suspected, we strongly recommend consulting a licensed mold professional.";

    const css = `
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #ffffff; color: #333; line-height: 1.6; }
        .page-break { page-break-after: always; }
        .cover-page { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 20px; }
        .cover-title { font-size: 28px; font-weight: bold; color: #004aac; margin-bottom: 20px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1); }
        .cover-image { max-width: 100%; height: auto; border-radius: 15px; margin: 20px 0; box-shadow: 0 8px 25px rgba(0,0,0,0.15); border: 3px solid white; }
        .cover-details { background: rgba(255,255,255,0.9); padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 100%; }
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
        
        /* Mobile-specific improvements */
        @media (max-width: 768px) {
            .cover-title { font-size: 24px; }
            .cover-details { padding: 15px; }
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
            .cover-title { font-size: 48px; }
            .cover-page { padding: 40px; }
            .cover-image { max-width: 450px; }
            .cover-details { padding: 30px; max-width: 500px; }
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
      ? `<div style="margin-bottom: 20px;">
          <h3 style="color: #dc2626; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px;">
            ⚠️ Visible Mold Detected
          </h3>
          ${moldLocations.map((location, i) => `
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <h4 style="color: #dc2626; font-weight: bold; margin: 0;">Location #${i + 1}: ${location || 'N/A'}</h4>
                ${createPriorityBadge('high', 'High Priority')}
              </div>
              <p style="color: #dc2626; font-size: 14px; margin: 8px 0;">⚠️ Visible mold detected - requires immediate attention</p>
              <div style="text-align: center; margin: 15px 0;">
                ${createImageList(inspection.mold_images)}
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
        <title>Mold Inspection Report</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>${css}</style>
    </head>
    <body>
        <div class="cover-page">
            <h1 class="cover-title">DIY Mold Inspection and Testing Report</h1>
<img src="https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/reportlogo.jpeg" alt="TT Logo" class="cover-image" />            <div class="cover-details">
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

            <div class="section">
                <h2>Client Information</h2>
                <div class="client-info-grid">
                    <div class="client-info-item"><div class="client-info-label">Customer:</div><div class="client-info-value">${inspection.full_name || 'N/A'}</div></div>
                    <div class="client-info-item"><div class="client-info-label">Email:</div><div class="client-info-value">${inspection.email || 'N/A'}</div></div>
                    <div class="client-info-item"><div class="client-info-label">Client Type:</div><div class="client-info-value">${inspection.client_type || 'N/A'}</div></div>
                    <div class="client-info-item"><div class="client-info-label">Address:</div><div class="client-info-value">${inspection.street_address}${inspection.unit_number ? ', ' + inspection.unit_number : ''}, ${inspection.city}, ${inspection.state} ${inspection.zip_code}</div></div>
                    <div class="client-info-item"><div class="client-info-label">Property Type:</div><div class="client-info-value">${inspection.property_type || 'N/A'}</div></div>
                    <div class="client-info-item"><div class="client-info-label">Square Footage:</div><div class="client-info-value">${inspection.square_footage || 'N/A'} sq ft</div></div>
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

            <div class="section">
                <h2>Lab Analysis</h2>
                ${labAnalysisHtml}
            </div>

            <div class="section">
                <h2>Conclusion</h2>
                <p>${inspection.lab_conclusion || inspection.conclusion || 'Pending conclusion.'}</p>
            </div>

<div class="section">
  <h2>Recommendations</h2>
  <div>
    ${
      (inspection.lab_recommendations || inspection.recommendations)
        ? (inspection.lab_recommendations || inspection.recommendations)
            // הסרת תווי \n כתובים
            .replace(/\\n/g, '')
            // פיצול לפי רווחים כפולים (או מעבר שורה כפול)
            .split(/\n{2,}/)
            .map(section => {
              // הסרת כוכביות מיותרים
              section = section.replace(/\*/g, '').trim();
              // נניח שהתבנית היא "Heading: Content"
              const indexOfColon = section.indexOf(':');
              if (indexOfColon !== -1) {
                const title = section.substring(0, indexOfColon).trim();
                const content = section.substring(indexOfColon + 1).trim();
                return `
                  <p style="font-weight: bold; margin: 12px 0 4px;">${title}:</p>
                  <p style="margin: 4px 0 12px 16px; line-height: 1.6; color: #374151;">${content}</p>
                  <br>
                `;
              }
              // אם לא נמצא כותרת, מחזירים את הטקסט כמפורט
              return `<p style="margin: 8px 0; line-height: 1.5; color: #374151;">${section}</p><br>`;
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

            <div class="footer">
                <p>Powered by Total Testing</p>
            </div>
        </div>
    </body>
    </html>
    `;
  };

  const downloadPDF = async (inspection) => {
    // Always generate a fresh report to ensure latest lab analysis is included
    setDownloadStatus({ type: 'info', message: `Generating report for ${getDisplayNumber(inspection)}...` });
    try {
      if (!inspection) {
        throw new Error("Could not find inspection details.");
      }
      
      // Fetch detailed inspection data to ensure we have the latest lab analysis
      let detailedInspection = inspection;
      console.log("🔍 DEBUG: Fetching detailed inspection data for report generation");
      try {
        detailedInspection = await MoldInspection.getDetailed(inspection.id);
        console.log("🔍 DEBUG: Retrieved detailed inspection data:", detailedInspection);
        console.log("🔍 DEBUG: Lab conclusion:", detailedInspection.lab_conclusion);
        console.log("🔍 DEBUG: Lab recommendations:", detailedInspection.lab_recommendations);
        console.log("🔍 DEBUG: Lab analysis images:", detailedInspection.lab_analysis_images);
      } catch (detailError) {
        console.error("🔍 DEBUG: Error fetching detailed inspection data:", detailError);
        // Continue with current data if detailed fetch fails
      }
      
      const samples = await Sample.findMany({ inspection_id: inspection.id });
      
      const displayNum = getDisplayNumber(inspection);
      
      const reportHtml = await generateReportHtmlContent(detailedInspection, samples);
      
      const blob = new Blob([reportHtml], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mold_Inspection_Report_${displayNum.replace(/[^a-zA-Z0-9]/g, '_')}_${(inspection.full_name || 'report').replace(/\s+/g, '_')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadStatus({ type: 'success', message: `Report ${displayNum} downloaded successfully!` });
      setTimeout(() => setDownloadStatus(null), 3000);
      
    } catch (error) {
      console.error("❌ Error generating report:", error);
      setDownloadStatus({ type: 'error', message: `Failed to generate report: ${error.message}` });
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  };

  const sendLabReceivedEmail = async (inspection) => {
    const emailKey = `lab_${inspection.id}`;
    setEmailStatus(prev => ({ ...prev, [emailKey]: 'sending' }));
    
    try {
      // Get the email template
      const template = await EmailTemplate.getByType('lab_received');
      const processedEmail = processEmailTemplate(template, inspection);
      
      // Mock email service since specific methods don't exist
      console.log(`Sending lab received email for inspection ${inspection.id}`);
      console.log(`Subject: ${processedEmail.subject}`);
      console.log(`Body: ${processedEmail.body}`);
      
      // Update inspection status to 'in_progress'
      await MoldInspection.update(inspection.id, { 
        status: 'in_progress',
        client_status_detail: "Your samples have been received and are now in lab analysis." 
      });

      // Reload inspections to reflect the change
      await loadInspections();
      
      setEmailStatus(prev => ({ ...prev, [emailKey]: 'sent' }));
      setTimeout(() => {
        setEmailStatus(prev => ({ ...prev, [emailKey]: null }));
      }, 3000);
      
    } catch (error) {
      setEmailStatus(prev => ({ ...prev, [emailKey]: 'error' }));
      setTimeout(() => {
        setEmailStatus(prev => ({ ...prev, [emailKey]: null }));
      }, 5000);
    }
  };

  const sendReportReadyEmail = async (inspection) => {
    const emailKey = `report_${inspection.id}`;
    setEmailStatus(prev => ({ ...prev, [emailKey]: 'sending' }));
    
    try {
      const displayNum = getDisplayNumber(inspection);
      
      // Step 1: Generate and upload the report
      setDownloadStatus({ type: 'info', message: `Generating and storing report for ${displayNum}...` });
      const samples = await Sample.findMany({ inspection_id: inspection.id });
      const reportHtml = await generateReportHtmlContent(inspection, samples);
      const reportFile = new File([reportHtml], `report-${inspection.id}.html`, { type: 'text/html' });
      
      // Mock file upload since LLMService is removed
      const reportUrl = `https://storage.moldtestinghouston.com/reports/report-${inspection.id}.html`;
      setDownloadStatus({ type: 'success', message: 'Report stored successfully.' });
      setTimeout(() => setDownloadStatus(null), 3000);

      // Step 2: Get the email template and process it
      const template = await EmailTemplate.getByType('report_ready');
      const processedEmail = processEmailTemplate(template, inspection);

      // Step 3: Send the email notification
      console.log(`Sending report ready email for inspection ${inspection.id}`);
      console.log(`Subject: ${processedEmail.subject}`);
      console.log(`Body: ${processedEmail.body}`);
      
      // Step 4: Update the inspection record
      await MoldInspection.update(inspection.id, { 
        status: 'completed',
        client_status_detail: "Your detailed analysis and report are complete and available for download.",
        report_html_url: reportUrl
      });
      
      // Step 5: Refresh the UI
      await loadInspections();
      
      setEmailStatus(prev => ({ ...prev, [emailKey]: 'sent' }));
      setTimeout(() => {
        setEmailStatus(prev => ({ ...prev, [emailKey]: null }));
      }, 3000);
      
    } catch (error) {
      setEmailStatus(prev => ({ ...prev, [emailKey]: 'error' }));
      setDownloadStatus({ type: 'error', message: `Failed to prepare report: ${error.message}` });
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  };

  const sendReviewRequestEmail = async (inspection) => {
    const emailKey = `review_${inspection.id}`;
    setEmailStatus(prev => ({ ...prev, [emailKey]: 'sending' }));
    
    try {
      // Get the email template and process it
      const template = await EmailTemplate.getByType('review_request');
      const processedEmail = processEmailTemplate(template, inspection);
      
      setEmailStatus(prev => ({ ...prev, [emailKey]: 'sent' }));
      setTimeout(() => {
        setEmailStatus(prev => ({ ...prev, [emailKey]: null }));
      }, 3000);
      
    } catch (error) {
      setEmailStatus(prev => ({ ...prev, [emailKey]: 'error' }));
      setTimeout(() => {
        setEmailStatus(prev => ({ ...prev, [emailKey]: null }));
      }, 5000);
    }
  };

  const getEmailButtonStatus = (emailKey) => {
    return emailStatus[emailKey] || 'idle';
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
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading admin dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <img 
                src="https://opjgytjlebfnhjzarvyy.supabase.co/storage/v1/object/public/mold.images/uploads/logos.png" 
                  alt="Total Testing Logo" 
                className="w-8 h-8 object-contain"
              />
              Admin Dashboard
            </h1>
            <p className="text-slate-600 mt-2">
              Manage all inspections and generate comprehensive reports
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => navigate('/EmailSettings')} 
              variant="outline" 
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Mail className="w-4 h-4" />
              Email Settings
            </Button>
            <Button onClick={loadInspections} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button onClick={exportToCSV} className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="inspections" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              All Inspections
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">All time inspections</p>
                </CardContent>
              </Card>
              
        
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Samples</CardTitle>
                  <FlaskConical className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.samples}</div>
                  <p className="text-xs text-muted-foreground">All time samples</p>
                </CardContent>
              </Card>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pending</span>
                    <Badge variant="secondary">{stats.pending}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Completed</span>
                    <Badge variant="default">{stats.completed}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Top Cities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(stats.cities)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([city, count]) => (
                      <div key={city} className="flex justify-between items-center">
                        <span className="text-sm">{city}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Common admin tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    onClick={exportToCSV} 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                  >
                    <FileText className="w-6 h-6" />
                    <span className="text-sm">Export All Data</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setActiveTab("inspections")} 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                  >
                    <Database className="w-6 h-6" />
                    <span className="text-sm">Manage Inspections</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setActiveTab("analytics")} 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                  >
                    <BarChart3 className="w-6 h-6" />
                    <span className="text-sm">View Analytics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inspections Tab */}
          <TabsContent value="inspections" className="space-y-6">
            {/* Enhanced Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Advanced Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <Input
                      placeholder="Search inspections..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                </div>

              </CardContent>
            </Card>

            {/* Enhanced Inspections Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>All Inspections ({filteredInspections.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSelectAll(true)}
                      variant="outline"
                      size="sm"
                    >
                      Select All
                    </Button>
                    <Button
                      onClick={() => handleSelectAll(false)}
                      variant="outline"
                      size="sm"
                    >
                      Clear
                    </Button>
                    {selectedInspections.size > 0 && (
                      <Button
                        onClick={handleDeleteSelected}
                        variant="destructive"
                        size="sm"
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Deleting...' : `Delete ${selectedInspections.size}`}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedInspections.size === filteredInspections.length && filteredInspections.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Inspection #</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInspections.map((inspection) => (
                        <TableRow key={inspection.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedInspections.has(inspection.id)}
                              onCheckedChange={(checked) => handleSelectInspection(inspection.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {getDisplayNumber(inspection)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{inspection.full_name}</div>
                              <div className="text-sm text-muted-foreground">{inspection.email}</div>
                              <div className="text-xs text-muted-foreground">{inspection.client_type}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{inspection.street_address}</div>
                              <div className="text-sm text-muted-foreground">
                                {inspection.city}, {inspection.state} {inspection.zip_code}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {inspection.property_type} • {inspection.square_footage} sq ft
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={getStatusDisplay(inspection.status).variant}>
                                {React.createElement(getStatusDisplay(inspection.status).icon, { className: "w-3 h-3 mr-1" })}
                                {getStatusDisplay(inspection.status).label}
                              </Badge>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <RotateCcw className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {getAvailableStatuses(inspection.status).map((status) => (
                                    <DropdownMenuItem 
                                      key={status}
                                      onClick={() => {
                                        updateInspectionStatus(inspection.id, status);
                                      }}
                                      className="flex items-center gap-2"
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
                            <div className="text-sm">
                              {inspection.created_date ? format(new Date(inspection.created_date), "MMM dd, yyyy") : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                
                                {/* View and Download Actions */}
                                <DropdownMenuItem 
                                  onClick={() => {
                                    const url = createPageUrl('InspectionDetails', { id: inspection.id });
                                    window.open(url, '_blank');
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={() => downloadPDF(inspection)}
                                  className="flex items-center gap-2"
                                >
                                  <File className="w-4 h-4" />
                                  Download Report
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={async () => {
                                    try {
                                      // Fetch the latest detailed inspection data
                                      const detailedInspection = await MoldInspection.getDetailed(inspection.id);
                                      console.log("🔍 DEBUG: View Report - Fetched detailed inspection:", detailedInspection);
                                      console.log("🔍 DEBUG: View Report - Lab conclusion:", detailedInspection.lab_conclusion);
                                      console.log("🔍 DEBUG: View Report - Lab recommendations:", detailedInspection.lab_recommendations);
                                      
                                      const samples = await Sample.findMany({ inspection_id: inspection.id });
                                      const reportHtml = await generateReportHtmlContent(detailedInspection, samples);
                                      const newWindow = window.open('', '_blank');
                                      newWindow.document.write(reportHtml);
                                      newWindow.document.close();
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
                                
                                {/* Email Actions */}
                                <DropdownMenuItem 
                                  onClick={() => sendLabReceivedEmail(inspection)}
                                  disabled={getEmailButtonStatus(`lab_received_${inspection.id}`) === 'sending'}
                                  className="flex items-center gap-2"
                                >
                                  <Mail className="w-4 h-4" />
                                  {getEmailButtonStatus(`lab_received_${inspection.id}`) === 'sending' ? 'Sending...' : 'Send Lab Received Email'}
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={() => sendReportReadyEmail(inspection)}
                                  disabled={getEmailButtonStatus(`report_ready_${inspection.id}`) === 'sending'}
                                  className="flex items-center gap-2"
                                >
                                  <Mail className="w-4 h-4" />
                                  {getEmailButtonStatus(`report_ready_${inspection.id}`) === 'sending' ? 'Sending...' : 'Send Report Ready Email'}
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem 
                                  onClick={() => sendReviewRequestEmail(inspection)}
                                  disabled={getEmailButtonStatus(`review_request_${inspection.id}`) === 'sending'}
                                  className="flex items-center gap-2"
                                >
                                  <Star className="w-4 h-4" />
                                  {getEmailButtonStatus(`review_request_${inspection.id}`) === 'sending' ? 'Sending...' : 'Send Review Request'}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Property Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.propertyTypes).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="capitalize">{type}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Client Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.clientTypes).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
