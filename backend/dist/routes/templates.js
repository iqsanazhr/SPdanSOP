"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Get all templates with latest version & components
router.get('/', async (req, res) => {
    try {
        const templates = await db_1.prisma.template.findMany({
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
            orderBy: { createdAt: 'desc' },
        });
        res.json(templates);
    }
    catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});
// Get template by ID
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const template = await db_1.prisma.template.findUnique({
            where: { id },
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
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        res.json(template);
    }
    catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});
exports.default = router;
