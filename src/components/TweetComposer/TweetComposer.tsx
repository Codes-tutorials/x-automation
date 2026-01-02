import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useComposerStore } from '../../stores/composerStore';
import { getCredentialsStatus, generateTweet, postTweet, uploadMedia, createPollTweet, replyToTweet } from '../../lib/api';
import './TweetComposer.css';

export default function TweetComposer() {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [successUrl, setSuccessUrl] = useState<string | null>(null);

    const {
        text, setText,
        mediaFiles, addMedia, removeMedia, updateMedia, clearMedia,
        poll, setPollEnabled, setPollOptions,
        replyToId, setReplyToId,
        prompt, setPrompt,
        tone, setTone,
        provider, setProvider,
        isGenerating, setIsGenerating,
        isPosting, setIsPosting,
        reset,
    } = useComposerStore();

    const { data: credStatus } = useQuery({
        queryKey: ['credentialsStatus'],
        queryFn: getCredentialsStatus,
    });

    const charCount = text.length;
    const isOverLimit = charCount > 280;
    const hasMedia = mediaFiles.length > 0;
    const hasPoll = poll.enabled && poll.options.filter(o => o.trim()).length >= 2;

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            showToast('Please enter a topic for AI generation', 'error');
            return;
        }

        setIsGenerating(true);
        try {
            const tweet = await generateTweet({ prompt, tone, provider });
            setText(tweet);
            showToast('Tweet generated!', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Generation failed', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            addMedia(files);
        }
    };

    const handlePost = async () => {
        if (!text.trim() && !hasMedia) {
            showToast('Please enter some text or add media', 'error');
            return;
        }

        if (isOverLimit) {
            showToast('Tweet exceeds 280 characters', 'error');
            return;
        }

        setIsPosting(true);
        try {
            // Upload media first
            const mediaIds: string[] = [];
            for (const media of mediaFiles) {
                if (!media.mediaId) {
                    updateMedia(media.id, { uploading: true });
                    try {
                        const result = await uploadMedia(media.file);
                        updateMedia(media.id, { uploading: false, mediaId: result.mediaId });
                        mediaIds.push(result.mediaId);
                    } catch (err) {
                        updateMedia(media.id, { uploading: false, error: 'Upload failed' });
                        throw err;
                    }
                } else {
                    mediaIds.push(media.mediaId);
                }
            }

            let result;

            if (hasPoll) {
                result = await createPollTweet(text, poll.options.filter(o => o.trim()), poll.durationMinutes);
            } else if (replyToId) {
                result = await replyToTweet(replyToId, text, mediaIds.length > 0 ? mediaIds : undefined);
            } else {
                result = await postTweet({ text, mediaIds: mediaIds.length > 0 ? mediaIds : undefined });
            }

            setSuccessUrl(result.url);
            showToast('Tweet posted successfully! 🎉', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to post', 'error');
        } finally {
            setIsPosting(false);
        }
    };

    const handleNewTweet = () => {
        reset();
        setSuccessUrl(null);
    };

    const updatePollOption = (index: number, value: string) => {
        const newOptions = [...poll.options];
        newOptions[index] = value;
        setPollOptions(newOptions);
    };

    const addPollOption = () => {
        if (poll.options.length < 4) {
            setPollOptions([...poll.options, '']);
        }
    };

    if (successUrl) {
        return (
            <div className="card success-card">
                <div className="success-icon">🎉</div>
                <h3>Tweet Posted Successfully!</h3>
                <p>Your tweet is now live on X.</p>
                <a href={successUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                    View on X ↗️
                </a>
                <button className="btn btn-primary" onClick={handleNewTweet} style={{ marginTop: '1rem' }}>
                    ✨ Create Another Tweet
                </button>
            </div>
        );
    }

    return (
        <div className="tweet-composer">
            {/* Main Composer Card */}
            <div className="card composer-card">
                <div className="composer-header">
                    <h2>📝 What's happening?</h2>
                    <span className={`char-count ${charCount > 260 ? 'warning' : ''} ${isOverLimit ? 'error' : ''}`}>
                        {charCount}/280
                    </span>
                </div>

                {/* Reply To Input */}
                {replyToId && (
                    <div className="reply-indicator">
                        <span>↩️ Replying to tweet</span>
                        <button className="btn-close" onClick={() => setReplyToId('')}>✕</button>
                    </div>
                )}

                {/* Text Area */}
                <textarea
                    className="input-textarea composer-textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Compose your tweet..."
                    rows={4}
                />

                {/* Media Preview */}
                {hasMedia && (
                    <div className="media-preview">
                        {mediaFiles.map((media) => (
                            <div key={media.id} className={`media-item ${media.uploading ? 'uploading' : ''}`}>
                                {media.type === 'image' ? (
                                    <img src={media.preview} alt="Upload preview" />
                                ) : (
                                    <video src={media.preview} />
                                )}
                                <button className="media-remove" onClick={() => removeMedia(media.id)}>✕</button>
                                {media.uploading && <div className="media-loading">Uploading...</div>}
                                {media.error && <div className="media-error">{media.error}</div>}
                            </div>
                        ))}
                    </div>
                )}

                {/* Poll Options */}
                {poll.enabled && (
                    <div className="poll-section">
                        <div className="poll-header">
                            <span>📊 Poll Options</span>
                            <button className="btn-close" onClick={() => setPollEnabled(false)}>✕</button>
                        </div>
                        {poll.options.map((option, index) => (
                            <input
                                key={index}
                                type="text"
                                className="input-text poll-input"
                                placeholder={`Option ${index + 1}`}
                                value={option}
                                onChange={(e) => updatePollOption(index, e.target.value)}
                            />
                        ))}
                        {poll.options.length < 4 && (
                            <button className="btn btn-secondary add-option" onClick={addPollOption}>
                                + Add Option
                            </button>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="composer-actions">
                    <div className="action-buttons">
                        <label className="btn btn-icon" title="Add Image/Video">
                            🖼️
                            <input
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                onChange={handleMediaSelect}
                                style={{ display: 'none' }}
                                disabled={poll.enabled}
                            />
                        </label>
                        <button
                            className={`btn btn-icon ${poll.enabled ? 'active' : ''}`}
                            onClick={() => setPollEnabled(!poll.enabled)}
                            title="Add Poll"
                            disabled={hasMedia}
                        >
                            📊
                        </button>
                        <button
                            className="btn btn-icon"
                            onClick={() => {
                                const id = window.prompt('Enter tweet ID or URL to reply to:');
                                if (id) setReplyToId(id);
                            }}
                            title="Reply to Tweet"
                        >
                            ↩️
                        </button>
                    </div>

                    <button
                        className={`btn btn-success ${isPosting ? 'loading' : ''}`}
                        onClick={handlePost}
                        disabled={isPosting || (!text.trim() && !hasMedia) || isOverLimit}
                    >
                        🚀 {replyToId ? 'Reply' : 'Post'} Tweet
                    </button>
                </div>
            </div>

            {/* AI Generation Card */}
            <div className="card ai-card">
                <div className="ai-header">
                    <h3>✨ AI Tweet Generator</h3>
                </div>

                <div className="form-group">
                    <label>What should I tweet about?</label>
                    <input
                        type="text"
                        className="input-text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., productivity tips for developers"
                    />
                </div>

                <div className="ai-options">
                    <div className="form-group">
                        <label>Provider</label>
                        <select className="input-select" value={provider} onChange={(e) => setProvider(e.target.value)}>
                            {credStatus?.availableProviders?.map((p) => (
                                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                            ))}
                            {(!credStatus?.availableProviders?.length) && (
                                <option disabled>No providers configured</option>
                            )}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Tone</label>
                        <select className="input-select" value={tone} onChange={(e) => setTone(e.target.value)}>
                            <option value="professional">💼 Professional</option>
                            <option value="casual">😊 Casual</option>
                            <option value="humorous">😄 Humorous</option>
                            <option value="inspirational">🌟 Inspirational</option>
                            <option value="informative">📚 Informative</option>
                        </select>
                    </div>
                </div>

                <button
                    className={`btn btn-primary ${isGenerating ? 'loading' : ''}`}
                    onClick={handleGenerate}
                    disabled={isGenerating || !prompt.trim()}
                >
                    ✨ Generate Tweet
                </button>
            </div>

            {/* Toast */}
            {toast && (
                <div className="toast-container">
                    <div className={`toast ${toast.type}`}>{toast.message}</div>
                </div>
            )}
        </div>
    );
}
