'use client';

import React, { useState, useRef } from 'react';
import {
    Pen, Wand2, Download, Copy, Check, Loader2, Image as ImageIcon,
    Sparkles, Palette, Code, FileText, Trash2, X, Eye, Package, Type
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import JSZip from 'jszip';

// Import ImageTracer for vector tracing
import ImageTracer from 'imagetracerjs';

// Types
type Mode = 'icon' | 'batch' | 'logo';
type LogoType = 'icon_only' | 'wordmark' | 'monogram' | 'combination';

interface GeneratedIcon {
    id: string;
    name: string;
    description?: string;
    style: string;
    svgContent: string;
    rasterImage: string;
    createdAt: number;
    type: 'icon' | 'logo';
    logoType?: LogoType;
}

// Full 65 styles matching original LucidGen - grouped
const STYLE_GROUPS: Record<string, { value: string; label: string }[]> = {
    'Essentials': [
        { value: 'lucid', label: 'Lucid (Default)' },
    ],
    'Logo & Professional': [
        { value: 'logo_mark', label: 'Logo Mark' },
        { value: 'mascot', label: 'Esports Mascot' },
        { value: 'monogram', label: 'Luxury Monogram' },
        { value: 'material', label: 'Material Design' },
        { value: 'fluent', label: 'Fluent Design' },
        { value: 'corporate', label: 'Corporate Minimal' },
        { value: 'startup', label: 'Tech Startup' },
        { value: 'flat_25d', label: 'Flat 2.5D' },
        { value: 'duotone', label: 'Duotone Split' },
        { value: 'badge', label: 'Outlined Badge' },
    ],
    'Technical & Schematic': [
        { value: 'blueprint', label: 'Blueprint / Schematic' },
        { value: 'architectural', label: 'Architectural Sketch' },
        { value: 'circuit', label: 'Circuit Board (PCB)' },
        { value: 'neon', label: 'Neon Sign' },
    ],
    'Fun & Comic': [
        { value: 'kawaii', label: 'Kawaii (Cute)' },
        { value: 'classic_animation', label: 'Classic Animation' },
        { value: 'rubber_hose', label: 'Vintage 1930s' },
        { value: 'tv_cartoon', label: 'TV Cartoon' },
        { value: 'superhero', label: 'Superhero Comic' },
        { value: 'graffiti', label: 'Graffiti / Street Art' },
        { value: 'sticker', label: 'Sticker Art' },
        { value: 'retro_anime', label: 'Retro Anime (90s)' },
        { value: 'comic', label: 'Comic Book' },
        { value: 'pop_art', label: 'Pop Art' },
    ],
    'Craft & Texture': [
        { value: 'paper_cutout', label: 'Paper Cutout Art' },
        { value: 'embroidery', label: 'Embroidery / Stitch' },
    ],
    '3D Styles': [
        { value: 'photorealistic', label: 'Photorealistic 3D' },
        { value: 'photorealistic_angled', label: 'Photorealistic 3D (Angled)' },
        { value: 'isometric_3d', label: 'Isometric 3D' },
        { value: 'isometric_rounded', label: 'Rounded Isometric (45°)' },
        { value: 'clay_3d', label: 'Smooth Clay 3D' },
        { value: 'low_poly', label: 'Low Poly 3D' },
        { value: 'glossy_3d', label: 'Glossy Plastic 3D' },
        { value: 'metallic_3d', label: 'Metallic 3D' },
        { value: 'glass_3d', label: 'Glass Transparent 3D' },
        { value: 'voxel_3d', label: 'Voxel Cubic 3D' },
        { value: 'balloon_3d', label: 'Inflated Balloon 3D' },
        { value: 'liquid_3d', label: 'Melting Liquid 3D' },
    ],
    'Hand-drawn & Organic': [
        { value: 'sketch', label: 'Sketch (Hand-Drawn)' },
        { value: 'crayon', label: 'Kids Crayon Drawing' },
        { value: 'doodle', label: 'Doodle Style' },
        { value: 'chalk', label: 'Chalk Texture' },
        { value: 'marker', label: 'Marker Drawing' },
    ],
    'Abstract & Artistic': [
        { value: 'geometric', label: 'Geometric Abstract' },
        { value: 'fluid', label: 'Fluid Organic' },
        { value: 'glitch', label: 'Glitch Art' },
        { value: 'single_line', label: 'Minimalist Single Line' },
        { value: 'splatter', label: 'Splatter Paint' },
        { value: 'negative_space', label: 'Negative Space' },
    ],
    'Art Movements': [
        { value: 'bauhaus', label: 'Bauhaus' },
        { value: 'swiss', label: 'Swiss International' },
        { value: 'art_deco', label: 'Art Deco' },
        { value: 'brutalist', label: 'Brutalist' },
        { value: 'mid_century', label: 'Mid-Century Modern' },
        { value: 'japanese', label: 'Japanese Minimalist' },
        { value: 'art_nouveau', label: 'Art Nouveau' },
        { value: 'de_stijl', label: 'De Stijl' },
        { value: 'tribal', label: 'Tribal / Aztec' },
        { value: 'origami', label: 'Origami / Folded' },
        { value: 'stencil', label: 'Industrial Stencil' },
        { value: 'victorian', label: 'Victorian / Woodcut' },
    ],
    'Thematic': [
        { value: 'cyberpunk', label: 'Cyberpunk' },
        { value: 'pixel', label: 'Pixel Art (8-Bit)' },
        { value: 'steampunk', label: 'Steampunk' },
        { value: 'gothic', label: 'Gothic' },
    ],
};

// Style prompts matching original API route
const STYLE_PROMPTS: Record<string, string> = {
    lucid: `Style: Minimalist "Lucid" Icon. Uniform line thickness, rounded caps. Simple strokes, open shapes. Clean, friendly, functional.`,
    logo_mark: `Style: Logo Mark. Bold, memorable, reductive. Solid fills, high contrast. Iconic, corporate.`,
    mascot: `Style: Esports Mascot. Aggressive, dynamic character. Thick bold outer contours, angular shading blocks. Competitive, energetic.`,
    monogram: `Style: Luxury Monogram. Interwoven lines, letter-like abstraction. Consistent stroke width, symmetry. High-end, sophisticated.`,
    material: `Style: Material Design. Flat layers, paper physics. Solid black shapes for shadows. Geometric forms. Enterprise, clean.`,
    fluent: `Style: Fluent Design. Weightless, light, depth. Clean lines, perspective hints. Modern UI, efficient.`,
    corporate: `Style: Corporate Minimal. Grid-based, ultra-clean. Thin to medium uniform lines, perfect geometry. Professional, B2B.`,
    startup: `Style: Tech Startup. Friendly geometry, slightly rounded. Bold strokes, simple composition. Modern, agile.`,
    flat_25d: `Style: Flat 2.5D. Isometric perspective, flat colors. Distinct planes (black vs white). Informative, clean.`,
    duotone: `Style: Duotone Split. Sharp division between light and shadow. Half outlined, half solid filled. Stylish, modern.`,
    badge: `Style: Outlined Badge. Enclosed in a shape (circle/shield). Uniform stroke width. Official, verified.`,
    blueprint: `Style: Technical Blueprint. Engineering diagram. Thin precise lines, small dashed construction lines. Planned, industrial.`,
    architectural: `Style: Architectural Sketch. Draftsman concept. Loose but straight lines, corner overshoots. Creative, structural.`,
    circuit: `Style: PCB Circuit. Tech nodes, traces. Lines ending in dots. 45-degree turns. Hardware, electronic.`,
    neon: `Style: Neon Sign. Glowing glass tubes. Double outlines (parallel lines), rounded ends. Nightlife, retro-tech.`,
    kawaii: `Style: Kawaii / Cute. Exaggerated rounded proportions, big heads. Soft rounded lines, minimal detail. Adorable, happy.`,
    classic_animation: `Style: Classic Animation. Smooth, flowing line art. Elegant tapered ink lines. Magical, polished.`,
    rubber_hose: `Style: Vintage 1930s Cartoon. Pie-cut eyes, noodle limbs. Uniform thick black lines, bounce. Retro, cheerful.`,
    tv_cartoon: `Style: Prime Time TV Animation (Simpsons-style). Character features: Large perfectly circular eyes with black pupil dots, prominent overbites. Bold, uniform black outlines. Purely flat black and white planes. Satirical, iconic.`,
    superhero: `Style: Superhero Comic. Dynamic action, heavy shadows (spot blacks). Varying line weights, musculature. Epic, strong.`,
    graffiti: `Style: Graffiti. Bubble letters style, drips. Ultra thick outlines. Urban, rebellious.`,
    sticker: `Style: Die-Cut Sticker. Sticker with border. Very thick bold outer contour. Collectible, pop.`,
    retro_anime: `Style: 90s Retro Anime. Cel-shaded, dramatic lighting. Sharp angular shadow blocks against white. Nostalgic, action.`,
    comic: `Style: Comic Book. Dynamic, bold. Heavy outlines, "Kirby dots". Action, story.`,
    pop_art: `Style: Pop Art. High contrast, explosive shapes. Very thick outlines. Energetic, loud.`,
    paper_cutout: `Style: Paper Cutout. Layered paper. Shapes defined by sharp drop shadows. Craft, tactile.`,
    embroidery: `Style: Embroidery. Thread texture. Lines made of small stitches. Handmade, cozy.`,
    photorealistic: `Style: Photorealistic Engraving. Detailed lighting using lines. Woodcut-style hatching for shading. No gradients. Premium, classic.`,
    photorealistic_angled: `Style: Photorealistic Angled View. Object in 3/4 perspective. Woodcut-style hatching for depth. Deep contrast. Cinematic, premium.`,
    isometric_3d: `Style: Isometric Line Art. 30-degree angles, dimensional structures. Uniform line weight, technical drawing. Structural, precise.`,
    isometric_rounded: `Style: Rounded Isometric (45 degrees). Isometric view with smoothed, rounded edges. Clean lines, friendly geometry. Soft, modern.`,
    clay_3d: `Style: Smooth Clay 3D. Soft, rounded, organic forms. Thick, soft black outlines. Blob-like shadows. Friendly, tactile.`,
    low_poly: `Style: Low Poly Wireframe. Faceted geometric triangles. Black outlines for every polygon edge. No solid fills. Digital, structural.`,
    glossy_3d: `Style: Glossy Plastic. Shiny surfaces, specular highlights. Black surfaces with sharp WHITE shapes for reflection. Toy-like, sleek.`,
    metallic_3d: `Style: Metallic. Chrome/Brushed Metal. High contrast horizon lines. Bands of black and white for reflection. Industrial, strong.`,
    glass_3d: `Style: Glass / Transparent. Refraction, transparency. Thin outlines, refraction lines, overlap indicators. Airy, futuristic.`,
    voxel_3d: `Style: Voxel Cubic (Outlined). Stacked 3D cubes. Thick black outlines for every cube. Distinct separation. Digital construction.`,
    balloon_3d: `Style: Inflated Balloon. Puffy, tight seams. Round forms with pinch points. White circular highlights. Party, pop.`,
    liquid_3d: `Style: Melting Liquid. Dripping, flowing, viscous fluid. Smooth curves, teardrops, connecting blobs. Surreal, fluid.`,
    sketch: `Style: Hand-Drawn Sketch. Imperfect, variable width lines. Slightly wobbly. Casual.`,
    crayon: `Style: Kids Crayon Drawing. Rough, waxy texture. Broken edges, uneven pressure. Innocent, playful.`,
    doodle: `Style: Notebook Doodle. Casual, loopy, ballpoint. Thin lines, multiple pass strokes. Informal, creative.`,
    chalk: `Style: Chalk. Dusty, grainy edges. Stipple texture. (Black on White). Rustic, handmade.`,
    marker: `Style: Permanent Marker. Thick, bold, slight bleed. Heavy constant width lines. Bold, loud.`,
    geometric: `Style: Geometric Abstract. Primitives (circles, triangles, squares). Clean lines, mathematical. Modern art, structured.`,
    fluid: `Style: Fluid Organic. Amoeba-like shapes, no straight lines. Smooth flowing curves. Natural, soft.`,
    glitch: `Style: Glitch Art. Digital corruption. Horizontal slicing, pixel displacement. Cyber, edgy.`,
    single_line: `Style: Minimalist Single Line. Continuous line drawing. One unbroken stroke. Elegant, connected.`,
    splatter: `Style: Splatter Paint. Chaotic splashes. Shape defined by negative space or splashes. Expressive, messy.`,
    negative_space: `Style: Negative Space. Subject defined by what is NOT drawn. Solid black block with white cutout. Clever, bold.`,
    bauhaus: `Style: Bauhaus. Geometric primitives, asymmetrical. Mix of heavy blocks and fine lines.`,
    swiss: `Style: Swiss International. Grid-based, mathematical. Very heavy bold strokes. Corporate.`,
    art_deco: `Style: Art Deco. Sunbursts, parallel lines. Elegant curves. Luxury.`,
    brutalist: `Style: Brutalist. Raw, blocky, exaggerated. Thick jagged lines. Aggressive.`,
    mid_century: `Style: Mid-Century Modern. Organic kidney shapes, starbursts. Fluid rhythmic lines. Optimistic.`,
    japanese: `Style: Japanese Minimalist. Zen simplicity. Brush strokes or crest design.`,
    art_nouveau: `Style: Art Nouveau. Flowing organic lines, plant forms. Sinuous varying thickness. Romantic.`,
    de_stijl: `Style: De Stijl. Horizontal/vertical lines only. Thick black grids. Order.`,
    tribal: `Style: Tribal / Aztec. Indigenous patterns. Bold angular lines.`,
    origami: `Style: Origami / Folded. Faceted planes, creases. Angular straight lines. Precise.`,
    stencil: `Style: Industrial Stencil. Bridges, broken lines. Thick segments. Urban.`,
    victorian: `Style: Victorian / Woodcut. Intricate fine engraved look. Hatching lines. Vintage.`,
    cyberpunk: `Style: Cyberpunk. Circuitry, glitches, angular cuts. High-tech.`,
    pixel: `Style: Pixel Art (8-Bit). Low-res, stepped edges. Blocky squares. Retro.`,
    steampunk: `Style: Steampunk. Gears, brass aesthetics. Detailed ornamental lines.`,
    gothic: `Style: Gothic. Sharp arches, spikes. Angular vertical stress. Dark.`,
};

const LOGO_TYPES: { value: LogoType; label: string; desc: string }[] = [
    { value: 'icon_only', label: 'Symbol', desc: 'Graphic only' },
    { value: 'wordmark', label: 'Wordmark', desc: 'Stylized text' },
    { value: 'monogram', label: 'Monogram', desc: 'Initials' },
    { value: 'combination', label: 'Combo', desc: 'Icon + Text' },
];

// Helper functions
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const isWhite = (color: string | null): boolean => {
    if (!color) return false;
    const c = color.toLowerCase().trim();
    return (
        c === '#fff' ||
        c === '#ffffff' ||
        c === 'white' ||
        c === 'rgb(255,255,255)' ||
        c === 'rgba(255,255,255,1)' ||
        c.includes('255,255,255')
    );
};

// Convert SVG to React component
const svgToReactComponent = (svgContent: string, componentName: string = 'Icon'): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');

    if (!svgElement) return svgContent;

    const viewBox = svgElement.getAttribute('viewBox') || '0 0 24 24';
    const fill = svgElement.getAttribute('fill') || 'currentColor';

    const innerContent = svgElement.innerHTML
        .replace(/class=/g, 'className=')
        .replace(/fill-rule=/g, 'fillRule=')
        .replace(/clip-rule=/g, 'clipRule=')
        .replace(/stroke-width=/g, 'strokeWidth=')
        .replace(/stroke-linecap=/g, 'strokeLinecap=')
        .replace(/stroke-linejoin=/g, 'strokeLinejoin=');

    return `import { FC, SVGProps } from 'react';

interface ${componentName}Props extends SVGProps<SVGSVGElement> {
  className?: string;
}

export const ${componentName}: FC<${componentName}Props> = ({ className, ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="${viewBox}"
    fill="${fill}"
    className={className}
    {...props}
  >
${innerContent.split('\n').map(line => '    ' + line.trim()).filter(Boolean).join('\n')}
  </svg>
);

export default ${componentName};`;
};

