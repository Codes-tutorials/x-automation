import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Mistral } from '@mistralai/mistralai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

/**
 * Available LLM providers
 */
export const LLM_PROVIDERS = {
    GROQ: 'groq',
    GEMINI: 'gemini',
    MISTRAL: 'mistral',
};

/**
 * Tone descriptions for tweet generation
 */
const toneDescriptions = {
    professional: 'professional, polished, and industry-appropriate',
    casual: 'friendly, relaxed, and conversational',
    humorous: 'witty, funny, and entertaining',
    inspirational: 'motivational, uplifting, and encouraging',
    informative: 'educational, factual, and insightful',
    controversial: 'thought-provoking, bold, and discussion-sparking',
};

/**
 * System prompt for tweet generation
 */
function getSystemPrompt(tone) {
    const toneDesc = toneDescriptions[tone] || toneDescriptions.professional;
    return `You are a social media expert who writes viral tweets. Your tweets are ${toneDesc}.

Rules:
- Write longer tweets, approximately 300-400 characters
- Format the tweet into 2-3 distinct paragraphs/lines for readability
- Use emojis sparingly but effectively (1-3 max)
- Include relevant hashtags when appropriate (1-2 max)
- Make the tweet engaging and shareable
- Do NOT use quotation marks around the tweet
- Return ONLY the tweet text, nothing else`;
}

/**
 * Clean and validate tweet text
 */
function cleanTweet(tweet) {
    if (!tweet) return null;

    // Remove quotes if present
    let cleanTweet = tweet.trim().replace(/^["']|["']$/g, '');

    // Truncate if over 500 characters (safety limit for the new 300-400 goal)
    if (cleanTweet.length > 500) {
        cleanTweet = cleanTweet.substring(0, 497) + '...';
    }

    return cleanTweet;
}

/**
 * Generate tweet using Groq
 */
async function generateWithGroq(prompt, tone, apiKey) {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
        messages: [
            { role: 'system', content: getSystemPrompt(tone) },
            { role: 'user', content: `Write a tweet about: ${prompt}` },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 300,
    });

    return completion.choices[0]?.message?.content;
}

/**
 * Generate tweet using Google Gemini
 */
async function generateWithGemini(prompt, tone, apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const fullPrompt = `${getSystemPrompt(tone)}\n\nWrite a tweet about: ${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
}

/**
 * Generate tweet using Mistral
 */
async function generateWithMistral(prompt, tone, apiKey) {
    const mistral = new Mistral({ apiKey });

    const result = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [
            { role: 'system', content: getSystemPrompt(tone) },
            { role: 'user', content: `Write a tweet about: ${prompt}` },
        ],
        temperature: 0.8,
        maxTokens: 150,
    });

    return result.choices[0]?.message?.content;
}

/**
 * Generate a tweet using the specified LLM provider
 * @param {string} prompt - What the user wants to tweet about
 * @param {string} tone - The tone of the tweet
 * @param {string} provider - LLM provider (groq, gemini, mistral)
 * @param {string} apiKey - API key for the provider
 * @returns {Promise<string>} - Generated tweet text
 */
export async function generateTweet(prompt, tone = 'professional', provider = 'groq', apiKey = null) {
    // Use environment variable if no API key provided
    if (!apiKey) {
        switch (provider) {
            case LLM_PROVIDERS.GROQ:
                apiKey = process.env.GROQ_API_KEY;
                break;
            case LLM_PROVIDERS.GEMINI:
                apiKey = process.env.GEMINI_API_KEY;
                break;
            case LLM_PROVIDERS.MISTRAL:
                apiKey = process.env.MISTRAL_API_KEY;
                break;
        }
    }

    if (!apiKey || apiKey.includes('your_') || apiKey.includes('_here')) {
        throw new Error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key not configured. Please add it in settings.`);
    }

    try {
        let tweetText;

        switch (provider) {
            case LLM_PROVIDERS.GROQ:
                tweetText = await generateWithGroq(prompt, tone, apiKey);
                break;
            case LLM_PROVIDERS.GEMINI:
                tweetText = await generateWithGemini(prompt, tone, apiKey);
                break;
            case LLM_PROVIDERS.MISTRAL:
                tweetText = await generateWithMistral(prompt, tone, apiKey);
                break;
            default:
                throw new Error(`Unknown provider: ${provider}`);
        }

        const cleanedTweet = cleanTweet(tweetText);

        if (!cleanedTweet) {
            throw new Error('No tweet generated');
        }

        return cleanedTweet;
    } catch (error) {
        if (error.status === 401 || error.message?.includes('401')) {
            throw new Error(`Invalid ${provider} API key. Please check your credentials.`);
        }
        throw error;
    }
}

/**
 * Get available providers based on configured API keys
 */
export function getAvailableProviders() {
    const providers = [];

    if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your_')) {
        providers.push({ id: 'groq', name: 'Groq (Llama 3.3)', icon: '⚡' });
    }
    if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_')) {
        providers.push({ id: 'gemini', name: 'Google Gemini', icon: '✨' });
    }
    if (process.env.MISTRAL_API_KEY && !process.env.MISTRAL_API_KEY.includes('your_')) {
        providers.push({ id: 'mistral', name: 'Mistral AI', icon: '🌀' });
    }

    return providers;
}

export default {
    generateTweet,
    getAvailableProviders,
    LLM_PROVIDERS,
};
