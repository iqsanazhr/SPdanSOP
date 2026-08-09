"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Get all documents
router.get('/', async (req, res) => {
    try {
        const documents = await db_1.prisma.document.findMany({
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                title: true,
                serviceType: true,
                signatoryTitle: true,
                signatoryName: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: { components: true },
                },
            },
        });
        res.json(documents);
    }
    catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});
// Get single document by ID with sorted components
router.get('/:id', async (req, res) => {
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
        console.error('Error fetching document:', error);
        res.status(500).json({ error: 'Failed to fetch document' });
    }
});
// Create new document from template or blank
router.post('/', async (req, res) => {
    try {
        const { templateId, title, serviceType, signatoryTitle, signatoryName } = req.body;
        let initialComponents = [];
        if (templateId) {
            const template = await db_1.prisma.template.findUnique({
                where: { id: templateId },
                include: {
                    versions: {
                        orderBy: { version: 'desc' },
                        take: 1,
                        include: {
                            components: {
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                },
            });
            if (template && template.versions.length > 0) {
                initialComponents = template.versions[0].components.map((c) => ({
                    order: c.order,
                    name: c.name,
                    uraian: c.defaultUraian,
                }));
            }
        }
        const document = await db_1.prisma.document.create({
            data: {
                title: title || 'Standar Pelayanan Publik Baru',
                serviceType: serviceType || 'LEGALISASI',
                signatoryTitle: signatoryTitle || 'KEPALA BADAN KEPEGAWAIAN\nDAN PENGEMBANGAN SUMBER DAYA MANUSIA\nKABUPATEN BANJARNEGARA',
                signatoryName: signatoryName || 'ESTI WIDODO',
                templateId: templateId || null,
                components: {
                    create: initialComponents,
                },
            },
            include: {
                components: {
                    orderBy: { order: 'asc' },
                },
            },
        });
        res.status(201).json(document);
    }
    catch (error) {
        console.error('Error creating document:', error);
        res.status(500).json({ error: 'Failed to create document' });
    }
});
// Update document metadata (title, serviceType, signatoryTitle, signatoryName, signatureImage)
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { title, serviceType, signatoryTitle, signatoryName, signatureImage } = req.body;
        const updatedDocument = await db_1.prisma.document.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(serviceType !== undefined && { serviceType }),
                ...(signatoryTitle !== undefined && { signatoryTitle }),
                ...(signatoryName !== undefined && { signatoryName }),
                ...(signatureImage !== undefined && { signatureImage }),
            },
        });
        res.json(updatedDocument);
    }
    catch (error) {
        console.error('Error updating document metadata:', error);
        res.status(500).json({ error: 'Failed to update document' });
    }
});
// Batch update/autosave components
router.put('/:id/components', async (req, res) => {
    try {
        const id = req.params.id;
        const { components } = req.body;
        if (!Array.isArray(components)) {
            return res.status(400).json({ error: 'components must be an array' });
        }
        await db_1.prisma.$transaction(components.map((comp) => db_1.prisma.documentComponent.update({
            where: { id: comp.id },
            data: {
                ...(comp.name !== undefined && { name: comp.name }),
                ...(comp.uraian !== undefined && { uraian: comp.uraian }),
                ...(comp.order !== undefined && { order: comp.order }),
            },
        })));
        await db_1.prisma.document.update({
            where: { id },
            data: { updatedAt: new Date() },
        });
        const updatedDoc = await db_1.prisma.document.findUnique({
            where: { id },
            include: {
                components: {
                    orderBy: { order: 'asc' },
                },
            },
        });
        res.json(updatedDoc);
    }
    catch (error) {
        console.error('Error updating components:', error);
        res.status(500).json({ error: 'Failed to update components' });
    }
});
// Add new component to document
router.post('/:id/components', async (req, res) => {
    try {
        const id = req.params.id;
        const { name, insertAfterOrder, defaultUraian } = req.body;
        const document = await db_1.prisma.document.findUnique({
            where: { id },
            include: { components: { orderBy: { order: 'asc' } } },
        });
        if (!document) {
            return res.status(404).json({ error: 'Document not found' });
        }
        const targetOrder = insertAfterOrder !== undefined ? insertAfterOrder + 1 : document.components.length + 1;
        await db_1.prisma.$transaction(async (tx) => {
            const componentsToShift = document.components.filter((c) => c.order >= targetOrder);
            for (const comp of componentsToShift) {
                await tx.documentComponent.update({
                    where: { id: comp.id },
                    data: { order: comp.order + 1 },
                });
            }
            await tx.documentComponent.create({
                data: {
                    documentId: id,
                    order: targetOrder,
                    name: name || 'Komponen Baru',
                    uraian: defaultUraian || '<p>Isi uraian komponen...</p>',
                },
            });
            await tx.document.update({
                where: { id },
                data: { updatedAt: new Date() },
            });
        });
        const updatedDoc = await db_1.prisma.document.findUnique({
            where: { id },
            include: { components: { orderBy: { order: 'asc' } } },
        });
        res.status(201).json(updatedDoc);
    }
    catch (error) {
        console.error('Error adding component:', error);
        res.status(500).json({ error: 'Failed to add component' });
    }
});
// Delete component and renumber remaining
router.delete('/:id/components/:componentId', async (req, res) => {
    try {
        const id = req.params.id;
        const componentId = req.params.componentId;
        await db_1.prisma.$transaction(async (tx) => {
            await tx.documentComponent.delete({
                where: { id: componentId },
            });
            const remaining = await tx.documentComponent.findMany({
                where: { documentId: id },
                orderBy: { order: 'asc' },
            });
            for (let i = 0; i < remaining.length; i++) {
                await tx.documentComponent.update({
                    where: { id: remaining[i].id },
                    data: { order: i + 1 },
                });
            }
            await tx.document.update({
                where: { id },
                data: { updatedAt: new Date() },
            });
        });
        const updatedDoc = await db_1.prisma.document.findUnique({
            where: { id },
            include: { components: { orderBy: { order: 'asc' } } },
        });
        res.json(updatedDoc);
    }
    catch (error) {
        console.error('Error deleting component:', error);
        res.status(500).json({ error: 'Failed to delete component' });
    }
});
// Duplicate document
router.post('/:id/duplicate', async (req, res) => {
    try {
        const id = req.params.id;
        const originalDoc = await db_1.prisma.document.findUnique({
            where: { id },
            include: { components: { orderBy: { order: 'asc' } } },
        });
        if (!originalDoc) {
            return res.status(404).json({ error: 'Original document not found' });
        }
        const duplicatedDoc = await db_1.prisma.document.create({
            data: {
                title: `Copy of ${originalDoc.title}`,
                serviceType: originalDoc.serviceType,
                signatoryTitle: originalDoc.signatoryTitle,
                signatoryName: originalDoc.signatoryName,
                signatureImage: originalDoc.signatureImage,
                templateId: originalDoc.templateId,
                components: {
                    create: originalDoc.components.map((c) => ({
                        order: c.order,
                        name: c.name,
                        uraian: c.uraian,
                    })),
                },
            },
            include: { components: { orderBy: { order: 'asc' } } },
        });
        res.status(201).json(duplicatedDoc);
    }
    catch (error) {
        console.error('Error duplicating document:', error);
        res.status(500).json({ error: 'Failed to duplicate document' });
    }
});
// Delete document
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await db_1.prisma.document.delete({
            where: { id },
        });
        res.json({ message: 'Document deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});
exports.default = router;