// Convert SVG to CSS Data URI
const svgToDataUri = (svgContent: string): string => {
    const encoded = encodeURIComponent(svgContent)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
    return `url("data:image/svg+xml,${encoded}")`;
};

// Ultra-High Fidelity ImageTracer settings (matching original)
const traceToSvg = async (base64Image: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Tracing timed out. Please try again.'));
        }, 30000);

        if (!ImageTracer) {
            clearTimeout(timeout);
            reject(new Error('ImageTracer not loaded. Please refresh the page.'));
            return;
        }

        // Ultra-High Fidelity settings for buttery-smooth curves
        const options = {
            ltres: 0.01,           // Error threshold for straight lines (lower = more accurate)
            qtres: 0.01,           // Error threshold for quadratic splines (lower = smoother)
            scale: 10,             // Coordinate multiplier (higher = more precision)
            roundcoords: 3,        // Decimal places for coordinates
            pathomit: 4,           // Minimum path length to keep
            rightangleenhance: true,
            colorsampling: 0,
            numberofcolors: 2,
            mincolorratio: 0,
            colorquantcycles: 1,
            blurradius: 1,
            blurdelta: 20,
            lcpr: 0,
            qcpr: 0,
            desc: false,
            viewbox: true
        };

        try {
            const imageUrl = base64Image.startsWith('data:')
                ? base64Image
                : `data:image/png;base64,${base64Image}`;

            ImageTracer.imageToSVG(
                imageUrl,
                (svgString: string) => {
                    clearTimeout(timeout);

                    if (!svgString) {
                        reject(new Error('Tracing returned empty SVG'));
                        return;
                    }

                    try {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(svgString, 'image/svg+xml');

                        if (doc.querySelector('parsererror')) {
                            resolve(svgString);
                            return;
                        }

                        const svg = doc.querySelector('svg');

                        if (svg) {
                            // Clean up background and set currentColor
                            const elements = svg.querySelectorAll('path, rect, circle, polygon');
                            elements.forEach(el => {
                                const fill = el.getAttribute('fill');
                                if (isWhite(fill)) {
                                    el.remove();
                                } else {
                                    el.setAttribute('fill', 'currentColor');
                                    el.removeAttribute('stroke-width');
                                    el.removeAttribute('id');
                                }
                            });

                            // Calculate Bounding Box to remove whitespace
                            const container = document.createElement('div');
                            Object.assign(container.style, {
                                position: 'absolute',
                                visibility: 'hidden',
                                top: '-9999px',
                                left: '-9999px',
                                width: '20000px',
                                height: '20000px'
                            });

                            const tempSvg = svg.cloneNode(true) as SVGSVGElement;
                            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                            while (tempSvg.firstChild) {
                                group.appendChild(tempSvg.firstChild);
                            }
                            tempSvg.appendChild(group);
                            container.appendChild(tempSvg);
                            document.body.appendChild(container);

                            try {
                                const bbox = group.getBBox();
                                const padding = Math.max(bbox.width, bbox.height) * 0.02;
                                const vx = bbox.x - padding;
                                const vy = bbox.y - padding;
                                const vw = bbox.width + (padding * 2);
                                const vh = bbox.height + (padding * 2);

                                if (bbox.width > 0 && bbox.height > 0) {
                                    svg.setAttribute('viewBox', `${vx.toFixed(2)} ${vy.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}`);
                                }
                            } catch (e) {
                                console.warn("Could not calculate BBox for cropping", e);
                            } finally {
                                document.body.removeChild(container);
                            }

                            svg.removeAttribute('width');
                            svg.removeAttribute('height');

                            const cleaned = svg.outerHTML.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><');
                            resolve(cleaned);
                        } else {
                            resolve(svgString);
                        }
                    } catch (processError) {
                        console.error("Error processing SVG", processError);
                        resolve(svgString);
                    }
                },
                options
            );
        } catch (e) {
            clearTimeout(timeout);
            reject(e);
        }
    });
};

