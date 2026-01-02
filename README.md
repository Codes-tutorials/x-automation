# 🐦 X Tweet Automation v3.0

A powerful web-based tool for automating X (Twitter) posts with AI-powered tweet generation, media uploads, polls, and replies.

## ✨ Features

### Web UI
- **🎨 Modern React Interface** - Beautiful dark/light theme with glassmorphism design
- **📝 Tweet Composer** - Rich text editor with character count
- **� Image Uploads** - Attach up to 4 images per tweet
- **🎬 Video Uploads** - Upload videos (MP4)
- **📊 Polls** - Create 2-4 option polls (requires Elevated Access)
- **↩️ Replies** - Reply to any tweet by URL or ID
- **🌓 Theme Toggle** - Switch between dark and light mode

### AI Generation
- **⚡ Groq** - Llama 3.3 powered generation
- **✨ Google Gemini** - Advanced AI generation
- **🌀 Mistral AI** - European AI model
- **🎭 Tone Selection** - Professional, Casual, Humorous, Inspirational, Informative

### CLI (Legacy)
- **📅 Schedule tweets** - Use cron expressions
- **🔄 Daemon mode** - Background scheduler

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Credentials
```bash
cp .env.example .env
```

Edit `.env` with your API keys or configure them in the Settings page.

### 3. Build & Run
```bash
npm run build    # Build React frontend
npm start        # Start server on port 3000
```

Open **http://localhost:3000** in your browser!

### Development Mode
```bash
npm run dev      # Runs Vite + Express with hot reload
```

## 🔑 Getting API Credentials

### X API
1. Go to [developer.x.com](https://developer.x.com/en/portal/dashboard)
2. Create a new Project and App
3. Enable **OAuth 1.0a** with **Read and Write** permissions
4. Generate and copy:
   - API Key & API Key Secret
   - Access Token & Access Token Secret

> ⚠️ **Important**: After changing permissions, regenerate your Access Token!

### LLM API Keys
| Provider | Get Key |
|----------|---------|
| Groq | [console.groq.com](https://console.groq.com) |
| Gemini | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| Mistral | [console.mistral.ai](https://console.mistral.ai/api-keys) |

## 📖 Usage

### Web Interface

1. **Compose Tab** - Write or generate tweets
   - Type your tweet or use AI generation
   - Click 🖼️ to add images/video
   - Click � to add a poll
   - Click ↩️ to reply to a tweet
   - Click **Post Tweet** 🚀

2. **Settings Tab** - Configure API keys
   - X API credentials
   - LLM provider keys

### CLI Commands

```bash
# Post a tweet
npm run tweet "Hello, World! 🚀"

# Schedule a tweet (requires daemon)
node src/index.js schedule "Daily update" "0 9 * * *"

# List scheduled tweets
node src/index.js list

# Start scheduler daemon
node src/index.js start
```

## 📁 Project Structure

```
x-automation/
├── server/               # Express.js backend
│   ├── index.js          # API routes
│   └── services/         # X client, LLM client
├── src/                  # React frontend
│   ├── components/       # TweetComposer, Settings, Layout
│   ├── stores/           # Zustand state (theme, composer)
│   └── lib/              # API client
├── dist/                 # Built React app
├── package.json
├── vite.config.ts
└── .env                  # API credentials
```

## 🛠️ Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start production server (port 3000) |
| `npm run build` | Build React frontend |
| `npm run dev` | Development mode (hot reload) |

## ⚠️ Rate Limits

| Tier | Tweets/Month |
|------|--------------|
| Free | 1,500 |
| Basic | 3,000 |
| Pro | 300,000 |

## � Troubleshooting

### "Forbidden" Error
- Ensure your app has **Read and Write** permissions
- Regenerate Access Token after changing permissions

### "Upload Failed"
- Check file size (max 500MB for videos, 5MB for images)
- Ensure file format is supported (PNG, JPG, GIF, MP4)

### "Polls require Elevated Access"
- Upgrade your X Developer account to create polls

## 📄 License

MIT License - feel free to use and modify!
