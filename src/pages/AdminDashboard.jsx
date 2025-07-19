
import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { MoldInspection } from "@/api/entities";
import { Sample } from "@/api/entities";
import { InvokeLLM, SendEmail, UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { Download, Eye, ShieldCheck, FileText, Trash2, Mail, Star, FlaskConical, Search } from "lucide-react";

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
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await User.me();
        if (currentUser.role !== 'admin') {
          navigate(createPageUrl("Welcome"));
        } else {
          setUser(currentUser);
          loadInspections();
        }
      } catch (error) {
        navigate(createPageUrl("Welcome"));
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, [navigate]);

  const loadInspections = async () => {
    try {
      // Reduced the number of inspections loaded to prevent rate limiting
      const allInspections = await MoldInspection.list('-created_date', 50);
      setInspections(allInspections);
      // Clear selection when reloading
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

  // Filter inspections based on search term and status filter
  const filteredInspections = inspections.filter(inspection => {
    const statusMatch = statusFilter === 'all' || inspection.status === statusFilter;

    const term = searchTerm.toLowerCase();
    // Add checks for potentially missing data to prevent crash
    const searchMatch = !term ||
      (getDisplayNumber(inspection) || '').toLowerCase().includes(term) ||
      (inspection.full_name || '').toLowerCase().includes(term) ||
      (inspection.street_address || '').toLowerCase().includes(term) ||
      (inspection.email || '').toLowerCase().includes(term) ||
      (inspection.client_status_detail || '').toLowerCase().includes(term);

    return statusMatch && searchMatch;
  });

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
    const newSelected = new Set(selectedInspections);
    if (checked) {
      newSelected.add(inspectionId);
    } else {
      newSelected.delete(inspectionId);
    }
    setSelectedInspections(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedInspections.size === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${selectedInspections.size} inspection(s)? This action cannot be undone.`;
    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      // Delete inspections one by one with a small delay to avoid rate limiting
      for (const id of selectedInspections) {
        await MoldInspection.delete(id);
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Reload the inspections list
      await loadInspections();
      
      alert(`Successfully deleted ${selectedInspections.size} inspection(s).`);
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
    // This is now the "Download Report" button logic
    if (inspection.report_html_url) {
      setDownloadStatus({ type: 'info', message: `Preparing download...` });
      try {
        const displayNum = getDisplayNumber(inspection);
        const fileName = `Mold_Inspection_Report_${displayNum.replace(/[^a-zA-Z0-9]/g, '_')}_${(inspection.full_name || 'report').replace(/\s+/g, '_')}.html`;

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
      
      const samples = await Sample.filter({ inspection_id: inspection.id });
      const displayNum = getDisplayNumber(inspection);
      
      const reportHtml = await generateReportHtmlContent(inspection, samples);
      
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
      console.error("Error generating report:", error);
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

      await SendEmail({
        to: inspection.email,
        subject: `Lab Sample Received - ${displayNum}`,
        from_name: "Mold Testing Houston",
        body: emailBody
      });
      
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
      const samples = await Sample.filter({ inspection_id: inspection.id });
      const reportHtml = await generateReportHtmlContent(inspection, samples);
      const reportFile = new File([reportHtml], `report-${inspection.id}.html`, { type: 'text/html' });
      const { file_url: reportUrl } = await UploadFile({ file: reportFile });
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
      await SendEmail({
        to: inspection.email,
        subject: `Your Mold Analysis Report is Ready - ${displayNum}`,
        from_name: "Mold Testing Houston",
        body: emailBody
      });
      
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
      
      await SendEmail({
        to: inspection.email,
        subject: "🙏 We'd Love Your Feedback",
        from_name: "Mold Testing Houston",
        body: emailBody
      });
      
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
    const status = emailStatus[emailKey];
    if (status === 'sending') return { text: 'Sending...', disabled: true, variant: 'secondary' };
    if (status === 'sent') return { text: 'Sent ✓', disabled: true, variant: 'default' };
    if (status === 'error') return { text: 'Failed', disabled: false, variant: 'destructive' };
    return { text: null, disabled: false, variant: 'outline' };
  };

  if (loading) {
    return <div className="text-center p-12">Loading Admin Portal...</div>;
  }
  
  if (!user) {
     return <div className="text-center p-12 text-red-600">Access Denied. You must be an administrator to view this page.</div>;
  }

  const allSelected = filteredInspections.length > 0 && selectedInspections.size === filteredInspections.length;
  const someSelected = selectedInspections.size > 0;

  return (
    <div className="max-w-7xl mx-auto py-12 px-6">
      {/* Success/Error/Info Notification */}
      {downloadStatus && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
          downloadStatus.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
          downloadStatus.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-blue-100 text-blue-800 border border-blue-200'
        }`}>
          {downloadStatus.message}
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        </div>
        <div className="flex gap-3">
          {someSelected && (
            <Button 
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "Deleting..." : `Delete Selected (${selectedInspections.size})`}
            </Button>
          )}
          <Button onClick={exportToCSV} className="bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4 mr-2" />
            Export to CSV
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">All Inspections ({filteredInspections.length} found)</h2>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by ID, name, email or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-52 h-11">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="report_ready">Report Ready</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    disabled={filteredInspections.length === 0}
                  />
                </TableHead>
                <TableHead>Inspection #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-80">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInspections.map((inspection, index) => {
                const displayNum = getDisplayNumber(inspection);
                const isSelected = selectedInspections.has(inspection.id);
                
                return (
                  <TableRow key={inspection.id} className={isSelected ? "bg-blue-50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectInspection(inspection.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {displayNum}
                    </TableCell>
                    <TableCell>{format(new Date(inspection.created_date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">{inspection.full_name}</TableCell>
                    <TableCell>{inspection.street_address}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        inspection.status === 'report_ready' || inspection.status === 'completed' ? 'bg-indigo-100 text-indigo-800' :
                        inspection.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {inspection.status.replace('_', ' ')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Link to={createPageUrl(`InspectionDetails?id=${inspection.id}`)}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadPDF(inspection)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Download Report
                        </Button>
                        
                        {/* Email Action Buttons */}
                        <Button 
                          variant={getEmailButtonStatus(`lab_${inspection.id}`).variant}
                          size="sm"
                          onClick={() => sendLabReceivedEmail(inspection)}
                          disabled={getEmailButtonStatus(`lab_${inspection.id}`).disabled}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                        >
                          <FlaskConical className="w-4 h-4 mr-1" />
                          {getEmailButtonStatus(`lab_${inspection.id}`).text || 'Lab Received'}
                        </Button>
                        
                        <Button 
                          variant={getEmailButtonStatus(`report_${inspection.id}`).variant}
                          size="sm"
                          onClick={() => sendReportReadyEmail(inspection)}
                          disabled={getEmailButtonStatus(`report_${inspection.id}`).disabled}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 border-purple-200"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          {getEmailButtonStatus(`report_${inspection.id}`).text || 'Report Ready'}
                        </Button>
                        
                        <Button 
                          variant={getEmailButtonStatus(`review_${inspection.id}`).variant}
                          size="sm"
                          onClick={() => sendReviewRequestEmail(inspection)}
                          disabled={getEmailButtonStatus(`review_${inspection.id}`).disabled}
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                        >
                          <Star className="w-4 h-4 mr-1" />
                          {getEmailButtonStatus(`review_${inspection.id}`).text || 'Request Review'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {filteredInspections.length === 0 && (
            <p className="text-center text-slate-500 py-8">No inspections match your search criteria.</p>
        )}
      </div>
    </div>
  );
}
