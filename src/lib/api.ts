// API client for communicating with the Express backend

const API_BASE = '/api';

export interface CredentialsStatus {
    xConfigured: boolean;
    groqConfigured: boolean;
    geminiConfigured: boolean;
    mistralConfigured: boolean;
    availableProviders: { id: string; name: string; icon: string }[];
}

export interface GenerateRequest {
    prompt: string;
    tone: string;
    provider: string;
}

export interface TweetRequest {
    text: string;
    mediaIds?: string[];
    replyToId?: string;
    pollOptions?: string[];
    pollDuration?: number;
}

export interface TweetResponse {
    success: boolean;
    tweetId: string;
    url: string;
}

export interface MediaUploadResponse {
    mediaId: string;
    url?: string;
}

// Credentials
export async function getCredentialsStatus(): Promise<CredentialsStatus> {
    const res = await fetch(`${API_BASE}/credentials/status`);
    if (!res.ok) throw new Error('Failed to fetch credentials status');
    return res.json();
}

export async function saveCredentials(credentials: Record<string, string>): Promise<void> {
    const res = await fetch(`${API_BASE}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save credentials');
    }
}

// Tweet Generation
export async function generateTweet(request: GenerateRequest): Promise<string> {
    const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate tweet');
    return data.tweet;
}

// Tweet Posting
export async function postTweet(request: TweetRequest): Promise<TweetResponse> {
    const res = await fetch(`${API_BASE}/tweets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to post tweet');
    return data;
}

// Reply to Tweet
export async function replyToTweet(tweetId: string, text: string, mediaIds?: string[]): Promise<TweetResponse> {
    const res = await fetch(`${API_BASE}/tweets/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweetId, text, mediaIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to reply');
    return data;
}

// Media Upload
export async function uploadMedia(file: File): Promise<MediaUploadResponse> {
    const formData = new FormData();
    formData.append('media', file);

    const res = await fetch(`${API_BASE}/media/upload`, {
        method: 'POST',
        body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to upload media');
    return data;
}

// Create Poll Tweet
export async function createPollTweet(
    text: string,
    options: string[],
    durationMinutes: number = 1440
): Promise<TweetResponse> {
    const res = await fetch(`${API_BASE}/tweets/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, options, durationMinutes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create poll');
    return data;
}
