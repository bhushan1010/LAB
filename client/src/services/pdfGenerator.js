import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Helper to render DOM element into a multi-page A4 jsPDF instance
 */
async function createPdfDoc(element) {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    scrollY: 0,
  });

  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  });

  const imgWidth = 210;
  const pageHeight = 297;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf;
}

/**
 * Generate a high-resolution A4 PDF Blob from a DOM element
 * @param {HTMLElement} element - The DOM node to render (e.g. #printable-report)
 * @param {string} filename - Output filename (e.g. 'Report-Mr.-POP-SINGH.pdf')
 * @returns {Promise<Blob>} - Resolves to the compiled PDF Blob
 */
export async function generatePdfBlob(element, filename = 'Lab-Report.pdf') {
  if (!element) {
    throw new Error('Target printable DOM element not found');
  }
  const pdf = await createPdfDoc(element);
  return pdf.output('blob');
}

/**
 * Compile and trigger direct PDF download from a DOM element (e.g. #printable-report)
 */
export async function downloadPdfFromElement(element, filename = 'Lab-Report.pdf') {
  const target = element || document.getElementById('printable-report');
  if (!target) {
    throw new Error('Target printable DOM element not found');
  }
  const pdf = await createPdfDoc(target);
  pdf.save(filename);
}

/**
 * Trigger immediate browser download of a PDF Blob
 */
export function downloadPdfBlob(blob, filename = 'Lab-Report.pdf') {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

