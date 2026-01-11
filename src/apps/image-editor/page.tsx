'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Image, Upload, Download, RotateCcw, RotateCw, FlipHorizontal, FlipVertical,
    Crop, Pencil, Type, Eraser, Square, Circle, Minus, Undo2, Redo2,
    Sun, Contrast, Droplets, Loader2, ZoomIn, ZoomOut, Move, Pipette,
    Trash2, Save, FolderOpen, Sliders, X, Check, Palette, MousePointer
} from 'lucide-react';
import { useToast } from '../../hooks/useToast';

// Tool button component - defined outside to prevent recreation on each render
interface ToolButtonProps {
    tool: string;
    activeTool: string;
    setActiveTool: (tool: any) => void;
    icon: React.ReactNode;
    label: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ tool, activeTool, setActiveTool, icon, label }) => (
    <button
        type="button"
        onClick={() => setActiveTool(tool)}
        className={`p-2 rounded-lg transition-all ${activeTool === tool
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
        }`}
        title={label}
    >
        {icon}
    </button>
);

// Types
interface HistoryState {
    imageData: ImageData;
    timestamp: number;
}

interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface TextOverlay {
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    color: string;
    isDragging: boolean;
}

type Tool = 'select' | 'crop' | 'draw' | 'erase' | 'text' | 'shape' | 'eyedropper';
type Shape = 'rectangle' | 'circle' | 'line';
type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | null;

interface Filters {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
    grayscale: number;
    sepia: number;
    hueRotate: number;
}

const DEFAULT_FILTERS: Filters = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    grayscale: 0,
    sepia: 0,
    hueRotate: 0
};

const ASPECT_RATIOS = [
    { label: 'Free', value: null },
    { label: '1:1', value: 1 },
    { label: '4:3', value: 4 / 3 },
    { label: '16:9', value: 16 / 9 },
    { label: '3:2', value: 3 / 2 },
    { label: '2:3', value: 2 / 3 },
];

const FONT_FAMILIES = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Courier New',
    'Impact',
    'Comic Sans MS'
];

const HANDLE_SIZE = 10;
const MIN_CROP_SIZE = 20;

