import React, { useState, useRef } from 'react';
import { useGemini } from '../../hooks/useGemini';
import {
    Camera,
    Upload,
    Loader2,
    Code2,
    Copy,
    Check,
    RotateCcw,
    FileCode,
    Braces,
    Smartphone,
    Monitor,
    X
} from 'lucide-react';

type Framework = 'react-tailwind' | 'html-tailwind' | 'html-css' | 'vue-tailwind';

const Vision2Code: React.FC = () => {
    const { generateContent, loading, error } = useGemini();
    const [screenshot, setScreenshot] = useState<string | null>(null);
    const [generatedCode, setGeneratedCode] = useState<string>('');
    const [framework, setFramework] = useState<Framework>('react-tailwind');
    const [copied, setCopied] = useState(false);
    const [status, setStatus] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const captureScreenshot = (): Promise<{ screenshot?: string; error?: string }> => {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' }, (response) => {
                resolve(response || { error: 'No response from background script' });
            });
        });
    };

    const handleCaptureScreen = async () => {
        setStatus('Capturing current page...');
        setGeneratedCode('');

        const response = await captureScreenshot();

        if (response.error) {
            setStatus('');
            alert('Failed to capture: ' + response.error);
            return;
        }

        if (response.screenshot) {
            setScreenshot(response.screenshot);
            setStatus('Screenshot captured! Select framework and generate code.');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            setScreenshot(event.target?.result as string);
            setGeneratedCode('');
            setStatus('Image loaded! Select framework and generate code.');
        };
        reader.readAsDataURL(file);
    };

    const handleGenerateCode = async () => {
        if (!screenshot) return;

        setStatus('Analyzing UI and generating code...');

        const frameworkPrompts: Record<Framework, string> = {
            'react-tailwind': `Convert this UI screenshot into a React functional component using Tailwind CSS.

Requirements:
- Use React functional component with TypeScript
- Use Tailwind CSS classes for ALL styling (no inline styles or CSS files)
- Make it responsive (use sm:, md:, lg: breakpoints where appropriate)
- Use semantic HTML elements
- Include proper spacing and layout
- Extract colors as close as possible to the original
- Add hover states where appropriate
- Use Lucide React icons if icons are needed (import from 'lucide-react')

Return ONLY the code, no explanations. Start with the import statements.`,

            'html-tailwind': `Convert this UI screenshot into HTML with Tailwind CSS.

Requirements:
- Use semantic HTML5 elements
- Use Tailwind CSS classes for ALL styling
- Make it responsive
- Match colors and spacing as closely as possible
- Include the Tailwind CDN script tag

Return ONLY the complete HTML file, no explanations.`,

            'html-css': `Convert this UI screenshot into HTML with vanilla CSS.

Requirements:
- Use semantic HTML5 elements
- Write clean, organized CSS
- Use CSS custom properties for colors
- Make it responsive with media queries
- Use flexbox/grid for layouts

Return the HTML and CSS in a single file with a <style> tag.`,

            'vue-tailwind': `Convert this UI screenshot into a Vue 3 component using Tailwind CSS.

Requirements:
- Use Vue 3 Composition API with <script setup>
- Use Tailwind CSS for styling
- Make it responsive
- Match the design as closely as possible

Return ONLY the .vue file content, no explanations.`
        };

        const prompt = `${frameworkPrompts[framework]}

Analyze this screenshot carefully and recreate the UI as accurately as possible.`;

        try {
            const base64Data = screenshot.split(',')[1];

            const code = await generateContent(
                prompt,
                "You are an expert frontend developer. Convert UI designs to clean, production-ready code. Focus on accuracy, responsiveness, and best practices. Return only code, no markdown formatting or explanations.",
                {
                    jsonMode: false,
                    imageData: base64Data
                }
            );

            let cleanCode = code
                .replace(/^```[\w]*\n?/gm, '')
                .replace(/```$/gm, '')
                .trim();

            setGeneratedCode(cleanCode);
            setStatus('');
        } catch (err) {
            console.error('Code generation error:', err);
            setStatus('Generation failed. Please try again.');
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const reset = () => {
        setScreenshot(null);
        setGeneratedCode('');
        setStatus('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const frameworks: { id: Framework; label: string; icon: React.ReactNode }[] = [
        { id: 'react-tailwind', label: 'React + Tailwind', icon: <Code2 size={14} /> },
        { id: 'vue-tailwind', label: 'Vue + Tailwind', icon: <FileCode size={14} /> },
        { id: 'html-tailwind', label: 'HTML + Tailwind', icon: <Braces size={14} /> },
        { id: 'html-css', label: 'HTML + CSS', icon: <FileCode size={14} /> },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
                <div
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px',
                        background: 'linear-gradient(135deg, hsl(239 84% 67%) 0%, hsl(271 81% 56%) 100%)',
                        boxShadow: '0 8px 24px hsl(239 84% 67% / 0.3)'
                    }}
                >
                    <Code2 size={28} style={{ color: 'white' }} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'hsl(210 40% 98%)' }}>Vision2Code</h2>
                <p style={{ fontSize: '12px', color: 'hsl(215 20% 65%)', marginTop: '4px' }}>Transform any UI into production-ready code</p>
            </div>

            {/* Image Input */}
            {!screenshot ? (
                <div className="space-y-4">
                    {/* Capture Button */}
                    <button
                        onClick={handleCaptureScreen}
                        style={{
                            width: '100%',
                            padding: '24px',
                            borderRadius: '16px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '2px dashed hsl(222 47% 22%)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'hsl(239 84% 67%)';
                            e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'hsl(222 47% 22%)';
                            e.currentTarget.style.backgroundColor = 'hsl(222 47% 11%)';
                        }}
                    >
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            backgroundColor: 'hsl(222 47% 15%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Monitor size={28} style={{ color: 'hsl(239 84% 70%)' }} />
                        </div>
                        <div>
                            <p style={{ fontWeight: 600, color: 'hsl(210 40% 98%)', fontSize: '14px' }}>Capture Current Page</p>
                            <p style={{ fontSize: '12px', color: 'hsl(215 15% 50%)', marginTop: '4px' }}>Screenshot the visible area</p>
                        </div>
                    </button>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'hsl(222 47% 18%)' }} />
                        <span style={{ fontSize: '12px', color: 'hsl(215 15% 45%)' }}>or</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'hsl(222 47% 18%)' }} />
                    </div>

                    {/* Upload Button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            width: '100%',
                            padding: '24px',
                            borderRadius: '16px',
                            backgroundColor: 'hsl(222 47% 11%)',
                            border: '2px dashed hsl(222 47% 22%)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'hsl(271 81% 56%)';
                            e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'hsl(222 47% 22%)';
                            e.currentTarget.style.backgroundColor = 'hsl(222 47% 11%)';
                        }}
                    >
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            backgroundColor: 'hsl(222 47% 15%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Upload size={28} style={{ color: 'hsl(271 81% 70%)' }} />
                        </div>
                        <div>
                            <p style={{ fontWeight: 600, color: 'hsl(210 40% 98%)', fontSize: '14px' }}>Upload Screenshot</p>
                            <p style={{ fontSize: '12px', color: 'hsl(215 15% 50%)', marginTop: '4px' }}>PNG, JPG, or WEBP</p>
                        </div>
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Screenshot Preview */}
                    <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', border: '1px solid hsl(222 47% 18%)' }}>
                        <img
                            src={screenshot}
                            alt="UI Screenshot"
                            style={{ width: '100%', height: '160px', objectFit: 'cover', objectPosition: 'top' }}
                        />
                        <button
                            onClick={reset}
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                padding: '8px',
                                backgroundColor: 'hsl(222 47% 11% / 0.9)',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0 84% 60%)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(222 47% 11% / 0.9)'}
                        >
                            <X size={16} style={{ color: 'white' }} />
                        </button>
                    </div>

                    {/* Framework Selection */}
                    <div className="space-y-3">
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'hsl(215 20% 65%)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Target Framework
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            {frameworks.map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setFramework(f.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px 14px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        ...(framework === f.id
                                            ? {
                                                background: 'linear-gradient(135deg, hsl(239 84% 67%) 0%, hsl(271 81% 56%) 100%)',
                                                color: 'white',
                                                boxShadow: '0 4px 16px hsl(239 84% 67% / 0.4)'
                                            }
                                            : {
                                                backgroundColor: 'hsl(222 47% 13%)',
                                                color: 'hsl(215 20% 70%)'
                                            }
                                        )
                                    }}
                                    onMouseEnter={(e) => {
                                        if (framework !== f.id) {
                                            e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                            e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (framework !== f.id) {
                                            e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                            e.currentTarget.style.color = 'hsl(215 20% 70%)';
                                        }
                                    }}
                                >
                                    {f.icon}
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerateCode}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px 24px',
                            background: loading
                                ? 'hsl(222 47% 20%)'
                                : 'linear-gradient(135deg, hsl(239 84% 67%) 0%, hsl(271 81% 56%) 100%)',
                            border: 'none',
                            borderRadius: '14px',
                            color: loading ? 'hsl(215 20% 50%)' : 'white',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'all 0.2s ease',
                            boxShadow: loading ? 'none' : '0 8px 24px hsl(239 84% 67% / 0.35)',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Generating Code...
                            </>
                        ) : (
                            <>
                                <Code2 size={18} />
                                Generate Code
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Status */}
            {status && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'hsl(217 91% 60% / 0.1)',
                    border: '1px solid hsl(217 91% 60% / 0.2)',
                    borderRadius: '12px',
                    color: 'hsl(217 91% 70%)',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    {loading && <Loader2 size={14} className="animate-spin" />}
                    {status}
                </div>
            )}

            {/* Generated Code */}
            {generatedCode && (
                <div className="space-y-3 animate-in">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(215 15% 50%)' }}>
                            Generated Code
                        </h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={copyToClipboard}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 12px',
                                    backgroundColor: 'hsl(222 47% 13%)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    color: 'hsl(215 20% 70%)',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)';
                                    e.currentTarget.style.color = 'hsl(210 40% 98%)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)';
                                    e.currentTarget.style.color = 'hsl(215 20% 70%)';
                                }}
                            >
                                {copied ? (
                                    <>
                                        <Check size={14} style={{ color: 'hsl(142 71% 45%)' }} />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} />
                                        Copy
                                    </>
                                )}
                            </button>
                            <button
                                onClick={reset}
                                style={{
                                    padding: '8px',
                                    backgroundColor: 'hsl(222 47% 13%)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(222 47% 18%)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(222 47% 13%)'}
                            >
                                <RotateCcw size={14} style={{ color: 'hsl(215 20% 70%)' }} />
                            </button>
                        </div>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <pre style={{
                            padding: '16px',
                            backgroundColor: 'hsl(222 47% 8%)',
                            border: '1px solid hsl(222 47% 15%)',
                            borderRadius: '14px',
                            overflow: 'auto',
                            fontSize: '12px',
                            color: 'hsl(215 20% 75%)',
                            maxHeight: '384px',
                            lineHeight: 1.5
                        }}>
                            <code>{generatedCode}</code>
                        </pre>
                    </div>

                    {/* Tips */}
                    <div style={{
                        padding: '14px 16px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        border: '1px solid hsl(222 47% 18%)',
                        borderRadius: '12px'
                    }}>
                        <p style={{ fontSize: '12px', color: 'hsl(215 20% 65%)' }}>
                            <strong style={{ color: 'hsl(215 20% 75%)' }}>Tip:</strong> The generated code is a starting point.
                            You may need to adjust colors, spacing, or add interactivity based on your needs.
                        </p>
                    </div>
                </div>
            )}

            {error && (
                <div style={{
                    padding: '14px 16px',
                    backgroundColor: 'hsl(0 84% 60% / 0.1)',
                    border: '1px solid hsl(0 84% 60% / 0.2)',
                    borderRadius: '12px',
                    color: 'hsl(0 84% 65%)',
                    fontSize: '13px'
                }}>
                    {error}
                </div>
            )}
        </div>
    );
};

export default Vision2Code;
