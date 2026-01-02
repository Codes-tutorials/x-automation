import cron from 'node-cron';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to scheduled tweets file
const scheduledTweetsPath = join(__dirname, '../../data/scheduled-tweets.json');

// Store active cron jobs
const activeJobs = new Map();

// Simple console logging for standalone operations
const simpleLogger = {
    info: (msg) => console.log(`ℹ ${msg}`),
    success: (msg) => console.log(`✓ ${msg}`),
    error: (msg) => console.error(`✗ ${msg}`),
    schedule: (msg) => console.log(`📅 ${msg}`),
    plain: (msg) => console.log(msg),
};

/**
 * Load scheduled tweets from the JSON file
 * @returns {Array} - Array of scheduled tweet objects
 */
export function loadScheduledTweets() {
    try {
        if (!existsSync(scheduledTweetsPath)) {
            return [];
        }
        const data = readFileSync(scheduledTweetsPath, 'utf8');
        const parsed = JSON.parse(data);
        return parsed.scheduled || [];
    } catch (error) {
        console.error(`Failed to load scheduled tweets: ${error.message}`);
        return [];
    }
}

/**
 * Save scheduled tweets to the JSON file
 * @param {Array} tweets - Array of scheduled tweet objects
 */
export function saveScheduledTweets(tweets) {
    try {
        const data = JSON.stringify({ scheduled: tweets }, null, 2);
        writeFileSync(scheduledTweetsPath, data, 'utf8');
    } catch (error) {
        console.error(`Failed to save scheduled tweets: ${error.message}`);
    }
}

/**
 * Generate a unique ID for a scheduled tweet
 */
function generateId() {
    return `tweet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Schedule a new tweet
 * @param {string} text - The tweet content
 * @param {string} cronExpression - Cron expression for scheduling (e.g., "0 9 * * *" for daily at 9 AM)
 * @param {boolean} oneTime - If true, tweet will be removed after posting
 * @returns {object} - The scheduled tweet object
 */
export function scheduleTweet(text, cronExpression, oneTime = false) {
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    if (!text || text.trim().length === 0) {
        throw new Error('Tweet text cannot be empty');
    }

    if (text.length > 280) {
        throw new Error(`Tweet exceeds 280 characters (${text.length} chars)`);
    }

    const scheduledTweet = {
        id: generateId(),
        text: text.trim(),
        cronExpression,
        oneTime,
        createdAt: new Date().toISOString(),
        lastPosted: null,
        postCount: 0,
    };

    // Load existing tweets and add new one
    const tweets = loadScheduledTweets();
    tweets.push(scheduledTweet);
    saveScheduledTweets(tweets);

    simpleLogger.schedule(`Tweet scheduled: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    simpleLogger.info(`ID: ${scheduledTweet.id}`);
    simpleLogger.info(`Schedule: ${cronExpression}`);
    simpleLogger.info(`One-time: ${oneTime ? 'Yes' : 'No (recurring)'}`);

    return scheduledTweet;
}

/**
 * Remove a scheduled tweet by ID
 * @param {string} id - The tweet ID to remove
 * @returns {boolean} - True if removed successfully
 */
export function removeScheduledTweet(id) {
    const tweets = loadScheduledTweets();
    const index = tweets.findIndex((t) => t.id === id);

    if (index === -1) {
        simpleLogger.error(`Scheduled tweet not found: ${id}`);
        return false;
    }

    const removed = tweets.splice(index, 1)[0];
    saveScheduledTweets(tweets);

    // Stop the cron job if running
    if (activeJobs.has(id)) {
        activeJobs.get(id).stop();
        activeJobs.delete(id);
    }

    simpleLogger.success(`Removed scheduled tweet: ${id}`);
    simpleLogger.info(`Text: "${removed.text.substring(0, 50)}${removed.text.length > 50 ? '...' : ''}"`);

    return true;
}

/**
 * List all scheduled tweets
 * @returns {Array} - Array of scheduled tweet objects
 */
export function listScheduledTweets() {
    const tweets = loadScheduledTweets();

    if (tweets.length === 0) {
        simpleLogger.info('No scheduled tweets found.');
        return tweets;
    }

    simpleLogger.plain('\n📋 Scheduled Tweets:\n');
    simpleLogger.plain('─'.repeat(60));

    tweets.forEach((tweet, index) => {
        simpleLogger.plain(`\n${index + 1}. ID: ${tweet.id}`);
        simpleLogger.plain(`   Text: "${tweet.text.substring(0, 50)}${tweet.text.length > 50 ? '...' : ''}"`);
        simpleLogger.plain(`   Schedule: ${tweet.cronExpression}`);
        simpleLogger.plain(`   One-time: ${tweet.oneTime ? 'Yes' : 'No'}`);
        simpleLogger.plain(`   Created: ${new Date(tweet.createdAt).toLocaleString()}`);
        if (tweet.lastPosted) {
            simpleLogger.plain(`   Last posted: ${new Date(tweet.lastPosted).toLocaleString()}`);
            simpleLogger.plain(`   Post count: ${tweet.postCount}`);
        }
    });

    simpleLogger.plain('\n' + '─'.repeat(60) + '\n');

    return tweets;
}

/**
 * Start the scheduler daemon
 * Loads all scheduled tweets and creates cron jobs for them
 * @param {Function} postTweetFn - The function to post tweets (passed to avoid circular import)
 */
export async function startScheduler(postTweetFn) {
    const tweets = loadScheduledTweets();

    if (tweets.length === 0) {
        simpleLogger.info('No scheduled tweets to run. Add some with: npm run schedule "text" "cron"');
        return;
    }

    simpleLogger.info(`Starting scheduler with ${tweets.length} scheduled tweet(s)...`);

    tweets.forEach((tweet) => {
        const job = cron.schedule(tweet.cronExpression, async () => {
            simpleLogger.schedule(`Executing scheduled tweet: ${tweet.id}`);

            try {
                await postTweetFn(tweet.text);

                // Update last posted time
                const allTweets = loadScheduledTweets();
                const tweetIndex = allTweets.findIndex((t) => t.id === tweet.id);

                if (tweetIndex !== -1) {
                    allTweets[tweetIndex].lastPosted = new Date().toISOString();
                    allTweets[tweetIndex].postCount = (allTweets[tweetIndex].postCount || 0) + 1;

                    // Remove if one-time
                    if (tweet.oneTime) {
                        allTweets.splice(tweetIndex, 1);
                        job.stop();
                        activeJobs.delete(tweet.id);
                        simpleLogger.info(`One-time tweet removed: ${tweet.id}`);
                    }

                    saveScheduledTweets(allTweets);
                }
            } catch (error) {
                simpleLogger.error(`Failed to post scheduled tweet ${tweet.id}: ${error.message}`);
            }
        });

        activeJobs.set(tweet.id, job);
        simpleLogger.success(`Scheduled: ${tweet.id} (${tweet.cronExpression})`);
    });

    simpleLogger.plain('\n🚀 Scheduler is running! Press Ctrl+C to stop.\n');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        simpleLogger.info('\nStopping scheduler...');
        activeJobs.forEach((job) => job.stop());
        simpleLogger.success('Scheduler stopped. Goodbye!');
        process.exit(0);
    });
}

export default {
    scheduleTweet,
    removeScheduledTweet,
    listScheduledTweets,
    loadScheduledTweets,
    startScheduler,
};
