'use client';

import { useState, useEffect } from 'react';

interface ApiKeyInputProps {
    onKeyChange?: (hasKey: boolean) => void;
}

export default function ApiKeyInput({ onKeyChange }: ApiKeyInputProps) {
    const [apiKey, setApiKey] = useState('');
    const [saved, setSaved] = useState(false);
    const [showKey, setShowKey] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('openai_api_key');
        if (stored) {
            setApiKey(stored);
            setSaved(true);
            onKeyChange?.(true);
        }
    }, []);

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem('openai_api_key', apiKey.trim());
            setSaved(true);
            onKeyChange?.(true);
        }
    };

    const handleClear = () => {
        localStorage.removeItem('openai_api_key');
        setApiKey('');
        setSaved(false);
        onKeyChange?.(false);
    };

    const maskedKey = apiKey
        ? apiKey.substring(0, 7) + '...' + apiKey.substring(apiKey.length - 4)
        : '';

    return (
        <div style={{
            padding: '12px 16px',
            background: saved ? 'rgba(5, 150, 105, 0.08)' : 'rgba(234, 179, 8, 0.08)',
            border: `1px solid ${saved ? 'rgba(5, 150, 105, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.85rem',
        }}>
            <span style={{ fontSize: '1.1rem' }}>{saved ? '🔑' : '⚠️'}</span>

            {saved ? (
                <>
                    <span style={{ color: '#059669', fontWeight: 500 }}>
                        API Key: {showKey ? apiKey : maskedKey}
                    </span>
                    <button
                        onClick={() => setShowKey(!showKey)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#6b7280',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            padding: '2px 6px',
                        }}
                    >
                        {showKey ? 'Hide' : 'Show'}
                    </button>
                    <button
                        onClick={handleClear}
                        style={{
                            marginLeft: 'auto',
                            background: 'rgba(220, 38, 38, 0.1)',
                            border: '1px solid rgba(220, 38, 38, 0.2)',
                            color: '#dc2626',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                        }}
                    >
                        Remove
                    </button>
                </>
            ) : (
                <>
                    <input
                        type="password"
                        placeholder="Enter your OpenAI API key (sk-...)"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        style={{
                            flex: 1,
                            padding: '6px 10px',
                            border: '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            background: 'white',
                            outline: 'none',
                        }}
                    />
                    <button
                        onClick={handleSave}
                        disabled={!apiKey.trim()}
                        style={{
                            background: apiKey.trim() ? '#002147' : '#d1d5db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 14px',
                            cursor: apiKey.trim() ? 'pointer' : 'default',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                        }}
                    >
                        Save
                    </button>
                </>
            )}
        </div>
    );
}
