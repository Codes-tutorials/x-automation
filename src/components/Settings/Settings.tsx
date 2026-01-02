import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCredentialsStatus, saveCredentials } from '../../lib/api';
import './Settings.css';

export default function Settings() {
    const queryClient = useQueryClient();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [xApiKey, setXApiKey] = useState('');
    const [xApiSecret, setXApiSecret] = useState('');
    const [xAccessToken, setXAccessToken] = useState('');
    const [xAccessTokenSecret, setXAccessTokenSecret] = useState('');
    const [groqApiKey, setGroqApiKey] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [mistralApiKey, setMistralApiKey] = useState('');

    const { data: status } = useQuery({
        queryKey: ['credentialsStatus'],
        queryFn: getCredentialsStatus,
    });

    const saveMutation = useMutation({
        mutationFn: saveCredentials,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['credentialsStatus'] });
            setToast({ message: 'Credentials saved successfully!', type: 'success' });
            // Clear inputs
            setXApiKey('');
            setXApiSecret('');
            setXAccessToken('');
            setXAccessTokenSecret('');
            setGroqApiKey('');
            setGeminiApiKey('');
            setMistralApiKey('');
        },
        onError: (error) => {
            setToast({ message: error instanceof Error ? error.message : 'Save failed', type: 'error' });
        },
    });

    const handleSave = () => {
        const creds: Record<string, string> = {};
        if (xApiKey) creds.xApiKey = xApiKey;
        if (xApiSecret) creds.xApiSecret = xApiSecret;
        if (xAccessToken) creds.xAccessToken = xAccessToken;
        if (xAccessTokenSecret) creds.xAccessTokenSecret = xAccessTokenSecret;
        if (groqApiKey) creds.groqApiKey = groqApiKey;
        if (geminiApiKey) creds.geminiApiKey = geminiApiKey;
        if (mistralApiKey) creds.mistralApiKey = mistralApiKey;

        if (Object.keys(creds).length === 0) {
            setToast({ message: 'Please enter at least one credential', type: 'error' });
            return;
        }

        saveMutation.mutate(creds);
    };

    return (
        <div className="settings-page">
            {/* X API Credentials */}
            <div className="card settings-card">
                <div className="card-header">
                    <h2>🔑 X API Credentials</h2>
                    <p className="card-subtitle">
                        Get your credentials from the <a href="https://developer.x.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer">X Developer Portal</a>
                    </p>
                    <div className="help-links">
                        <a href="https://developer.x.com/en/docs/twitter-api/getting-started/getting-access-to-the-twitter-api" target="_blank" rel="noopener noreferrer">
                            📖 How to get API access
                        </a>
                        <a href="https://developer.x.com/en/portal/projects-and-apps" target="_blank" rel="noopener noreferrer">
                            🔧 Create an App
                        </a>
                        <a href="https://developer.x.com/en/docs/authentication/oauth-1-0a/api-key-and-secret" target="_blank" rel="noopener noreferrer">
                            🔑 Generate Keys & Tokens
                        </a>
                    </div>
                </div>

                <div className={`status-badge ${status?.xConfigured ? 'configured' : ''}`}>
                    <span className="status-dot" />
                    {status?.xConfigured ? 'Configured' : 'Not configured'}
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label>API Key</label>
                        <input
                            type="password"
                            className="input-text"
                            value={xApiKey}
                            onChange={(e) => setXApiKey(e.target.value)}
                            placeholder="Enter API Key"
                        />
                    </div>
                    <div className="form-group">
                        <label>API Key Secret</label>
                        <input
                            type="password"
                            className="input-text"
                            value={xApiSecret}
                            onChange={(e) => setXApiSecret(e.target.value)}
                            placeholder="Enter API Key Secret"
                        />
                    </div>
                    <div className="form-group">
                        <label>Access Token</label>
                        <input
                            type="password"
                            className="input-text"
                            value={xAccessToken}
                            onChange={(e) => setXAccessToken(e.target.value)}
                            placeholder="Enter Access Token"
                        />
                    </div>
                    <div className="form-group">
                        <label>Access Token Secret</label>
                        <input
                            type="password"
                            className="input-text"
                            value={xAccessTokenSecret}
                            onChange={(e) => setXAccessTokenSecret(e.target.value)}
                            placeholder="Enter Access Token Secret"
                        />
                    </div>
                </div>
            </div>

            {/* LLM API Keys */}
            <div className="card settings-card">
                <div className="card-header">
                    <h2>🤖 LLM API Keys</h2>
                    <p className="card-subtitle">Configure AI providers for tweet generation</p>
                </div>

                <div className="provider-grid">
                    {/* Groq */}
                    <div className="provider-item">
                        <div className="provider-header">
                            <span className="provider-icon">⚡</span>
                            <span className="provider-name">Groq</span>
                            <div className={`status-dot-small ${status?.groqConfigured ? 'configured' : ''}`} />
                        </div>
                        <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="provider-link">
                            Get API Key →
                        </a>
                        <input
                            type="password"
                            className="input-text"
                            value={groqApiKey}
                            onChange={(e) => setGroqApiKey(e.target.value)}
                            placeholder="Enter Groq API Key"
                        />
                    </div>

                    {/* Gemini */}
                    <div className="provider-item">
                        <div className="provider-header">
                            <span className="provider-icon">✨</span>
                            <span className="provider-name">Gemini</span>
                            <div className={`status-dot-small ${status?.geminiConfigured ? 'configured' : ''}`} />
                        </div>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="provider-link">
                            Get API Key →
                        </a>
                        <input
                            type="password"
                            className="input-text"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            placeholder="Enter Gemini API Key"
                        />
                    </div>

                    {/* Mistral */}
                    <div className="provider-item">
                        <div className="provider-header">
                            <span className="provider-icon">🌀</span>
                            <span className="provider-name">Mistral</span>
                            <div className={`status-dot-small ${status?.mistralConfigured ? 'configured' : ''}`} />
                        </div>
                        <a href="https://console.mistral.ai/api-keys" target="_blank" rel="noopener noreferrer" className="provider-link">
                            Get API Key →
                        </a>
                        <input
                            type="password"
                            className="input-text"
                            value={mistralApiKey}
                            onChange={(e) => setMistralApiKey(e.target.value)}
                            placeholder="Enter Mistral API Key"
                        />
                    </div>
                </div>
            </div>

            <button
                className={`btn btn-primary save-btn ${saveMutation.isPending ? 'loading' : ''}`}
                onClick={handleSave}
                disabled={saveMutation.isPending}
            >
                💾 Save All Credentials
            </button>

            {/* Toast */}
            {toast && (
                <div className="toast-container">
                    <div className={`toast ${toast.type}`}>{toast.message}</div>
                </div>
            )}
        </div>
    );
}
