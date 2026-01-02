import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env');
const uploadsDir = join(rootDir, 'uploads');
const distDir = join(rootDir, 'dist');

// Create uploads directory if it doesn't exist
if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
}

// Load existing .env if present
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3000;

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max for videos
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'));
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// Serve built React app (production)
if (existsSync(distDir)) {
    app.use(express.static(distDir));
}

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File is too large. Maximum size is 500MB.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
};

// Helper functions
function parseEnvFile(content) {
    const result = {};
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key) {
                result[key.trim()] = valueParts.join('=').trim();
            }
        }
    }
    return result;
}

function writeEnvFile(envObj) {
    const lines = [
        '# X (Twitter) API Credentials',
        `X_API_KEY=${envObj.X_API_KEY || ''}`,
        `X_API_SECRET=${envObj.X_API_SECRET || ''}`,
        `X_ACCESS_TOKEN=${envObj.X_ACCESS_TOKEN || ''}`,
        `X_ACCESS_TOKEN_SECRET=${envObj.X_ACCESS_TOKEN_SECRET || ''}`,
        '',
        '# LLM API Keys',
        `GROQ_API_KEY=${envObj.GROQ_API_KEY || ''}`,
        `GEMINI_API_KEY=${envObj.GEMINI_API_KEY || ''}`,
        `MISTRAL_API_KEY=${envObj.MISTRAL_API_KEY || ''}`,
    ];
    writeFileSync(envPath, lines.join('\n'), 'utf8');
    dotenv.config({ path: envPath });
}

function loadEnv() {
    if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf8');
        return parseEnvFile(content);
    }
    return {};
}

