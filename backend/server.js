require('dotenv').config();
const express = require('express');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { generateChartImage } = require('./generateChart');

const app = express();
const port = process.env.PORT || 5000;

// --- CORS Configuration ---
if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = [process.env.FRONTEND_URL];
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
        const newRow = {
            Timestamp: new Date().toLocaleString(), Name: name, Organization: organization,
            'Self-Awareness': scores.SA, 'Managing Emotions': scores.ME, 'Motivating Oneself': scores.MO,
            'Empathy': scores.E, 'Social Skill': scores.SS,
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

        console.log('Generating chart image on server...');
        const chartImage = await generateChartImage(data.scores);

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
        if (fs.existsSync('./logo.png')) {
            doc.image('./logo.png', (doc.page.width - 40) / 2, 40, { width: 40 });
        }
        doc.moveDown(3);
        doc.fontSize(26).fillColor(BRAND_COLOR_ORANGE).font('Helvetica-Bold').text('Emotional Intelligence (EI) Self-Assessment', { align: 'center' });
        doc.fontSize(14).fillColor(TEXT_COLOR).font('Helvetica').text('Assessment Results', { align: 'center' });
        doc.moveDown(1);
        doc.strokeColor(BRAND_COLOR_ORANGE).lineWidth(1.5).moveTo(100, doc.y).lineTo(doc.page.width - 100, doc.y).stroke();
        doc.moveDown(2);

        doc.fontSize(12).fillColor(TEXT_COLOR).font('Helvetica-Bold').text('Name:', 70, doc.y, { continued: true }).font('Helvetica').text(` ${data.name}`);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Organization:', { continued: true }).font('Helvetica').text(` ${data.organization}`);
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text('Date:', { continued: true }).font('Helvetica').text(` ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);

        const chartWidth = 450;
        const chartX = (doc.page.width - chartWidth) / 2;
        doc.image(chartImage, chartX, 320, { fit: [chartWidth, 350] });
        doc.fontSize(10).fillColor(TEXT_COLOR).text('This chart visualizes your scores across the five key areas, showing your unique emotional intelligence profile at a glance.', 70, 680, { align: 'center' });

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

        doc.rect(doc.page.margins.left, doc.y, doc.page.width - doc.page.margins.left * 2, 80).fill(LIGHT_GRAY);
        doc.fillColor(TEXT_COLOR).font('Helvetica-Bold').fontSize(16).text('Key Insights', doc.page.margins.left + 20, doc.y + 15);
        doc.font('Helvetica').fontSize(12).text(`Your highest score is in: ${strengthAreas.join(', ')}`, { indent: 20 });
        doc.text(`Your area with the lowest score is: ${improvementAreas.join(', ')}`, { indent: 20 });
        doc.moveDown(3);

        let currentY = doc.y;
        sections.forEach(section => {
            const interpretation = getInterpretation(section.score);
            const boxHeight = 65;
            doc.rect(doc.page.margins.left, currentY, doc.page.width - doc.page.margins.left * 2, boxHeight).fill(LIGHT_GRAY);
            doc.rect(doc.page.margins.left, currentY, 5, boxHeight).fill(interpretation.color);
            doc.fillColor(BRAND_COLOR_RED).font('Helvetica-Bold').fontSize(14).text(section.title, doc.page.margins.left + 15, currentY + 15);
            doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(11).text(`Score: ${section.score} / 50 - `, doc.page.margins.left + 15, currentY + 35)
               .font('Helvetica-Bold').fillColor(interpretation.color).text(interpretation.text);
            currentY += (boxHeight + 10);
        });

        // --- PAGE 3: UNDERSTANDING YOUR SCORES ---
        doc.addPage();
        doc.fontSize(22).fillColor(BRAND_COLOR_RED).font('Helvetica-Bold').text('Understanding Your Scores', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(11).fillColor(TEXT_COLOR).font('Helvetica').text('Higher overall scores reflect stronger emotional intelligence. The breakdown below explains what the score for each section means.', { align: 'center' });
        doc.moveDown(3);

        const interpretations = [
            { title: 'Area of Strength (35-50)', color: GREEN, text: 'Indicates areas of strength or potential strength. You are likely confident and effective in these aspects of emotional intelligence.' },
            { title: 'Needs More Consistent Attention (18-34)', color: BRAND_COLOR_ORANGE, text: 'Indicates areas that are generally okay but could be more consistent. Focusing here can turn a moderate skill into a strong one.' },
            { title: 'Needs Improvement (10-17)', color: BRAND_COLOR_RED, text: 'Indicates areas of communication that would benefit most from focused development and practice.' }
        ];

        interpretations.forEach(item => {
            const boxY = doc.y;
            const boxHeight = 75;
            // --- STYLING FIX APPLIED HERE ---
            doc.rect(doc.page.margins.left, boxY, doc.page.width - doc.page.margins.left * 2, boxHeight).fill(LIGHT_GRAY); // Added gray background
            doc.rect(doc.page.margins.left, boxY, 5, boxHeight).fill(item.color);
            doc.fillColor(item.color).font('Helvetica-Bold').fontSize(14).text(item.title, doc.page.margins.left + 15, boxY + 15);
            doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(11).text(item.text, doc.page.margins.left + 15, boxY + 35, { 
                width: doc.page.width - (doc.page.margins.left * 2) - 20 
            });
            doc.y = boxY + boxHeight + 15;
        });

        // --- PAGE 4: NEXT STEPS ---
        doc.addPage();
        doc.fontSize(22).fillColor(BRAND_COLOR_RED).font('Helvetica-Bold').text('Understanding Your Profile & Next Steps', { align: 'center' });
        doc.moveDown(1);
        doc.fontSize(11).fillColor(TEXT_COLOR).font('Helvetica').text('This report provides a snapshot of your emotional intelligence based on your responses. Use these insights as a guide for personal and professional development.', { align: 'left' });
        doc.moveDown(2);

        const definitions = [
            { title: 'Self-Awareness', text: 'Practice mindfulness and self-reflection. At the end of each day, ask yourself: "What emotions did I feel today, and what caused them?" Naming your emotions is the first step to understanding them.' },
            { title: 'Managing Emotions', text: 'When you feel a strong negative emotion, pause before reacting. Take a deep breath and count to ten. This small gap can prevent hasty decisions and allow for a more thoughtful response.' },
            { title: 'Motivating Oneself', text: 'Set clear, achievable goals. Break larger goals into smaller, manageable steps. Celebrate small victories to maintain momentum and build a positive feedback loop.' },
            { title: 'Empathy', text: 'Practice active listening. When talking with someone, focus completely on their words and body language. Try to understand their perspective from their point of view, not just your own.' },
            { title: 'Social Skill', text: 'Be mindful of your communication style. Pay attention to non-verbal cues, give clear messages, and be open to constructive feedback to build stronger relationships.' }
        ];

        definitions.forEach(def => {
            doc.fillColor(BRAND_COLOR_RED).font('Helvetica-Bold').fontSize(12).text(def.title);
            doc.fillColor(TEXT_COLOR).font('Helvetica').fontSize(11).text(def.text);
            doc.moveDown(1);
        });

        doc.moveDown(2);
        doc.strokeColor(BRAND_COLOR_ORANGE).lineWidth(1.5).moveTo(100, doc.y).lineTo(doc.page.width - 100, doc.y).stroke();
        doc.moveDown(1);
        doc.fontSize(10).fillColor(TEXT_COLOR).text('For further clarification regarding your results or guidance on next steps, please consult your trainer or reach out to us at hello@carnelianco.com', { align: 'center' });

        console.log('PDF Generated Successfully with PDFKit.');
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