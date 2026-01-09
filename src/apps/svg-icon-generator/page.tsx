import React, { useState, useRef, useEffect } from 'react';
import {
    Pen, Wand2, Download, Copy, Check, Loader2, Image as ImageIcon,
    Sparkles, Palette, Settings2, Code2, FileCode, Trash2, X
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';

// Import ImageTracer and make it available globally
import ImageTracer from 'imagetracerjs';
if (typeof window !== 'undefined') {
    (window as any).ImageTracer = ImageTracer;
}

// Icon styles organized by category
const STYLE_GROUPS = {
    'Essentials': [
        { value: 'lucid', label: 'Lucid (Default)' },
    ],
    'Logo & Professional': [
        { value: 'logo_mark', label: 'Logo Mark' },
        { value: 'corporate', label: 'Corporate Minimal' },
        { value: 'startup', label: 'Tech Startup' },
        { value: 'material', label: 'Material Design' },
        { value: 'fluent', label: 'Fluent Design' },
        { value: 'monogram', label: 'Luxury Monogram' },
        { value: 'badge', label: 'Outlined Badge' },
        { value: 'duotone', label: 'Duotone Split' },
    ],
    '3D Styles': [
        { value: 'isometric_3d', label: 'Isometric 3D' },
        { value: 'clay_3d', label: 'Smooth Clay 3D' },
        { value: 'low_poly', label: 'Low Poly 3D' },
        { value: 'glossy_3d', label: 'Glossy Plastic 3D' },
        { value: 'voxel_3d', label: 'Voxel Cubic 3D' },
    ],
    'Technical': [
        { value: 'blueprint', label: 'Blueprint' },
        { value: 'circuit', label: 'Circuit Board' },
        { value: 'neon', label: 'Neon Sign' },
        { value: 'architectural', label: 'Architectural' },
    ],
    'Fun & Comic': [
        { value: 'kawaii', label: 'Kawaii (Cute)' },
        { value: 'comic', label: 'Comic Book' },
        { value: 'pop_art', label: 'Pop Art' },
        { value: 'sticker', label: 'Sticker Art' },
        { value: 'pixel', label: 'Pixel Art (8-Bit)' },
        { value: 'graffiti', label: 'Graffiti' },
    ],
    'Hand-drawn': [
        { value: 'sketch', label: 'Sketch' },
        { value: 'doodle', label: 'Doodle Style' },
        { value: 'crayon', label: 'Crayon Drawing' },
        { value: 'chalk', label: 'Chalk Texture' },
    ],
    'Art Movements': [
        { value: 'bauhaus', label: 'Bauhaus' },
        { value: 'art_deco', label: 'Art Deco' },
        { value: 'japanese', label: 'Japanese Minimal' },
        { value: 'tribal', label: 'Tribal / Aztec' },
        { value: 'origami', label: 'Origami' },
    ],
    'Abstract': [
        { value: 'geometric', label: 'Geometric' },
        { value: 'single_line', label: 'Single Line' },
        { value: 'negative_space', label: 'Negative Space' },
        { value: 'glitch', label: 'Glitch Art' },
    ],
};

const STYLE_PROMPTS: Record<string, string> = {
    lucid: "Minimalist icon with uniform line thickness and rounded corners. Clean, friendly, and functional.",
    logo_mark: "Memorable bold logo mark using solid fills and reductive, iconic shapes.",
    corporate: "Professional grid-based design with uniform lines and perfect mathematical geometry.",
    startup: "Agile tech startup vibe with friendly rounded geometry and bold strokes.",
    material: "Material design style with flat layers and solid black geometric shadow shapes.",
    fluent: "Modern UI style focusing on light, depth, and clean perspective lines.",
    monogram: "Sophisticated luxury monogram with interwoven lines and symmetric letter-like abstraction.",
    badge: "Official outlined badge enclosed in a simple geometric frame like a circle or shield.",
    duotone: "Stylish duotone split with sharp division between solid fills and outlines.",
    isometric_3d: "Technical isometric line art with 30-degree angles and uniform line weight.",
    clay_3d: "Soft, rounded, tactile clay forms with thick outlines and blob-like silhouettes.",
    low_poly: "Faceted geometric wireframe made of sharp triangles. Structural and digital.",
    glossy_3d: "Sleek glossy plastic look using sharp black-and-white contrast for specular highlights.",
    voxel_3d: "Digital construction look made of stacked 3D cubes with thick outlines.",
    blueprint: "Industrial technical blueprint with precise thin lines and dashed construction markers.",
    circuit: "Hardware electronic theme with technical nodes and 45-degree trace lines ending in dots.",
    neon: "Retro-tech neon sign style using double parallel lines and rounded ends.",
    architectural: "Creative architectural concept sketch with loose straight lines and corner overshoots.",
    kawaii: "Happy adorable characters with exaggerated rounded proportions and minimal detail.",
    comic: "Action-oriented comic book style with dynamic lines and bold shadows.",
    pop_art: "Loud energetic pop art with high contrast and explosive geometric shapes.",
    sticker: "Pop-culture sticker art with a very thick bold die-cut outer border.",
    pixel: "Retro 8-bit pixel art with low-res stepped edges and blocky squares.",
    graffiti: "Rebellious urban graffiti with thick bubble-letter outlines and drips.",
    sketch: "Casual hand-drawn sketch with imperfect, variable-width wobbly lines.",
    doodle: "Informal notebook doodle with loopy ballpoint pen strokes.",
    crayon: "Playful innocent crayon drawing with waxy texture and broken edges.",
    chalk: "Rustic handmade chalk texture with grainy edges and stipple shading.",
    bauhaus: "Bauhaus style using geometric primitives and asymmetrical layouts of heavy blocks.",
    art_deco: "Luxury Art Deco style with sunbursts, parallel lines, and sinuous curves.",
    japanese: "Zen minimalist Japanese style using brush strokes or crest-like designs.",
    tribal: "Bold angular tribal patterns and indigenous aesthetic.",
    origami: "Precise folded-paper style with faceted planes and straight angular creases.",
    geometric: "Structured modern art made of clean mathematical primitives like circles and triangles.",
    single_line: "Elegant minimalist drawing consisting of one unbroken continuous line.",
    negative_space: "Clever bold design where the subject is defined by negative space cutout.",
    glitch: "Edgy cyber glitch art with horizontal slicing and digital corruption.",
};

const LOGO_TYPES = [
    { value: 'icon_only', label: 'Symbol', desc: 'Graphic only' },
    { value: 'wordmark', label: 'Wordmark', desc: 'Stylized text' },
    { value: 'monogram', label: 'Monogram', desc: 'Initials' },
    { value: 'combination', label: 'Combo', desc: 'Icon + Text' },
];

interface GeneratedIcon {
    id: string;
    name: string;
    style: string;
    svgContent: string;
    rasterImage: string;
    createdAt: number;
    type: 'icon' | 'logo';
    logoType?: string;
}

const SvgIconGeneratorApp: React.FC = () => {
    const { generateImage, loading } = useGemini();

    const [mode, setMode] = useState<'icon' | 'logo'>('icon');
    const [prompt, setPrompt] = useState('');
    const [description, setDescription] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('lucid');
    const [logoType, setLogoType] = useState('icon_only');
    const [history, setHistory] = useState<GeneratedIcon[]>([]);
    const [status, setStatus] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [copiedType, setCopiedType] = useState<string | null>(null);
    const [selectedIcon, setSelectedIcon] = useState<GeneratedIcon | null>(null);

    // Load history from storage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('microlabs_svg_icons');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Don't load raster images to save memory
                setHistory(parsed.map((icon: GeneratedIcon) => ({ ...icon, rasterImage: '' })));
            }
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    }, []);

    // Save to storage (without raster images)
    useEffect(() => {
        try {
            const toSave = history.map(({ rasterImage, ...rest }) => rest);
            localStorage.setItem('microlabs_svg_icons', JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save history:', e);
        }
    }, [history]);

    const traceToSvg = async (base64Image: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            // @ts-ignore - ImageTracer is loaded via CDN
            if (!window.ImageTracer) {
                reject(new Error('ImageTracer not loaded. Please refresh the page.'));
                return;
            }

            const options = {
                ltres: 2.5,
                qtres: 2.5,
                pathomit: 15,
                colorsampling: 0,
                numberofcolors: 2,
                mincolorratio: 0,
                colorquantcycles: 1,
                scale: 2,
                simplifytolerance: 1.5,
                roundcoords: 1,
                lcpr: 0,
                qcpr: 0,
                desc: false,
                viewbox: true,
                blurradius: 2,
                blurdelta: 20
            };

            try {
                // @ts-ignore
                window.ImageTracer.imageToSVG(
                    base64Image,
                    (svgString: string) => {
                        if (!svgString) {
                            reject(new Error('Tracing returned empty SVG'));
                            return;
                        }

                        // Post-process SVG
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(svgString, 'image/svg+xml');
                        const svg = doc.querySelector('svg');

                        if (svg) {
                            // Remove white backgrounds and set currentColor
                            const elements = svg.querySelectorAll('path, rect, circle, polygon');
                            elements.forEach(el => {
                                const fill = el.getAttribute('fill');
                                if (fill && (fill === '#fff' || fill === '#ffffff' || fill === 'white' || fill.includes('255,255,255'))) {
                                    el.remove();
                                } else {
                                    el.setAttribute('fill', 'currentColor');
                                    el.removeAttribute('stroke-width');
                                    el.removeAttribute('id');
                                }
                            });

                            svg.removeAttribute('width');
                            svg.removeAttribute('height');

                            const cleaned = svg.outerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><');
                            resolve(cleaned);
                        } else {
                            resolve(svgString);
                        }
                    },
                    options
                );
            } catch (e) {
                reject(e);
            }
        });
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setStatus('Generating image...');

        try {
            const styleInstruction = STYLE_PROMPTS[selectedStyle] || STYLE_PROMPTS['lucid'];

            let imagePrompt: string;
            if (mode === 'logo') {
                let typeDesc = '';
                switch (logoType) {
                    case 'icon_only': typeDesc = 'Pictorial symbol or abstract mark. NO text.'; break;
                    case 'monogram': typeDesc = `Artistic intertwined initials of "${prompt}".`; break;
                    case 'wordmark': typeDesc = `Typographic treatment of the name "${prompt}".`; break;
                    case 'combination': typeDesc = `Graphic symbol paired with the brand name "${prompt}".`; break;
                }
                imagePrompt = `Professional logo design on a pure WHITE background.
                    BRAND: "${prompt}"
                    TYPE: ${typeDesc}
                    ${description ? `CONTEXT: ${description}` : ''}
                    ARTISTIC STYLE: ${styleInstruction}
                    REQUIREMENTS: PURE BLACK and PURE WHITE ONLY. Clean solid shapes.`;
            } else {
                imagePrompt = `Professional pixel-based graphic symbol on a PURE WHITE background.
                    SUBJECT: ${prompt}
                    ${description ? `DETAILS: ${description}` : ''}
                    VISUAL STYLE: ${styleInstruction}
                    TECHNICAL REQUIREMENTS:
                    - Solid BLACK shapes on a solid WHITE background.
                    - NO greyscale, NO gradients, NO shading.
                    - High contrast, crisp lines.`;
            }

            const images = await generateImage(imagePrompt);

            if (!images || images.length === 0) {
                throw new Error('No image generated');
            }

            const rasterImage = images[0];

            setStatus('Tracing vectors...');
            const svgContent = await traceToSvg(rasterImage);

            const newIcon: GeneratedIcon = {
                id: Date.now().toString(),
                name: prompt,
                style: selectedStyle,
                svgContent,
                rasterImage,
                createdAt: Date.now(),
                type: mode,
                logoType: mode === 'logo' ? logoType : undefined
            };

            setHistory(prev => [newIcon, ...prev].slice(0, 50));
            setSelectedIcon(newIcon);
            setStatus('');
        } catch (err: any) {
            setStatus(`Failed: ${err.message}`);
        }
    };

    const handleCopy = async (content: string, id: string, type: string) => {
        await navigator.clipboard.writeText(content);
        setCopiedId(id);
        setCopiedType(type);
        setTimeout(() => {
            setCopiedId(null);
            setCopiedType(null);
        }, 2000);
    };

    const handleDownloadSvg = (icon: GeneratedIcon) => {
        const svgData = icon.svgContent.replace(/currentColor/g, 'black');
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${icon.style}_${icon.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPng = (icon: GeneratedIcon) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        const svgData = icon.svgContent.replace(/currentColor/g, 'black');
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            ctx.clearRect(0, 0, 1024, 1024);
            ctx.drawImage(img, 0, 0, 1024, 1024);
            const pngUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = `${icon.style}_${icon.name.toLowerCase().replace(/\s+/g, '-')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        };
        img.src = url;
    };

    const getReactComponent = (icon: GeneratedIcon) => {
        const componentName = icon.name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).replace(/[^a-zA-Z0-9]/g, '')).join('') + 'Icon';
        const svgData = icon.svgContent.replace(/currentColor/g, 'black');
        return `const ${componentName} = ({ size = 24, className = "" }) => (
  <div style={{ width: size, height: size }} className={className} dangerouslySetInnerHTML={{ __html: \`${svgData}\` }} />
);

export default ${componentName};`;
    };

    const deleteIcon = (id: string) => {
        setHistory(prev => prev.filter(i => i.id !== id));
        if (selectedIcon?.id === id) {
            setSelectedIcon(null);
        }
    };

    // Empty state
    if (!selectedIcon && history.length === 0) {
        return (
            <div className="space-y-6">
                <div className="text-center py-6">
                    <div className="w-16 h-16 bg-indigo-600/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Pen size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">SVG Icon Generator</h3>
                    <p className="text-sm text-dim max-w-[240px] mx-auto">
                        AI-powered icon & logo creation with vector export
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-1 p-1 glass rounded-xl" style={{ background: 'hsl(222 47% 7%)' }}>
                    {(['icon', 'logo'] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all"
                            style={mode === m
                                ? { background: 'hsl(271 91% 65%)', color: 'hsl(210 40% 98%)', boxShadow: '0 4px 12px hsl(271 91% 65% / 0.3)' }
                                : { background: 'transparent', color: 'hsl(215 20% 65%)' }
                            }
                        >
                            {m === 'icon' ? 'Icon' : 'Logo'}
                        </button>
                    ))}
                </div>

                {/* Logo Type (if logo mode) */}
                {mode === 'logo' && (
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-dim font-bold">Logo Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {LOGO_TYPES.map(type => (
                                <button
                                    key={type.value}
                                    onClick={() => setLogoType(type.value)}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                        logoType === type.value
                                            ? 'bg-indigo-600 border-indigo-500'
                                            : 'hover:border-slate-600'
                                    }`}
                                    style={logoType === type.value
                                        ? { color: 'hsl(210 40% 98%)' }
                                        : { background: 'hsl(222 47% 11%)', borderColor: 'hsl(222 47% 18% / 0.5)' }
                                    }
                                >
                                    <div className={`text-xs font-bold ${logoType === type.value ? '' : ''}`} style={logoType !== type.value ? { color: 'hsl(210 40% 98%)' } : {}}>
                                        {type.label}
                                    </div>
                                    <div className={`text-[10px] ${logoType === type.value ? 'opacity-70' : ''}`} style={logoType !== type.value ? { color: 'hsl(215 20% 65%)' } : {}}>
                                        {type.desc}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Style Selector */}
                <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-dim font-bold flex items-center gap-2">
                        <Palette size={12} /> Visual Style
                    </label>
                    <select
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        className="w-full"
                    >
                        {Object.entries(STYLE_GROUPS).map(([group, styles]) => (
                            <optgroup key={group} label={group}>
                                {styles.map(s => (
                                    <option key={s.value} value={s.value}>
                                        {s.label}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {/* Input Fields */}
                <div className="space-y-3">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={mode === 'logo' ? 'Brand name...' : 'Icon subject (e.g., Robot)'}
                        className="w-full"
                        disabled={loading}
                    />
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={mode === 'logo' ? 'Brand context (industry, values)...' : 'Additional details (optional)'}
                        rows={2}
                        className="w-full resize-none"
                        disabled={loading}
                    />
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={loading || !prompt.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2 !bg-indigo-600 shadow-indigo-600/20"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            {status || 'Generating...'}
                        </>
                    ) : (
                        <>
                            <Wand2 size={18} />
                            Generate {mode === 'logo' ? 'Logo' : 'Icon'}
                        </>
                    )}
                </button>

                {status && !loading && (
                    <div className="p-3 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20">
                        {status}
                    </div>
                )}
            </div>
        );
    }

    // Results view
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl" style={{ background: 'hsl(222 47% 11%)' }}>
                        <Pen size={18} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 98%)' }}>SVG Icons</h3>
                        <p className="text-[10px]" style={{ color: 'hsl(215 20% 65%)' }}>{history.length} generated</p>
                    </div>
                </div>
                <button
                    onClick={() => setSelectedIcon(null)}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                    <Wand2 size={12} /> New
                </button>
            </div>

            {/* Selected Icon Preview */}
            {selectedIcon && (
                <div className="card overflow-hidden" style={{ marginTop: '20px' }}>
                    <div className="aspect-square flex items-center justify-center p-8 relative"
                         style={{ background: 'hsl(222 47% 7%)', borderBottom: '1px solid hsl(222 47% 18% / 0.5)' }}>
                        <div className="absolute inset-0 opacity-5"
                            style={{
                                backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                                backgroundSize: '20px 20px'
                            }}
                        />
                        <div
                            className="w-1/2 h-1/2"
                            style={{ color: 'hsl(210 40% 98%)' }}
                            dangerouslySetInnerHTML={{ __html: selectedIcon.svgContent.replace(/<svg/, '<svg width="100%" height="100%"') }}
                        />
                    </div>

                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium" style={{ color: 'hsl(210 40% 98%)' }}>{selectedIcon.name}</h4>
                                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(215 20% 65%)' }}>{selectedIcon.style}</p>
                            </div>
                        </div>

                        {/* Code Preview */}
                        <div className="rounded-lg p-2" style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(222 47% 18% / 0.5)' }}>
                            <code className="text-[10px] font-mono block h-8 overflow-hidden whitespace-nowrap" style={{ color: 'hsl(215 20% 65%)' }}>
                                {selectedIcon.svgContent.replace(/>\s+</g, '><').substring(0, 100)}...
                            </code>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => handleCopy(selectedIcon.svgContent.replace(/currentColor/g, 'black'), selectedIcon.id, 'svg')}
                                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
                            >
                                {copiedId === selectedIcon.id && copiedType === 'svg' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                SVG
                            </button>
                            <button
                                onClick={() => handleCopy(getReactComponent(selectedIcon), selectedIcon.id, 'react')}
                                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
                            >
                                {copiedId === selectedIcon.id && copiedType === 'react' ? <Check size={14} className="text-green-400" /> : <Code2 size={14} />}
                                React
                            </button>
                            <button
                                onClick={() => handleDownloadSvg(selectedIcon)}
                                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
                            >
                                <FileCode size={14} />
                                .SVG
                            </button>
                            <button
                                onClick={() => handleDownloadPng(selectedIcon)}
                                className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
                            >
                                <ImageIcon size={14} />
                                .PNG
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Grid */}
            {history.length > 0 && (
                <div className="space-y-3" style={{ marginTop: '24px' }}>
                    <h4 className="text-xs uppercase tracking-wider font-bold" style={{ color: 'hsl(215 15% 45%)' }}>History</h4>
                    <div className="grid grid-cols-3 gap-2">
                        {history.map(icon => (
                            <div
                                key={icon.id}
                                onClick={() => setSelectedIcon(icon)}
                                className={`aspect-square rounded-xl border cursor-pointer relative group overflow-hidden transition-all ${
                                    selectedIcon?.id === icon.id
                                        ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                                        : 'hover:border-slate-600'
                                }`}
                                style={selectedIcon?.id !== icon.id
                                    ? { background: 'hsl(222 47% 11%)', borderColor: 'hsl(222 47% 18% / 0.5)' }
                                    : { background: 'hsl(222 47% 11%)' }
                                }
                            >
                                <div
                                    className="w-full h-full p-3"
                                    style={{ color: 'hsl(210 40% 98%)' }}
                                    dangerouslySetInnerHTML={{ __html: icon.svgContent.replace(/<svg/, '<svg width="100%" height="100%"') }}
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteIcon(icon.id); }}
                                    className="absolute top-1 right-1 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ background: 'hsl(0 84% 60% / 0.8)' }}
                                >
                                    <X size={12} style={{ color: 'hsl(210 40% 98%)' }} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Generate Form */}
            <div className="card p-4 space-y-3" style={{ marginTop: '20px' }}>
                <h4 className="text-xs uppercase tracking-wider font-bold" style={{ color: 'hsl(215 15% 45%)' }}>Quick Generate</h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Icon name..."
                        className="flex-1"
                        disabled={loading}
                    />
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !prompt.trim()}
                        className="btn-primary px-4 !bg-indigo-600"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SvgIconGeneratorApp;
