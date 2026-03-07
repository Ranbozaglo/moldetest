import { format } from 'date-fns';
import { MoldInspection, Sample, AsbestosInspection } from '@/api/entities';
import { uploadToSupabaseStorage } from '@/lib/supabase';
import html2pdf from 'html2pdf.js';

/**
 * Simple HTML to PDF download using browser's print functionality
 * @param {Object} inspection - The inspection data
 * @param {Array} samples - The samples data
 * @param {Function} generateReportHtmlContent - Function to generate HTML content
 * @param {Function} getDisplayNumber - Function to get display number
 * @param {Function} setStatus - Function to update status
 * @returns {Promise<void>}
 */
export const downloadPDF = async (
  inspection,
  samples,
  generateReportHtmlContent,
  getDisplayNumber,
  setStatus
) => {
  setStatus({ type: 'info', message: 'Preparing PDF download...' });
  
  try {
    // Fetch detailed inspection data
    let detailedInspection = inspection;
    try {
      const inspectionId = inspection.id || inspection.inspection_number;
      if (inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos') {
        detailedInspection = await AsbestosInspection.getDetailed(inspectionId);
        console.log("🔍 DEBUG: Retrieved detailed asbestos inspection data for PDF:", detailedInspection);
      } else {
        detailedInspection = await MoldInspection.getDetailed(inspectionId);
        console.log("🔍 DEBUG: Retrieved detailed mold inspection data for PDF:", detailedInspection);
      }
    } catch (detailError) {
      console.error("🔍 DEBUG: Error fetching detailed inspection data for PDF:", detailError);
    }
    
    // Fetch samples for this inspection
    let detailedSamples = samples;
    if (!samples || samples.length === 0) {
      try {
        const inspectionId = inspection.id || inspection.inspection_number;
        detailedSamples = await Sample.findMany({ inspection_id: inspectionId });
        console.log("🔍 DEBUG: Retrieved samples for PDF:", detailedSamples);
      } catch (samplesError) {
        console.error("🔍 DEBUG: Error fetching samples for PDF:", samplesError);
        detailedSamples = [];
      }
    }
    
    const displayNum = getDisplayNumber(inspection);
    
    // Generate the HTML report content
    const reportHtml = await generateReportHtmlContent(detailedInspection, detailedSamples);
    
    console.log("🔍 DEBUG: Generated HTML length:", reportHtml.length);
    
    // Create PDF blob and upload to appropriate bucket
    try {
      const pdfBlob = await html2pdf().from(reportHtml).output('blob');
      // Create a clean filename from inspection details
      const cleanName = (inspection.full_name || 'report').replace(/[^a-zA-Z0-9]/g, '_');
      const reportType = (inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos') ? 'Asbestos' : 'Mold';
      const file = new File([pdfBlob], `${reportType}_Report_${displayNum}_${cleanName}.pdf`, { type: 'application/pdf' });
      
      // Select the correct bucket based on inspection type
      const bucketName = (inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos') ? 'asbestosReport' : 'moldReport';
      console.log(`🔍 DEBUG: Uploading report to ${bucketName} bucket`);
      
      // Prepare metadata for the upload
      const metadata = {
        reportType: (inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos') ? 'asbestos' : 'mold',
        inspectionId: inspection.id || inspection.inspection_number,
        inspectionNumber: displayNum,
        clientName: inspection.full_name || 'Unknown',
        clientEmail: inspection.email || 'Not provided',
        propertyAddress: [
          inspection.street_address,
          inspection.unit_number,
          inspection.city,
          inspection.state,
          inspection.zip_code
        ].filter(Boolean).join(', '),
        propertyType: inspection.property_type || 'Not specified',
        yearBuilt: inspection.year_built || 'Not specified',
        squareFootage: inspection.square_footage || 'Not specified',
        createdAt: inspection.created_at || new Date().toISOString(),
        updatedAt: inspection.updated_date || new Date().toISOString(),
        status: inspection.status || 'completed',
        generatedDate: new Date().toISOString()
      };

      // For asbestos reports, add asbestos-specific metadata
      if (metadata.reportType === 'asbestos') {
        Object.assign(metadata, {
          materialType: inspection.material_type || 'Not specified',
          materialCondition: inspection.material_condition || 'Not specified',
          locationDescription: inspection.location_description || 'Not specified',
          riskLevel: inspection.risk_level || 'Not specified'
        });
      }

      console.log('🔍 DEBUG: Uploading report with metadata:', metadata);
      const inspectionId = inspection.id || inspection.inspection_number;
      const uploadResult = await uploadToSupabaseStorage(file, bucketName, '', inspectionId);
      console.log(`✅ Report uploaded to ${bucketName} bucket:`, uploadResult);

      // Update the inspection record with the report file URL
      try {
        const updateData = { reportfile: uploadResult.url };
        if (inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos') {
          await AsbestosInspection.update(inspectionId, updateData);
          console.log('✅ Updated asbestos inspection record with report URL:', uploadResult.url);
        } else {
          await MoldInspection.update(inspectionId, updateData);
          console.log('✅ Updated mold inspection record with report URL:', uploadResult.url);
        }
      } catch (updateError) {
        console.error('❌ Failed to update inspection record with report URL:', updateError);
        // Don't throw - we still want to show the PDF even if DB update fails
      }
    } catch (uploadError) {
      console.error('⚠️ Upload warning:', uploadError);
      // Continue with PDF display even if upload fails
    }

    // Create a complete HTML document with print-friendly CSS
    const completeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="robots" content="noindex">
        <title></title>
        <style>
          @media print {
            @page {
              margin: 0.3in 1in 0.3in 1in;
              size: A4;
            }
            
            /* Aggressive approach to hide browser headers/footers */
            @page :first {
              margin-top: 0.3in;
            }
            
            @page :left {
              margin-left: 1in;
            }
            
            @page :right {
              margin-right: 1in;
            }
            
            /* Hide browser default headers and footers */
            body {
              margin: 0 !important;
              padding: 20px !important;
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
            }
            
            /* Additional CSS to prevent browser-generated content */
            html {
              background: white !important;
            }
          }
          
          * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
          }
          
          body { 
            font-family: 'Arial', sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #ffffff; 
            color: #2c3e50; 
            line-height: 1.6; 
            font-size: 12px;
            max-width: 800px;
            margin: 0 auto;
          }
          
          @media print {
            body { 
              font-size: 10px; 
              line-height: 1.5;
              margin: 0;
              padding: 0;
            }
          }
          
          .page-break { 
            page-break-after: always; 
          }
          
          .cover-page { 
            min-height: 100vh; 
            display: flex; 
            flex-direction: column; 
            justify-content: flex-start; 
            align-items: center; 
            text-align: center; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            padding: 50px 20px; 
            position: relative;
            color: white;
          }
          
          .cover-title { 
            font-size: 32px; 
            font-weight: 700; 
            margin-top: 20px;
            margin-bottom: 30px; 
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          
          .cover-subtitle {
            font-size: 16px;
            margin-bottom: 40px;
            font-weight: 300;
            opacity: 0.9;
          }
          
          .cover-details { 
            background: rgba(255,255,255,0.95); 
            padding: 35px; 
            border-radius: 20px; 
            box-shadow: 0 12px 35px rgba(0,0,0,0.2); 
            max-width: 85%; 
            width: 100%;
            color: #2c3e50;
          }
          
          .cover-detail-item { 
            margin: 15px 0; 
            font-size: 14px; 
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid rgba(0,0,0,0.1);
          }
          
          .cover-detail-item:last-child {
            border-bottom: none;
          }
          
          .cover-detail-label { 
            font-weight: 600; 
            color: #34495e; 
            font-size: 13px;
          }
          
          .cover-detail-value {
            font-weight: 400;
            color: #2c3e50;
            text-align: right;
            max-width: 60%;
          }
          
          .section { 
            margin-bottom: 30px; 
            page-break-inside: avoid;
          }
          
          .section h2 { 
            font-size: 20px; 
            color: #2c3e50; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
            font-weight: 600;
          }
          
          .section h3 {
            font-size: 16px;
            color: #34495e;
            margin: 15px 0 10px 0;
            font-weight: 600;
          }
          
          .section h4 {
            font-size: 14px;
            color: #2c3e50;
            margin: 12px 0 8px 0;
            font-weight: 600;
          }
          
          .disclaimer-box { 
            background: #f8f9fa; 
            border: 2px solid #3498db; 
            border-radius: 10px; 
            padding: 20px; 
            margin: 20px 0; 
          }
          
          .disclaimer-title { 
            color: #2c3e50; 
            font-size: 18px; 
            font-weight: 700; 
            margin-bottom: 15px; 
            text-align: center; 
          }
          
          .disclaimer-text { 
            font-size: 12px; 
            line-height: 1.6; 
            text-align: justify; 
            color: #34495e;
          }
          
          .limitations-section { 
            background: #fff5f5; 
            border: 2px solid #e53e3e; 
            border-radius: 10px; 
            padding: 20px; 
            margin: 20px 0; 
          }
          
          .limitations-title { 
            color: #c53030; 
            font-size: 18px; 
            font-weight: 700; 
            margin-bottom: 15px; 
            text-align: center; 
          }
          
          .limitations-text { 
            font-size: 12px; 
            line-height: 1.6; 
            text-align: justify; 
            color: #2d3748;
          }
          
          .client-info-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 15px; 
            margin: 20px 0; 
          }
          
          .client-info-item { 
            padding: 15px; 
            background: #f7fafc; 
            border-radius: 8px; 
            border: 1px solid #e2e8f0;
          }
          
          .client-info-label { 
            font-weight: 700; 
            color: #2c3e50; 
            font-size: 11px; 
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          
          .client-info-value { 
            margin-top: 5px; 
            font-size: 13px; 
            color: #34495e;
            font-weight: 500;
          }
          
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #3498db; 
            font-size: 11px; 
            color: #7f8c8d; 
            font-weight: 500;
          }
          
          img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            margin: 10px 0;
          }

          .lab-analysis-section img {
            max-width: 100%;
            max-height: none;
            border: 2px solid #ddd;
            border-radius: 12px;
            margin: 0;
          }

          .lab-analysis-page {
            max-width: 800px;
            padding: 20px 40px;
            margin: 0 auto;
          }
          
          p {
            margin: 10px 0;
            line-height: 1.5;
            color: #2c3e50;
          }
          
          .highlight-box {
            background: #e8f5e8;
            border: 2px solid #28a745;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
          }
          
          .warning-box {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
          }
          
          .danger-box {
            background: #f8d7da;
            border: 2px solid #dc3545;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
          }
          
          .info-box {
            background: #d1ecf1;
            border: 2px solid #17a2b8;
            border-radius: 8px;
            padding: 15px;
            margin: 15px 0;
          }
          
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            margin: 3px;
          }
          
          .badge-success {
            background: #28a745;
            color: white;
          }
          
          .badge-warning {
            background: #ffc107;
            color: #212529;
          }
          
          .badge-danger {
            background: #dc3545;
            color: white;
          }
          
          .badge-info {
            background: #17a2b8;
            color: white;
          }
          
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            border-radius: 6px;
            overflow: hidden;
            font-size: 11px;
          }
          
          .table th {
            background: #34495e;
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: 600;
            font-size: 10px;
            text-transform: uppercase;
          }
          
          .table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 10px;
            color: #2c3e50;
          }
          
          .table tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          
          @media print {
            .client-info-grid {
              grid-template-columns: 1fr;
            }
            .cover-page {
              min-height: 100vh;
            }
            .section h2 { 
              font-size: 16px; 
            }
            .section h3 {
              font-size: 14px;
            }
            .section h4 {
              font-size: 12px;
            }
          }
        </style>
      </head>
      <body>
        ${reportHtml}
      </body>
      </html>
    `;
    
    console.log("🔍 DEBUG: Complete HTML length:", completeHtml.length);
    
    // Try to open a new window for printing
    let printWindow;
    try {
      console.log("🔍 DEBUG: Attempting to open print window...");
      
      // First, try to open the window with a specific URL to avoid popup blockers
      printWindow = window.open(dataUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      console.log("🔍 DEBUG: Print window result:", printWindow);
      
      if (!printWindow) {
        throw new Error("Popup blocked by browser. Please allow popups for this site.");
      }
      
      console.log("🔍 DEBUG: Data URL window opened, setting up print...");
      
      // Wait for content to load and then print
      printWindow.onload = () => {
        console.log("🔍 DEBUG: Print window loaded, triggering print");
        try {
          // Add a small delay to ensure content is fully rendered
          setTimeout(() => {
            printWindow.print();
            // Don't close immediately - let user interact with print dialog
            setTimeout(() => {
              if (printWindow && !printWindow.closed) {
                printWindow.close();
              }
            }, 1000);
          }, 500);
          
          setStatus({ type: 'success', message: `PDF download initiated for ${displayNum}. Check your print dialog.` });
          setTimeout(() => setStatus(null), 5000);
        } catch (printError) {
          console.error("❌ Error during print:", printError);
          setStatus({ type: 'error', message: `Print failed: ${printError.message}. Please try printing manually from the opened window.` });
          setTimeout(() => setStatus(null), 5000);
        }
      };
      
      // Fallback: if onload doesn't fire, try printing after a delay
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          console.log("🔍 DEBUG: Fallback print attempt");
          try {
            // Add a small delay to ensure content is fully rendered
            setTimeout(() => {
              printWindow.print();
              // Don't close immediately - let user interact with print dialog
              setTimeout(() => {
                if (printWindow && !printWindow.closed) {
                  printWindow.close();
                }
              }, 1000);
            }, 500);
            
            setStatus({ type: 'success', message: `PDF download initiated for ${displayNum}. Check your print dialog.` });
            setTimeout(() => setStatus(null), 5000);
          } catch (printError) {
            console.error("❌ Error during fallback print:", printError);
            setStatus({ type: 'error', message: `Print failed: ${printError.message}. Please try printing manually from the opened window.` });
            setTimeout(() => setStatus(null), 5000);
          }
        } else {
          console.log("🔍 DEBUG: Print window was closed or null during fallback");
        }
      }, 2000);
      
    } catch (windowError) {
      console.error("❌ Error opening print window:", windowError);
      
      // Alternative approach: create a temporary iframe
      try {
        console.log("🔍 DEBUG: Trying iframe approach...");
        
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.top = '-9999px';
        iframe.style.width = '800px';
        iframe.style.height = '600px';
        document.body.appendChild(iframe);
        
        console.log("🔍 DEBUG: Iframe created, writing content...");
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(completeHtml);
        iframeDoc.close();
        
        console.log("🔍 DEBUG: Content written to iframe, waiting for load...");
        
        // Wait a bit for content to load
        setTimeout(() => {
          try {
            console.log("🔍 DEBUG: Attempting iframe print...");
            iframe.contentWindow.print();
            // Don't remove iframe immediately - let print dialog work
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 2000);
            
            setStatus({ type: 'success', message: `PDF download initiated for ${displayNum}. Check your print dialog.` });
            setTimeout(() => setStatus(null), 5000);
          } catch (iframePrintError) {
            console.error("❌ Error during iframe print:", iframePrintError);
            document.body.removeChild(iframe);
            setStatus({ type: 'error', message: `Print failed: ${iframePrintError.message}. Please try the HTML download option instead.` });
            setTimeout(() => setStatus(null), 5000);
          }
        }, 1000);
        
      } catch (iframeError) {
        console.error("❌ Error with iframe approach:", iframeError);
        setStatus({ type: 'error', message: `Failed to open print window: ${windowError.message}. Please try the HTML download option instead.` });
        setTimeout(() => setStatus(null), 5000);
      }
    }
    
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    setStatus({ type: 'error', message: `Failed to generate PDF: ${error.message}` });
    setTimeout(() => setStatus(null), 5000);
  }
};

/**
 * Alternative method: Download as HTML file
 * @param {Object} inspection - The inspection data
 * @param {Array} samples - The samples data
 * @param {Function} generateReportHtmlContent - Function to generate HTML content
 * @param {Function} getDisplayNumber - Function to get display number
 * @param {Function} setStatus - Function to update status
 * @returns {Promise<void>}
 */
export const downloadHTML = async (
  inspection,
  samples,
  generateReportHtmlContent,
  getDisplayNumber,
  setStatus
) => {
  setStatus({ type: 'info', message: 'Preparing HTML download...' });
  
  try {
    // Fetch detailed inspection data
    let detailedInspection = inspection;
    try {
      const inspectionId = inspection.id || inspection.inspection_number;
      if (inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos') {
        detailedInspection = await AsbestosInspection.getDetailed(inspectionId);
        console.log("🔍 DEBUG: Retrieved detailed asbestos inspection data for HTML:", detailedInspection);
      } else {
        detailedInspection = await MoldInspection.getDetailed(inspectionId);
        console.log("🔍 DEBUG: Retrieved detailed mold inspection data for HTML:", detailedInspection);
      }
    } catch (detailError) {
      console.error("🔍 DEBUG: Error fetching detailed inspection data:", detailError);
    }
    
    // Fetch samples for this inspection
    let detailedSamples = samples;
    if (!samples || samples.length === 0) {
      try {
        const inspectionId = inspection.id || inspection.inspection_number;
        detailedSamples = await Sample.findMany({ inspection_id: inspectionId });
      } catch (samplesError) {
        console.error("🔍 DEBUG: Error fetching samples:", samplesError);
        detailedSamples = [];
      }
    }
    
    const displayNum = getDisplayNumber(inspection);
    
    // Generate the HTML report content
    const reportHtml = await generateReportHtmlContent(detailedInspection, detailedSamples);
    
    // Create and download HTML file
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const reportType = (inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos') ? 'Asbestos_Assessment' : 'Mold_Inspection';
    link.download = `${reportType}_Report_${displayNum.replace(/[^a-zA-Z0-9]/g, '_')}_${(inspection.full_name || 'report').replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    setStatus({ type: 'success', message: `HTML report downloaded for ${displayNum}` });
    setTimeout(() => setStatus(null), 3000);
    
  } catch (error) {
    console.error("❌ Error generating HTML:", error);
    setStatus({ type: 'error', message: `Failed to generate HTML: ${error.message}` });
    setTimeout(() => setStatus(null), 5000);
  }
};
