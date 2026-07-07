import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not defined.');
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  // Using public model list endpoint if supported, or listing via an API call
  // Note: the JS SDK doesn't expose listModels directly on the main class in all versions, 
  // but let's try a simple generateContent call to 'gemini-1.5-flash-latest' or see what happens.
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    const res = await model.generateContent('Hello');
    console.log('gemini-1.5-flash-latest success:', res.response.text());
  } catch (err: any) {
    console.error('gemini-1.5-flash-latest failed:', err.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
    const res = await model.generateContent('Hello');
    console.log('gemini-1.5-pro-latest success:', res.response.text());
  } catch (err: any) {
    console.error('gemini-1.5-pro-latest failed:', err.message);
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const res = await model.generateContent('Hello');
    console.log('gemini-2.5-flash success:', res.response.text());
  } catch (err: any) {
    console.error('gemini-2.5-flash failed:', err.message);
  }
}

main().catch(console.error);
