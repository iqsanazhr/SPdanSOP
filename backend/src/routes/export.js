import { Router } from 'express';
import { prisma } from '../db.js';
import { generatePdfBuffer, generatePdfFromHtmlBuffer } from '../services/pdfService.js';
import { generateDocxBuffer } from '../services/docxService.js';

const router = Router();

// Direct PDF generation from client DOM HTML
router.post('/pdf-html', async (req, res) => {
  try {
    const { html, title, isLandscape } = req.body;
    if (!html) {
      return res.status(400).json({ error: 'HTML content is required' });
    }

    const pdfBuffer = await generatePdfFromHtmlBuffer({ html, isLandscape: !!isLandscape });
    const safeTitle = (title || 'Dokumen').replace(/[^a-zA-Z0-9_-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.end(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF from HTML:', error);
    res.status(500).json({ error: 'Failed to generate PDF from HTML: ' + error.message });
  }
});

const handlePdfExport = async (req, res) => {
  try {
    const { id } = req.params;
    let document = null;

    if (req.body && (req.body.title || req.body.contentData || req.body.components)) {
      document = req.body;
    } else {
      document = await prisma.document.findUnique({
        where: { id },
        include: {
          components: {
            orderBy: { order: 'asc' },
          },
        },
      });
    }

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const pdfBuffer = await generatePdfBuffer(document);

    const safeTitle = (document.title || 'Standar_Pelayanan').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeTitle}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.end(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF export:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

const handleDocxExport = async (req, res) => {
  try {
    const { id } = req.params;
    let document = null;
    const previewHtml = req.body && req.body.html ? req.body.html : null;

    if (req.body && (req.body.title || req.body.contentData || req.body.components)) {
      document = req.body;
    } else {
      document = await prisma.document.findUnique({
        where: { id },
        include: {
          components: {
            orderBy: { order: 'asc' },
          },
        },
      });
    }

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const docxBuffer = await generateDocxBuffer(document, previewHtml);

    const safeTitle = (document.title || 'Standar_Pelayanan').replace(/[^a-zA-Z0-9_-]/g, '_');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"`);
    res.setHeader('Content-Length', docxBuffer.length);

    res.end(docxBuffer);
  } catch (error) {
    console.error('Error generating DOCX export:', error);
    res.status(500).json({ error: 'Failed to generate Word document' });
  }
};

// Export PDF endpoints
router.get('/documents/:id/pdf', handlePdfExport);
router.post('/documents/:id/pdf', handlePdfExport);

// Export Word (.docx) endpoints
router.get('/documents/:id/docx', handleDocxExport);
router.post('/documents/:id/docx', handleDocxExport);

// HTML preview endpoint for PDF preview modal
router.get('/documents/:id/preview-html', async (req, res) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        components: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Error fetching preview data:', error);
    res.status(500).json({ error: 'Failed to fetch preview data' });
  }
});

export default router;
