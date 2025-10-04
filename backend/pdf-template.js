// backend/pdf-template.js
const fs = require('fs');
const path = require('path');

const getLogoBase64 = () => {
  try {
    const logoPath = path.join(__dirname, 'logo.png');
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.error("Error reading logo.png:", error);
    return '';
  }
};

const getPdfHtml = (data) => {
  const { name, organization, scores, chartImage } = data;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const logoSrc = getLogoBase64();

  const getInterpretation = (score) => {
    if (score >= 35) return { text: 'Area of Strength', color: '#27AE60' }; // Green
    if (score >= 18) return { text: 'Needs More Consistent Attention', color: '#F39C12' }; // Yellow
    return { text: 'Needs Improvement', color: '#B31B1B' }; // Red
  };

  const competencyMap = { SA: 'Self-Awareness', ME: 'Managing Emotions', MO: 'Motivating Oneself', E: 'Empathy', SS: 'Social Skill' };
  const sections = Object.keys(scores).map(key => ({
    title: competencyMap[key],
    score: scores[key]
  }));

  const maxScore = Math.max(...sections.map(s => s.score));
  const minScore = Math.min(...sections.map(s => s.score));
  const strengthAreas = sections.filter(s => s.score === maxScore).map(s => s.title);
  const improvementAreas = sections.filter(s => s.score === minScore).map(s => s.title);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>EI Assessment Results</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap');
        body { font-family: 'Lato', sans-serif; margin: 0; color: #34495e; background-color: #ffffff; }
        .page { padding: 40px 50px; max-width: 800px; margin: 0 auto; }
        .page-break { page-break-before: always; }
        .header { text-align: center; margin-bottom: 20px; }
        .header img.logo { max-height: 60px; margin-bottom: 15px; }
        .header h1 { font-size: 28px; color: #B31B1B; margin: 0; font-weight: 700; }
        .header h2 { font-size: 24px; color: #B31B1B; margin-bottom: 25px; }
        .header p { font-size: 16px; color: #7f8c8d; margin-top: 5px; }
        .underline { border-bottom: 2px solid #F57C00; width: 100%; margin: 20px 0; }
        .user-info p { font-size: 16px; line-height: 1.6; margin: 4px 0; }
        .user-info span { font-weight: 700; display: inline-block; width: 110px; }
        .chart-container { text-align: center; margin: 30px 0; }
        .chart-container img { max-width: 90%; height: auto; }
        .chart-caption { text-align: center; font-size: 14px; color: #7f8c8d; margin-top: 10px; }
        
        .summary-section { background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .summary-section h3 { margin: 0 0 15px; font-size: 20px; color: #34495e; }
        
        .score-card { background-color: #f9f9f9; padding: 15px; margin-bottom: 10px; border-left: 5px solid; border-radius: 5px; }
        .score-card h4 { margin: 0 0 5px; font-size: 18px; color: #B31B1B; }
        .score-card p { margin: 0; font-size: 14px; }

        .understanding-card { background-color: #f9f9f9; padding: 15px; margin-bottom: 15px; border-left: 5px solid; border-radius: 5px; }
        .understanding-card h4 { margin: 0 0 8px; font-size: 16px; }
        .understanding-card p { margin: 0; font-size: 14px; line-height: 1.5; }

        .next-steps-section h4 { color: #B31B1B; font-size: 16px; margin-top: 20px; margin-bottom: 8px; }
        .next-steps-section p { font-size: 14px; line-height: 1.6; margin-top: 0; }
        .footer-contact { text-align: center; margin-top: 40px; font-size: 14px; color: #7f8c8d; }
      </style>
    </head>
    <body>
      <!-- PAGE 1: VISUAL PROFILE -->
      <div class="page">
        <div class="header">
          ${logoSrc ? `<img src="${logoSrc}" alt="Company Logo" class="logo">` : ''}
          <h1>Emotional Intelligence (EI) Self-Assessment</h1>
          <p>Assessment Results</p>
        </div>
        <div class="underline"></div>
        <div class="user-info">
          <p><span>Name:</span> ${name}</p>
          <p><span>Organization:</span> ${organization}</p>
          <p><span>Date:</span> ${date}</p>
        </div>
        <div class="chart-container"><img src="${chartImage}" alt="EI Profile Chart"></div>
        <p class="chart-caption">This chart visualizes your scores across the five key areas, showing your unique emotional intelligence profile at a glance.</p>
      </div>

      <!-- PAGE 2: RESULTS SUMMARY -->
      <div class="page page-break">
        <div class="header"><h2>Results Summary</h2></div>
        <div class="summary-section">
          <h3>Key Insights</h3>
          <p><strong>Your highest score is in:</strong> ${strengthAreas.join(', ')}</p>
          <p><strong>Your area with the lowest score is:</strong> ${improvementAreas.join(', ')}</p>
        </div>
        ${sections.map(section => `
          <div class="score-card" style="border-color: ${getInterpretation(section.score).color};">
            <h4>${section.title}</h4>
            <p>Score: ${section.score} / 50 - <strong>${getInterpretation(section.score).text}</strong></p>
          </div>
        `).join('')}
      </div>

      <!-- PAGE 3: UNDERSTANDING YOUR SCORES -->
      <div class="page page-break">
        <div class="header"><h2>Understanding Your Scores</h2></div>
        <p style="text-align: center; margin-bottom: 25px;">Higher overall scores reflect stronger emotional intelligence. The breakdown below explains what the score for each section means.</p>
        <div class="understanding-card" style="border-color: #27AE60;">
          <h4 style="color: #27AE60;">Area of Strength (35-50)</h4>
          <p>Indicates areas of strength or potential strength. You are likely confident and effective in these aspects of emotional intelligence.</p>
        </div>
        <div class="understanding-card" style="border-color: #F39C12;">
          <h4 style="color: #F39C12;">Needs More Consistent Attention (18-34)</h4>
          <p>Indicates areas that are generally okay but could be more consistent. Focusing here can turn a moderate skill into a strong one.</p>
        </div>
        <div class="understanding-card" style="border-color: #B31B1B;">
          <h4 style="color: #B31B1B;">Needs Improvement (10-17)</h4>
          <p>Indicates areas of communication that would benefit most from focused development and practice.</p>
        </div>
      </div>

      <!-- PAGE 4: NEXT STEPS -->
      <div class="page page-break next-steps-section">
        <div class="header"><h2>Understanding Your Profile & Next Steps</h2></div>
        <p>This report provides a snapshot of your emotional intelligence based on your responses. Use these insights as a guide for personal and professional development.</p>
        <h4>Self-Awareness</h4>
        <p>Practice mindfulness and self-reflection. At the end of each day, ask yourself: "What emotions did I feel today, and what caused them?" Naming your emotions is the first step to understanding them.</p>
        <h4>Managing Emotions</h4>
        <p>When you feel a strong negative emotion, pause before reacting. Take a deep breath and count to ten. This small gap can prevent hasty decisions and allow for a more thoughtful response.</p>
        <h4>Motivating Oneself</h4>
        <p>Set clear, achievable goals. Break larger goals into smaller, manageable steps. Celebrate small victories to maintain momentum and build a positive feedback loop.</p>
        <h4>Empathy</h4>
        <p>Practice active listening. When talking with someone, focus completely on their words and body language. Try to understand their perspective from their point of view, not just your own.</p>
        <h4>Social Skill</h4>
        <p>Be mindful of your communication style. Pay attention to non-verbal cues, give clear messages, and be open to constructive feedback to build stronger relationships.</p>
        <div class="underline" style="margin-top: 40px;"></div>
        <p class="footer-contact">For further clarification regarding your results or guidance on next steps, please consult your trainer or reach out to us at hello@carnelianco.com</p>
      </div>
    </body>
    </html>
  `;
};

module.exports = { getPdfHtml };