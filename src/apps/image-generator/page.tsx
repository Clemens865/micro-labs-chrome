import React, { useState } from 'react';
import { Image, Download, Loader2, Sparkles, RefreshCw, Square, RectangleHorizontal, RectangleVertical, Smartphone } from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';

type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

interface GeneratedImage {
    data: string;
    prompt: string;
    aspectRatio: AspectRatio;
    timestamp: number;
}

const ImageGeneratorApp: React.FC = () => {
    const { generateImage, loading, error } = useGemini();
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [images, setImages] = useState<GeneratedImage[]>([]);
    const [status, setStatus] = useState('');

    const aspectRatioOptions: { value: AspectRatio; label: string; icon: React.ReactNode }[] = [
        { value: '1:1', label: 'Square', icon: <Square size={14} /> },
        { value: '4:3', label: 'Landscape', icon: <RectangleHorizontal size={14} /> },
        { value: '3:4', label: 'Portrait', icon: <RectangleVertical size={14} /> },
        { value: '16:9', label: 'Wide', icon: <RectangleHorizontal size={14} /> },
        { value: '9:16', label: 'Story', icon: <Smartphone size={14} /> },
    ];

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setStatus('Generating image with Gemini AI...');

        try {
            const generatedImages = await generateImage(prompt, {
                aspectRatio,
                numberOfImages: 1
            });

            if (generatedImages.length > 0) {
                const newImage: GeneratedImage = {
                    data: generatedImages[0],
                    prompt: prompt.trim(),
                    aspectRatio,
                    timestamp: Date.now()
                };
                setImages(prev => [newImage, ...prev]);
                setStatus('');
            } else {
                setStatus('No image generated. Try a different prompt.');
            }
        } catch (err: any) {
            console.error('Image generation error:', err);
            setStatus(err.message || 'Failed to generate image. Please try again.');
        }
    };

    const handleDownload = (image: GeneratedImage) => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${image.data}`;
        link.download = `generated-${image.timestamp}.png`;
        link.click();
    };

    const handleRegenerate = (image: GeneratedImage) => {
        setPrompt(image.prompt);
        setAspectRatio(image.aspectRatio);
    };

    const promptSuggestions = [
        "A serene Japanese garden with cherry blossoms at sunset",
        "Futuristic cityscape with flying cars and neon lights",
        "Cozy coffee shop interior with warm lighting",
        "Majestic mountain landscape reflected in a crystal lake",
        "Abstract geometric patterns in vibrant colors"
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{
                        background: 'linear-gradient(135deg, hsl(271 81% 56%) 0%, hsl(330 81% 60%) 100%)',
                        boxShadow: '0 8px 24px hsl(271 81% 56% / 0.3)'
                    }}
                >
                    <Image size={28} className="text-white" />
                </div>
                <h2 className="text-lg font-bold" style={{ color: 'hsl(210 40% 98%)' }}>AI Image Generator</h2>
                <p className="text-xs mt-1" style={{ color: 'hsl(215 20% 65%)' }}>Create stunning images with Gemini AI</p>
            </div>

            {/* Prompt Input */}
            <div className="space-y-2">
                <label className="text-xs font-medium" style={{ color: 'hsl(215 20% 65%)' }}>Describe your image</label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A beautiful sunset over mountains with dramatic clouds..."
                    rows={3}
                    style={{
                        width: '100%',
                        padding: '14px 16px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        border: '1px solid hsl(222 47% 20%)',
                        borderRadius: '14px',
                        color: 'hsl(210 40% 98%)',
                        fontSize: '14px',
                        resize: 'none',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = 'hsl(271 81% 56%)';
                        e.target.style.boxShadow = '0 0 0 3px hsl(271 81% 56% / 0.15)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = 'hsl(222 47% 20%)';
                        e.target.style.boxShadow = 'none';
                    }}
                />
            </div>

            {/* Prompt Suggestions */}
            <div className="space-y-3">
                <label className="text-xs font-medium" style={{ color: 'hsl(215 15% 50%)' }}>Try a suggestion:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {promptSuggestions.map((suggestion, idx) => (
                        <button
                            key={idx}
                            onClick={() => setPrompt(suggestion)}
                            style={{
                                padding: '10px 14px',
                                backgroundColor: 'hsl(222 47% 13%)',
                                border: 'none',
                                borderRadius: '10px',
                                color: 'hsl(215 20% 70%)',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                maxWidth: '180px',
                                textAlign: 'left',
                                lineHeight: 1.4
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                e.currentTarget.style.color = 'hsl(215 20% 70%)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {suggestion.substring(0, 35)}...
                        </button>
                    ))}
                </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-3">
                <label className="text-xs font-medium" style={{ color: 'hsl(215 20% 65%)' }}>Aspect Ratio</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {aspectRatioOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setAspectRatio(option.value)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 14px',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                ...(aspectRatio === option.value
                                    ? {
                                        background: 'linear-gradient(135deg, hsl(271 81% 56%) 0%, hsl(300 81% 56%) 100%)',
                                        color: 'white',
                                        boxShadow: '0 4px 16px hsl(271 81% 56% / 0.4)'
                                    }
                                    : {
                                        backgroundColor: 'hsl(222 47% 13%)',
                                        color: 'hsl(215 20% 70%)'
                                    }
                                )
                            }}
                            onMouseEnter={(e) => {
                                if (aspectRatio !== option.value) {
                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                    e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (aspectRatio !== option.value) {
                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                    e.currentTarget.style.color = 'hsl(215 20% 70%)';
                                }
                            }}
                        >
                            {option.icon}
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Generate Button */}
            <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                style={{
                    width: '100%',
                    padding: '16px 24px',
                    background: loading || !prompt.trim()
                        ? 'hsl(222 47% 20%)'
                        : 'linear-gradient(135deg, hsl(271 81% 56%) 0%, hsl(330 81% 60%) 100%)',
                    border: 'none',
                    borderRadius: '14px',
                    color: loading || !prompt.trim() ? 'hsl(215 20% 50%)' : 'white',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s ease',
                    boxShadow: loading || !prompt.trim() ? 'none' : '0 8px 24px hsl(271 81% 56% / 0.35)',
                    opacity: loading || !prompt.trim() ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                    if (!loading && prompt.trim()) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 12px 32px hsl(271 81% 56% / 0.45)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = loading || !prompt.trim() ? 'none' : '0 8px 24px hsl(271 81% 56% / 0.35)';
                }}
            >
                {loading ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <Sparkles size={20} />
                        Generate Image
                    </>
                )}
            </button>

            {/* Status */}
            {status && (
                <div
                    style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: 500,
                        ...(status.includes('Failed') || status.includes('No image')
                            ? {
                                backgroundColor: 'hsl(0 84% 60% / 0.1)',
                                border: '1px solid hsl(0 84% 60% / 0.2)',
                                color: 'hsl(0 84% 65%)'
                            }
                            : {
                                backgroundColor: 'hsl(271 81% 56% / 0.1)',
                                border: '1px solid hsl(271 81% 56% / 0.2)',
                                color: 'hsl(271 81% 70%)'
                            }
                        )
                    }}
                >
                    {status}
                </div>
            )}

            {/* Generated Images */}
            {images.length > 0 && (
                <div className="space-y-4">
                    <h3
                        className="text-xs uppercase tracking-wider font-semibold"
                        style={{ color: 'hsl(215 15% 50%)' }}
                    >
                        Generated Images
                    </h3>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        {images.map((image) => (
                            <div
                                key={image.timestamp}
                                style={{
                                    backgroundColor: 'hsl(222 47% 11%)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    border: '1px solid hsl(222 47% 18%)'
                                }}
                            >
                                <img
                                    src={`data:image/png;base64,${image.data}`}
                                    alt={image.prompt}
                                    style={{ width: '100%', objectFit: 'contain' }}
                                />
                                <div style={{ padding: '16px' }}>
                                    <p
                                        style={{
                                            fontSize: '12px',
                                            color: 'hsl(215 20% 65%)',
                                            marginBottom: '12px',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {image.prompt}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span
                                            style={{
                                                padding: '6px 10px',
                                                backgroundColor: 'hsl(222 47% 8%)',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: 'hsl(215 20% 60%)'
                                            }}
                                        >
                                            {image.aspectRatio}
                                        </span>
                                        <button
                                            onClick={() => handleDownload(image)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                color: 'hsl(271 81% 70%)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'hsl(271 81% 56% / 0.1)';
                                                e.currentTarget.style.color = 'hsl(271 81% 80%)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'hsl(271 81% 70%)';
                                            }}
                                        >
                                            <Download size={14} />
                                            Download
                                        </button>
                                        <button
                                            onClick={() => handleRegenerate(image)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                color: 'hsl(215 20% 65%)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'hsl(222 47% 15%)';
                                                e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                e.currentTarget.style.color = 'hsl(215 20% 65%)';
                                            }}
                                        >
                                            <RefreshCw size={14} />
                                            Remix
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {images.length === 0 && !loading && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '48px 0',
                    textAlign: 'center'
                }}>
                    <Image size={64} style={{ color: 'hsl(222 47% 20%)', marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'hsl(215 20% 55%)', marginBottom: '8px' }}>
                        No images yet
                    </h3>
                    <p style={{ fontSize: '13px', color: 'hsl(215 15% 45%)' }}>
                        Describe what you want to create and click Generate
                    </p>
                </div>
            )}
        </div>
    );
};

export default ImageGeneratorApp;
