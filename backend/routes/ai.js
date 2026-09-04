const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/ai/scan-receipt
router.post('/scan-receipt', verifyToken, async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ message: 'imageBase64 is required' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: 'models/gemini-3.5-flash',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            {
              text: `You are a receipt parser for Indian receipts. Extract the following fields from this receipt image and return ONLY a valid JSON object with no markdown, no explanation, and no extra text.

Required fields:
- merchant (string): The store or business name
- amount (number): The total amount paid in Indian Rupees (numeric value only, strip all currency symbols like ₹, Rs, INR)
- category (string): One of [Food, Travel, Shopping, Entertainment, Health, Utilities, Other]
- date (string): The transaction date in ISO 8601 format (YYYY-MM-DD). If no date is visible, use today's date.

Example output:
{"merchant":"Swiggy","amount":349,"category":"Food","date":"2024-06-15"}`,
            },
          ],
        },
      ],
    });

    const rawText = response.text.trim();

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Strip markdown code fences if the model wraps the JSON
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        return res.status(422).json({ message: 'Could not parse receipt', raw: rawText });
      }
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ message: 'Receipt scan failed', error: err.message });
  }
});

module.exports = router;
