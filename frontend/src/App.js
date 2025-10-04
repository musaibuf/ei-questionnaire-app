import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Container, Box, Typography, Button, Radio, RadioGroup,
  FormControlLabel, FormControl, FormLabel, Paper, LinearProgress, Alert, Grid, TextField, CircularProgress
} from '@mui/material';
import { createTheme, ThemeProvider, responsiveFontSizes } from '@mui/material/styles';

// --- ICONS ---
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StarIcon from '@mui/icons-material/Star';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DownloadIcon from '@mui/icons-material/Download';

// --- CHART.JS IMPORTS ---
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

// --- REGISTER CHART.JS COMPONENTS ---
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// --- THEME AND STYLES ---
let theme = createTheme({
  palette: {
    primary: { 
      main: '#F57C00',
      light: 'rgba(245, 124, 0, 0.08)',
    },
    secondary: { main: '#B31B1B' },
    text: { primary: '#2c3e50', secondary: '#34495e' },
    background: { default: '#f8f9fa', paper: '#FFFFFF' },
    action: { hover: 'rgba(245, 124, 0, 0.04)' }
  },
  typography: {
    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 700, color: '#B31B1B', textAlign: 'center' },
    h2: { fontWeight: 600, color: '#B31B1B', textAlign: 'center', marginBottom: '1.5rem' },
    h5: { color: '#F57C00', fontWeight: 600, borderBottom: '2px solid #F57C00', paddingBottom: '0.5rem', marginBottom: '1rem' },
    body1: { fontSize: '1rem', color: '#2c3e50' },
    body2: { fontSize: '0.9rem', color: '#34495e' },
  },
});
theme = responsiveFontSizes(theme);

const containerStyles = {
  padding: { xs: 2, sm: 3, md: 4 },
  margin: { xs: '1rem auto', md: '2rem auto' },
  borderRadius: '15px',
  backgroundColor: 'background.paper',
  border: '1px solid #e9ecef',
  maxWidth: { xs: '100%', sm: '700px', md: '900px' },
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
};

// --- EI QUESTIONNAIRE DATA ---
const sections = [
    {
        title: 'Self-Awareness',
        category: 'SA',
        questions: [
          { id: 1, text: "I realise immediately when I lose my temper" },
          { id: 6, text: "I know when I am happy" },
          { id: 11, text: "I usually recognise when I am stressed" },
          { id: 16, text: "When I am being 'emotional' I am aware of this" },
          { id: 21, text: "When I feel anxious, I usually can account for the reason(s)" },
          { id: 26, text: "I always know when I'm being unreasonable" },
          { id: 31, text: "Awareness of my own emotions is very important to me at all times" },
          { id: 36, text: "I can tell if someone has upset or annoyed me" },
          { id: 41, text: "I can let anger 'go' quickly so that it no longer affects me" },
          { id: 46, text: "I know what makes me happy" },
        ]
      },
      {
        title: 'Managing Emotions',
        category: 'ME',
        questions: [
          { id: 2, text: "I can 'reframe' bad situations quickly" },
          { id: 7, text: "I do not wear my 'heart on my sleeve'" },
          { id: 12, text: "Others can rarely tell what kind of mood I am in" },
          { id: 17, text: "I rarely 'fly off the handle' at other people" },
          { id: 22, text: "Difficult people do not annoy me" },
          { id: 27, text: "I can consciously alter my frame of mind or mood" },
          { id: 32, text: "I do not let stressful situations or people affect me once I have left work" },
          { id: 37, text: "I rarely worry about work or life in general" },
          { id: 42, text: "I can suppress my emotions when I need to" },
          { id: 47, text: "Others often do not know how I am feeling about things" },
        ]
      },
      {
        title: 'Motivating Oneself',
        category: 'MO',
        questions: [
          { id: 3, text: "I am able to always motivate myself to do difficult tasks" },
          { id: 8, text: "I am usually able to prioritise important activities at work and get on with them" },
          { id: 13, text: "I always meet deadlines" },
          { id: 18, text: "I never waste time" },
          { id: 23, text: "I do not deviate from the truth" },
          { id: 28, text: "I believe you should do the difficult things first" },
          { id: 33, text: "Delayed gratification is a virtue that I hold to" },
          { id: 38, text: "I believe in 'Action this Day'" },
          { id: 43, text: "I can always motivate myself even when I feel low" },
          { id: 48, text: "Motivations has been the key to my success" },
        ]
      },
      {
        title: 'Empathy',
        category: 'E',
        questions: [
          { id: 4, text: "I am always able to see things from the other person's viewpoint" },
          { id: 9, text: "I am excellent at empathising with someone else's problem" },
          { id: 14, text: "I can tell if someone is not happy with me" },
          { id: 19, text: "I can tell if a team of people are not getting along with each other" },
          { id: 24, text: "I can usually understand why people are being difficult towards me" },
          { id: 29, text: "I believe other individuals are not 'difficult' just 'different'" },
          { id: 34, text: "I can understand if I am being unreasonable" },
          { id: 39, text: "I can understand why my actions sometimes offend others" },
          { id: 44, text: "I can sometimes see things from others' point of view" },
          { id: 49, text: "Reasons for disagreements are always clear to me" },
        ]
      },
      {
        title: 'Social Skill',
        category: 'SS',
        questions: [
          { id: 5, text: "I am an excellent listener" },
          { id: 10, text: "I never interrupt other people's conversations" },
          { id: 15, text: "I am good at adapting and mixing with a variety of people" },
          { id: 20, text: "People are the most interesting thing in life for me" },
          { id: 25, text: "I love to meet new people and get to know what makes them 'tick'" },
          { id: 30, text: "I need a variety of work colleagues to make my job interesting" },
          { id: 35, text: "I like to ask questions to find out what it is important to people" },
          { id: 40, text: "I see working with difficult people as simply a challenge to win them over" },
          { id: 45, text: "I am good at reconciling differences with other people" },
          { id: 50, text: "I generally build solid relationships with those I work with" },
        ]
      },
];

