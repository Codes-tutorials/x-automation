import { create } from 'zustand';

export interface MediaFile {
    id: string;
    file: File;
    preview: string;
    type: 'image' | 'video';
    uploading: boolean;
    mediaId?: string;
    error?: string;
}

export interface PollOptions {
    enabled: boolean;
    options: string[];
    durationMinutes: number;
}

interface ComposerState {
    // Tweet content
    text: string;
    setText: (text: string) => void;

    // Media
    mediaFiles: MediaFile[];
    addMedia: (files: File[]) => void;
    removeMedia: (id: string) => void;
    updateMedia: (id: string, updates: Partial<MediaFile>) => void;
    clearMedia: () => void;

    // Poll
    poll: PollOptions;
    setPollEnabled: (enabled: boolean) => void;
    setPollOptions: (options: string[]) => void;
    setPollDuration: (minutes: number) => void;

    // Reply
    replyToId: string;
    setReplyToId: (id: string) => void;

    // AI Generation
    prompt: string;
    setPrompt: (prompt: string) => void;
    tone: string;
    setTone: (tone: string) => void;
    provider: string;
    setProvider: (provider: string) => void;

    // UI State
    isGenerating: boolean;
    setIsGenerating: (loading: boolean) => void;
    isPosting: boolean;
    setIsPosting: (loading: boolean) => void;

    // Actions
    reset: () => void;
}

const initialState = {
    text: '',
    mediaFiles: [],
    poll: { enabled: false, options: ['', ''], durationMinutes: 1440 },
    replyToId: '',
    prompt: '',
    tone: 'professional',
    provider: 'groq',
    isGenerating: false,
    isPosting: false,
};

export const useComposerStore = create<ComposerState>((set) => ({
    ...initialState,

    setText: (text) => set({ text }),

    addMedia: (files) => set((state) => {
        const newMedia: MediaFile[] = files.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            preview: URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' : 'image',
            uploading: false,
        }));

        // Max 4 images or 1 video
        const isVideo = newMedia.some(m => m.type === 'video');
        const maxFiles = isVideo ? 1 : 4;

        return {
            mediaFiles: [...state.mediaFiles, ...newMedia].slice(0, maxFiles)
        };
    }),

    removeMedia: (id) => set((state) => ({
        mediaFiles: state.mediaFiles.filter((m) => m.id !== id),
    })),

    updateMedia: (id, updates) => set((state) => ({
        mediaFiles: state.mediaFiles.map((m) =>
            m.id === id ? { ...m, ...updates } : m
        ),
    })),

    clearMedia: () => set({ mediaFiles: [] }),

    setPollEnabled: (enabled) => set((state) => ({
        poll: { ...state.poll, enabled },
    })),

    setPollOptions: (options) => set((state) => ({
        poll: { ...state.poll, options },
    })),

    setPollDuration: (durationMinutes) => set((state) => ({
        poll: { ...state.poll, durationMinutes },
    })),

    setReplyToId: (replyToId) => set({ replyToId }),

    setPrompt: (prompt) => set({ prompt }),
    setTone: (tone) => set({ tone }),
    setProvider: (provider) => set({ provider }),

    setIsGenerating: (isGenerating) => set({ isGenerating }),
    setIsPosting: (isPosting) => set({ isPosting }),

    reset: () => set(initialState),
}));