function maskValue(value) {
    if (!value || value.length < 12) return '****';
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

function isConfigured(value) {
    return Boolean(value && !value.includes('your_') && !value.includes('_here'));
}

async function getTwitterClient() {
    const { TwitterApi } = await import('twitter-api-v2');
    return new TwitterApi({
        appKey: process.env.X_API_KEY,
        appSecret: process.env.X_API_SECRET,
        accessToken: process.env.X_ACCESS_TOKEN,
        accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
    });
}

// ============ API Routes ============

// GET /api/credentials/status
app.get('/api/credentials/status', (req, res) => {
    const env = loadEnv();

    const hasXCredentials = Boolean(
        isConfigured(env.X_API_KEY) &&
        isConfigured(env.X_API_SECRET) &&
        isConfigured(env.X_ACCESS_TOKEN) &&
        isConfigured(env.X_ACCESS_TOKEN_SECRET)
    );

    const hasGroqKey = isConfigured(env.GROQ_API_KEY);
    const hasGeminiKey = isConfigured(env.GEMINI_API_KEY);
    const hasMistralKey = isConfigured(env.MISTRAL_API_KEY);

    const availableProviders = [];
    if (hasGroqKey) availableProviders.push({ id: 'groq', name: 'Groq (Llama 3.3)', icon: '⚡' });
    if (hasGeminiKey) availableProviders.push({ id: 'gemini', name: 'Google Gemini', icon: '✨' });
    if (hasMistralKey) availableProviders.push({ id: 'mistral', name: 'Mistral AI', icon: '🌀' });

    res.json({
        xConfigured: hasXCredentials,
        groqConfigured: hasGroqKey,
        geminiConfigured: hasGeminiKey,
        mistralConfigured: hasMistralKey,
        availableProviders,
        xApiKey: hasXCredentials ? maskValue(env.X_API_KEY) : '',
        groqApiKey: hasGroqKey ? maskValue(env.GROQ_API_KEY) : '',
        geminiApiKey: hasGeminiKey ? maskValue(env.GEMINI_API_KEY) : '',
        mistralApiKey: hasMistralKey ? maskValue(env.MISTRAL_API_KEY) : '',
    });
});

// POST /api/credentials
app.post('/api/credentials', (req, res) => {
    const { xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret, groqApiKey, geminiApiKey, mistralApiKey } = req.body;

    const env = loadEnv();

    if (xApiKey) env.X_API_KEY = xApiKey;
    if (xApiSecret) env.X_API_SECRET = xApiSecret;
    if (xAccessToken) env.X_ACCESS_TOKEN = xAccessToken;
    if (xAccessTokenSecret) env.X_ACCESS_TOKEN_SECRET = xAccessTokenSecret;
    if (groqApiKey) env.GROQ_API_KEY = groqApiKey;
    if (geminiApiKey) env.GEMINI_API_KEY = geminiApiKey;
    if (mistralApiKey) env.MISTRAL_API_KEY = mistralApiKey;

    writeEnvFile(env);
    Object.assign(process.env, env);

    res.json({ success: true, message: 'Credentials saved successfully!' });
});

// POST /api/generate
app.post('/api/generate', async (req, res) => {
    const { prompt, tone, provider = 'groq' } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const { generateTweet } = await import('./services/llmClient.js');
        const tweet = await generateTweet(prompt, tone || 'professional', provider);
        res.json({ tweet });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/tweets - Post a tweet (with optional media)
app.post('/api/tweets', async (req, res) => {
    const { text, mediaIds } = req.body;

    if (!text && (!mediaIds || mediaIds.length === 0)) {
        return res.status(400).json({ error: 'Tweet text or media is required' });
    }

    try {
        const client = await getTwitterClient();
        const rwClient = client.readWrite;

        const tweetOptions = {};
        if (text) tweetOptions.text = text;
        if (mediaIds && mediaIds.length > 0) {
            tweetOptions.media = { media_ids: mediaIds };
        }

        const { data } = await rwClient.v2.tweet(tweetOptions);

        res.json({
            success: true,
            tweetId: data.id,
            url: `https://x.com/i/web/status/${data.id}`,
        });
    } catch (error) {
        let errorMessage = error.message;
        if (error.code === 403) {
            errorMessage = 'Access forbidden. Your Access Token needs Read+Write permissions.';
        } else if (error.code === 401) {
            errorMessage = 'Unauthorized. Check your X API credentials.';
        } else if (error.data?.detail) {
            errorMessage = error.data.detail;
        }
        res.status(500).json({ error: errorMessage });
    }
});

// POST /api/tweets/reply - Reply to a tweet
app.post('/api/tweets/reply', async (req, res) => {
    const { tweetId, text, mediaIds } = req.body;

    if (!tweetId || !text) {
        return res.status(400).json({ error: 'Tweet ID and text are required' });
    }

    // Extract tweet ID from URL if necessary
    let replyToId = tweetId;
    if (tweetId.includes('x.com') || tweetId.includes('twitter.com')) {
        const match = tweetId.match(/status\/(\d+)/);
        if (match) replyToId = match[1];
    }

    try {
        const client = await getTwitterClient();
        const rwClient = client.readWrite;

        const tweetOptions = {
            text,
            reply: { in_reply_to_tweet_id: replyToId },
        };

        if (mediaIds && mediaIds.length > 0) {
            tweetOptions.media = { media_ids: mediaIds };
        }

        const { data } = await rwClient.v2.tweet(tweetOptions);

        res.json({
            success: true,
            tweetId: data.id,
            url: `https://x.com/i/web/status/${data.id}`,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/tweets/poll - Create a tweet with poll
app.post('/api/tweets/poll', async (req, res) => {
    const { text, options, durationMinutes = 1440 } = req.body;

    if (!text || !options || options.length < 2) {
        return res.status(400).json({ error: 'Text and at least 2 poll options are required' });
    }

    try {
        const client = await getTwitterClient();
        const rwClient = client.readWrite;

        const { data } = await rwClient.v2.tweet({
            text,
            poll: {
                options,
                duration_minutes: durationMinutes,
            },
        });

        res.json({
            success: true,
            tweetId: data.id,
            url: `https://x.com/i/web/status/${data.id}`,
        });
    } catch (error) {
        let errorMessage = error.message;
        if (error.message?.includes('poll')) {
            errorMessage = 'Polls require Elevated Access. Please upgrade your X Developer account.';
        }
        res.status(500).json({ error: errorMessage });
    }
});

// POST /api/media/upload - Upload media file
app.post('/api/media/upload', upload.single('media'), handleMulterError, async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const client = await getTwitterClient();
        const isVideo = req.file.mimetype.startsWith('video/');
        const isGif = req.file.mimetype === 'image/gif';

        console.log(`Uploading ${isVideo ? 'video' : 'image'}: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);

        // Upload media to Twitter
        const mediaId = await client.v1.uploadMedia(req.file.path, {
            mimeType: req.file.mimetype,
            longVideo: isVideo,
            additionalOwners: undefined,
        });

        console.log(`Upload successful! Media ID: ${mediaId}`);

        res.json({
            mediaId,
            url: `/uploads/${req.file.filename}`,
        });
    } catch (error) {
        console.error('Media upload error:', error);

        let errorMessage = error.message;

        // Handle common Twitter API errors
        if (error.code === 324) {
            errorMessage = 'Media type not supported or file is too large for Twitter.';
        } else if (error.code === 214) {
            errorMessage = 'Bad media: The file may be corrupt or in an unsupported format.';
        } else if (error.code === 403) {
            errorMessage = 'Access forbidden. Check your X API permissions.';
        } else if (error.message?.includes('ETIMEDOUT') || error.message?.includes('timeout')) {
            errorMessage = 'Upload timed out. Try with a smaller file.';
        }

        res.status(500).json({ error: errorMessage });
    }
});

// Catch-all route for React SPA (must be after API routes)
app.get('*', (req, res) => {
    const indexPath = join(distDir, 'index.html');
    if (existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({
            error: 'Frontend not built. Run: npm run build',
            hint: 'For development, use: npm run dev'
        });
    }
});

// Start server
app.listen(PORT, () => {
    const hasBuild = existsSync(join(distDir, 'index.html'));
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     ██╗  ██╗    ████████╗██╗    ██╗███████╗███████╗████████╗
║     ╚██╗██╔╝    ╚══██╔══╝██║    ██║██╔════╝██╔════╝╚══██╔══╝
║      ╚███╔╝        ██║   ██║ █╗ ██║█████╗  █████╗     ██║   
║      ██╔██╗        ██║   ██║███╗██║██╔══╝  ██╔══╝     ██║   
║     ██╔╝ ██╗       ██║   ╚███╔███╔╝███████╗███████╗   ██║   
║     ╚═╝  ╚═╝       ╚═╝    ╚══╝╚══╝ ╚══════╝╚══════╝   ╚═╝   
║                                                           ║
║           🐦 X Tweet Automation v3.0 🚀                   ║
╚═══════════════════════════════════════════════════════════╝

  🌐 Server: http://localhost:${PORT}
  📦 Frontend: ${hasBuild ? '✅ Built & Serving' : '❌ Not built (run: npm run build)'}
  
  Features:
  📝 Text tweets    📷 Images    🎬 Videos
  📊 Polls          ↩️  Replies  ✨ AI Generation
  `);
});

