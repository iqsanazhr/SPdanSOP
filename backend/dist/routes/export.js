"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const pdfService_1 = require("../services/pdfService");
const docxService_1 = require("../services/docxService");
const router = (0, express_1.Router)();
const handlePdfExport = async (req, res) => {
    try {
        const id = req.params.id;
        let document = null;
        if (req.body && req.body.components && Array.isArray(req.body.components)) {
            document = req.body;
        }
        else {
            document = await db_1.prisma.document.findUnique({
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
        const pdfBuffer = await (0, pdfService_1.generatePdfBuffer)(document);
        const safeTitle = (document.title || 'Standar_Pelayanan').replace(/[^a-zA-Z0-9_-]/g, '_');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${safeTitle}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    }
    catch (error) {
        console.error('Error generating PDF export:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
};
const handleDocxExport = async (req, res) => {
    try {
        const id = req.params.id;
        let document = null;
        if (req.body && req.body.components && Array.isArray(req.body.components)) {
            document = req.body;
        }
        else {
            document = await db_1.prisma.document.findUnique({
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
        const docxBuffer = await (0, docxService_1.generateDocxBuffer)(document);
        const safeTitle = (document.title || 'Standar_Pelayanan').replace(/[^a-zA-Z0-9_-]/g, '_');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"`);
        res.setHeader('Content-Length', docxBuffer.length);
        res.end(docxBuffer);
    }
    catch (error) {
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
        const id = req.params.id;
        const document = await db_1.prisma.document.findUnique({
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
    }
    catch (error) {
        console.error('Error fetching preview data:', error);
        res.status(500).json({ error: 'Failed to fetch preview data' });
    }
});
exports.default = router;
