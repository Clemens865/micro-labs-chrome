'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Upload,
    Sparkles,
    AlertCircle,
    X,
    RotateCcw,
    MousePointer2,
    Crop as CropIcon,
    Pencil,
    Eraser,
    Image as ImageIcon,
    Plus,
    Wand2,
    Zap,
    Download,
    Clock,
    Loader2,
    Columns,
    ChevronLeft,
    ChevronRight,
    Trash2
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useToast } from '../../hooks/useToast';

// Types
interface EditHistoryItem {
    id: string;
    imageData: string;
    prompt: string;
    createdAt: number;
    parentId?: string;
}

type MixingMode = 'subject' | 'style';
type ToolType = 'select' | 'crop' | 'mark';

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Utility functions
const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.src = url;
    });

async function getCroppedImg(
    imageSrc: string,
    pixelCrop: CropArea,
): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return canvas.toDataURL('image/png');
}

async function applyMarkersToImage(
    baseImageSrc: string,
    markerCanvas: HTMLCanvasElement
): Promise<string> {
    const baseImage = await createImage(baseImageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2d context');

    canvas.width = baseImage.naturalWidth;
    canvas.height = baseImage.naturalHeight;

    ctx.drawImage(baseImage, 0, 0);
    ctx.drawImage(markerCanvas, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
}

// Crop handle constants
const HANDLE_SIZE = 10;
const MIN_CROP_SIZE = 30;
type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | null;

// Helper functions
const cleanBase64 = (base64Str: string): string => {
    return base64Str.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

const getMimeType = (base64Str: string): string => {
    const match = base64Str.match(/^data:(image\/[a-zA-Z+]+);base64,/);
    return match ? match[1] : 'image/png';
};

export default function PixelAlchemyApp() {
    const { success, error: showError, info } = useToast();

    // Core state
    const [currentImage, setCurrentImage] = useState<string | null>(null);
    const [secondaryImage, setSecondaryImage] = useState<string | null>(null);
    const [mixingMode, setMixingMode] = useState<MixingMode>('style');
    const [prompt, setPrompt] = useState('');
    const [history, setHistory] = useState<EditHistoryItem[]>([]);
    const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');

    // Tool state
    const [activeTool, setActiveTool] = useState<ToolType>('select');
    const [showComparison, setShowComparison] = useState(false);
    const [compareValue, setCompareValue] = useState(50);

    // Crop state
    const [cropArea, setCropArea] = useState<CropArea | null>(null);
    const [cropHandle, setCropHandle] = useState<CropHandle>(null);
    const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number; area: CropArea } | null>(null);

    // Marker state
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasMarkers, setHasMarkers] = useState(false);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const secondaryInputRef = useRef<HTMLInputElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const markerCanvasRef = useRef<HTMLCanvasElement>(null);
    const cropOverlayRef = useRef<HTMLCanvasElement>(null);

    // Load history from storage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('microlabs_pixel_alchemy');
            if (saved) {
                const parsed = JSON.parse(saved);
                setHistory(parsed);
                if (parsed.length > 0) {
                    const lastItem = parsed[0];
                    setCurrentImage(lastItem.imageData);
                    setCurrentHistoryId(lastItem.id);
                }
            }
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    }, []);

    // Save history (without full image data for storage efficiency)
    useEffect(() => {
        try {
            // Only save the last 10 items
            const toSave = history.slice(0, 10);
            localStorage.setItem('microlabs_pixel_alchemy', JSON.stringify(toSave));
        } catch (e) {
            console.error('Failed to save history:', e);
        }
    }, [history]);

    // Initialize marker canvas when image loads
    useEffect(() => {
        if (imgRef.current && markerCanvasRef.current && currentImage && activeTool === 'mark') {
            const img = imgRef.current;
            const canvas = markerCanvasRef.current;
            canvas.width = img.clientWidth;
            canvas.height = img.clientHeight;
        }
    }, [currentImage, activeTool]);

    // Initialize crop area when crop tool is activated
    useEffect(() => {
        if (activeTool === 'crop' && imgRef.current && !cropArea) {
            const img = imgRef.current;
            const margin = Math.min(img.clientWidth, img.clientHeight) * 0.1;
            setCropArea({
                x: margin,
                y: margin,
                width: img.clientWidth - margin * 2,
                height: img.clientHeight - margin * 2
            });
        } else if (activeTool !== 'crop') {
            setCropArea(null);
        }
    }, [activeTool]);

    // Draw crop overlay
    useEffect(() => {
        if (activeTool === 'crop' && cropArea && cropOverlayRef.current && imgRef.current) {
            const canvas = cropOverlayRef.current;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = imgRef.current.clientWidth;
            canvas.height = imgRef.current.clientHeight;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Darken outside area
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

            // Border
            ctx.strokeStyle = '#8b5cf6';
            ctx.lineWidth = 2;
            ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

            // Grid lines
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            const thirdW = cropArea.width / 3;
            const thirdH = cropArea.height / 3;
            ctx.beginPath();
            ctx.moveTo(cropArea.x + thirdW, cropArea.y);
            ctx.lineTo(cropArea.x + thirdW, cropArea.y + cropArea.height);
            ctx.moveTo(cropArea.x + thirdW * 2, cropArea.y);
            ctx.lineTo(cropArea.x + thirdW * 2, cropArea.y + cropArea.height);
            ctx.moveTo(cropArea.x, cropArea.y + thirdH);
            ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + thirdH);
            ctx.moveTo(cropArea.x, cropArea.y + thirdH * 2);
            ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + thirdH * 2);
            ctx.stroke();

            // Handles
            const handles = [
                { x: cropArea.x, y: cropArea.y },
                { x: cropArea.x + cropArea.width / 2, y: cropArea.y },
                { x: cropArea.x + cropArea.width, y: cropArea.y },
                { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height / 2 },
                { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height },
                { x: cropArea.x + cropArea.width / 2, y: cropArea.y + cropArea.height },
                { x: cropArea.x, y: cropArea.y + cropArea.height },
                { x: cropArea.x, y: cropArea.y + cropArea.height / 2 },
            ];

            ctx.fillStyle = '#8b5cf6';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            handles.forEach(h => {
                ctx.beginPath();
                ctx.rect(h.x - HANDLE_SIZE / 2, h.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
                ctx.fill();
                ctx.stroke();
            });
        }
    }, [cropArea, activeTool]);

    const addToHistory = useCallback((imageData: string, promptText: string) => {
        const newItem: EditHistoryItem = {
            id: generateId(),
            imageData,
            prompt: promptText,
            createdAt: Date.now(),
            parentId: currentHistoryId || undefined
        };
        setHistory(prev => [newItem, ...prev].slice(0, 20));
        setCurrentHistoryId(newItem.id);
    }, [currentHistoryId]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const result = e.target?.result as string;
            setCurrentImage(result);
            setSecondaryImage(null);
            setPrompt('');
            setShowComparison(false);
            clearMarkers();
            setActiveTool('select');

            // Clear history and add new original
            setHistory([]);
            setCurrentHistoryId(null);

            setTimeout(() => {
                const newItem: EditHistoryItem = {
                    id: generateId(),
                    imageData: result,
                    prompt: "Original Upload",
                    createdAt: Date.now(),
                };
                setHistory([newItem]);
                setCurrentHistoryId(newItem.id);
            }, 50);

            success('Image loaded');
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleSecondaryUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            setSecondaryImage(e.target?.result as string);
            info('Reference image added');
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    // AI Edit using Gemini image model
    const handleEdit = async () => {
        console.log('[PixelAlchemy] handleEdit called!', { currentImage: !!currentImage, prompt });

        if (!currentImage || !prompt.trim()) {
            console.log('[PixelAlchemy] Early return - no image or prompt');
            return;
        }

        setIsProcessing(true);
        setProcessingStatus('Preparing image...');

        try {
            console.log('[PixelAlchemy] Getting API key...');

            // Get API key from extension storage
            const { apiKey } = await new Promise<{ apiKey: string }>((resolve) => {
                chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, resolve);
            });

            console.log('[PixelAlchemy] API key result:', apiKey ? 'Found' : 'Not found');

            if (!apiKey) {
                throw new Error('API Key not found. Please set it in settings.');
            }

            console.log('[PixelAlchemy] API key found, preparing image...');

            let sourceImage = history.find(h => h.id === currentHistoryId)?.imageData || currentImage;

            if (hasMarkers && markerCanvasRef.current) {
                setProcessingStatus('Applying markers...');
                sourceImage = await applyMarkersToImage(sourceImage, markerCanvasRef.current);
            }

            setProcessingStatus('AI is transforming your image...');

            // Initialize Gemini
            const genAI = new GoogleGenAI({ apiKey });

            // Build parts array with image(s) and prompt
            const parts: any[] = [];

            // Primary image
            const primaryMime = getMimeType(sourceImage);
            const primaryData = cleanBase64(sourceImage);
            console.log('[PixelAlchemy] Primary image:', primaryMime, 'data length:', primaryData.length);

            parts.push({
                inlineData: {
                    data: primaryData,
                    mimeType: primaryMime,
                },
            });

            // Secondary/reference image if provided
            if (secondaryImage) {
                parts.push({
                    inlineData: {
                        data: cleanBase64(secondaryImage),
                        mimeType: getMimeType(secondaryImage),
                    },
                });
            }

            // Add the user's prompt
            parts.push({ text: prompt });

            console.log('[PixelAlchemy] Calling Gemini with prompt:', prompt);

            // Mixing instruction based on mode (exact from original)
            const mixingInstruction = mixingMode === 'subject'
                ? "Take the SUBJECT or OBJECT from the SECOND image and realistically place it into the FIRST image."
                : "Adopt ONLY the colors, lighting, mood, and artistic STYLE of the SECOND image and apply it to the FIRST image. Do NOT copy objects/people from the second image.";

            // System instruction - exact from original
            const systemInstruction = `You are a direct image transformation engine.
MANDATORY RULES:
1. MODIFY the FIRST image based on the text prompt.
2. ${secondaryImage ? mixingInstruction : ""}
3. OUTPUT: ONLY the modified image data. NO TEXT. NO JSON.`;

            // Call Gemini with the image-specific model (EXACT from original MicroLabs)
            const response = await genAI.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts },
                config: {
                    systemInstruction,
                }
            });

            console.log('[PixelAlchemy] Response received:', response);

            // Extract the generated image
            const candidate = response.candidates?.[0];
            const outputParts = candidate?.content?.parts;

            console.log('[PixelAlchemy] Candidate:', candidate);
            console.log('[PixelAlchemy] Output parts:', outputParts);

            let generatedImage: string | null = null;

            if (outputParts) {
                for (const part of outputParts) {
                    console.log('[PixelAlchemy] Part:', Object.keys(part));
                    if (part.inlineData?.data) {
                        const mimeType = part.inlineData.mimeType || 'image/png';
                        generatedImage = `data:${mimeType};base64,${part.inlineData.data}`;
                        console.log('[PixelAlchemy] Found image!');
                        break;
                    }
                }
            }

            if (generatedImage) {
                setCurrentImage(generatedImage);
                addToHistory(generatedImage, prompt);
                clearMarkers();
                setPrompt('');
                success('Image edited successfully!');
            } else {
                // Check for text response (could be an error or explanation)
                const textPart = outputParts?.find((p: any) => p.text);
                if (textPart?.text) {
                    console.log('[PixelAlchemy] Got text response:', textPart.text);
                    // If it's a refusal or explanation, show it
                    if (textPart.text.length < 200) {
                        throw new Error(textPart.text);
                    } else {
                        throw new Error('AI returned text instead of image. Try a simpler edit prompt.');
                    }
                }
                throw new Error('The AI failed to generate an image. Try a different prompt.');
            }

        } catch (err: any) {
            console.error('[PixelAlchemy] Error:', err);
            showError(err.message || 'Edit failed');
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
    };

    // Drawing functions
    const startDrawing = (e: React.MouseEvent) => {
        if (activeTool !== 'mark') return;
        setIsDrawing(true);
        const canvas = markerCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        setHasMarkers(true);
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || activeTool !== 'mark') return;
        const canvas = markerCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
        ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);

    const clearMarkers = () => {
        const canvas = markerCanvasRef.current;
        if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
        setHasMarkers(false);
    };

    // Crop functions
    const getHandleAtPosition = (x: number, y: number): CropHandle => {
        if (!cropArea) return null;

        const handles: { handle: CropHandle; x: number; y: number }[] = [
            { handle: 'nw', x: cropArea.x, y: cropArea.y },
            { handle: 'n', x: cropArea.x + cropArea.width / 2, y: cropArea.y },
            { handle: 'ne', x: cropArea.x + cropArea.width, y: cropArea.y },
            { handle: 'e', x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height / 2 },
            { handle: 'se', x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height },
            { handle: 's', x: cropArea.x + cropArea.width / 2, y: cropArea.y + cropArea.height },
            { handle: 'sw', x: cropArea.x, y: cropArea.y + cropArea.height },
            { handle: 'w', x: cropArea.x, y: cropArea.y + cropArea.height / 2 },
        ];

        for (const h of handles) {
            if (Math.abs(x - h.x) <= HANDLE_SIZE && Math.abs(y - h.y) <= HANDLE_SIZE) {
                return h.handle;
            }
        }

        if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
            y >= cropArea.y && y <= cropArea.y + cropArea.height) {
            return 'move';
        }

        return null;
    };

    const handleCropMouseDown = (e: React.MouseEvent) => {
        if (activeTool !== 'crop' || !cropArea || !cropOverlayRef.current) return;
        const rect = cropOverlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const handle = getHandleAtPosition(x, y);
        if (handle) {
            setCropHandle(handle);
            setCropDragStart({ x, y, area: { ...cropArea } });
        }
    };

    const handleCropMouseMove = (e: React.MouseEvent) => {
        if (!cropHandle || !cropDragStart || !cropArea || !cropOverlayRef.current || !imgRef.current) return;

        const rect = cropOverlayRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const dx = x - cropDragStart.x;
        const dy = y - cropDragStart.y;
        const orig = cropDragStart.area;
        const maxW = imgRef.current.clientWidth;
        const maxH = imgRef.current.clientHeight;

        let newArea = { ...cropArea };

        switch (cropHandle) {
            case 'move':
                newArea.x = Math.max(0, Math.min(maxW - orig.width, orig.x + dx));
                newArea.y = Math.max(0, Math.min(maxH - orig.height, orig.y + dy));
                break;
            case 'nw':
                newArea.x = Math.max(0, Math.min(orig.x + orig.width - MIN_CROP_SIZE, orig.x + dx));
                newArea.y = Math.max(0, Math.min(orig.y + orig.height - MIN_CROP_SIZE, orig.y + dy));
                newArea.width = orig.x + orig.width - newArea.x;
                newArea.height = orig.y + orig.height - newArea.y;
                break;
            case 'ne':
                newArea.y = Math.max(0, Math.min(orig.y + orig.height - MIN_CROP_SIZE, orig.y + dy));
                newArea.width = Math.max(MIN_CROP_SIZE, Math.min(maxW - orig.x, orig.width + dx));
                newArea.height = orig.y + orig.height - newArea.y;
                break;
            case 'se':
                newArea.width = Math.max(MIN_CROP_SIZE, Math.min(maxW - orig.x, orig.width + dx));
                newArea.height = Math.max(MIN_CROP_SIZE, Math.min(maxH - orig.y, orig.height + dy));
                break;
            case 'sw':
                newArea.x = Math.max(0, Math.min(orig.x + orig.width - MIN_CROP_SIZE, orig.x + dx));
                newArea.width = orig.x + orig.width - newArea.x;
                newArea.height = Math.max(MIN_CROP_SIZE, Math.min(maxH - orig.y, orig.height + dy));
                break;
            case 'n':
                newArea.y = Math.max(0, Math.min(orig.y + orig.height - MIN_CROP_SIZE, orig.y + dy));
                newArea.height = orig.y + orig.height - newArea.y;
                break;
            case 's':
                newArea.height = Math.max(MIN_CROP_SIZE, Math.min(maxH - orig.y, orig.height + dy));
                break;
            case 'e':
                newArea.width = Math.max(MIN_CROP_SIZE, Math.min(maxW - orig.x, orig.width + dx));
                break;
            case 'w':
                newArea.x = Math.max(0, Math.min(orig.x + orig.width - MIN_CROP_SIZE, orig.x + dx));
                newArea.width = orig.x + orig.width - newArea.x;
                break;
        }

        setCropArea(newArea);
    };

    const handleCropMouseUp = () => {
        setCropHandle(null);
        setCropDragStart(null);
    };

    const handleApplyCrop = async () => {
        if (!cropArea || !currentImage || !imgRef.current) return;

        try {
            // Scale crop area to actual image dimensions
            const img = imgRef.current;
            const scaleX = img.naturalWidth / img.clientWidth;
            const scaleY = img.naturalHeight / img.clientHeight;

            const scaledCrop = {
                x: cropArea.x * scaleX,
                y: cropArea.y * scaleY,
                width: cropArea.width * scaleX,
                height: cropArea.height * scaleY
            };

            const croppedBase64 = await getCroppedImg(currentImage, scaledCrop);
            setCurrentImage(croppedBase64);
            addToHistory(croppedBase64, "Crop Applied");
            setActiveTool('select');
            success('Crop applied');
        } catch (err) {
            showError('Crop failed');
        }
    };

    const handleReset = () => {
        setCurrentImage(null);
        setSecondaryImage(null);
        setPrompt('');
        setHistory([]);
        setCurrentHistoryId(null);
        setActiveTool('select');
        setShowComparison(false);
        clearMarkers();
        localStorage.removeItem('microlabs_pixel_alchemy');
        info('Reset complete');
    };

    const handleDownload = () => {
        if (!currentImage) return;
        const link = document.createElement('a');
        link.href = currentImage;
        link.download = `pixel-alchemy-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        success('Image downloaded');
    };

    const prevImage = history.find(h => h.id === (history.find(x => x.id === currentHistoryId)?.parentId))?.imageData;

    // Empty state
    if (!currentImage) {
        return (
            <div className="space-y-6">
                <div className="text-center py-6">
                    <div className="w-16 h-16 bg-violet-600/10 text-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                        <Wand2 size={32} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Pixel Alchemy</h3>
                    <p className="text-sm text-dim max-w-[240px] mx-auto">
                        AI-powered image editing with text prompts
                    </p>
                </div>

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center cursor-pointer hover:border-violet-500 hover:bg-slate-800/50 transition-all"
                >
                    <Upload size={48} className="mx-auto mb-4 text-slate-500" />
                    <p className="text-sm text-slate-400 mb-2">Click to upload an image</p>
                    <p className="text-xs text-slate-600">Begin your alchemy journey</p>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                />
            </div>
        );
    }

    // Main editing view
    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl" style={{ background: 'hsl(222 47% 11%)' }}>
                        <Wand2 size={18} className="text-violet-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold">Pixel Alchemy</h3>
                        <p className="text-[10px] text-dim">{history.length} edits</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                        title="Download"
                    >
                        <Download size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        title="Reset"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Tool Bar */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'hsl(222 47% 9%)' }}>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                    title="Upload New"
                >
                    <Upload size={16} />
                </button>
                <div className="w-px bg-slate-700 mx-1" />
                <button
                    type="button"
                    onClick={() => setActiveTool('select')}
                    className={`p-2 rounded-lg transition-all ${activeTool === 'select' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                    title="Select"
                >
                    <MousePointer2 size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTool('crop')}
                    className={`p-2 rounded-lg transition-all ${activeTool === 'crop' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                    title="Crop"
                >
                    <CropIcon size={16} />
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTool('mark')}
                    className={`p-2 rounded-lg transition-all ${activeTool === 'mark' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                    title="Mark Areas"
                >
                    <Pencil size={16} />
                </button>
                {history.length > 1 && (
                    <>
                        <div className="w-px bg-slate-700 mx-1" />
                        <button
                            type="button"
                            onClick={() => setShowComparison(!showComparison)}
                            className={`p-2 rounded-lg transition-all ${showComparison ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
                            title="Compare"
                        >
                            <Columns size={16} />
                        </button>
                    </>
                )}
            </div>

            {/* Image Preview Area - constrained height */}
            <div
                className="relative rounded-lg overflow-hidden flex items-center justify-center"
                style={{
                    background: 'hsl(222 47% 7%)',
                    minHeight: '180px',
                    maxHeight: '280px',
                    height: '40vh'
                }}
            >
                {isProcessing && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                        <Wand2 className="w-10 h-10 text-violet-400 animate-bounce" />
                        <p className="mt-3 text-sm font-medium text-white animate-pulse">{processingStatus}</p>
                        <p className="text-xs text-slate-400 mt-1">AI is editing your image...</p>
                    </div>
                )}

                {showComparison && prevImage ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img src={currentImage} className="max-w-full max-h-full object-contain" alt="Current" />
                        <div
                            className="absolute inset-0 overflow-hidden flex items-center justify-center"
                            style={{ width: `${compareValue}%`, borderRight: '2px solid white' }}
                        >
                            <img
                                src={prevImage}
                                className="max-w-full max-h-full object-contain"
                                alt="Previous"
                            />
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={compareValue}
                            onChange={e => setCompareValue(parseInt(e.target.value))}
                            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-ew-resize"
                        />
                    </div>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center p-2">
                        <img
                            ref={imgRef}
                            src={currentImage}
                            className="rounded-lg shadow-lg"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                width: 'auto',
                                height: 'auto'
                            }}
                            alt="Current"
                        />

                        {/* Marker canvas */}
                        {activeTool === 'mark' && imgRef.current && (
                            <canvas
                                ref={markerCanvasRef}
                                className="absolute cursor-crosshair pointer-events-auto"
                                style={{
                                    top: imgRef.current.offsetTop,
                                    left: imgRef.current.offsetLeft,
                                    width: imgRef.current.clientWidth,
                                    height: imgRef.current.clientHeight
                                }}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                            />
                        )}

                        {/* Crop overlay */}
                        {activeTool === 'crop' && imgRef.current && (
                            <canvas
                                ref={cropOverlayRef}
                                className="absolute cursor-move pointer-events-auto"
                                style={{
                                    top: imgRef.current.offsetTop,
                                    left: imgRef.current.offsetLeft,
                                    width: imgRef.current.clientWidth,
                                    height: imgRef.current.clientHeight
                                }}
                                onMouseDown={handleCropMouseDown}
                                onMouseMove={handleCropMouseMove}
                                onMouseUp={handleCropMouseUp}
                                onMouseLeave={handleCropMouseUp}
                            />
                        )}
                    </div>
                )}

                {/* Marker clear button */}
                {activeTool === 'mark' && hasMarkers && (
                    <button
                        type="button"
                        onClick={clearMarkers}
                        className="absolute bottom-3 left-3 z-20 bg-slate-900/90 border border-slate-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 hover:bg-slate-800"
                    >
                        <Eraser size={12} /> Clear Marks
                    </button>
                )}
            </div>

            {/* Crop controls */}
            {activeTool === 'crop' && (
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTool('select')}
                        className="btn-secondary flex-1 text-xs py-2"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApplyCrop}
                        className="btn-primary flex-1 text-xs py-2 !bg-violet-600"
                    >
                        Apply Crop
                    </button>
                </div>
            )}

            {/* Reference Mixing */}
            {activeTool !== 'crop' && (
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-dim font-bold">Reference Mixing</label>
                    <div className="flex gap-3">
                        <div
                            onClick={() => secondaryInputRef.current?.click()}
                            className={`w-16 h-16 rounded-xl border-2 transition-all overflow-hidden flex items-center justify-center cursor-pointer ${
                                secondaryImage ? 'border-violet-500' : 'border-slate-700 border-dashed hover:border-slate-500'
                            }`}
                            style={{ background: 'hsl(222 47% 11%)' }}
                        >
                            {secondaryImage ? (
                                <img src={secondaryImage} className="w-full h-full object-cover" alt="Reference" />
                            ) : (
                                <Plus size={20} className="text-slate-600" />
                            )}
                        </div>
                        {secondaryImage && (
                            <div className="flex flex-col gap-1.5 justify-center">
                                <button
                                    type="button"
                                    onClick={() => setMixingMode('style')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                        mixingMode === 'style'
                                            ? 'bg-violet-600 border-violet-500 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-400'
                                    }`}
                                >
                                    <Wand2 size={10} /> Style Mix
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMixingMode('subject')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                        mixingMode === 'subject'
                                            ? 'bg-purple-600 border-purple-500 text-white'
                                            : 'bg-slate-800 border-slate-700 text-slate-400'
                                    }`}
                                >
                                    <Zap size={10} /> Subject Mix
                                </button>
                            </div>
                        )}
                        {secondaryImage && (
                            <button
                                type="button"
                                onClick={() => setSecondaryImage(null)}
                                className="self-start p-1 text-slate-500 hover:text-red-400"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Prompt Input */}
            {activeTool !== 'crop' && (
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-dim font-bold">Edit Instruction</label>
                    <div className="relative">
                        <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="e.g., 'Turn the sky into a cosmic nebula'..."
                            className="w-full resize-none pr-20"
                            rows={2}
                            disabled={isProcessing}
                        />
                        <button
                            type="button"
                            onClick={handleEdit}
                            disabled={!prompt.trim() || isProcessing}
                            className="absolute right-2 bottom-2 btn-primary text-xs py-1.5 px-3 !bg-violet-600 flex items-center gap-1.5"
                        >
                            {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            Edit
                        </button>
                    </div>
                </div>
            )}

            {/* History */}
            {history.length > 0 && (
                <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-wider text-dim font-bold flex items-center gap-1.5">
                        <Clock size={10} /> History
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {history.slice().reverse().map((item, idx) => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    setCurrentImage(item.imageData);
                                    setCurrentHistoryId(item.id);
                                    setShowComparison(false);
                                }}
                                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                                    item.id === currentHistoryId
                                        ? 'border-violet-500 ring-2 ring-violet-500/20'
                                        : 'border-slate-700 hover:border-slate-500'
                                }`}
                            >
                                <img src={item.imageData} className="w-full h-full object-cover" alt={item.prompt} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hidden file inputs */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*"
            />
            <input
                type="file"
                ref={secondaryInputRef}
                onChange={handleSecondaryUpload}
                className="hidden"
                accept="image/*"
            />
        </div>
    );
}
