// backend/generateChart.js
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const generateChartImage = async (scores) => {
    const width = 600;
    const height = 500;
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: '#FFFFFF' });

    const competencyMap = { SA: 'Self-Awareness', ME: 'Managing Emotions', MO: 'Motivating Oneself', E: 'Empathy', SS: 'Social Skill' };
    const chartOrder = ['MO', 'E', 'SA', 'ME', 'SS']; // Your desired order
    const reorderedScores = chartOrder.map(key => scores[key]);
    const reorderedLabels = chartOrder.map(key => competencyMap[key].replace(' ', '\n'));

    const configuration = {
        type: 'radar',
        data: {
            labels: reorderedLabels,
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
        },
        options: {
            scales: {
                r: {
                    angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
                    grid: { color: 'rgba(0, 0, 0, 0.1)' },
                    suggestedMin: 10,
                    suggestedMax: 50,
                    ticks: { stepSize: 10, backdropColor: 'transparent', color: 'rgba(0, 0, 0, 0.5)' },
                    pointLabels: { font: { size: 14 }, color: '#34495e' },
                },
            },
            plugins: {
                legend: { display: false },
            }
        }
    };

    const imageBuffer = await chartJSNodeCanvas.renderToBuffer(configuration);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
};

module.exports = { generateChartImage };