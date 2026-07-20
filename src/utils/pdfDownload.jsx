import { MoldInspection, Sample, AsbestosInspection } from '@/api/entities';
import { uploadToSupabaseStorage } from '@/lib/supabase';
import { getLabAnalysisPdfUrls } from '@/lib/labAnalysis.jsx';
import html2pdf from 'html2pdf.js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const waitForImages = (root, timeoutMs = 15000) => {
  const images = Array.from(root.querySelectorAll('img'));
  if (images.length === 0) return Promise.resolve();

  return Promise.race([
    Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          })
      )
    ),
    new Promise((resolve) => setTimeout(resolve, timeoutMs))
  ]);
};

const wrapText = (text, font, fontSize, maxWidth) => {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(next, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
};

/** Build a clean single-page PDF (Letter) with a title + body text. */
const createSimpleTextPdf = async ({ title, paragraphs }) => {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const marginX = 54;
  const maxWidth = 612 - marginX * 2;
  let y = 720;

  page.drawText(title, {
    x: marginX,
    y,
    size: 20,
    font: fontBold,
    color: rgb(0 / 255, 74 / 255, 172 / 255)
  });
  y -= 36;

  for (const paragraph of paragraphs) {
    const lines = wrapText(paragraph, font, 12, maxWidth);
    for (const line of lines) {
      if (y < 54) break;
      page.drawText(line, {
        x: marginX,
        y,
        size: 12,
        font,
        color: rgb(0.2, 0.2, 0.2)
      });
      y -= 18;
    }
    y -= 12;
  }

  return doc;
};

const appendPdfDoc = async (target, sourceDoc) => {
  const pages = await target.copyPages(sourceDoc, sourceDoc.getPageIndices());
  pages.forEach((page) => target.addPage(page));
};

/**
 * Generate and download an inspection report PDF.
 * Order: report body → lab intro page → lab analysis PDF pages → limitations
 */
export const downloadPDF = async (
  inspection,
  samples,
  generateReportHtmlContent,
  getDisplayNumber,
  setStatus
) => {
  setStatus({ type: 'info', message: 'Preparing PDF download...' });

  let host = null;

  try {
    let detailedInspection = inspection;
    try {
      const inspectionId = inspection.id || inspection.inspection_number;
      if (inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos') {
        detailedInspection = await AsbestosInspection.getDetailed(inspectionId);
      } else {
        detailedInspection = await MoldInspection.getDetailed(inspectionId);
      }
    } catch (detailError) {
      console.error('Error fetching detailed inspection data for PDF:', detailError);
    }

    let detailedSamples = samples;
    if (!samples || samples.length === 0) {
      try {
        const inspectionId = inspection.id || inspection.inspection_number;
        detailedSamples = await Sample.findMany({ inspection_id: inspectionId });
      } catch (samplesError) {
        console.error('Error fetching samples for PDF:', samplesError);
        detailedSamples = [];
      }
    }

    const displayNum = getDisplayNumber(inspection);
    const reportHtml = await generateReportHtmlContent(detailedInspection, detailedSamples);

    if (!reportHtml || reportHtml.trim().length < 50) {
      throw new Error('Report HTML was empty — cannot generate PDF');
    }

    const cleanName = (inspection.full_name || 'report').replace(/[^a-zA-Z0-9]/g, '_');
    const reportType =
      inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos'
        ? 'Asbestos'
        : 'Mold';
    const fileName = `${reportType}_Report_${String(displayNum).replace(/[^a-zA-Z0-9]/g, '_')}_${cleanName}.pdf`;

    const parser = new DOMParser();
    const doc = parser.parseFromString(reportHtml, 'text/html');
    const styleText = [...doc.querySelectorAll('style')].map((s) => s.textContent || '').join('\n');
    const bodyHtml = doc.body?.innerHTML || reportHtml;

    // Grab limitations text before we strip DOM nodes
    const limitationsTitle =
      doc.querySelector('.limitations-title')?.textContent?.trim() ||
      'Limitations of DIY Mold Testing';
    const limitationsBody =
      doc.querySelector('.limitations-text')?.textContent?.trim() ||
      'This report is based on a Do-It-Yourself (DIY) mold surface testing kit and is subject to certain inherent limitations.';

    host = document.createElement('div');
    host.id = 'pdf-download-host';
    host.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      'width:794px',
      'background:#ffffff',
      'color:#333333',
      'z-index:2147483646',
      'overflow:visible',
      'pointer-events:none'
    ].join(';');

    const shield = document.createElement('div');
    shield.id = 'pdf-download-shield';
    shield.style.cssText = [
      'position:fixed',
      'inset:0',
      'background:rgba(255,255,255,0.92)',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'font:600 16px Arial,sans-serif',
      'color:#004aac'
    ].join(';');
    shield.textContent = 'Generating PDF…';
    document.body.appendChild(shield);

    const content = document.createElement('div');
    content.id = 'pdf-download-content';
    content.innerHTML = `<style>
      #pdf-download-content, #pdf-download-content * { box-sizing: border-box; }
      #pdf-download-content .cover-page { min-height: auto !important; height: auto !important; }
      #pdf-download-content .page-break { display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important; page-break-after: auto !important; break-after: auto !important; }
      ${styleText}
    </style>${bodyHtml}`;

    host.appendChild(content);
    document.body.appendChild(host);

    // Remove everything that should be assembled separately (prevents blank pages)
    content
      .querySelectorAll(
        '.limitations-section, .lab-analysis-intro, .lab-pdf-page, .lab-analysis-page, .lab-analysis-section, .page-break'
      )
      .forEach((el) => el.remove());

    const html2pdfOptions = {
      margin: [8, 8, 8, 8],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    void host.offsetHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await waitForImages(content);
    await new Promise((r) => setTimeout(r, 250));

    if (!content.innerText?.trim()) {
      throw new Error('Report body had no text content to render');
    }

    const reportBlob = await html2pdf()
      .set(html2pdfOptions)
      .from(content)
      .outputPdf('blob');

    if (!reportBlob || reportBlob.size < 1000) {
      throw new Error('Generated PDF looks empty. Try Download HTML, then Print → Save as PDF.');
    }

    setStatus({ type: 'info', message: 'Assembling report pages…' });

    const merged = await PDFDocument.create();
    const reportDoc = await PDFDocument.load(await reportBlob.arrayBuffer());
    await appendPdfDoc(merged, reportDoc);

    const labPdfUrls = getLabAnalysisPdfUrls(detailedInspection.lab_analysis_images);

    // Intro page immediately before lab analysis (only when lab PDF exists)
    if (labPdfUrls.length > 0) {
      const introDoc = await createSimpleTextPdf({
        title: 'Laboratory Analysis Results',
        paragraphs: [
          'The following pages contain the official laboratory analysis report for this inspection.'
        ]
      });
      await appendPdfDoc(merged, introDoc);

      for (const url of labPdfUrls) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.warn('Could not fetch lab PDF:', url, response.status);
            continue;
          }
          const labBytes = await response.arrayBuffer();
          const labDoc = await PDFDocument.load(labBytes);
          await appendPdfDoc(merged, labDoc);
        } catch (labErr) {
          console.warn('Skipping lab PDF due to error:', url, labErr);
        }
      }
    }

    // Limitations always last
    const limitationsDoc = await createSimpleTextPdf({
      title: limitationsTitle,
      paragraphs: [limitationsBody]
    });
    await appendPdfDoc(merged, limitationsDoc);

    const mergedBytes = await merged.save();
    const pdfBlob = new Blob([mergedBytes], { type: 'application/pdf' });

    const downloadUrl = window.URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

    setStatus({ type: 'success', message: `PDF downloaded for ${displayNum}` });
    setTimeout(() => setStatus(null), 4000);

    try {
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const bucketName =
        inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos'
          ? 'asbestosReport'
          : 'moldReport';
      const inspectionId = inspection.id || inspection.inspection_number;
      const uploadResult = await uploadToSupabaseStorage(file, bucketName, '', inspectionId);

      try {
        const updateData = { reportfile: uploadResult.url };
        if (inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos') {
          await AsbestosInspection.update(inspectionId, updateData);
        } else {
          await MoldInspection.update(inspectionId, updateData);
        }
      } catch (updateError) {
        console.error('Failed to update inspection record with report URL:', updateError);
      }
    } catch (uploadError) {
      console.error('Upload warning (download still succeeded):', uploadError);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    setStatus({ type: 'error', message: `Failed to generate PDF: ${error.message}` });
    setTimeout(() => setStatus(null), 6000);
  } finally {
    const shield = document.getElementById('pdf-download-shield');
    if (shield && shield.parentNode) shield.parentNode.removeChild(shield);
    if (host && host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
};

/**
 * Alternative method: Download as HTML file
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
    let detailedInspection = inspection;
    try {
      const inspectionId = inspection.id || inspection.inspection_number;
      if (inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos') {
        detailedInspection = await AsbestosInspection.getDetailed(inspectionId);
      } else {
        detailedInspection = await MoldInspection.getDetailed(inspectionId);
      }
    } catch (detailError) {
      console.error('Error fetching detailed inspection data:', detailError);
    }

    let detailedSamples = samples;
    if (!samples || samples.length === 0) {
      try {
        const inspectionId = inspection.id || inspection.inspection_number;
        detailedSamples = await Sample.findMany({ inspection_id: inspectionId });
      } catch (samplesError) {
        console.error('Error fetching samples:', samplesError);
        detailedSamples = [];
      }
    }

    const displayNum = getDisplayNumber(inspection);
    const reportHtml = await generateReportHtmlContent(detailedInspection, detailedSamples);

    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const reportType =
      inspection.inspection_type === 'asbestos' || inspection.app_id === 'asbestos'
        ? 'Asbestos_Assessment'
        : 'Mold_Inspection';
    link.download = `${reportType}_Report_${String(displayNum).replace(/[^a-zA-Z0-9]/g, '_')}_${(inspection.full_name || 'report').replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    setStatus({ type: 'success', message: `HTML report downloaded for ${displayNum}` });
    setTimeout(() => setStatus(null), 3000);
  } catch (error) {
    console.error('Error generating HTML:', error);
    setStatus({ type: 'error', message: `Failed to generate HTML: ${error.message}` });
    setTimeout(() => setStatus(null), 5000);
  }
};
