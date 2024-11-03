const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { OpenAI } = require('openai'); // Correctly require OpenAI
require('dotenv').config();

const app = express();
const port = 8080;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Correctly configure the OpenAI API client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.post('/summarize', async (req, res) => {
    const { image } = req.body;

    try {
        const completion = await openai.chat.completions.create({ // Use the correct method
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Please summarize this screenshot:"
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: image, // Use the base64 image string directly
                                detail: "high"
                            },
                        },
                    ],
                },
            ],
        });

        const summary = completion.choices[0].message.content; // Access content correctly
        res.json({ summary });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to summarize.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
})