// backend/server.js
const express = require('express');
const cors = require('cors');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const puppeteer = require('puppeteer');
const { getPdfHtml } = require('./pdf-template');

const app = express();
const port = process.env.PORT || 5000; // OnRender provides the PORT

// --- CORS Configuration for Production ---
const allowedOrigins = [process.env.FRONTEND_URL]; // We will set this variable on OnRender
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// --- Google Sheets Setup ---
// Read credentials from environment variables
const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const SPREADSHEET_ID = process.env.SPREADSHEET_ID; 

const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);

async function accessSheet() {
    try {
        await doc.loadInfo();
        console.log(`Successfully connected to Google Sheet: "${doc.title}"`);
    } catch (error) {
        console.error('Error loading Google Sheet:', error);
    }
}

accessSheet();

// --- API Endpoints ---
app.post('/api/save-results', async (req, res) => {
    try {
        const sheet = doc.sheetsByIndex[0];
        const { name, organization, scores } = req.body;

        if (!name || !organization || !scores) {
            return res.status(400).json({ message: "Missing required data." });
        }

        const newRow = {
            Timestamp: new Date().toLocaleString(),
            Name: name,
            Organization: organization,
            'Self-Awareness': scores.SA,
            'Managing Emotions': scores.ME,
            'Motivating Oneself': scores.MO,
            'Empathy': scores.E,
            'Social Skill': scores.SS,
        };

        await sheet.addRow(newRow);
        res.status(200).json({ message: "Results saved successfully!" });
    } catch (error) {
        console.error('Error saving to Google Sheet:', error);
        res.status(500).json({ message: "Failed to save results." });
    }
});

app.post('/api/generate-pdf', async (req, res) => {
    try {
        const browser = await puppeteer.launch({ 
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // For OnRender
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        const htmlContent = getPdfHtml(req.body);
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});