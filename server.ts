import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI OCR Endpoint for Shipping Box Labels
app.post('/api/ocr-label', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 data' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured on server',
        fallbackNeeded: true,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Strip data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const promptText = `
You are an expert industrial shipping label OCR and parsing engine for warehouse logistics.
Extract the shipping carton label attributes precisely from this image:
1. 箱號 (Box No / Carton No / CTN / Package No): e.g. "BOX-20261027-001", "CTN-01", "B-001". Preserve prefixes.
2. 品號 (Part No / Item No / Material No / P/N): preserve leading zeros (e.g. "004821", "0901A-X").
3. 規格 (Spec / Description / Model / Dimensions): e.g. "M4*12 SUS304", "100uF 50V +/-10%".
4. 批號 (Batch No / Lot No / LOT): preserve leading zeros and capital letters (e.g. "202610A01", "L-0899").
5. 標示數量 (Label Qty / Quantity / QTY): integer count printed on the label, e.g. 100.
6. 單位 (Unit): e.g. "PCS", "SET", "KG", "BOX", "EA".
7. 辨識信心度 (Confidence): 0.0 to 1.0. If blurry, incomplete, or ambiguous, rate lower (e.g. < 0.7).
8. 備註與警示 (Notes): Mention if label is torn, blurry, missing fields, or contains barcodes/QR notes.

If any field is missing, obscured, or unreadable, leave it as an empty string "" and lower confidence.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            boxNo: { type: Type.STRING, description: '箱號 (Carton / Box No)' },
            partNo: { type: Type.STRING, description: '品號 (Part / Item No)' },
            spec: { type: Type.STRING, description: '規格 (Specification)' },
            batchNo: { type: Type.STRING, description: '批號 (Batch / Lot No)' },
            labelQty: { type: Type.NUMBER, description: '標示數量 (Quantity on label)' },
            unit: { type: Type.STRING, description: '單位 (Unit: PCS, SET, KG, etc.)' },
            confidence: { type: Type.NUMBER, description: '辨識信心度 0.0 - 1.0' },
            notes: { type: Type.STRING, description: '辨識說明或瑕疵註記' },
          },
          required: ['boxNo', 'partNo', 'spec', 'batchNo', 'labelQty', 'unit', 'confidence'],
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsedJson });
  } catch (error: any) {
    console.error('OCR API error:', error);
    return res.status(500).json({
      error: error.message || 'OCR processing failed',
      fallbackNeeded: true,
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Shipping Manifest & Label Verification Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
