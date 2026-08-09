"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const templates_1 = __importDefault(require("./routes/templates"));
const documents_1 = __importDefault(require("./routes/documents"));
const export_1 = __importDefault(require("./routes/export"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use('/api/templates', templates_1.default);
app.use('/api/documents', documents_1.default);
app.use('/api/export', export_1.default);
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