export default function ImageEditor() {
    // Canvas refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Image state
    const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageName, setImageName] = useState('');

    // Tool state
    const [activeTool, setActiveTool] = useState<Tool>('select');
    const [activeShape, setActiveShape] = useState<Shape>('rectangle');
    const [brushSize, setBrushSize] = useState(5);
    const [brushColor, setBrushColor] = useState('#ff0000');
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

    // Crop state
    const [cropArea, setCropArea] = useState<CropArea | null>(null);
    const [cropHandle, setCropHandle] = useState<CropHandle>(null);
    const [cropDragStart, setCropDragStart] = useState<{ x: number; y: number; area: CropArea } | null>(null);
    const [aspectRatio, setAspectRatio] = useState<number | null>(null);

    // Text state
    const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
    const [activeTextId, setActiveTextId] = useState<string | null>(null);
    const [textInput, setTextInput] = useState('');
    const [textFontSize, setTextFontSize] = useState(24);
    const [textFontFamily, setTextFontFamily] = useState('Arial');
    const [textColor, setTextColor] = useState('#ffffff');

    // Filter state
    const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
    const [showFilters, setShowFilters] = useState(false);

    // History state
    const [history, setHistory] = useState<HistoryState[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // View state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // Shape drawing state
    const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
    const [currentShape, setCurrentShape] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    const { success, error: showError, info } = useToast();

    // Initialize canvas dimensions
    const updateCanvasSize = useCallback(() => {
        if (!canvasRef.current || !overlayCanvasRef.current || !originalImage) return;

        const canvas = canvasRef.current;
        const overlay = overlayCanvasRef.current;

        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        overlay.width = originalImage.width;
        overlay.height = originalImage.height;
    }, [originalImage]);

    // Apply filters to canvas
    const applyFilters = useCallback(() => {
        if (!canvasRef.current || !originalImage) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Build filter string
        const filterString = `
            brightness(${filters.brightness}%)
            contrast(${filters.contrast}%)
            saturate(${filters.saturation}%)
            blur(${filters.blur}px)
            grayscale(${filters.grayscale}%)
            sepia(${filters.sepia}%)
            hue-rotate(${filters.hueRotate}deg)
        `.trim();

        ctx.filter = filterString;
        ctx.drawImage(originalImage, 0, 0);
        ctx.filter = 'none';

        // Draw text overlays
        textOverlays.forEach(overlay => {
            ctx.font = `${overlay.fontSize}px ${overlay.fontFamily}`;
            ctx.fillStyle = overlay.color;
            ctx.fillText(overlay.text, overlay.x, overlay.y);
        });
    }, [filters, originalImage, textOverlays]);

    // Draw crop overlay
    const drawCropOverlay = useCallback(() => {
        const overlay = overlayCanvasRef.current;
        const ctx = overlay?.getContext('2d');
        if (!ctx || !overlay || !cropArea) return;

        ctx.clearRect(0, 0, overlay.width, overlay.height);

        // Darken outside area
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, overlay.width, overlay.height);

        // Clear crop area (make it visible)
        ctx.clearRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

        // Draw border
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

        // Draw grid (rule of thirds)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        const thirdW = cropArea.width / 3;
        const thirdH = cropArea.height / 3;
        ctx.beginPath();
        // Vertical lines
        ctx.moveTo(cropArea.x + thirdW, cropArea.y);
        ctx.lineTo(cropArea.x + thirdW, cropArea.y + cropArea.height);
        ctx.moveTo(cropArea.x + thirdW * 2, cropArea.y);
        ctx.lineTo(cropArea.x + thirdW * 2, cropArea.y + cropArea.height);
        // Horizontal lines
        ctx.moveTo(cropArea.x, cropArea.y + thirdH);
        ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + thirdH);
        ctx.moveTo(cropArea.x, cropArea.y + thirdH * 2);
        ctx.lineTo(cropArea.x + cropArea.width, cropArea.y + thirdH * 2);
        ctx.stroke();

        // Draw corner handles
        const handles = [
            { x: cropArea.x, y: cropArea.y, cursor: 'nw' }, // Top-left
            { x: cropArea.x + cropArea.width / 2, y: cropArea.y, cursor: 'n' }, // Top-center
            { x: cropArea.x + cropArea.width, y: cropArea.y, cursor: 'ne' }, // Top-right
            { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height / 2, cursor: 'e' }, // Middle-right
            { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height, cursor: 'se' }, // Bottom-right
            { x: cropArea.x + cropArea.width / 2, y: cropArea.y + cropArea.height, cursor: 's' }, // Bottom-center
            { x: cropArea.x, y: cropArea.y + cropArea.height, cursor: 'sw' }, // Bottom-left
            { x: cropArea.x, y: cropArea.y + cropArea.height / 2, cursor: 'w' }, // Middle-left
        ];

        ctx.fillStyle = '#3b82f6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        handles.forEach(handle => {
            ctx.beginPath();
            ctx.rect(
                handle.x - HANDLE_SIZE / 2,
                handle.y - HANDLE_SIZE / 2,
                HANDLE_SIZE,
                HANDLE_SIZE
            );
            ctx.fill();
            ctx.stroke();
        });

        // Draw dimensions
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(cropArea.x + cropArea.width / 2 - 40, cropArea.y + cropArea.height + 10, 80, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${Math.round(cropArea.width)} × ${Math.round(cropArea.height)}`,
            cropArea.x + cropArea.width / 2,
            cropArea.y + cropArea.height + 24
        );
    }, [cropArea]);

    // Initialize crop area when crop tool is activated
    useEffect(() => {
        if (activeTool === 'crop' && canvasRef.current && !cropArea) {
            const canvas = canvasRef.current;
            const margin = Math.min(canvas.width, canvas.height) * 0.1;
            setCropArea({
                x: margin,
                y: margin,
                width: canvas.width - margin * 2,
                height: canvas.height - margin * 2
            });
        } else if (activeTool !== 'crop') {
            setCropArea(null);
            // Clear overlay when switching away from crop
            const overlay = overlayCanvasRef.current;
            const ctx = overlay?.getContext('2d');
            if (ctx && overlay) {
                ctx.clearRect(0, 0, overlay.width, overlay.height);
            }
        }
    }, [activeTool]);

    // Redraw crop overlay when crop area changes
    useEffect(() => {
        if (activeTool === 'crop' && cropArea) {
            drawCropOverlay();
        }
    }, [cropArea, activeTool, drawCropOverlay]);

    // Save to history
    const saveToHistory = useCallback(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ imageData, timestamp: Date.now() });

        // Keep max 20 history states
        if (newHistory.length > 20) {
            newHistory.shift();
        }

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    // Undo
    const undo = useCallback(() => {
        if (historyIndex <= 0) return;

        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.putImageData(history[newIndex].imageData, 0, 0);
        info('Undo');
    }, [history, historyIndex, info]);

    // Redo
    const redo = useCallback(() => {
        if (historyIndex >= history.length - 1) return;

        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.putImageData(history[newIndex].imageData, 0, 0);
        info('Redo');
    }, [history, historyIndex, info]);

    // Load image
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showError('Please select an image file');
            return;
        }

        setImageName(file.name);
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                setOriginalImage(img);
                setImageLoaded(true);
                setFilters(DEFAULT_FILTERS);
                setTextOverlays([]);
                setHistory([]);
                setHistoryIndex(-1);
                setZoom(1);
                setPan({ x: 0, y: 0 });
                setCropArea(null);
                setActiveTool('select');
                success('Image loaded');
            };
            img.src = event.target?.result as string;
        };

        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // Initialize canvas when image loads
    useEffect(() => {
        if (!originalImage || !canvasRef.current) return;

        updateCanvasSize();
        applyFilters();

        // Save initial state to history
        setTimeout(() => saveToHistory(), 100);
    }, [originalImage, updateCanvasSize, applyFilters, saveToHistory]);

    // Apply filters when they change
    useEffect(() => {
        if (imageLoaded) {
            applyFilters();
        }
    }, [filters, applyFilters, imageLoaded]);

    // Rotate image
    const rotateImage = (degrees: number) => {
        if (!canvasRef.current || !originalImage) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get current image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Create temp canvas with rotated dimensions
        const tempCanvas = document.createElement('canvas');
        const isRightAngle = Math.abs(degrees) === 90 || Math.abs(degrees) === 270;

        if (isRightAngle) {
            tempCanvas.width = canvas.height;
            tempCanvas.height = canvas.width;
        } else {
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
        }

        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        // Put current image data on temp canvas
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = canvas.width;
        sourceCanvas.height = canvas.height;
        const sourceCtx = sourceCanvas.getContext('2d');
        sourceCtx?.putImageData(imageData, 0, 0);

        // Rotate
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate((degrees * Math.PI) / 180);
        tempCtx.drawImage(sourceCanvas, -canvas.width / 2, -canvas.height / 2);

        // Update main canvas
        canvas.width = tempCanvas.width;
        canvas.height = tempCanvas.height;
        if (overlayCanvasRef.current) {
            overlayCanvasRef.current.width = tempCanvas.width;
            overlayCanvasRef.current.height = tempCanvas.height;
        }
        ctx.drawImage(tempCanvas, 0, 0);

        saveToHistory();
        success(`Rotated ${degrees}°`);
    };

    // Flip image
    const flipImage = (direction: 'horizontal' | 'vertical') => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return;

        tempCtx.putImageData(imageData, 0, 0);

        ctx.save();
        if (direction === 'horizontal') {
            ctx.scale(-1, 1);
            ctx.drawImage(tempCanvas, -canvas.width, 0);
        } else {
            ctx.scale(1, -1);
            ctx.drawImage(tempCanvas, 0, -canvas.height);
        }
        ctx.restore();

        saveToHistory();
        success(`Flipped ${direction}`);
    };

    // Get handle at position
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

        // Check handles first
        for (const h of handles) {
            if (Math.abs(x - h.x) <= HANDLE_SIZE && Math.abs(y - h.y) <= HANDLE_SIZE) {
                return h.handle;
            }
        }

        // Check if inside crop area for moving
        if (x >= cropArea.x && x <= cropArea.x + cropArea.width &&
            y >= cropArea.y && y <= cropArea.y + cropArea.height) {
            return 'move';
        }

        return null;
    };

    // Get cursor for handle
    const getCursorForHandle = (handle: CropHandle): string => {
        switch (handle) {
            case 'nw':
            case 'se':
                return 'nwse-resize';
            case 'ne':
            case 'sw':
                return 'nesw-resize';
            case 'n':
            case 's':
                return 'ns-resize';
            case 'e':
            case 'w':
                return 'ew-resize';
            case 'move':
                return 'move';
            default:
                return 'default';
        }
    };

    // Handle mouse events for drawing/cropping
    const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getCanvasCoords(e);

        if (activeTool === 'select' && e.button === 1) {
            // Middle mouse button for panning
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            return;
        }

        if (activeTool === 'crop' && cropArea) {
            const handle = getHandleAtPosition(coords.x, coords.y);
            if (handle) {
                setCropHandle(handle);
                setCropDragStart({ x: coords.x, y: coords.y, area: { ...cropArea } });
            }
        } else if (activeTool === 'draw' || activeTool === 'erase') {
            setIsDrawing(true);
            setLastPos(coords);
        } else if (activeTool === 'shape') {
            setShapeStart(coords);
        } else if (activeTool === 'eyedropper') {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                const pixel = ctx.getImageData(coords.x, coords.y, 1, 1).data;
                const color = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
                setBrushColor(color);
                setTextColor(color);
                success(`Color picked: ${color}`);
            }
        } else if (activeTool === 'text') {
            // Add text at click position
            if (textInput.trim()) {
                const newText: TextOverlay = {
                    id: Date.now().toString(),
                    text: textInput,
                    x: coords.x,
                    y: coords.y,
                    fontSize: textFontSize,
                    fontFamily: textFontFamily,
                    color: textColor,
                    isDragging: false
                };
                setTextOverlays([...textOverlays, newText]);
                setTextInput('');

                // Redraw with text
                setTimeout(() => {
                    applyFilters();
                    saveToHistory();
                }, 50);
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const coords = getCanvasCoords(e);

        if (isPanning) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            });
            return;
        }

        // Update cursor for crop handles
        if (activeTool === 'crop' && cropArea && !cropHandle) {
            const handle = getHandleAtPosition(coords.x, coords.y);
            const overlay = overlayCanvasRef.current;
            if (overlay) {
                overlay.style.cursor = getCursorForHandle(handle);
            }
        }

        if (activeTool === 'crop' && cropHandle && cropDragStart && cropArea) {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const dx = coords.x - cropDragStart.x;
            const dy = coords.y - cropDragStart.y;
            const orig = cropDragStart.area;

            let newArea = { ...cropArea };

            switch (cropHandle) {
                case 'move':
                    newArea.x = Math.max(0, Math.min(canvas.width - orig.width, orig.x + dx));
                    newArea.y = Math.max(0, Math.min(canvas.height - orig.height, orig.y + dy));
                    break;
                case 'nw':
                    newArea.x = Math.max(0, Math.min(orig.x + orig.width - MIN_CROP_SIZE, orig.x + dx));
                    newArea.y = Math.max(0, Math.min(orig.y + orig.height - MIN_CROP_SIZE, orig.y + dy));
                    newArea.width = orig.x + orig.width - newArea.x;
                    newArea.height = orig.y + orig.height - newArea.y;
                    break;
                case 'n':
                    newArea.y = Math.max(0, Math.min(orig.y + orig.height - MIN_CROP_SIZE, orig.y + dy));
                    newArea.height = orig.y + orig.height - newArea.y;
                    break;
                case 'ne':
                    newArea.y = Math.max(0, Math.min(orig.y + orig.height - MIN_CROP_SIZE, orig.y + dy));
                    newArea.width = Math.max(MIN_CROP_SIZE, Math.min(canvas.width - orig.x, orig.width + dx));
                    newArea.height = orig.y + orig.height - newArea.y;
                    break;
                case 'e':
                    newArea.width = Math.max(MIN_CROP_SIZE, Math.min(canvas.width - orig.x, orig.width + dx));
                    break;
                case 'se':
                    newArea.width = Math.max(MIN_CROP_SIZE, Math.min(canvas.width - orig.x, orig.width + dx));
                    newArea.height = Math.max(MIN_CROP_SIZE, Math.min(canvas.height - orig.y, orig.height + dy));
                    break;
                case 's':
                    newArea.height = Math.max(MIN_CROP_SIZE, Math.min(canvas.height - orig.y, orig.height + dy));
                    break;
                case 'sw':
                    newArea.x = Math.max(0, Math.min(orig.x + orig.width - MIN_CROP_SIZE, orig.x + dx));
                    newArea.width = orig.x + orig.width - newArea.x;
                    newArea.height = Math.max(MIN_CROP_SIZE, Math.min(canvas.height - orig.y, orig.height + dy));
                    break;
                case 'w':
                    newArea.x = Math.max(0, Math.min(orig.x + orig.width - MIN_CROP_SIZE, orig.x + dx));
                    newArea.width = orig.x + orig.width - newArea.x;
                    break;
            }

            // Apply aspect ratio if set
            if (aspectRatio && cropHandle !== 'move') {
                if (['n', 's'].includes(cropHandle)) {
                    newArea.width = newArea.height * aspectRatio;
                } else {
                    newArea.height = newArea.width / aspectRatio;
                }
            }

            setCropArea(newArea);
        } else if ((activeTool === 'draw' || activeTool === 'erase') && isDrawing && lastPos) {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!ctx) return;

            ctx.beginPath();
            ctx.moveTo(lastPos.x, lastPos.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.strokeStyle = activeTool === 'erase' ? '#ffffff' : brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            setLastPos(coords);
        } else if (activeTool === 'shape' && shapeStart) {
            setCurrentShape({
                x: Math.min(shapeStart.x, coords.x),
                y: Math.min(shapeStart.y, coords.y),
                width: Math.abs(coords.x - shapeStart.x),
                height: Math.abs(coords.y - shapeStart.y)
            });

            // Draw shape preview on overlay
            const overlay = overlayCanvasRef.current;
            const ctx = overlay?.getContext('2d');
            if (ctx && overlay) {
                ctx.clearRect(0, 0, overlay.width, overlay.height);
                ctx.strokeStyle = brushColor;
                ctx.lineWidth = brushSize;

                const shape = {
                    x: Math.min(shapeStart.x, coords.x),
                    y: Math.min(shapeStart.y, coords.y),
                    width: Math.abs(coords.x - shapeStart.x),
                    height: Math.abs(coords.y - shapeStart.y)
                };

                if (activeShape === 'rectangle') {
                    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                } else if (activeShape === 'circle') {
                    ctx.beginPath();
                    ctx.ellipse(
                        shape.x + shape.width / 2,
                        shape.y + shape.height / 2,
                        shape.width / 2,
                        shape.height / 2,
                        0, 0, Math.PI * 2
                    );
                    ctx.stroke();
                } else if (activeShape === 'line') {
                    ctx.beginPath();
                    ctx.moveTo(shapeStart.x, shapeStart.y);
                    ctx.lineTo(coords.x, coords.y);
                    ctx.stroke();
                }
            }
        }
    };

    const handleMouseUp = () => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (activeTool === 'crop') {
            setCropHandle(null);
            setCropDragStart(null);
        } else if ((activeTool === 'draw' || activeTool === 'erase') && isDrawing) {
            setIsDrawing(false);
            setLastPos(null);
            saveToHistory();
        } else if (activeTool === 'shape' && shapeStart && currentShape) {
            // Draw shape on main canvas
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (ctx) {
                ctx.strokeStyle = brushColor;
                ctx.lineWidth = brushSize;

                if (activeShape === 'rectangle') {
                    ctx.strokeRect(currentShape.x, currentShape.y, currentShape.width, currentShape.height);
                } else if (activeShape === 'circle') {
                    ctx.beginPath();
                    ctx.ellipse(
                        currentShape.x + currentShape.width / 2,
                        currentShape.y + currentShape.height / 2,
                        currentShape.width / 2,
                        currentShape.height / 2,
                        0, 0, Math.PI * 2
                    );
                    ctx.stroke();
                } else if (activeShape === 'line') {
                    ctx.beginPath();
                    ctx.moveTo(shapeStart.x, shapeStart.y);
                    ctx.lineTo(currentShape.x + currentShape.width, currentShape.y + currentShape.height);
                    ctx.stroke();
                }

                saveToHistory();
            }

            // Clear overlay
            const overlay = overlayCanvasRef.current;
            const overlayCtx = overlay?.getContext('2d');
            if (overlayCtx && overlay) {
                overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
            }

            setShapeStart(null);
            setCurrentShape(null);
        }
    };

    // Apply crop
    const applyCrop = () => {
        if (!cropArea || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const imageData = ctx.getImageData(cropArea.x, cropArea.y, cropArea.width, cropArea.height);

        canvas.width = cropArea.width;
        canvas.height = cropArea.height;
        if (overlayCanvasRef.current) {
            overlayCanvasRef.current.width = cropArea.width;
            overlayCanvasRef.current.height = cropArea.height;
        }

        ctx.putImageData(imageData, 0, 0);

        setCropArea(null);
        setActiveTool('select');

        // Clear overlay
        const overlay = overlayCanvasRef.current;
        const overlayCtx = overlay?.getContext('2d');
        if (overlayCtx && overlay) {
            overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        }

        saveToHistory();
        success('Crop applied');
    };

    // Cancel crop
    const cancelCrop = () => {
        setCropArea(null);
        setActiveTool('select');

        const overlay = overlayCanvasRef.current;
        const ctx = overlay?.getContext('2d');
        if (ctx && overlay) {
            ctx.clearRect(0, 0, overlay.width, overlay.height);
        }
    };

    // Reset filters
    const resetFilters = () => {
        setFilters(DEFAULT_FILTERS);
        success('Filters reset');
    };

    // Export image
    const exportImage = (format: 'png' | 'jpeg' | 'webp') => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const mimeType = `image/${format}`;
        const quality = format === 'jpeg' ? 0.9 : undefined;

        canvas.toBlob((blob) => {
            if (!blob) return;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${imageName.replace(/\.[^/.]+$/, '') || 'edited-image'}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            success(`Exported as ${format.toUpperCase()}`);
        }, mimeType, quality);
    };

    // Zoom controls
    const handleZoom = (delta: number) => {
        setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)));
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                    <Image size={16} className="text-purple-400" />
                    Image Editor
                </h3>
                {imageLoaded && (
                    <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{imageName}</span>
                )}
            </div>

            {/* Upload Area or Editor */}
            {!imageLoaded ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-slate-800/50 transition-all"
                >
                    <Upload size={48} className="mx-auto mb-4 text-slate-500" />
                    <p className="text-sm text-slate-400 mb-2">Click to upload an image</p>
                    <p className="text-xs text-slate-600">PNG, JPG, WebP, GIF supported</p>
                </div>
            ) : (
                <>
                    {/* Toolbar */}
                    <div className="flex flex-wrap gap-2 p-2 bg-slate-800/50 rounded-lg">
                        {/* Selection & Navigation */}
                        <div className="flex gap-1 border-r border-slate-700 pr-2">
                            <ToolButton tool="select" activeTool={activeTool} setActiveTool={setActiveTool} icon={<MousePointer size={16} />} label="Select" />
                            <ToolButton tool="crop" activeTool={activeTool} setActiveTool={setActiveTool} icon={<Crop size={16} />} label="Crop" />
                        </div>

                        {/* Drawing Tools */}
                        <div className="flex gap-1 border-r border-slate-700 pr-2">
                            <ToolButton tool="draw" activeTool={activeTool} setActiveTool={setActiveTool} icon={<Pencil size={16} />} label="Draw" />
                            <ToolButton tool="erase" activeTool={activeTool} setActiveTool={setActiveTool} icon={<Eraser size={16} />} label="Erase" />
                            <ToolButton tool="shape" activeTool={activeTool} setActiveTool={setActiveTool} icon={<Square size={16} />} label="Shapes" />
                            <ToolButton tool="text" activeTool={activeTool} setActiveTool={setActiveTool} icon={<Type size={16} />} label="Text" />
                            <ToolButton tool="eyedropper" activeTool={activeTool} setActiveTool={setActiveTool} icon={<Pipette size={16} />} label="Eyedropper" />
                        </div>

                        {/* Transform */}
                        <div className="flex gap-1 border-r border-slate-700 pr-2">
                            <button
                                type="button"
                                onClick={() => rotateImage(-90)}
                                className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                title="Rotate Left"
                            >
                                <RotateCcw size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => rotateImage(90)}
                                className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                title="Rotate Right"
                            >
                                <RotateCw size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => flipImage('horizontal')}
                                className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                title="Flip Horizontal"
                            >
                                <FlipHorizontal size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => flipImage('vertical')}
                                className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                title="Flip Vertical"
                            >
                                <FlipVertical size={16} />
                            </button>
                        </div>

                        {/* Undo/Redo */}
                        <div className="flex gap-1 border-r border-slate-700 pr-2">
                            <button
                                type="button"
                                onClick={undo}
                                disabled={historyIndex <= 0}
                                className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Undo"
                            >
                                <Undo2 size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={redo}
                                disabled={historyIndex >= history.length - 1}
                                className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Redo"
                            >
                                <Redo2 size={16} />
                            </button>
                        </div>

                        {/* Filters & Zoom */}
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2 rounded-lg ${showFilters ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                                title="Filters"
                            >
                                <Sliders size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleZoom(-0.1)}
                                className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                title="Zoom Out"
                            >
                                <ZoomOut size={16} />
                            </button>
                            <span className="px-2 py-1 text-xs text-slate-400 flex items-center">{Math.round(zoom * 100)}%</span>
                            <button
                                type="button"
                                onClick={() => handleZoom(0.1)}
                                className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
                                title="Zoom In"
                            >
                                <ZoomIn size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Tool Options */}
                    {(activeTool === 'draw' || activeTool === 'erase' || activeTool === 'shape') && (
                        <div className="flex items-center gap-4 p-2 bg-slate-800/30 rounded-lg text-xs">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">Size:</span>
                                <input
                                    type="range"
                                    min="1"
                                    max="50"
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    className="w-20"
                                />
                                <span className="text-slate-400 w-6">{brushSize}</span>
                            </div>
                            {activeTool !== 'erase' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Color:</span>
                                    <input
                                        type="color"
                                        value={brushColor}
                                        onChange={(e) => setBrushColor(e.target.value)}
                                        className="w-8 h-6 rounded cursor-pointer"
                                    />
                                </div>
                            )}
                            {activeTool === 'shape' && (
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">Shape:</span>
                                    <select
                                        value={activeShape}
                                        onChange={(e) => setActiveShape(e.target.value as Shape)}
                                        className="bg-slate-800 rounded px-2 py-1 text-xs"
                                    >
                                        <option value="rectangle">Rectangle</option>
                                        <option value="circle">Ellipse</option>
                                        <option value="line">Line</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Text Options */}
                    {activeTool === 'text' && (
                        <div className="flex flex-wrap items-center gap-3 p-2 bg-slate-800/30 rounded-lg text-xs">
                            <input
                                type="text"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="Enter text..."
                                className="flex-1 min-w-[100px] px-2 py-1 bg-slate-800 rounded text-xs"
                            />
                            <select
                                value={textFontFamily}
                                onChange={(e) => setTextFontFamily(e.target.value)}
                                className="bg-slate-800 rounded px-2 py-1 text-xs"
                            >
                                {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <input
                                type="number"
                                value={textFontSize}
                                onChange={(e) => setTextFontSize(parseInt(e.target.value))}
                                className="w-14 px-2 py-1 bg-slate-800 rounded text-xs"
                                min="8"
                                max="200"
                            />
                            <input
                                type="color"
                                value={textColor}
                                onChange={(e) => setTextColor(e.target.value)}
                                className="w-8 h-6 rounded cursor-pointer"
                            />
                        </div>
                    )}

                    {/* Crop Options */}
                    {activeTool === 'crop' && (
                        <div className="flex items-center gap-3 p-2 bg-slate-800/30 rounded-lg text-xs">
                            <span className="text-slate-500">Aspect Ratio:</span>
                            <div className="flex gap-1">
                                {ASPECT_RATIOS.map(ar => (
                                    <button
                                        key={ar.label}
                                        type="button"
                                        onClick={() => setAspectRatio(ar.value)}
                                        className={`px-2 py-1 rounded ${aspectRatio === ar.value ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                    >
                                        {ar.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2 ml-auto">
                                <button
                                    type="button"
                                    onClick={cancelCrop}
                                    className="px-3 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 flex items-center gap-1"
                                >
                                    <X size={14} /> Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={applyCrop}
                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 flex items-center gap-1"
                                >
                                    <Check size={14} /> Apply Crop
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Filters Panel */}
                    {showFilters && (
                        <div className="card p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-400">Adjustments</h4>
                                <button onClick={resetFilters} className="text-[10px] text-blue-400 hover:text-blue-300">Reset</button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { key: 'brightness', label: 'Brightness', icon: <Sun size={12} />, min: 0, max: 200 },
                                    { key: 'contrast', label: 'Contrast', icon: <Contrast size={12} />, min: 0, max: 200 },
                                    { key: 'saturation', label: 'Saturation', icon: <Droplets size={12} />, min: 0, max: 200 },
                                    { key: 'blur', label: 'Blur', icon: <Circle size={12} />, min: 0, max: 20 },
                                    { key: 'grayscale', label: 'Grayscale', icon: <Palette size={12} />, min: 0, max: 100 },
                                    { key: 'sepia', label: 'Sepia', icon: <Palette size={12} />, min: 0, max: 100 },
                                    { key: 'hueRotate', label: 'Hue', icon: <Palette size={12} />, min: 0, max: 360 },
                                ].map(filter => (
                                    <div key={filter.key} className="space-y-1">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-slate-500 flex items-center gap-1">{filter.icon} {filter.label}</span>
                                            <span className="text-slate-400">{filters[filter.key as keyof Filters]}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min={filter.min}
                                            max={filter.max}
                                            value={filters[filter.key as keyof Filters]}
                                            onChange={(e) => setFilters({ ...filters, [filter.key]: parseInt(e.target.value) })}
                                            className="w-full"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Canvas Area */}
                    <div
                        ref={containerRef}
                        className="flex-1 overflow-auto bg-slate-900/50 rounded-lg relative"
                        style={{ minHeight: '200px' }}
                    >
                        <div
                            className="relative inline-block"
                            style={{
                                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                                transformOrigin: 'top left'
                            }}
                        >
                            <canvas
                                ref={canvasRef}
                                className="max-w-none"
                                style={{ imageRendering: zoom > 1 ? 'pixelated' : 'auto' }}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            />
                            <canvas
                                ref={overlayCanvasRef}
                                className="absolute top-0 left-0"
                                style={{ pointerEvents: activeTool === 'crop' ? 'auto' : 'none' }}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                            />
                        </div>
                    </div>

                    {/* Export Options */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-secondary flex items-center justify-center gap-2 flex-1"
                        >
                            <FolderOpen size={14} />
                            Open New
                        </button>
                        <button
                            type="button"
                            onClick={() => exportImage('png')}
                            className="btn-primary flex items-center justify-center gap-2 flex-1"
                        >
                            <Download size={14} />
                            PNG
                        </button>
                        <button
                            type="button"
                            onClick={() => exportImage('jpeg')}
                            className="btn-secondary flex items-center justify-center gap-2"
                        >
                            JPG
                        </button>
                        <button
                            type="button"
                            onClick={() => exportImage('webp')}
                            className="btn-secondary flex items-center justify-center gap-2"
                        >
                            WebP
                        </button>
                    </div>
                </>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
            />
        </div>
    );
}
