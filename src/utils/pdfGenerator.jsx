import { format } from 'date-fns';
import { MoldInspection, Sample } from '@/api/entities';

/**
 * Generates a PDF from HTML content using html2pdf.js
 * @param {Object} inspection - The inspection data
 * @param {Array} samples - The samples data
 * @param {Function} generateReportHtmlContent - Function to generate HTML content
 * @param {Function} getDisplayNumber - Function to get display number
 * @param {Function} setDownloadStatus - Function to update download status
 * @returns {Promise<void>}
 */
export const generatePDFReport = async (
  inspection,
  samples,
  generateReportHtmlContent,
  getDisplayNumber,
  setDownloadStatus
) => {
  setDownloadStatus({ type: 'info', message: 'Generating PDF report...' });
  
  try {
    // Fetch detailed inspection data first (like View Report does)
    let detailedInspection = inspection;
    try {
      const inspectionId = inspection.id || inspection.inspection_number;
      detailedInspection = await MoldInspection.getDetailed(inspectionId);
      console.log("🔍 DEBUG: Retrieved detailed inspection data for PDF:", detailedInspection);
    } catch (detailError) {
      console.error("🔍 DEBUG: Error fetching detailed inspection data for PDF:", detailError);
      // Continue with current data if detailed fetch fails
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
    
    // Generate the complete HTML report with detailed data
    const reportHtml = await generateReportHtmlContent(detailedInspection, detailedSamples);
    
    // Create a complete HTML document with embedded CSS
    const completeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Mold Inspection Report</title>
        <style>
          * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #ffffff; 
            color: #333; 
            line-height: 1.6; 
            font-size: 12px;
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
          }
          .page-break { page-break-after: always; }
          .cover-page { 
            min-height: 100vh; 
            display: flex; 
            flex-direction: column; 
            justify-content: center; 
            align-items: center; 
            text-align: center; 
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
            padding: 20px; 
          }
          .cover-title { 
            font-size: 28px; 
            font-weight: bold; 
            color: #004aac; 
            margin-bottom: 20px; 
          }
          .cover-image { 
            max-width: 100%; 
            height: auto; 
            border-radius: 15px; 
            margin: 20px 0; 
            box-shadow: 0 8px 25px rgba(0,0,0,0.15); 
            border: 3px solid white; 
          }
          .cover-details { 
            background: rgba(255,255,255,0.9); 
            padding: 20px; 
            border-radius: 15px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
            max-width: 100%; 
          }
          .cover-detail-item { 
            margin: 10px 0; 
            font-size: 16px; 
          }
          .cover-detail-label { 
            font-weight: bold; 
            color: #004aac; 
          }
          .report-container { 
            max-width: 100%; 
            margin: 0 auto; 
            background-color: #fff; 
            padding: 20px; 
          }
          .section { 
            margin-bottom: 25px; 
            page-break-inside: avoid;
          }
          .section h2 { 
            font-size: 20px; 
            color: #004aac; 
            border-bottom: 2px solid #dee2e6; 
            padding-bottom: 12px; 
            margin-bottom: 20px; 
          }
          .disclaimer-box { 
            background: #f8f9fa; 
            border: 2px solid #004aac; 
            border-radius: 10px; 
            padding: 20px; 
            margin: 20px 0; 
          }
          .disclaimer-title { 
            color: #004aac; 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 15px; 
            text-align: center; 
          }
          .disclaimer-text { 
            font-size: 14px; 
            line-height: 1.7; 
            text-align: justify; 
          }
          .limitations-section { 
            background: #f8f9fa; 
            border: 1px solid #dee2e6; 
            border-radius: 8px; 
            padding: 20px; 
            margin: 20px 0; 
          }
          .limitations-title { 
            color: #004aac; 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 15px; 
            text-align: center; 
          }
          .limitations-text { 
            font-size: 14px; 
            line-height: 1.7; 
            text-align: justify; 
          }
          .client-info-grid { 
            display: grid; 
            grid-template-columns: 1fr; 
            gap: 15px; 
            margin: 20px 0; 
          }
          .client-info-item { 
            padding: 10px; 
            background: #f8f9fa; 
            border-radius: 5px; 
          }
          .client-info-label { 
            font-weight: bold; 
            color: #004aac; 
            font-size: 14px; 
          }
          .client-info-value { 
            margin-top: 5px; 
            font-size: 16px; 
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 2px solid #dee2e6; 
            font-size: 14px; 
            color: #6c757d; 
          }
          img { 
            max-width: 100%; 
            height: auto; 
            border-radius: 8px; 
            border: 1px solid #ddd; 
            margin: 8px; 
          }
          @media print {
            body { font-size: 10px; }
            .cover-title { font-size: 24px; }
            .section h2 { font-size: 18px; }
          }
        </style>
      </head>
      <body>
        ${reportHtml}
      </body>
      </html>
    `;
    
    // Create a temporary container to render the HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = completeHtml;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '800px';
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.padding = '0';
    tempContainer.style.fontFamily = 'Arial, sans-serif';
    tempContainer.style.fontSize = '12px';
    tempContainer.style.lineHeight = '1.4';
    tempContainer.style.color = '#333';
    tempContainer.style.overflow = 'visible';
    document.body.appendChild(tempContainer);
    
    // Force a reflow to ensure styles are applied
    tempContainer.offsetHeight;
    
    // Wait for all images to load with a longer timeout
    const images = tempContainer.querySelectorAll('img');
    console.log("🔍 DEBUG: Found", images.length, "images to load");
    
    if (images.length > 0) {
      await Promise.all(Array.from(images).map(img => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.warn("⚠️ DEBUG: Image load timeout:", img.src);
            resolve();
          }, 10000); // 10 second timeout per image
          
          if (img.complete) {
            console.log("🔍 DEBUG: Image already loaded:", img.src);
            clearTimeout(timeout);
            resolve();
          } else {
            img.onload = () => {
              console.log("🔍 DEBUG: Image loaded successfully:", img.src);
              clearTimeout(timeout);
              resolve();
            };
            img.onerror = () => {
              console.warn("⚠️ DEBUG: Image failed to load:", img.src);
              clearTimeout(timeout);
              resolve(); // Continue even if image fails
            };
          }
        });
      }));
    }
    
    // Wait longer for the DOM to settle and CSS to be applied
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Force another reflow after waiting
    tempContainer.offsetHeight;
    
    // Debug: Log the container content and check if content is visible
    console.log("🔍 DEBUG: Temp container content length:", tempContainer.innerHTML.length);
    console.log("🔍 DEBUG: Temp container dimensions:", {
      width: tempContainer.offsetWidth,
      height: tempContainer.scrollHeight,
      hasContent: tempContainer.textContent.trim().length > 0
    });
    
    // Check if content is actually visible
    const hasVisibleContent = tempContainer.textContent.trim().length > 0;
    if (!hasVisibleContent) {
      throw new Error("No content detected in the report. Please check the report generation.");
    }
    
    // Import html2pdf.js
    const html2pdf = (await import('html2pdf.js')).default;
    
    // Configure html2pdf options for optimal PDF generation
    const options = {
      margin: [10, 10, 10, 10], // [top, right, bottom, left] margins in mm
      filename: `Mold_Inspection_Report_${displayNum.replace(/[^a-zA-Z0-9]/g, '_')}_${(inspection.full_name || 'report').replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 }, // High quality images
      html2canvas: {
        scale: 1.2, // Further reduced scale to prevent oversized content
        useCORS: true, // Handle CORS for external images
        allowTaint: true, // Allow tainted canvas
        backgroundColor: '#ffffff',
        width: tempContainer.offsetWidth,
        height: tempContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: tempContainer.offsetWidth,
        windowHeight: tempContainer.scrollHeight,
        logging: true, // Enable logging for debugging
        imageTimeout: 30000, // 30 second timeout for images
        removeContainer: false, // Don't auto-remove so we can debug
        foreignObjectRendering: false, // Disable for better compatibility
        ignoreElements: (element) => {
          // Ignore elements that might cause issues
          return element.style.display === 'none' || 
                 element.style.visibility === 'hidden' ||
                 element.classList.contains('hidden');
        },
        onclone: (clonedDoc) => {
          // Ensure all styles are applied in the cloned document
          const clonedContainer = clonedDoc.body.firstChild;
          if (clonedContainer) {
            clonedContainer.style.width = '800px';
            clonedContainer.style.backgroundColor = 'white';
            clonedContainer.style.padding = '0';
            clonedContainer.style.fontFamily = 'Arial, sans-serif';
            clonedContainer.style.fontSize = '12px';
            clonedContainer.style.lineHeight = '1.4';
            clonedContainer.style.color = '#333';
            clonedContainer.style.overflow = 'visible';
          }
        }
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true,
        precision: 16
      },
      pagebreak: {
        mode: ['css'], // Simplified page break handling
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: '.avoid-break'
      }
    };
    
    console.log("🔍 DEBUG: Starting html2pdf generation with options:", options);
    
    // Generate PDF using html2pdf
    await html2pdf()
      .from(tempContainer)
      .set(options)
      .save();
    
    // Remove the temporary container
    if (document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
    
    console.log("✅ PDF generated successfully using html2pdf.js");
    setDownloadStatus({ type: 'success', message: `PDF Report ${displayNum} downloaded successfully!` });
    setTimeout(() => setDownloadStatus(null), 3000);
    
  } catch (error) {
    console.error("❌ Error generating PDF report:", error);
    
    // Try fallback to HTML download if PDF generation fails
    try {
      console.log("🔄 Attempting HTML fallback...");
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
      
      setDownloadStatus({ type: 'warning', message: `HTML Report ${displayNum} downloaded (PDF generation failed)` });
      setTimeout(() => setDownloadStatus(null), 5000);
    } catch (fallbackError) {
      console.error("❌ Error in fallback HTML generation:", fallbackError);
      setDownloadStatus({ type: 'error', message: `Failed to generate report: ${error.message}` });
      setTimeout(() => setDownloadStatus(null), 5000);
    }
  }
};

/**
 * Generates a simple HTML report as fallback
 * @param {Object} inspection - The inspection data
 * @param {Array} samples - The samples data
 * @param {Function} generateReportHtmlContent - Function to generate HTML content
 * @param {Function} getDisplayNumber - Function to get display number
 * @param {Function} setDownloadStatus - Function to update download status
 * @returns {Promise<void>}
 */
export const generateHTMLReport = async (
  inspection,
  samples,
  generateReportHtmlContent,
  getDisplayNumber,
  setDownloadStatus
) => {
  try {
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
    
    setDownloadStatus({ type: 'success', message: `HTML Report ${displayNum} downloaded successfully!` });
    setTimeout(() => setDownloadStatus(null), 3000);
  } catch (error) {
    console.error("❌ Error generating HTML report:", error);
    setDownloadStatus({ type: 'error', message: `Failed to generate HTML report: ${error.message}` });
    setTimeout(() => setDownloadStatus(null), 5000);
  }
}; 