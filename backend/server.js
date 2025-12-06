require('dotenv').config();
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
// REMOVED: const { generateChartImage } = require('./generateChart'); <--- No longer needed

const app = express();
const port = process.env.PORT || 5000;

// --- CORS Configuration ---
// Allows your frontend to talk to this backend
if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = [process.env.FRONTEND_URL]; // Make sure this is set in Render Env Vars
    app.use(cors({
        origin: function (origin, callback) {
            if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    }));
} else {
    app.use(cors());
}

// Increased limit to handle the Base64 Image string
app.use(express.json({ limit: '10mb' }));

// --- Google Sheets Setup ---
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
        
        if (!name || !organization || !scores) return res.status(400).json({ message: "Missing data." });
        
        // Ensure these keys match your Google Sheet Header Row EXACTLY
        const newRow = {
            Timestamp: new Date().toLocaleString(), 
            Name: name, 
            Organization: organization,
            'Self-Awareness': scores.SA, 
            'Managing Emotions': scores.ME, 
            'Motivating Oneself': scores.MO,
            'Empathy': scores.E, 
            'Social Skill': scores.SS,
            'Total Score': Object.values(scores).reduce((a, b) => a + b, 0) // Added Total
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
        const data = req.body;
        if (!data.name || !data.scores) return res.status(400).send('Missing data for PDF generation.');

        // --- 1. PROCESS IMAGE FROM FRONTEND ---
        let chartImageBuffer = null;
        if (data.chartImage) {
            // Remove the data:image/png;base64 prefix to get raw data
            const base64Data = data.chartImage.replace(/^data:image\/\w+;base64,/, "");
            chartImageBuffer = Buffer.from(base64Data, 'base64');
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=EI-Report-${data.name.replace(/\s+/g, '-')}.pdf`);

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        doc.pipe(res);

        // --- STYLING CONSTANTS ---
        const BRAND_COLOR_RED = '#B31B1B';
        const BRAND_COLOR_ORANGE = '#F57C00';
        const TEXT_COLOR = '#34495e';
        const LIGHT_GRAY = '#f8f9fa';
        const GREEN = '#2ECC71';

        // --- PAGE 1: VISUAL PROFILE ---
        // Ensure logo.png exists in your root folder on Render
        if (fs.existsSync('./logo.png')) {
            doc.image('./logo.png', (doc.page.width - 60) / 2, 40, { width: 60 });
        }
        
        doc.moveDown(4);
        doc.fontSize(26).fillColor(BRAND_COLOR_ORANGE).font('Helvetica-Bold').text('Emotional Intelligence (EI)', { align: 'center' });
        doc.fontSize(26).text('Self-Assessment', { align: 'center' });
        
        doc.moveDown(1);
        doc.fontSize(14).fillColor(TEXT_COLOR).font('Helvetica').text('Personal Feedback Report', { align: 'center' });
        
        doc.moveDown(1);
        doc.strokeColor(BRAND_COLOR_ORANGE).lineWidth(1.5).moveTo(100, doc.y).lineTo(doc.page.width - 100, doc.y).stroke();
        doc.moveDown(2);

        // User Info Box
        doc.fontSize(12).fillColor(TEXT_COLOR).font('Helvetica-Bold').text('Name:', 150, doc.y, { continued: true }).font('Helvetica').text(`   ${data.name}`);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Organization:', 150, doc.y, { continued: true }).font('Helvetica').text(`   ${data.organization}`);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Date:', 150, doc.y, { continued: true }).font('Helvetica').text(`   ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);

        // Draw the Chart Image from Frontend
        if (chartImageBuffer) {
            const chartWidth = 400;
            const chartX = (doc.page.width - chartWidth) / 2;
            doc.moveDown(2);
            doc.image(chartImageBuffer, chartX, doc.y, { fit: [chartWidth, 350] });
        }

        // --- PAGE 2: RESULTS SUMMARY ---
        doc.addPage();
        doc.fontSize(22).fillColor(BRAND_COLOR_RED).font('Helvetica-Bold').text('Results Summary', { align: 'center' });
        doc.moveDown(2);

        const competencyMap = { SA: 'Self-Awareness', ME: 'Managing Emotions', MO: 'Motivating Oneself', E: 'Empathy', SS: 'Social Skill' };
        const sections = Object.keys(data.scores).map(key => ({ title: competencyMap[key], score: data.scores[key] }));
        
        const maxScore = Math.max(...sections.map(s => s.score));
        const minScore = Math.min(...sections.map(s => s.score));
        
        const strengthAreas = sections.filter(s => s.score === maxScore).map(s => s.title);
        const improvementAreas = sections.filter(s => s.score === minScore).map(s => s.title);
        
        const getInterpretation = (score) => {
            if (score >= 35) return { text: 'Area of Strength', color: GREEN };
            if (score >= 18) return { text: 'Needs More Consistent Attention', color: BRAND_COLOR_ORANGE };
            return { text: 'Needs Improvement', color: BRAND_COLOR_RED };
        };

        // Key Insights Box
        doc.rect(doc.page.margins.left, doc.y, doc.page.width - doc.page.margins.left * 2, 150).fill(LIGHT_GRAY);
        doc.fillColor(TEXT_COLOR).font('Helvetica-Bold').fontSize(16).text('Key Insights', doc.page.margins.left + 20, doc.y + 15);
        
        doc.font('Helvetica').fontSize(12).text('Your highest score is in:', doc.page.margins.left + 20, doc.y + 10);
        doc.font('Helvetica-Bold').fillColor(GREEN).text(strengthAreas.join(', '));
        
        doc.moveDown(0.5);
        doc.font('Helvetica').fillColor(TEXT_COLOR).text('Your area with the lowest score is:', doc.page.margins.left + 20);
        doc.font('Helvetica-Bold').fillColor(BRAND_COLOR_RED).text(improvementAreas.join(', '));
        doc.moveDown(3);

        // Detailed Scores
        let currentY = doc.y + 20;
        sections.forEach(section => {
            const interpretation = getInterpretation(section.score);
            const boxHeight = 65;
            
            // Background Box
            doc.rect(doc.page.margins.left, currentY, doc.page.width - doc.page.margins.left * 2, boxHeight).fill(LIGHT_GRAY);
            // Colored Side Bar
            doc.rect(doc.page.margins.left, currentY, 6, boxHeight).fill(interpretation.color);
            
            // Text
            doc.fillColor(BRAND_COLOR_RED).font('Helvetica-Bold').fontSize(14).text(section.title, doc.page.margins.left + 20, currentY + 15);
            doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(11).text(`Score: ${section.score} / 50 - `, doc.page.margins.left + 20, currentY + 38, { continued: true })
               .font('Helvetica-Bold').fillColor(interpretation.color).text(interpretation.text);
            
            currentY += (boxHeight + 15);
        });

        // --- PAGE 3: DEFINITIONS ---
        doc.addPage();
        doc.fontSize(22).fillColor(BRAND_COLOR_RED).font('Helvetica-Bold').text('Understanding Your Scores', { align: 'center' });
        doc.moveDown(2);

        const definitions = [
            { title: 'Self-Awareness', text: 'Knowing what we are feeling in the moment, and using those preferences to guide our decision making; having a realistic assessment of our own abilities and a well-grounded sense of self-confidence.' },
            { title: 'Managing Emotions', text: 'Handling our emotions so that they facilitate rather than interfere with the task at hand; being conscientious and delaying gratification to pursue goals; recovering well from emotional distress.' },
            { title: 'Motivating Oneself', text: 'Using our deepest preferences to move and guide us toward our goals, to help us take initiative and strive to improve, and to persevere in the face of setbacks and frustration.' },
            { title: 'Empathy', text: 'Sensing what people are feeling, being able to take their perspective, and cultivating rapport and attunement with a broad diversity of people.' },
            { title: 'Social Skill', text: 'Handling emotions in relationships well and accurately reading social situations and networks; interacting smoothly; using these skills to persuade and lead, negotiate and settle disputes, for cooperation and teamwork.' }
        ];

        definitions.forEach(def => {
            doc.fillColor(BRAND_COLOR_RED).font('Helvetica-Bold').fontSize(13).text(def.title);
            doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(11).text(def.text, { align: 'justify' });
            doc.moveDown(1.5);
        });

        doc.moveDown(2);
        doc.fontSize(10).fillColor('#7f8c8d').text('Generated by Carnelian Co.', { align: 'center' });

        console.log('PDF Generated Successfully.');
        doc.end();

    } catch (error) {
        console.error('FATAL ERROR generating PDF:', error);
        if (!res.headersSent) {
            res.status(500).send('An internal server error occurred while generating the PDF.');
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});