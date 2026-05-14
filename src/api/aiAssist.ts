import { load_dotenv } from 'dotenv';
import { groq } from 'groq-sdk';

// Load environment variables
load_dotenv();

const groqClient = new groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function analyzeDetectionData(prompt: string) {
  try {
    const completion = await groqClient.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an AI assistant specialized in analyzing surveillance and detection data. 
          Provide insights, patterns, and recommendations based on the detection data.
          Format your response in a clear, structured way with sections for:
          - Key Findings
          - Patterns Identified
          - Recommendations
          - Risk Assessment`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3-70b-8192",
      temperature: 0.3,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || 'No response generated';
  } catch (error) {
    console.error('Error calling Groq API:', error);
    throw new Error('Failed to analyze detection data');
  }
} 