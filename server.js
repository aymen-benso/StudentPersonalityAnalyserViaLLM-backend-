//AIzaSyBEe_wW86fTLuDpge16VMxWhc_mzCl07zY

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('combined')); // Log HTTP requests

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Use the API key from environment variables
const GEMINI_API_KEY = 'AIzaSyBEe_wW86fTLuDpge16VMxWhc_mzCl07zY';

// Initialize GoogleGenerativeAI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Sample question types
const questionTypes = [
    { question: "On a scale of 1 to 5, how much do you enjoy participating in group discussions?", type: "scale" },
    { question: "Do you feel energized after spending time with large groups of people?", type: "yesno" },
    { question: "Do you prefer working alone rather than in teams?", type: "yesno" },
    { question: "On a scale of 1 to 5, how much do you focus on facts and details when learning?", type: "scale" },
    { question: "Do you enjoy working on theoretical or abstract problems more than practical ones?", type: "yesno" },
    { question: "How often do you look for patterns or deeper meaning in what you're learning?", type: "multiple-choice" },
    { question: "On a scale of 1 to 5, how much do you enjoy learning new ideas or exploring different perspectives?", type: "scale" },
    { question: "Do you prefer sticking to traditional methods rather than experimenting with new ways?", type: "yesno" },
    { question: "How likely are you to try something unfamiliar in your studies or work?", type: "multiple-choice" },
    { question: "On a scale of 1 to 5, how organized and structured are you in managing your tasks?", type: "scale" },
    { question: "Do you often plan ahead and set goals for yourself?", type: "yesno" },
    { question: "How often do you procrastinate on tasks or assignments?", type: "multiple-choice" },
    { question: "On a scale of 1 to 5, how much do you enjoy learning by doing, such as through hands-on activities or projects?", type: "scale" },
    { question: "Do you prefer to think through problems before trying to solve them?", type: "yesno" },
    { question: "Do you prefer to try out new learning material immediately rather than reflecting on it first?", type: "yesno" },
    { question: "On a scale of 1 to 5, how often do you take the lead in group projects?", type: "scale" },
    { question: "Do you enjoy being the one to direct and guide others in class activities?", type: "yesno" },
    { question: "On a scale of 1 to 5, how often do you ask questions during class?", type: "scale" },
    { question: "Do you enjoy self-paced learning, where you have control over how and when you study?", type: "yesno" },
    { question: "On a scale of 1 to 5, how much do you enjoy learning in group settings?", type: "scale" },
];

// Function to validate responses
function validateResponses(responses) {
    for (const [key, value] of Object.entries(responses)) {
        // Convert key to number to match the question index
        console.log('key:', key);
        
        const questionIndex = Number(key);

        const question = questionTypes[questionIndex];

        if (!question) {
            console.error(`Invalid question index: ${key}`);
            return false; // Invalid question index
        }

        switch (question.type) {
            case 'scale':
                if (typeof value !== 'number' || value < 1 || value > 5) {
                    console.error(`Invalid scale response for question ${key}: ${value}`);
                    return false;
                }
                break;
            case 'yesno':
                if (!['yes', 'no'].includes(value)) {
                    console.error(`Invalid yes/no response for question ${key}: ${value}`);
                    return false;
                }
                break;
            case 'multiple-choice':
                const validChoices = ['Never', 'Sometimes', 'Often', 'Very likely', 'Neutral','Likely','Unlikely'];
                if (!validChoices.includes(value)) {
                    console.error(`Invalid multiple-choice response for question ${key}: ${value}`);
                    return false;
                }
                break;
            default:
                console.error(`Unsupported question type for question ${key}`);
                return false; // Unsupported question type
        }
    }
    return true;
}



// Evaluate endpoint
app.post('/evaluate', async (req, res) => {
    try {
        const studentResponses = req.body.responses;

        console.log('Student responses before :', studentResponses);

        // Validate responses before proceeding
        const isValid = validateResponses(studentResponses);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid responses format or values.' });
        }

        console.log('Student responses:', studentResponses);
        const prompt = generatePrompt(studentResponses);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent(prompt);

        // Ensure the response from the model is valid
        if (!result || !result.response || !result.response.text) {
            throw new Error('Model response is malformed or missing.');
        }

        console.log('Generated report:', result.response.text());
        return res.json({ report: result.response.text() });
    } catch (error) {
        console.error('Error fetching model:', error.message);
        return res.status(500).json({ error: 'Failed to generate personality report.' });
    }
});


// Test endpoint
app.get('/test', async (req, res) => {
    const testResponses = {
        "1": 4,
        "2": "yes",
        "3": "no",
        "4": 3,
        "5": "yes",
        "6": "sometimes",
        "7": 5,
        "8": "no",
        "9": "very likely",
        "10": 2,
        "11": "yes",
        "12": "often",
        "13": 5,
        "14": "yes",
        "15": 4,
        "16": "yes",
        "17": 5,
        "18": "yes",
        "19": 3,
        "20": 5
    };

    try {
        const prompt = generatePrompt(testResponses);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const result = await model.generateContent(prompt);
        console.log('Generated report:', result.response.text());
        return res.json({ report: result.response.text() });
    } catch (error) {
        console.error('Error fetching model:', error.message);
        return res.status(500).json({ error: 'Failed to generate personality report.' });
    }
});

// Function to generate prompt
function generatePrompt(responses) {
    return `Based on the following responses from a personality assessment:\n` +
        Object.entries(responses).map(([key, value]) => {
            const questionIndex = Number(key); // Change here to match the indexing
            const question = questionTypes[questionIndex]; // Access question directly using the index
            return `Question ${key}: ${question.question} - Response: ${value}`;
        }).join('\n') +
        `\n\nGenerate a detailed personality profile. Provide the results in the following format:\n` +
        `{\n` +
        `  "mbti": {\n` +
        `    "type": "<MBTI_TYPE>",\n` +
        `    "dimensions": [\n` +
        `      { "name": "Extraversion", "value": <percentage> },\n` +
        `      { "name": "Intuition", "value": <percentage> },\n` +
        `      { "name": "Feeling", "value": <percentage> },\n` +
        `      { "name": "Perceiving", "value": <percentage> }\n` +
        `    ]\n` +
        `  },\n` +
        `  "bigFive": [\n` +
        `    { "name": "Openness", "value": <percentage> },\n` +
        `    { "name": "Conscientiousness", "value": <percentage> },\n` +
        `    { "name": "Extraversion", "value": <percentage> },\n` +
        `    { "name": "Agreeableness", "value": <percentage> },\n` +
        `    { "name": "Neuroticism", "value": <percentage> }\n` +
        `  ],\n` +
        `  "learningStyles": [\n` +
        `    { "name": "Social Learner", "value": <percentage> },\n` +
        `    { "name": "Active Learner", "value": <percentage> },\n` +
        `    { "name": "Reflective Learner", "value": <percentage> },\n` +
        `    { "name": "Independent Learner", "value": <percentage> }\n` +
        `  ],\n` +
        `  "socialLearning": <percentage>,\n` +
        `  "independentLearning": <percentage>,\n` +
        `  "neuroticismScore": <SCORE>,\n` +
        `  "leadershipPotential": <true/false>,\n` +
        `  "collaborationSuitability": <true/false>\n` +
        `}`;
}
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
