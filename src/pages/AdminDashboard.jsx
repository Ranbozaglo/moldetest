
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { MoldInspection } from "@/api/entities";
import { Sample } from "@/api/entities";
import { LLMService, EmailService } from "@/api/entities";
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
  Download, Eye, ShieldCheck, FileText, Trash2, Mail, Star, FlaskConical, Search,
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

  useEffect(() => {
    const checkUser = async () => {
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
        console.error("Error checking user:", error);
        navigate(createPageUrl("Welcome"));
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [navigate, authUser]);

  const loadInspections = async () => {
    try {
      console.log("🔍 Loading all inspections...");
      const allInspections = await MoldInspection.list('-created_date', 1000); // Load more inspections
      console.log("🔍 Loaded inspections:", allInspections);
      setInspections(allInspections);
      setSelectedInspections(new Set());
    } catch (error) {
      console.error("Error loading inspections:", error);
      alert("Failed to load inspections. Please refresh the page.");
    }
  };
  
  const getDisplayNumber = (inspection) => {
    const number = inspection.inspection_number || inspection.id;
    return `MTH #${number}`;
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
      console.error("Error deleting inspections:", error);
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
    
    const disclaimerText = "The Mold Testing Houston DIY Mold Test Kit is intended as a preliminary screening tool to help individuals identify the possible presence of mold in their environment. It is not a substitute for a licensed mold assessment, professional inspection, or full indoor air quality evaluation as defined by state or federal regulations. This service is designed to provide basic laboratory analysis and a summary report based on surface sampling. The results and interpretations are intended for informational purposes only and do not constitute legal, environmental, or medical advice. If elevated mold levels are detected, or if there are known health concerns, water damage, or visible mold growth, we strongly recommend a licensed mold assessment by a certified professional in accordance with your state's regulations. By purchasing and using this kit, the user acknowledges and agrees that Mold Testing Houston, LLC is not liable for decisions made based on this preliminary testing, and that the DIY kit is best used as an initial 'first-aid' tool to gain awareness and guide next steps.";
    const limitationsText = "This report is based on a Do-It-Yourself (DIY) mold surface testing kit and is subject to certain inherent limitations. Results reflect conditions only at the specific locations and times the samples were collected. Mold presence can vary with environmental changes and may not be uniform throughout the property. This testing method does not detect airborne mold spores, mold hidden within walls or inaccessible areas, or other indoor air quality concerns. Therefore, this report should be considered a preliminary screening tool, not a substitute for a licensed mold assessment or comprehensive indoor environmental inspection. If health concerns persist, or if visible mold, water damage, or elevated moisture is suspected, we strongly recommend consulting a licensed mold professional.";

    const css = `
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 0; background-color: #ffffff; color: #333; line-height: 1.6; }
        .page-break { page-break-after: always; }
        .cover-page { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 40px; }
        .cover-title { font-size: 48px; font-weight: bold; color: #004aac; margin-bottom: 20px; text-shadow: 1px 1px 2px rgba(0,0,0,0.1); }
        .cover-image { max-width: 450px; height: auto; border-radius: 15px; margin: 40px 0; box-shadow: 0 8px 25px rgba(0,0,0,0.15); border: 3px solid white; }
        .cover-details { background: rgba(255,255,255,0.9); padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 500px; }
        .cover-detail-item { margin: 15px 0; font-size: 18px; }
        .cover-detail-label { font-weight: bold; color: #004aac; }
        .report-container { max-width: 800px; margin: 0 auto; background-color: #fff; padding: 40px; }
        .section { margin-bottom: 35px; }
        .section h2 { font-size: 22px; color: #004aac; border-bottom: 2px solid #dee2e6; padding-bottom: 12px; margin-bottom: 20px; }
        .disclaimer-box { background: #f8f9fa; border: 2px solid #004aac; border-radius: 10px; padding: 25px; margin: 30px 0; }
        .disclaimer-title { color: #004aac; font-size: 20px; font-weight: bold; margin-bottom: 15px; text-align: center; }
        .disclaimer-text { font-size: 14px; line-height: 1.7; text-align: justify; }
        .limitations-section { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 25px; margin: 20px 0; }
        .limitations-title { color: #004aac; font-size: 20px; font-weight: bold; margin-bottom: 15px; text-align: center; }
        .limitations-text { font-size: 14px; line-height: 1.7; text-align: justify; }
        .client-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .client-info-item { padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .client-info-label { font-weight: bold; color: #004aac; font-size: 14px; }
        .client-info-value { margin-top: 5px; font-size: 16px; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #dee2e6; font-size: 14px; color: #6c757d; }
        img { max-width: 250px; height: auto; border-radius: 8px; border: 1px solid #ddd; margin: 8px; }
    `;

    const createImageList = (images) => {
        if (!images || images.length === 0) return '<p>No photos provided.</p>';
        return images.map(img => `<img src="${img}" alt="Evidence" style="width: 150px; height: 150px; object-fit: cover; margin: 5px; border-radius: 4px;" />`).join('');
    };

    const visibleMoldHtml = inspection.has_visible_mold && inspection.visible_mold_details && inspection.visible_mold_details.length > 0
      ? inspection.visible_mold_details.map((d, i) => `<h4>Location #${i + 1}: ${d.location || 'N/A'}</h4><div>${createImageList(d.images)}</div>`).join('')
      : '<p>No visible mold reported.</p>';

    const waterDamageHtml = inspection.has_water_damage && inspection.water_damage_details && inspection.water_damage_details.length > 0
      ? inspection.water_damage_details.map((d, i) => `<h4>Location #${i + 1}: ${d.location || 'N/A'}</h4><div>${createImageList(d.images)}</div>`).join('')
      : '<p>No recent water damage reported.</p>';
    
    let environmentalHtml = '';
    if (inspection.environmental_data_method === 'photo' && inspection.thermostat_image) {
        environmentalHtml = `<h4>Thermostat Photo:</h4><div><img src="${inspection.thermostat_image}" alt="Thermostat" /></div>`;
    } else if (inspection.environmental_data_method === 'manual') {
        environmentalHtml = `<p>Temperature: ${inspection.temperature || 'N/A'}°F</p><p>Humidity: ${inspection.humidity || 'N/A'}%</p>`;
    } else {
        environmentalHtml = '<p>Environmental data not provided.</p>';
    }
    if (inspection.humidity && parseFloat(inspection.humidity) > 60) {
        environmentalHtml += `<p style="color: red; font-weight: bold;">⚠️ HUMIDITY WARNING: The EPA recommends relative humidity levels at or below 60% to prevent mold growth inside buildings. Based on the temperature and humidity readings, the HVAC system appears to NOT be operating properly.</p>`;
    }
    
    const samplesHtml = samples && samples.length > 0
      ? samples.map((s, i) => `<h4>Sample #${i + 1}: ${s.location || 'N/A'}</h4><p>${s.description || ''}</p><div>${s.sample_image ? `<img src="${s.sample_image}" alt="Sample Photo" />` : ''}</div>`).join('')
      : '<p>No samples were documented for this inspection.</p>';
      
    const labAnalysisHtml = inspection.lab_analysis_image_url
        ? `<img src="${inspection.lab_analysis_image_url}" alt="Lab Analysis Results" style="max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 8px; margin: 10px 0;" />`
        : '<p>Lab analysis results have not been uploaded yet.</p>';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mold Inspection Report</title>
        <style>${css}</style>
    </head>
    <body>
        <div class="cover-page">
            <h1 class="cover-title">DIY Mold Inspection and Testing Report</h1>
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/0e72c4dcb_Untitleddesign5.png" alt="MTH Logo" class="cover-image" />
            <div class="cover-details">
                <div class="cover-detail-item"><span class="cover-detail-label">Report Number:</span> ${displayNum}</div>
                <div class="cover-detail-item"><span class="cover-detail-label">Inspection Date:</span> ${format(new Date(inspection.created_date), "MMMM d, yyyy")}</div>
                <div class="cover-detail-item"><span class="cover-detail-label">Property Address:</span> ${inspection.street_address}${inspection.unit_number ? ', ' + inspection.unit_number : ''}, ${inspection.city}, ${inspection.state} ${inspection.zip_code}</div>
            </div>
            <p style="margin-top: 50px; font-size: 16px; color: #555;">Mold Testing Houston, LLC</p>
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
                <h3>Visible Mold</h3>
                ${visibleMoldHtml}
                <h3>Water Damage</h3>
                ${waterDamageHtml}
                <h3>Environmental Conditions</h3>
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
                <p>${inspection.conclusion || 'Pending conclusion.'}</p>
            </div>

            <div class="section">
                <h2>Recommendations</h2>
                <p>${inspection.recommendations || 'Pending recommendations.'}</p>
            </div>
            
            <div class="limitations-section">
                <h3 class="limitations-title">Limitations of DIY Mold Testing</h3>
                <p class="limitations-text">${limitationsText}</p>
            </div>

            <div class="footer">
                <p>Mold Testing Houston, LLC</p>
                <p>Report generated on ${format(new Date(), "MMMM d, yyyy")}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  };

  const downloadPDF = async (inspection) => {
    console.log("🔍 DEBUG: downloadPDF called with inspection:", inspection);
    
    // This is now the "Download Report" button logic
    if (inspection.report_html_url) {
      setDownloadStatus({ type: 'info', message: `Preparing download...` });
      try {
        const displayNum = getDisplayNumber(inspection);
        const fileName = `Mold_Inspection_Report_${displayNum.replace(/[^a-zA-Z0-9]/g, '_')}_${(inspection.full_name || 'report').replace(/\s+/g, '_')}.html`;

        console.log("🔍 DEBUG: Fetching pre-generated report from:", inspection.report_html_url);
        const response = await fetch(inspection.report_html_url);
        if (!response.ok) throw new Error('Failed to fetch report file.');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setDownloadStatus({ type: 'success', message: 'Report downloaded.' });
        setTimeout(() => setDownloadStatus(null), 3000);
        return; // Important to stop execution here
      } catch (error) {
        console.error("Error downloading pre-generated report:", error);
        setDownloadStatus({ type: 'error', message: 'Download failed. Trying to generate a new report...' });
        // Fall through to generate a new one if download fails
      }
    }

    // Fallback for older reports without a pre-generated URL or if download failed
    setDownloadStatus({ type: 'info', message: `Generating report for ${getDisplayNumber(inspection)}...` });
    try {
      if (!inspection) {
        throw new Error("Could not find inspection details.");
      }
      
      console.log("🔍 DEBUG: Fetching samples for inspection ID:", inspection.id);
      const samples = await Sample.findMany({ inspection_id: inspection.id });
      console.log("🔍 DEBUG: Samples fetched:", samples);
      
      const displayNum = getDisplayNumber(inspection);
      console.log("🔍 DEBUG: Generating report HTML for:", displayNum);
      
      const reportHtml = await generateReportHtmlContent(inspection, samples);
      console.log("🔍 DEBUG: Report HTML generated successfully");
      
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
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        inspection: inspection,
        inspectionId: inspection?.id
      });
      setDownloadStatus({ type: 'error', message: `Failed to generate report: ${error.message}` });
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  };

  const sendLabReceivedEmail = async (inspection) => {
    const emailKey = `lab_${inspection.id}`;
    setEmailStatus(prev => ({ ...prev, [emailKey]: 'sending' }));
    
    try {
      const displayNum = getDisplayNumber(inspection);
      const firstName = inspection.full_name.split(' ')[0];
      
      const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; font-size: 16px; color: #000000;">
          <p>Hi ${firstName},</p>
          <p>Just a quick update, your mold test samples have been received by our lab and are now being processed.</p>
          <p>Our team is reviewing the findings and preparing your personalized report. You can expect to receive your full results and expert interpretation within 48–72 business hours.</p>
          <p>You can track the status of your report here: <a href="${window.location.origin}${createPageUrl("MyInspections")}" style="color: #1e40af; text-decoration: underline;">Track My Report</a></p>
          <p>We'll notify you the moment your report is ready.</p>
          <p>Thank you for trusting Mold Testing Houston with your health and home!</p>
          <br>
          <p>Warm regards,</p>
          <p><strong>Mold Testing Houston</strong></p>
        </div>
      `;

      await EmailService.sendLabReceived(inspection.id);
      
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
      console.error("Error sending lab received email:", error);
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
      const firstName = inspection.full_name.split(' ')[0];
      
      // Step 1: Generate and upload the report
      setDownloadStatus({ type: 'info', message: `Generating and storing report for ${displayNum}...` });
      const samples = await Sample.findMany({ inspection_id: inspection.id });
      const reportHtml = await generateReportHtmlContent(inspection, samples);
      const reportFile = new File([reportHtml], `report-${inspection.id}.html`, { type: 'text/html' });
      const { file_url: reportUrl } = await LLMService.uploadFile({ file: reportFile }); // Changed to LLMService.uploadFile
      setDownloadStatus({ type: 'success', message: 'Report stored successfully.' });
      setTimeout(() => setDownloadStatus(null), 3000);

      // Step 2: Construct the new email body
      const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; font-size: 16px; color: #000000;">
          <p>Hi ${firstName},</p>
          <p>Your lab results and mold inspection report are now ready to view in your secure portal.</p>
          <p>This report includes:</p>
          <ul style="padding-left: 20px; margin-top: 0; margin-bottom: 16px;">
            <li>Lab-verified analysis of your samples</li>
            <li>Mold types identified and spore levels</li>
            <li>Professional interpretation and next steps (if needed)</li>
          </ul>
          <p>🔗 <strong>View your report now by visiting your portal:</strong><br>
          👉 <a href="${window.location.origin}${createPageUrl("MyInspections")}" style="color: #1e40af; text-decoration: underline;">Access Your Report</a></p>
          <p>If you have any questions or need further guidance, feel free to reply, we're happy to help.</p>
          <p>Thanks again for choosing Mold Testing Houston!</p>
          <br>
          <p>Best,</p>
          <p><strong>Mold Testing Houston</strong></p>
        </div>
      `;

      // Step 3: Send the email notification
      await EmailService.sendReportReady(inspection.id);
      
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
      console.error("Error sending report ready email:", error);
      setEmailStatus(prev => ({ ...prev, [emailKey]: 'error' }));
      setDownloadStatus({ type: 'error', message: `Failed to prepare report: ${error.message}` });
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  };

  const sendReviewRequestEmail = async (inspection) => {
    const emailKey = `review_${inspection.id}`;
    setEmailStatus(prev => ({ ...prev, [emailKey]: 'sending' }));
    
    try {
      const displayNum = getDisplayNumber(inspection);
      const firstName = inspection.full_name.split(' ')[0];
      
      const emailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; font-size: 16px; color: #000000;">
          <p>Hi ${firstName},</p>
          <p>Thank you again for trusting Mold Testing Houston with your mold testing needs. We hope your experience was smooth, informative, and gave you peace of mind.</p>
          <p>If you found our service helpful, would you mind leaving us a quick Google review? It helps others find reliable help when they need it most, and we'd truly appreciate it!</p>
          <p>⭐️ <strong>Leave a review here:</strong><br>
          👉 <a href="https://g.page/r/CYI0lXIHJ-W-EBE/review" style="color: #1e40af; text-decoration: underline;">Leave Your Review</a></p>
          <p>Thanks again, and if you ever need further assistance or follow-up, we're just a message away.</p>
          <br>
          <p>All the best,</p>
          <p><strong>Mold Testing Houston</strong></p>
        </div>
      `;
      
      await EmailService.sendReviewRequest(inspection.id);
      
      setEmailStatus(prev => ({ ...prev, [emailKey]: 'sent' }));
      setTimeout(() => {
        setEmailStatus(prev => ({ ...prev, [emailKey]: null }));
      }, 3000);
      
    } catch (error) {
      console.error("Error sending review request email:", error);
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
      console.log(`🔍 DEBUG: Updating inspection ${inspectionId} status to ${newStatus}`);
      console.log(`🔍 DEBUG: Inspection ID type:`, typeof inspectionId);
      console.log(`🔍 DEBUG: New status type:`, typeof newStatus);
      
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
      
      console.log(`🔍 DEBUG: Using inspection ID:`, inspectionIdStr);
      console.log(`🔍 DEBUG: Using status:`, statusStr);
      
      const updatedInspection = await MoldInspection.update(inspectionIdStr, { 
        status: statusStr,
        updated_date: new Date().toISOString() // Add update timestamp
      });
      
      console.log("🔍 DEBUG: Status updated successfully:", updatedInspection);
      
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
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        inspectionId,
        newStatus
      });
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
              <ShieldCheck className="w-8 h-8 text-blue-600" />
              Admin Dashboard
            </h1>
            <p className="text-slate-600 mt-2">
              Manage all inspections and generate comprehensive reports
            </p>
          </div>
          <div className="flex gap-3">
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="inspections" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              All Inspections
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <File className="w-4 h-4" />
              Reports
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
                  <CardTitle className="text-sm font-medium">With Visible Mold</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.withMold}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.total > 0 ? `${((stats.withMold / stats.total) * 100).toFixed(1)}%` : '0%'} of total
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">With Water Damage</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.withWaterDamage}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.total > 0 ? `${((stats.withWaterDamage / stats.total) * 100).toFixed(1)}%` : '0%'} of total
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sample Requests</CardTitle>
                  <FlaskConical className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.samples}</div>
                  <p className="text-xs text-muted-foreground">Lab analysis requested</p>
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
                    onClick={() => setActiveTab("reports")} 
                    variant="outline" 
                    className="h-20 flex flex-col gap-2"
                  >
                    <File className="w-6 h-6" />
                    <span className="text-sm">Generate Reports</span>
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
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Property Type</label>
                    <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Property type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="house">House</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="condo">Condo</SelectItem>
                        <SelectItem value="office">Office</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Client Type</label>
                    <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Client type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="property_management">Property Management</SelectItem>
                        <SelectItem value="home_inspector">Home Inspector</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Visible Mold</label>
                    <Select value={moldFilter} onValueChange={setMoldFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Mold status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Water Damage</label>
                    <Select value={waterDamageFilter} onValueChange={setWaterDamageFilter}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Water damage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
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
                        <TableHead>Mold</TableHead>
                        <TableHead>Water Damage</TableHead>
                        <TableHead>Sample</TableHead>
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
                                        console.log("🔍 DEBUG: Status update clicked:", {
                                          inspectionId: inspection.id,
                                          inspectionIdType: typeof inspection.id,
                                          currentStatus: inspection.status,
                                          newStatus: status,
                                          inspection: inspection
                                        });
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
                            {inspection.has_visible_mold ? (
                              <Badge variant="destructive">Yes</Badge>
                            ) : (
                              <Badge variant="outline">No</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {inspection.has_water_damage ? (
                              <Badge variant="destructive">Yes</Badge>
                            ) : (
                              <Badge variant="outline">No</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {inspection.is_sample ? (
                              <Badge variant="default">Yes</Badge>
                            ) : (
                              <Badge variant="outline">No</Badge>
                            )}
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
                                    console.log("🔍 DEBUG: Opening InspectionDetails URL:", url);
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
                                      const samples = await Sample.findMany({ inspection_id: inspection.id });
                                      const reportHtml = await generateReportHtmlContent(inspection, samples);
                                      const newWindow = window.open('', '_blank');
                                      newWindow.document.write(reportHtml);
                                      newWindow.document.close();
                                    } catch (error) {
                                      console.error("Error generating report:", error);
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
                                
                                {/* Edit Action */}
                                <DropdownMenuItem 
                                  onClick={() => {
                                    const url = createPageUrl('InspectionDetails', { id: inspection.id, edit: true });
                                    console.log("🔍 DEBUG: Opening InspectionDetails Edit URL:", url);
                                    window.open(url, '_blank');
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit Inspection
                                </DropdownMenuItem>
                                
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

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <File className="w-5 h-5" />
                  Report Generation
                </CardTitle>
                <CardDescription>
                  Generate comprehensive reports for inspections and analytics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button onClick={exportToCSV} className="h-20 flex flex-col gap-2">
                    <FileText className="w-6 h-6" />
                    <span>Export All Data (CSV)</span>
                  </Button>
                  
                  <Button onClick={() => {}} className="h-20 flex flex-col gap-2">
                    <File className="w-6 h-6" />
                    <span>Generate Summary Report</span>
                  </Button>
                  
                  <Button onClick={() => {}} className="h-20 flex flex-col gap-2">
                    <BarChart3 className="w-6 h-6" />
                    <span>Analytics Report</span>
                  </Button>
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
