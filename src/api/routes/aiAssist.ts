import { Request, Response } from 'express';
import { analyzeDetectionData } from '../aiAssist';

export async function handleAIAssist(req: Request, res: Response) {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const analysis = await analyzeDetectionData(prompt);
    res.json({ summary: analysis });
  } catch (error) {
    console.error('Error in AI assist endpoint:', error);
    res.status(500).json({ error: 'Failed to process AI analysis' });
  }
} 