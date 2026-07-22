import { MoldInspection, Sample, AsbestosInspection } from '@/api/entities';
import { uploadToSupabaseStorage } from '@/lib/supabase';
import { getLabAnalysisPdfUrls, getLabAnalysisImageUrls, normalizeLabAnalysisImages, isLabPdfUrl } from '@/lib/labAnalysis.jsx';
import html2pdf from 'html2pdf.js';
import { PDFDocument, StandardFonts, rgb, PDFName, PDFArray } from 'pdf-lib';

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

/** Approximate content stream size for a PDF page (used to drop trailing blanks). */
const getPageContentLength = (page) => {
  try {
    const contents = page.node.get(PDFName.of('Contents'));
    if (!contents) return 0;
    const context = page.doc.context;
    const refs = contents instanceof PDFArray ? contents.asArray() : [contents];
    let size = 0;
    for (const ref of refs) {
      const stream = context.lookup(ref);
      if (!stream) continue;
      if (typeof stream.getContents === 'function') {
        size += stream.getContents().length;
      } else if (stream.contents) {
        size += stream.contents.length;
      }
    }
    return size;
  } catch {
    return 500;
  }
};

/** html2pdf often appends an empty trailing page — remove those. */
const removeTrailingBlankPages = (pdfDoc, minContentLength = 120) => {
  while (pdfDoc.getPageCount() > 1) {
    const last = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
    if (getPageContentLength(last) >= minContentLength) break;
    pdfDoc.removePage(pdfDoc.getPageCount() - 1);
  }
};

