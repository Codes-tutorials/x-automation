import { TwitterApi } from 'twitter-api-v2';
import config, { validateConfig } from '../config/index.js';
import logger from '../utils/logger.js';

// Validate credentials on import
validateConfig();

/**
 * Initialize the X API client with OAuth 1.0a User Context
 * This allows posting tweets on behalf of the authenticated user
 */
const client = new TwitterApi({
    appKey: config.x.apiKey,
    appSecret: config.x.apiSecret,
    accessToken: config.x.accessToken,
    accessSecret: config.x.accessTokenSecret,
});

// Get the read-write client
const rwClient = client.readWrite;

/**
 * Post a tweet to X
 * @param {string} text - The tweet content (max 280 characters)
 * @returns {Promise<object>} - The created tweet data
 */
export async function postTweet(text) {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error('Tweet text cannot be empty');
        }

        if (text.length > 280) {
            throw new Error(`Tweet exceeds 280 characters (${text.length} chars)`);
        }

        logger.info(`Posting tweet (${text.length} chars)...`);

        const { data } = await rwClient.v2.tweet(text);

        logger.success(`Tweet posted successfully!`);
        logger.tweet(`"${text}"`);
        logger.info(`Tweet ID: ${data.id}`);
        logger.info(`View at: https://x.com/i/web/status/${data.id}`);

        return data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
}

/**
 * Post a tweet with a reply to another tweet
 * @param {string} text - The tweet content
 * @param {string} replyToId - The tweet ID to reply to
 * @returns {Promise<object>} - The created tweet data
 */
export async function postReply(text, replyToId) {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error('Tweet text cannot be empty');
        }

        logger.info(`Posting reply to tweet ${replyToId}...`);

        const { data } = await rwClient.v2.tweet(text, {
            reply: { in_reply_to_tweet_id: replyToId },
        });

        logger.success(`Reply posted successfully!`);
        logger.info(`Tweet ID: ${data.id}`);

        return data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
}

/**
 * Delete a tweet by ID
 * @param {string} tweetId - The ID of the tweet to delete
 * @returns {Promise<boolean>} - True if deleted successfully
 */
export async function deleteTweet(tweetId) {
    try {
        logger.info(`Deleting tweet ${tweetId}...`);

        await rwClient.v2.deleteTweet(tweetId);

        logger.success(`Tweet ${tweetId} deleted successfully!`);
        return true;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
}

/**
 * Get authenticated user info
 * @returns {Promise<object>} - The user data
 */
export async function getMe() {
    try {
        const { data } = await rwClient.v2.me();
        return data;
    } catch (error) {
        handleApiError(error);
        throw error;
    }
}

/**
 * Verify API credentials by fetching user info
 * @returns {Promise<boolean>} - True if credentials are valid
 */
export async function verifyCredentials() {
    try {
        logger.info('Verifying X API credentials...');
        const user = await getMe();
        logger.success(`Authenticated as @${user.username}`);
        return true;
    } catch (error) {
        logger.error('Failed to verify credentials');
        return false;
    }
}

/**
 * Handle API errors with user-friendly messages
 */
function handleApiError(error) {
    if (error.code === 403) {
        logger.error('Access forbidden. Check your app permissions (need Read and Write).');
    } else if (error.code === 401) {
        logger.error('Unauthorized. Check your API credentials.');
    } else if (error.code === 429) {
        logger.error('Rate limit exceeded. Please wait before trying again.');
    } else if (error.data?.detail) {
        logger.error(`API Error: ${error.data.detail}`);
    } else {
        logger.error(`Error: ${error.message}`);
    }
}

export default {
    postTweet,
    postReply,
    deleteTweet,
    getMe,
    verifyCredentials,
};
