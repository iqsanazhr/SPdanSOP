import express from 'express';
import cors from 'cors';
import templatesRouter from './routes/templates.js';
import documentsRouter from './routes/documents.js';
import exportRouter from './routes/export.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/templates', templatesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/export', exportRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