const appendPdfDoc = async (target, sourceDoc) => {
  removeTrailingBlankPages(sourceDoc);
  const pages = await target.copyPages(sourceDoc, sourceDoc.getPageIndices());
  pages.forEach((page) => target.addPage(page));
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

const PDF_OVERRIDE_STYLES = `
  #pdf-download-content, #pdf-download-content * { box-sizing: border-box; }
  #pdf-download-content .cover-page { min-height: 1040px !important; height: 1040px !important; padding: 28px 24px 48px !important; gap: 20px !important; justify-content: flex-start !important; page-break-after: auto !important; display: flex !important; flex-direction: column !important; align-items: center !important; }
  #pdf-download-content .cover-title { font-size: 34px !important; margin: 0 !important; line-height: 1.25 !important; max-width: 720px !important; }
  #pdf-download-content .cover-image { max-width: 620px !important; max-height: 500px !important; width: auto !important; height: auto !important; margin: 0 !important; object-fit: contain !important; }
  #pdf-download-content .cover-details { padding: 20px 24px !important; max-width: 520px !important; width: 100% !important; margin-top: auto !important; margin-bottom: 40px !important; }
  #pdf-download-content .cover-detail-item { font-size: 15px !important; margin: 8px 0 !important; line-height: 1.45 !important; }
  #pdf-download-content .report-page { page-break-after: auto !important; break-after: auto !important; page-break-before: auto !important; break-before: auto !important; }
  #pdf-download-content .disclaimer-page { min-height: auto !important; padding: 24px !important; display: block !important; }
  #pdf-download-content .findings-page { padding-top: 8px !important; page-break-after: auto !important; }
  #pdf-download-content .samples-page { padding-top: 8px !important; page-break-after: auto !important; }
  #pdf-download-content .post-lab-page { page-break-after: auto !important; break-after: auto !important; }
  #pdf-download-content .post-lab-section { page-break-after: auto !important; break-after: auto !important; }
  #pdf-download-content .section h2 { page-break-after: avoid !important; break-after: avoid-page !important; }
  #pdf-download-content .report-section-title { color: #004aac !important; font-size: 28px !important; font-weight: bold !important; margin: 0 0 16px 0 !important; padding-bottom: 0 !important; border-bottom: none !important; text-align: center !important; line-height: 1.2 !important; page-break-inside: avoid !important; break-inside: avoid-page !important; }
  #pdf-download-content .keep-together, #pdf-download-content .sample-block, #pdf-download-content .finding-block {
    page-break-inside: avoid !important;
    break-inside: avoid-page !important;
    display: block !important;
  }
  #pdf-download-content .finding-block img { max-height: 140px !important; object-fit: contain !important; }
  #pdf-download-content .sample-block h4 { page-break-after: avoid !important; break-after: avoid-page !important; }
  #pdf-download-content .sample-block img { page-break-before: avoid !important; break-before: avoid-page !important; max-height: 260px !important; object-fit: contain !important; }
  #pdf-download-content .page-break { display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }
`;

const buildHtml2pdfOptions = (fileName) => ({
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
  pagebreak: {
    mode: ['css', 'legacy'],
    avoid: ['.keep-together', '.sample-block', '.finding-block', '.report-section-title', 'h2', 'h3', 'h4', 'img']
  }
});

/** Render one report segment to a PDF blob (avoids cross-section page splits). */
const renderSegmentToPdfBlob = async (segment, styleText, html2pdfOptions) => {
  const segmentHost = document.createElement('div');
  segmentHost.style.cssText = 'position:fixed;top:0;left:-10000px;width:794px;background:#ffffff;z-index:-1;overflow:visible;';
  const segmentRoot = document.createElement('div');
  segmentRoot.id = 'pdf-download-content';
  segmentRoot.innerHTML = `<style>${PDF_OVERRIDE_STYLES}${styleText}
    #pdf-download-content .report-page { page-break-after: auto !important; break-after: auto !important; }
    @media print {
      #pdf-download-content .report-page { page-break-after: auto !important; break-after: auto !important; }
    }
  </style>`;
  const cloned = segment.cloneNode(true);
  // Segment is rendered alone — never force a page break after the last block
  cloned.classList.remove('report-page');
  cloned.style.pageBreakAfter = 'auto';
  cloned.style.breakAfter = 'auto';
  cloned.querySelectorAll('.report-page, .page-break, .pdf-break-before').forEach((el) => {
    el.classList.remove('report-page', 'pdf-break-before');
    if (el.classList.contains('page-break')) el.remove();
  });
  segmentRoot.appendChild(cloned);
  segmentHost.appendChild(segmentRoot);
  document.body.appendChild(segmentHost);

  try {
    void segmentHost.offsetHeight;
    await waitForImages(segmentRoot);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const contentHeight = Math.max(segmentRoot.scrollHeight, cloned.scrollHeight, 1);
    const usablePageHeightPx = 1100;
    const forceSinglePage =
      cloned.classList.contains('cover-page') ||
      cloned.classList.contains('disclaimer-page') ||
      !!cloned.querySelector?.('.cover-page');

    const blob = await html2pdf()
      .set(html2pdfOptions)
      .from(segmentRoot)
      .outputPdf('blob');

    if (!blob || blob.size < 100) {
      throw new Error('Segment PDF looks empty');
    }

    const doc = await PDFDocument.load(await blob.arrayBuffer());

    if (forceSinglePage) {
      while (doc.getPageCount() > 1) {
        doc.removePage(doc.getPageCount() - 1);
      }
    } else {
      // Only trim clearly-extra trailing pages; never cut content pages
      const expectedPages = Math.max(1, Math.ceil(contentHeight / usablePageHeightPx));
      while (doc.getPageCount() > expectedPages + 1) {
        doc.removePage(doc.getPageCount() - 1);
      }
    }
    removeTrailingBlankPages(doc);
    const cleaned = await doc.save();
    return new Blob([cleaned], { type: 'application/pdf' });
  } finally {
    if (segmentHost.parentNode) {
      segmentHost.parentNode.removeChild(segmentHost);
    }
  }
};

/**
 * Generate and download an inspection report PDF.
 * Order: report body → lab intro → lab pages → conclusion/recommendations → limitations
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
      detailedInspection.lab_analysis_images = normalizeLabAnalysisImages(
        detailedInspection.lab_analysis_images ?? inspection.lab_analysis_images
      );
    } catch (detailError) {
      console.error('Error fetching detailed inspection data for PDF:', detailError);
      detailedInspection.lab_analysis_images = normalizeLabAnalysisImages(
        inspection.lab_analysis_images
      );
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
    const limitationsParagraphs =
      [...doc.querySelectorAll('.limitations-text')]
        .map((el) => el.textContent?.trim())
        .filter(Boolean);
    const limitationsBody = limitationsParagraphs.join('\n\n') ||
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
    content.innerHTML = `<style>${PDF_OVERRIDE_STYLES}${styleText}</style>${bodyHtml}`;

    host.appendChild(content);
    document.body.appendChild(host);

    // Collect lab file URLs from DOM before stripping (fallback if API field is unparsed)
    const domLabPdfUrls = [...content.querySelectorAll('.lab-pdf-page iframe')]
      .map((el) => (el.getAttribute('src') || '').split('#')[0])
      .filter((url) => isLabPdfUrl(url));
    const domLabImageUrls = [...content.querySelectorAll('.lab-analysis-section img')]
      .map((el) => el.getAttribute('src'))
      .filter(Boolean);

    // Save conclusion/recommendations to append after lab analysis
    const postLabSection = content.querySelector('.post-lab-section');
    const postLabClone = postLabSection ? postLabSection.cloneNode(true) : null;

    // Remove everything that should be assembled separately (prevents blank pages)
    content
      .querySelectorAll(
        '.limitations-section, .lab-analysis-intro, .lab-pdf-page, .lab-analysis-page, .lab-analysis-section, .post-lab-section, .page-break'
      )
      .forEach((el) => el.remove());

    // Drop empty containers left behind (e.g. after lab/limitations removed) — prevents blank PDF pages
    [...content.children].forEach((child) => {
      if (child.tagName?.toLowerCase() === 'style') return;
      if (!(child.innerText || child.textContent || '').trim()) {
        child.remove();
      }
    });

    const normalizedLabFiles = normalizeLabAnalysisImages(
      detailedInspection.lab_analysis_images ?? inspection.lab_analysis_images
    );
    const labPdfUrls = [
      ...new Set([
        ...getLabAnalysisPdfUrls(normalizedLabFiles),
        ...domLabPdfUrls
      ])
    ];
    const labImageUrls = [
      ...new Set([
        ...getLabAnalysisImageUrls(normalizedLabFiles),
        ...domLabImageUrls.filter((url) => !isLabPdfUrl(url))
      ])
    ];
    const hasLabResults = labPdfUrls.length > 0 || labImageUrls.length > 0;

    const html2pdfOptions = buildHtml2pdfOptions(fileName);

    void host.offsetHeight;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await waitForImages(content);
    await new Promise((r) => setTimeout(r, 250));

    if (!content.innerText?.trim()) {
      throw new Error('Report body had no text content to render');
    }

    // Render each top-level section separately so html2pdf never slices headings across pages
    const segments = [...content.children].filter((node) => {
      if (!node.tagName || node.tagName.toLowerCase() === 'style') return false;
      return (node.innerText || node.textContent || '').trim().length > 0;
    });

    if (segments.length === 0) {
      throw new Error('Report body had no sections to render');
    }

    setStatus({ type: 'info', message: 'Rendering report pages…' });

    const segmentBlobs = [];
    for (const segment of segments) {
      segmentBlobs.push(await renderSegmentToPdfBlob(segment, styleText, html2pdfOptions));
    }

    setStatus({ type: 'info', message: 'Assembling report pages…' });

    const merged = await PDFDocument.create();
    for (const segmentBlob of segmentBlobs) {
      const segmentDoc = await PDFDocument.load(await segmentBlob.arrayBuffer());
      await appendPdfDoc(merged, segmentDoc);
    }

    // Laboratory analysis: intro page + merged PDF pages + rendered image pages
    if (hasLabResults) {
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

      for (let i = 0; i < labImageUrls.length; i++) {
        const url = labImageUrls[i];
        const imgPage = document.createElement('div');
        imgPage.className = 'report-page lab-image-page report-container';
        imgPage.innerHTML = `
          <div class="section keep-together" style="text-align:center;padding:12px 0;">
            ${labImageUrls.length > 1 ? `<p style="color:#666;font-size:14px;margin:0 0 12px;">Lab Analysis — Image ${i + 1} of ${labImageUrls.length}</p>` : ''}
            <img src="${url}" alt="Lab Analysis ${i + 1}" style="max-width:100%;height:auto;border:2px solid #ddd;border-radius:12px;" />
          </div>`;
        try {
          const imgBlob = await renderSegmentToPdfBlob(imgPage, styleText, html2pdfOptions);
          const imgDoc = await PDFDocument.load(await imgBlob.arrayBuffer());
          await appendPdfDoc(merged, imgDoc);
        } catch (imgErr) {
          console.warn('Skipping lab image page due to error:', url, imgErr);
        }
      }
    }

    // Conclusion & Recommendations after lab analysis
    if (postLabClone && (postLabClone.innerText || '').trim()) {
      const postLabPage = document.createElement('div');
      postLabPage.className = 'report-page post-lab-page report-container';
      postLabPage.appendChild(postLabClone);
      try {
        const postLabBlob = await renderSegmentToPdfBlob(postLabPage, styleText, html2pdfOptions);
        const postLabDoc = await PDFDocument.load(await postLabBlob.arrayBuffer());
        await appendPdfDoc(merged, postLabDoc);
      } catch (postLabErr) {
        console.warn('Skipping conclusion/recommendations page due to error:', postLabErr);
      }
    }

    // Limitations always last
    const limitationsDoc = await createSimpleTextPdf({
      title: limitationsTitle,
      paragraphs: limitationsParagraphs.length > 0 ? limitationsParagraphs : [limitationsBody]
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