// Extract image from Gemini response
const extractImage = (response: any): string => {
    const candidate = response.candidates?.[0];

    if (!candidate) {
        throw new Error("Gemini API returned no candidates.");
    }

    let base64Image: string | null = null;
    let mimeType: string = "image/png";
    let failureText = "";

    const parts = candidate.content?.parts;
    if (parts) {
        for (const part of parts) {
            if (part.inlineData) {
                base64Image = part.inlineData.data;
                mimeType = part.inlineData.mimeType || "image/png";
                break;
            } else if (part.text) {
                failureText += part.text;
            }
        }
    }

    if (!base64Image) {
        const trimmedText = failureText.trim();
        if (trimmedText.length > 0) {
            throw new Error(`Model returned text instead of image: "${trimmedText.slice(0, 100)}..."`);
        }
        throw new Error(`Failed to generate image. Finish Reason: ${candidate.finishReason || 'Unknown'}`);
    }

    return `data:${mimeType};base64,${base64Image}`;
};

// Generated Icon Card Component
const GeneratedIconCard: React.FC<{
    icon: GeneratedIcon;
    onDelete: () => void;
    isSelected?: boolean;
    onClick?: () => void;
}> = ({ icon, onDelete, isSelected, onClick }) => {
    const [copied, setCopied] = useState<'svg' | 'react' | 'css' | null>(null);
    const [viewMode, setViewMode] = useState<'vector' | 'raster'>('vector');
    const [downloadingPng, setDownloadingPng] = useState(false);

    const handleCopy = async (type: 'svg' | 'react' | 'css') => {
        try {
            let content = '';
            if (type === 'svg') {
                content = icon.svgContent.replace(/currentColor/g, 'black');
            } else if (type === 'react') {
                const componentName = icon.name
                    .split(/[\s-_]+/)
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join('') + 'Icon';
                content = svgToReactComponent(icon.svgContent.replace(/currentColor/g, 'black'), componentName);
            } else {
                const dataUri = svgToDataUri(icon.svgContent.replace(/currentColor/g, 'black'));
                content = `/* ${icon.name} */\n.icon {\n  background-image: ${dataUri};\n  background-size: contain;\n  background-repeat: no-repeat;\n}`;
            }
            await navigator.clipboard.writeText(content);
            setCopied(type);
            setTimeout(() => setCopied(null), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    const handleDownloadSvg = () => {
        const svgData = icon.svgContent.replace(/currentColor/g, 'black');
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const stylePrefix = icon.style ? `${icon.style}_` : '';
        const dateSuffix = new Date(icon.createdAt).toISOString().split('T')[0];
        a.download = `${stylePrefix}${icon.name.toLowerCase().replace(/\s+/g, '-')}_${dateSuffix}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPng = () => {
        setDownloadingPng(true);
        try {
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
                const stylePrefix = icon.style ? `${icon.style}_` : '';
                a.download = `${stylePrefix}${icon.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setDownloadingPng(false);
            };
            img.onerror = () => setDownloadingPng(false);
            img.src = url;
        } catch (err) {
            console.error("PNG conversion failed", err);
            setDownloadingPng(false);
        }
    };

    const injectedSvg = icon.svgContent.replace(/<svg/, '<svg width="100%" height="100%"');

    return (
        <div
            className={`card overflow-hidden cursor-pointer transition-all ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
            onClick={onClick}
        >
            {/* Preview */}
            <div className="aspect-square flex items-center justify-center p-6 relative"
                 style={{ background: 'hsl(222 47% 7%)', borderBottom: '1px solid hsl(222 47% 18% / 0.5)' }}>
                {icon.rasterImage && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setViewMode(viewMode === 'vector' ? 'raster' : 'vector'); }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
                        title={viewMode === 'vector' ? 'Show original' : 'Show vector'}
                    >
                        {viewMode === 'vector' ? <Eye size={12} /> : <Code size={12} />}
                    </button>
                )}

                <div className="absolute inset-0 opacity-5"
                    style={{
                        backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                        backgroundSize: '16px 16px'
                    }}
                />

                <div className="w-2/3 h-2/3 relative">
                    {viewMode === 'vector' ? (
                        <div
                            className="w-full h-full"
                            style={{ color: 'hsl(210 40% 98%)' }}
                            dangerouslySetInnerHTML={{ __html: injectedSvg }}
                        />
                    ) : (
                        <img
                            src={icon.rasterImage}
                            alt="Original AI"
                            className="w-full h-full object-contain opacity-90 grayscale contrast-125"
                        />
                    )}
                </div>

                {/* Delete button */}
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="absolute top-2 left-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                    style={{ background: 'hsl(0 84% 60% / 0.8)' }}
                >
                    <X size={12} style={{ color: 'hsl(210 40% 98%)' }} />
                </button>
            </div>

            {/* Info & Actions */}
            <div className="p-3 space-y-2">
                <div>
                    <h4 className="font-medium text-sm truncate" style={{ color: 'hsl(210 40% 98%)' }}>{icon.name}</h4>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'hsl(215 20% 65%)' }}>
                        {icon.style} • {viewMode === 'vector' ? 'Vector' : 'Raster'}
                    </p>
                </div>

                {/* Copy Buttons */}
                <div className="grid grid-cols-3 gap-1">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCopy('svg'); }}
                        className="btn-secondary text-[10px] py-1.5 flex items-center justify-center gap-1"
                    >
                        {copied === 'svg' ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                        SVG
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCopy('react'); }}
                        className="btn-secondary text-[10px] py-1.5 flex items-center justify-center gap-1"
                    >
                        {copied === 'react' ? <Check size={10} className="text-green-400" /> : <Code size={10} />}
                        React
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleCopy('css'); }}
                        className="btn-secondary text-[10px] py-1.5 flex items-center justify-center gap-1"
                    >
                        {copied === 'css' ? <Check size={10} className="text-green-400" /> : <Palette size={10} />}
                        CSS
                    </button>
                </div>

                {/* Download Buttons */}
                <div className="grid grid-cols-2 gap-1">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDownloadSvg(); }}
                        className="btn-secondary text-[10px] py-1.5 flex items-center justify-center gap-1"
                    >
                        <Download size={10} />
                        SVG
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDownloadPng(); }}
                        disabled={downloadingPng}
                        className="btn-secondary text-[10px] py-1.5 flex items-center justify-center gap-1"
                    >
                        {downloadingPng ? <Loader2 size={10} className="animate-spin" /> : <ImageIcon size={10} />}
                        PNG
                    </button>
                </div>
            </div>
        </div>
    );
};

const SvgIconGeneratorApp: React.FC = () => {
    // State - NO localStorage persistence as requested
    const [mode, setMode] = useState<Mode>('icon');
    const [prompt, setPrompt] = useState('');
    const [description, setDescription] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('lucid');
    const [logoType, setLogoType] = useState<LogoType>('icon_only');
    const [history, setHistory] = useState<GeneratedIcon[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('Generating...');
    const [error, setError] = useState<string | null>(null);

    // Batch mode state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [batchFile, setBatchFile] = useState<File | null>(null);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
    const [batchLogs, setBatchLogs] = useState<string[]>([]);
    const [zipping, setZipping] = useState(false);

    // Core generation logic
    const generateIcon = async (name: string, desc: string, isLogo: boolean = false): Promise<GeneratedIcon> => {
        // Get API key
        const { apiKey } = await new Promise<{ apiKey: string }>((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, resolve);
        });

        if (!apiKey) {
            throw new Error('API Key not found. Please set it in settings.');
        }

        const ai = new GoogleGenAI({ apiKey });
        const styleInstruction = STYLE_PROMPTS[selectedStyle] || STYLE_PROMPTS['lucid'];

        let imagePrompt: string;

        if (isLogo) {
            let typeDesc = '';
            switch (logoType) {
                case 'icon_only': typeDesc = `A pictorial symbol or abstract mark for "${name}". NO text.`; break;
                case 'monogram': typeDesc = `A Monogram using initials of "${name}". Intertwined letters.`; break;
                case 'wordmark': typeDesc = `A Wordmark: the text "${name}" in custom typography.`; break;
                case 'combination': typeDesc = `A Combination Mark: symbol + the text "${name}".`; break;
            }
            imagePrompt = `Generate an image of a professional black and white vector logo.
Subject: Logo for "${name}"
Structure: ${typeDesc}
Style: ${selectedStyle}. ${styleInstruction}
${desc ? `Context: ${desc}` : ''}
Visual constraints: High-contrast Black shapes on a White background. No gradients. Flat vector style.
Output requirement: Return the image only. No text description.`;
        } else {
            imagePrompt = `Generate a high-contrast black and white vector icon illustration of ${name}.
${desc ? `Description: ${desc}` : ''}
Style: ${selectedStyle}. ${styleInstruction}
Visual constraints: Solid black shapes on a white background. No text labels. No gradients.
Output requirement: Return the image only. No text description.`;
        }

        setLoadingText(`Dreaming in ${selectedStyle} style...`);

        // Use gemini-2.5-flash-image model (EXACT from original)
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: imagePrompt }] },
        });

        const rasterImage = extractImage(response);

        setLoadingText('Tracing Vectors...');
        const svgContent = await traceToSvg(rasterImage);

        return {
            id: crypto.randomUUID(),
            name,
            description: desc,
            style: selectedStyle,
            svgContent,
            rasterImage,
            createdAt: Date.now(),
            type: isLogo ? 'logo' : 'icon',
            logoType: isLogo ? logoType : undefined
        };
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        setLoadingText('Initializing...');
        setError(null);

        try {
            const newIcon = await generateIcon(prompt, description, mode === 'logo');
            setHistory(prev => [newIcon, ...prev].slice(0, 100));
            setPrompt('');
            setDescription('');
        } catch (err: any) {
            setError(err.message || 'Failed to generate');
            console.error(err);
        } finally {
            setLoading(false);
            setLoadingText('Generating...');
        }
    };

    // Batch mode functions
    const downloadTemplate = () => {
        const headers = "Icon Name,Details (Optional)\n";
        const rows = "Rocket,A simple rocket ship taking off\nLeaf,A minimal oak leaf\nSettings,A gear icon";
        const content = headers + rows;
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "icon_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setBatchFile(e.target.files[0]);
            setError(null);
        }
    };

    const parseCSV = async (file: File): Promise<{ name: string; desc: string }[]> => {
        const text = await file.text();
        const lines = text.split(/\r\n|\n/);
        const items: { name: string; desc: string }[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(',');
            const name = parts[0]?.trim();
            const desc = parts.slice(1).join(',')?.trim() || "";
            if (name) items.push({ name, desc });
        }
        return items;
    };

    const handleBatchSubmit = async () => {
        if (!batchFile) {
            setError("Please upload a CSV file first.");
            return;
        }

        setLoading(true);
        setBatchLogs([]);
        setError(null);

        try {
            const items = await parseCSV(batchFile);
            if (items.length === 0) {
                throw new Error("No valid rows found in CSV.");
            }

            setBatchProgress({ current: 0, total: items.length });

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                setBatchProgress({ current: i + 1, total: items.length });
                setBatchLogs(prev => [`Generating "${item.name}" (${selectedStyle})...`, ...prev]);

                try {
                    const newIcon = await generateIcon(item.name, item.desc, false);
                    setHistory(prev => [newIcon, ...prev].slice(0, 100));
                    setBatchLogs(prev => [`✓ Success: "${item.name}"`, ...prev]);
                } catch (err) {
                    console.error(err);
                    setBatchLogs(prev => [`✕ Failed: "${item.name}"`, ...prev]);
                }

                if (i < items.length - 1) {
                    setBatchLogs(prev => [`⏳ Cooling down (5s)...`, ...prev]);
                    await delay(5000);
                }
            }

            setBatchLogs(prev => [`🎉 Batch Complete!`, ...prev]);
        } catch (err: any) {
            setError("Batch failed: " + err.message);
        } finally {
            setLoading(false);
            setBatchProgress(null);
        }
    };

    const handleDownloadZip = async () => {
        if (history.length === 0) return;
        setZipping(true);
        try {
            const zip = new JSZip();
            const rootFolder = zip.folder("svg-icons");
            const usedPaths: Record<string, number> = {};

            history.forEach((icon) => {
                if (icon.svgContent) {
                    const styleFolder = icon.style || 'misc';
                    const cleanName = icon.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'icon';
                    const date = new Date(icon.createdAt).toISOString().split('T')[0];
                    const baseName = `${cleanName}_${date}`;
                    let filePath = `${styleFolder}/${baseName}.svg`;

                    if (usedPaths[filePath]) {
                        usedPaths[filePath]++;
                        filePath = `${styleFolder}/${baseName}-${usedPaths[filePath]}.svg`;
                    } else {
                        usedPaths[filePath] = 1;
                    }

                    rootFolder?.file(filePath, icon.svgContent.replace(/currentColor/g, 'black'));
                }
            });

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement("a");
            link.href = url;
            link.download = "svg-icons.zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Zip failed", e);
            setError("Failed to create zip file.");
        } finally {
            setZipping(false);
        }
    };

    const deleteIcon = (id: string) => {
        setHistory(prev => prev.filter(i => i.id !== id));
    };

    const clearHistory = () => {
        setHistory([]);
    };

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Input Section - Always at TOP */}
            <div className="flex-shrink-0 space-y-4 p-4" style={{ borderBottom: '1px solid hsl(222 47% 18% / 0.5)' }}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl" style={{ background: 'hsl(271 91% 65% / 0.15)' }}>
                            <Pen size={18} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: 'hsl(210 40% 98%)' }}>SVG Generator</h3>
                            <p className="text-[10px]" style={{ color: 'hsl(215 20% 65%)' }}>{history.length} generated</p>
                        </div>
                    </div>
                    {history.length > 0 && (
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={handleDownloadZip}
                                disabled={zipping}
                                className="btn-secondary text-xs py-1.5 px-2 flex items-center gap-1"
                            >
                                {zipping ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                                ZIP
                            </button>
                            <button
                                type="button"
                                onClick={clearHistory}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Clear all"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Mode Toggle - 3 modes only */}
                <div className="flex gap-1 p-1 glass rounded-xl" style={{ background: 'hsl(222 47% 7%)' }}>
                    {(['icon', 'batch', 'logo'] as Mode[]).map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => { setMode(m); setError(null); }}
                            className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
                            style={mode === m
                                ? { background: 'hsl(271 91% 65%)', color: 'hsl(210 40% 98%)', boxShadow: '0 4px 12px hsl(271 91% 65% / 0.3)' }
                                : { background: 'transparent', color: 'hsl(215 20% 65%)' }
                            }
                        >
                            {m === 'icon' ? 'Icon' : m === 'batch' ? 'Batch' : 'Logo'}
                        </button>
                    ))}
                </div>

                {/* Logo Type (if logo mode) */}
                {mode === 'logo' && (
                    <div className="grid grid-cols-4 gap-1">
                        {LOGO_TYPES.map(type => (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => setLogoType(type.value)}
                                className={`p-2 rounded-lg border text-center transition-all ${
                                    logoType === type.value
                                        ? 'bg-indigo-600 border-indigo-500'
                                        : 'hover:border-slate-600'
                                }`}
                                style={logoType === type.value
                                    ? { color: 'hsl(210 40% 98%)' }
                                    : { background: 'hsl(222 47% 11%)', borderColor: 'hsl(222 47% 18% / 0.5)' }
                                }
                            >
                                <div className="text-[10px] font-bold" style={logoType !== type.value ? { color: 'hsl(210 40% 98%)' } : {}}>
                                    {type.label}
                                </div>
                                <div className="text-[8px] opacity-70" style={logoType !== type.value ? { color: 'hsl(215 20% 65%)' } : {}}>
                                    {type.desc}
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Style Selector */}
                <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-dim font-bold flex items-center gap-1">
                        <Palette size={10} /> Visual Style
                    </label>
                    <select
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value)}
                        className="w-full text-sm"
                        disabled={loading}
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

                {/* Mode-specific inputs */}
                {mode === 'batch' ? (
                    <div className="space-y-3">
                        <div className="p-2 rounded-lg text-[10px]" style={{ background: 'hsl(271 91% 65% / 0.1)', border: '1px solid hsl(271 91% 65% / 0.2)', color: 'hsl(271 91% 65%)' }}>
                            Upload a CSV to generate multiple icons automatically.
                        </div>

                        <button
                            type="button"
                            onClick={downloadTemplate}
                            className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1"
                        >
                            <Download size={12} />
                            Download CSV Template
                        </button>

                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 cursor-pointer"
                            disabled={loading}
                        />

                        {batchFile && (
                            <div className="text-[10px] text-green-400 font-mono flex items-center gap-1">
                                <Check size={10} /> {batchFile.name} ready
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleBatchSubmit}
                            disabled={!batchFile || loading}
                            className="btn-primary w-full flex items-center justify-center gap-2 !bg-indigo-600"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {batchProgress ? `${batchProgress.current}/${batchProgress.total}` : 'Processing...'}
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    Start Batch
                                </>
                            )}
                        </button>

                        {/* Batch Logs */}
                        {batchLogs.length > 0 && (
                            <div className="rounded-lg p-2 h-24 overflow-y-auto text-[10px] font-mono" style={{ background: 'hsl(222 47% 7%)', border: '1px solid hsl(222 47% 18% / 0.5)', color: 'hsl(215 20% 65%)' }}>
                                {batchLogs.map((log, i) => (
                                    <div key={i} className="mb-0.5">{log}</div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={mode === 'logo' ? 'Brand name...' : 'Icon subject (e.g., Robot)'}
                            className="w-full text-sm"
                            disabled={loading}
                        />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={mode === 'logo' ? 'Brand context (industry, values)...' : 'Additional details (optional)'}
                            rows={2}
                            className="w-full resize-none text-sm"
                            disabled={loading}
                        />

                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={loading || !prompt.trim()}
                            className="btn-primary w-full flex items-center justify-center gap-2 !bg-indigo-600"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    {loadingText}
                                </>
                            ) : (
                                <>
                                    <Wand2 size={16} />
                                    Generate {mode === 'logo' ? 'Logo' : 'Icon'}
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-2 rounded-lg text-xs bg-red-500/10 text-red-400 border border-red-500/20">
                        {error}
                    </div>
                )}
            </div>

            {/* Results Grid - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <div className="w-14 h-14 bg-indigo-600/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-4">
                            <Pen size={28} />
                        </div>
                        <h4 className="text-sm font-medium mb-1" style={{ color: 'hsl(210 40% 98%)' }}>No icons yet</h4>
                        <p className="text-xs max-w-[200px]" style={{ color: 'hsl(215 20% 65%)' }}>
                            Create your first icon, logo, or use batch mode to generate multiple at once.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {history.map(icon => (
                            <GeneratedIconCard
                                key={icon.id}
                                icon={icon}
                                onDelete={() => deleteIcon(icon.id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SvgIconGeneratorApp;