const allQuestions = sections.flatMap(s => s.questions);

function App() {
  const [step, setStep] = useState('welcome');
  const [userInfo, setUserInfo] = useState({ name: '', organization: '' });
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, currentSectionIndex]);

  const handleStart = () => {
    if (userInfo.name && userInfo.organization) {
      setError('');
      setStep('assessment');
    } else {
      setError('Please fill out both your name and organization.');
    }
  };

  const handleResponseChange = (id, value) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  };

  const calculateScores = () => {
    const scores = { SA: 0, ME: 0, MO: 0, E: 0, SS: 0 };
    sections.forEach(section => {
      section.questions.forEach(q => {
        const responseValue = responses[q.id];
        if (responseValue) {
          scores[section.category] += parseInt(responseValue, 10);
        }
      });
    });
    return scores;
  };

  const handleSubmit = async () => {
    if (Object.keys(responses).length !== allQuestions.length) {
      setError('Please answer all questions before submitting.');
      return;
    }
    setError('');
    const calculatedScores = calculateScores();
    
    setResults(calculatedScores);
    setStep('results');

    const payload = {
      name: userInfo.name,
      organization: userInfo.organization,
      scores: calculatedScores,
    };

    try {
      await axios.post('/api/save-results', payload);
      console.log("Results successfully saved to Google Sheet.");
    } catch (error) {
      console.error("Failed to save results to Google Sheet:", error);
    }
  };

  const validateCurrentSection = () => {
    const currentQuestions = sections[currentSectionIndex].questions;
    return currentQuestions.every(q => responses.hasOwnProperty(q.id));
  };

  const handleNextSection = () => {
    if (validateCurrentSection()) {
      setError('');
      if (currentSectionIndex < sections.length - 1) {
        setCurrentSectionIndex(prev => prev + 1);
      }
    } else {
      setError('Please answer all questions in this section to continue.');
    }
  };

  const handlePreviousSection = () => {
    setError('');
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setError('');
    
    const chartImage = chartRef.current ? chartRef.current.toBase64Image() : '';

    const payload = {
        name: userInfo.name,
        organization: userInfo.organization,
        scores: results,
        chartImage: chartImage,
    };

    try {
        const response = await axios.post('/api/generate-pdf', payload, {
            responseType: 'blob',
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `EI-Report-${userInfo.name.replace(/\s+/g, '-')}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Error downloading PDF:", err);
        setError("Sorry, we couldn't generate your PDF at this time.");
    } finally {
        setIsDownloading(false);
    }
  };

  const renderWelcome = () => (
    <Paper elevation={3} sx={containerStyles}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box component="img" src="/logo.png" alt="Carnelian Logo" sx={{ maxWidth: { xs: '100px', sm: '120px' }, height: 'auto' }} />
        <Typography variant="h1">Emotional Intelligence (EI) Self-Assessment</Typography>
      </Box>
      <Typography variant="h5" align="center" color="text.secondary" sx={{ mb: 4, fontWeight: 'normal', px: { xs: 1, sm: 2 } }}>
        Assess your skills in self-awareness, managing emotions, motivation, empathy, and social skills.
      </Typography>
      <Box sx={{ maxWidth: { xs: '100%', sm: 400 }, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 2, px: { xs: 1, sm: 0 } }}>
        <TextField fullWidth label="Your Name" variant="outlined" value={userInfo.name} onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })} />
        <TextField fullWidth label="Your Organization" variant="outlined" value={userInfo.organization} onChange={(e) => setUserInfo({ ...userInfo, organization: e.target.value })} />
        {error && <Alert severity="error">{error}</Alert>}
        <Button variant="contained" size="large" color="primary" onClick={handleStart} disabled={!userInfo.name || !userInfo.organization} startIcon={<RocketLaunchIcon />} sx={{ mt: 2, py: 1.5, width: { xs: '100%', sm: 'auto' }, alignSelf: 'center' }}>
          Start Assessment
        </Button>
      </Box>
    </Paper>
  );

  const renderAssessment = () => {
    const progress = (Object.keys(responses).length / allQuestions.length) * 100;
    const currentSection = sections[currentSectionIndex];
    const radioOptions = [
        { value: '1', label: 'Not at all' },
        { value: '2', label: 'Infrequently' },
        { value: '3', label: 'Half the time' },
        { value: '4', label: 'Frequently' },
        { value: '5', label: 'Always' },
    ];

    const questionOffset = sections.slice(0, currentSectionIndex).reduce((acc, section) => acc + section.questions.length, 0);

    return (
      <Paper sx={containerStyles}>
        <Box sx={{ mb: 3, position: 'sticky', top: 0, backgroundColor: 'background.paper', zIndex: 1, pt: 2, px: { xs: 1, sm: 2 } }}>
          <Typography variant="h2">Section {currentSectionIndex + 1} of {sections.length}</Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
            {Object.keys(responses).length} of {allQuestions.length} questions answered
          </Typography>
          <LinearProgress variant="determinate" value={progress} sx={{ height: '8px', borderRadius: '4px' }} />
        </Box>
        <Box>
          <Typography variant="h5">{currentSection.title}</Typography>
          {currentSection.questions.map((q, index) => (
            <FormControl key={q.id} component="fieldset" fullWidth sx={{ mb: 2, borderTop: '1px solid #eee', pt: 2 }}>
              <FormLabel component="legend" sx={{ fontWeight: 500, mb: 1.5, color: 'text.primary', fontSize: '1.05rem' }}>{`${questionOffset + index + 1}. ${q.text}`}</FormLabel>
              <RadioGroup
                value={responses[q.id] || ''}
                onChange={(e) => handleResponseChange(q.id, e.target.value)}
                sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1, sm: 1.5 }, justifyContent: 'center' }}
              >
                {radioOptions.map(({ value, label }) => {
                  const isSelected = responses[q.id] === value;
                  return (
                    <FormControlLabel
                      key={value}
                      value={value}
                      control={<Radio sx={{ display: 'none' }} />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                          <Box component="span" sx={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid', borderColor: isSelected ? 'primary.main' : '#ccc', backgroundColor: isSelected ? 'primary.main' : 'transparent', mr: 1.5, flexShrink: 0 }} />
                          <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? 'text.primary' : 'text.secondary' }}>
                            {label}
                          </Typography>
                        </Box>
                      }
                      sx={{ m: 0, flex: { sm: 1 }, p: 1.5, cursor: 'pointer', border: '2px solid', borderColor: isSelected ? 'primary.main' : '#ddd', backgroundColor: isSelected ? 'primary.light' : 'transparent', borderRadius: 2, '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover' } }}
                    />
                  );
                })}
              </RadioGroup>
            </FormControl>
          ))}
        </Box>
        {error && <Alert severity="warning" sx={{ mt: 3 }}>{error}</Alert>}
        <Box sx={{ display: 'flex', flexDirection: 'column-reverse', gap: 1.5, mt: 4, pt: 3, borderTop: '1px solid #eee' }}>
          {currentSectionIndex < sections.length - 1 ? (
            <Button variant="contained" fullWidth size="large" onClick={handleNextSection} endIcon={<ArrowForwardIcon />}>Next Section</Button>
          ) : (
            <Button variant="contained" fullWidth size="large" color="primary" onClick={handleSubmit}>Submit & View Results</Button>
          )}
          {currentSectionIndex > 0 && (<Button variant="outlined" fullWidth size="large" onClick={handlePreviousSection} startIcon={<ArrowBackIcon />}>Previous</Button>)}
        </Box>
      </Paper>
    );
  };

  const renderResults = () => {
    if (!results) return null;

    const competencyMap = { SA: 'Self-Awareness', ME: 'Managing Emotions', MO: 'Motivating Oneself', E: 'Empathy', SS: 'Social Skill' };
    
    const chartOrder = ['SA', 'E', 'MO', 'ME', 'SS'];
    const reorderedScores = chartOrder.map(key => results[key]);
    const reorderedLabels = chartOrder.map(key => competencyMap[key]);

    const scoresWithTitles = Object.keys(results).map(key => ({
      title: competencyMap[key],
      score: results[key]
    }));

    const chartData = {
      labels: reorderedLabels.map(label => label.replace(' ', '\n')),
      datasets: [{
        label: 'Your Score',
        data: reorderedScores,
        backgroundColor: 'rgba(245, 124, 0, 0.2)',
        borderColor: '#F57C00',
        borderWidth: 2,
        pointBackgroundColor: '#F57C00',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#F57C00',
      }],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                grid: { color: 'rgba(0, 0, 0, 0.1)' },
                suggestedMin: 10,
                suggestedMax: 50,
                ticks: { stepSize: 10, backdropColor: 'transparent', color: 'rgba(0, 0, 0, 0.5)' },
                pointLabels: { font: { size: 12 }, color: '#34495e' },
            },
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.raw} / 50`;
                    }
                }
            }
        }
    };

    const getInterpretation = (score) => {
      if (score >= 35) return { text: 'This area is a strength for you.', color: 'primary.main' };
      if (score >= 18) return { text: 'Giving attention here will pay dividends.', color: 'warning.dark' };
      return { text: 'Make this area a development priority.', color: 'secondary.main' };
    };

    return (
      <Paper sx={containerStyles}>
        <Box textAlign="center" mb={3}>
          <Typography variant="h1" component="h1">Your Results</Typography>
          <Typography variant="h6" color="text.secondary">View your scores, strengths, and areas for improvement</Typography>
        </Box>

        <Grid container spacing={4} alignItems="center" sx={{ my: 2 }}>
          <Grid item xs={12} md={7}>
            <Box sx={{ position: 'relative', height: { xs: '300px', sm: '400px' } }}>
              <Radar ref={chartRef} data={chartData} options={chartOptions} />
            </Box>
            <Typography variant="caption" display="block" textAlign="center" mt={2}>
              This chart visualizes your scores across the five key areas, showing your unique emotional intelligence profile at a glance.
            </Typography>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}><StarIcon /> Area of Strength</Typography>
              <Typography>Your highest score is in: <strong>{scoresWithTitles.filter(s => s.score === Math.max(...scoresWithTitles.map(item => item.score))).map(s => s.title).join(', ')}</strong></Typography>
            </Paper>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" component="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'secondary.main' }}><TrendingUpIcon /> Area for Improvement</Typography>
              <Typography>An area with potential for growth is: <strong>{scoresWithTitles.filter(s => s.score === Math.min(...scoresWithTitles.map(item => item.score))).map(s => s.title).join(', ')}</strong></Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box my={4}>
          <Typography variant="h4" textAlign="center" gutterBottom>Detailed Breakdown</Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {scoresWithTitles.map((item) => {
              const interpretation = getInterpretation(item.score);
              return (
                <Box key={item.title} sx={{ backgroundColor: 'primary.light', borderLeft: '5px solid', borderColor: 'primary.main', p: 2, borderRadius: '8px' }}>
                  <Typography variant="h6" component="h3" sx={{ color: 'primary.main', fontSize: '1.1rem' }}>{item.title}</Typography>
                  <Typography>Score: {item.score} / 50 - <Typography component="span" sx={{ color: interpretation.color, fontWeight: 'bold' }}>{interpretation.text}</Typography></Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #eee', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            startIcon={isDownloading ? <CircularProgress size={24} color="inherit" /> : <DownloadIcon />}
            sx={{ width: { xs: '100%', sm: 'auto' }, py: 1.5 }}
          >
            {isDownloading ? 'Generating Report...' : 'Download Report'}
          </Button>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Thank you for taking the assessment. Your detailed PDF report will include all scores and interpretations.
          </Typography>
        </Box>
      </Paper>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <Container component="main" sx={{ mt: { xs: 2, sm: 3 }, mb: 4, px: { xs: 2, sm: 3 } }}>
        {step === 'welcome' && renderWelcome()}
        {step === 'assessment' && renderAssessment()}
        {step === 'results' && renderResults()}
      </Container>
    </ThemeProvider>
  );
}

export default App;