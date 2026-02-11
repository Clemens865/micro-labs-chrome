'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Wand2, Type, Square, Circle, Minus, Image, Layers,
  Download, Share2, History, Palette, Upload, Trash2,
  ZoomIn, ZoomOut, RotateCcw, Move, MousePointer,
  Sparkles, RefreshCw, Copy, Settings, FolderOpen,
  ChevronDown, Plus, Eye, EyeOff, Lock, Unlock,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic,
  Eraser, Scissors, ImageOff
} from 'lucide-react';
import { useGemini } from '../../hooks/useGemini';

// Types
interface Layer {
  id: string;
  name: string;
  type: 'image' | 'text' | 'shape' | 'ai-generated';
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  data: LayerData;
}

type LayerData = ImageLayerData | TextLayerData | ShapeLayerData;

interface ImageLayerData {
  type: 'image';
  src: string;
  originalWidth: number;
  originalHeight: number;
}

interface TextLayerData {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  align: 'left' | 'center' | 'right';
}

interface ShapeLayerData {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line';
  fill: string;
  stroke: string;
  strokeWidth: number;
}

interface BrandAsset {
  id: string;
  name: string;
  type: 'logo' | 'image' | 'icon';
  src: string;
  tags: string[];
}

interface BrandKit {
  name: string;
  colors: string[];
  fonts: string[];
  logos: BrandAsset[];
}

interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  parameters: Record<string, string>;
}

interface VersionEntry {
  id: string;
  timestamp: Date;
  thumbnail: string;
  description: string;
}

// Canvas presets for marketing
const CANVAS_PRESETS = [
  { name: 'Instagram Post', width: 1080, height: 1080, icon: '📱' },
  { name: 'Instagram Story', width: 1080, height: 1920, icon: '📱' },
  { name: 'Facebook Post', width: 1200, height: 630, icon: '📘' },
  { name: 'Twitter/X Post', width: 1200, height: 675, icon: '🐦' },
  { name: 'LinkedIn Post', width: 1200, height: 627, icon: '💼' },
  { name: 'YouTube Thumbnail', width: 1280, height: 720, icon: '▶️' },
  { name: 'Web Banner', width: 1920, height: 600, icon: '🖥️' },
  { name: 'Email Header', width: 600, height: 200, icon: '📧' },
  { name: 'Ad - Leaderboard', width: 728, height: 90, icon: '📊' },
  { name: 'Ad - Medium Rectangle', width: 300, height: 250, icon: '📊' },
  { name: 'Custom', width: 1200, height: 800, icon: '✏️' },
];

// Default brand kit
const DEFAULT_BRAND_KIT: BrandKit = {
  name: 'My Brand',
  colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
  fonts: ['Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Playfair Display'],
  logos: [],
};

// AI iteration presets
const AI_ITERATION_PRESETS = [
  { label: 'More Professional', modifier: 'make it more professional and corporate' },
  { label: 'More Vibrant', modifier: 'make the colors more vibrant and energetic' },
  { label: 'More Minimalist', modifier: 'simplify to a more minimalist design' },
  { label: 'More Bold', modifier: 'make it bolder with stronger contrast' },
  { label: 'Warmer Tones', modifier: 'shift to warmer color tones' },
  { label: 'Cooler Tones', modifier: 'shift to cooler color tones' },
  { label: 'More Playful', modifier: 'make it more playful and fun' },
  { label: 'More Elegant', modifier: 'make it more elegant and sophisticated' },
];

type Tool = 'select' | 'move' | 'text' | 'rectangle' | 'circle' | 'line' | 'eraser';

export default function BrandStudioPage() {
  // Canvas state
  const [canvasWidth, setCanvasWidth] = useState(1080);
  const [canvasHeight, setCanvasHeight] = useState(1080);
  const [selectedPreset, setSelectedPreset] = useState('Instagram Post');
  const [zoom, setZoom] = useState(0.5);

  // Layers state
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [fillColor, setFillColor] = useState('#3B82F6');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Text tool state
  const [textContent, setTextContent] = useState('Add Text');
  const [fontSize, setFontSize] = useState(32);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [fontWeight, setFontWeight] = useState<'normal' | 'bold'>('normal');
  const [fontStyle, setFontStyle] = useState<'normal' | 'italic'>('normal');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');

  // Brand assets state
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>([]);

  // AI state
  const [aiPrompt, setAiPrompt] = useState('');
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  // Version history
  const [versions, setVersions] = useState<VersionEntry[]>([]);

  // UI state
  const [activePanel, setActivePanel] = useState<'layers' | 'brand' | 'ai' | 'export'>('layers');
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { generateContent, generateImage, loading, error } = useGemini();

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Get selected layer
  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  // Canvas rendering
  useEffect(() => {
    renderCanvas();
  }, [layers, canvasWidth, canvasHeight, zoom]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render layers from bottom to top
    const sortedLayers = [...layers].reverse();

    for (const layer of sortedLayers) {
      if (!layer.visible) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-layer.width / 2, -layer.height / 2);

      if (layer.data.type === 'image') {
        const img = new window.Image();
        img.src = layer.data.src;
        ctx.drawImage(img, 0, 0, layer.width, layer.height);
      } else if (layer.data.type === 'text') {
        const textData = layer.data;
        ctx.font = `${textData.fontStyle} ${textData.fontWeight} ${textData.fontSize}px ${textData.fontFamily}`;
        ctx.fillStyle = textData.color;
        ctx.textAlign = textData.align;
        ctx.textBaseline = 'top';
        const x = textData.align === 'center' ? layer.width / 2 : textData.align === 'right' ? layer.width : 0;
        ctx.fillText(textData.text, x, 0);
      } else if (layer.data.type === 'shape') {
        const shapeData = layer.data;
        ctx.fillStyle = shapeData.fill;
        ctx.strokeStyle = shapeData.stroke;
        ctx.lineWidth = shapeData.strokeWidth;

        if (shapeData.shapeType === 'rectangle') {
          ctx.fillRect(0, 0, layer.width, layer.height);
          if (shapeData.strokeWidth > 0) {
            ctx.strokeRect(0, 0, layer.width, layer.height);
          }
        } else if (shapeData.shapeType === 'circle') {
          ctx.beginPath();
          ctx.ellipse(layer.width / 2, layer.height / 2, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          if (shapeData.strokeWidth > 0) ctx.stroke();
        } else if (shapeData.shapeType === 'line') {
          ctx.beginPath();
          ctx.moveTo(0, layer.height / 2);
          ctx.lineTo(layer.width, layer.height / 2);
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    // Draw selection outline
    if (selectedLayer) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selectedLayer.x - 2, selectedLayer.y - 2, selectedLayer.width + 4, selectedLayer.height + 4);
      ctx.setLineDash([]);
    }
  }, [layers, canvasWidth, canvasHeight, selectedLayer]);

  // Handle canvas preset change
  const handlePresetChange = (preset: typeof CANVAS_PRESETS[0]) => {
    setCanvasWidth(preset.width);
    setCanvasHeight(preset.height);
    setSelectedPreset(preset.name);
    setShowPresetMenu(false);
  };

  // Add image layer
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        // Scale to fit canvas while maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        const maxSize = Math.min(canvasWidth, canvasHeight) * 0.8;

        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width *= scale;
          height *= scale;
        }

        const newLayer: Layer = {
          id: generateId(),
          name: `Image ${layers.length + 1}`,
          type: 'image',
          visible: true,
          locked: false,
          x: (canvasWidth - width) / 2,
          y: (canvasHeight - height) / 2,
          width,
          height,
          rotation: 0,
          opacity: 1,
          data: {
            type: 'image',
            src,
            originalWidth: img.width,
            originalHeight: img.height,
          },
        };

        setLayers(prev => [newLayer, ...prev]);
        setSelectedLayerId(newLayer.id);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add text layer
  const addTextLayer = () => {
    const newLayer: Layer = {
      id: generateId(),
      name: `Text ${layers.length + 1}`,
      type: 'text',
      visible: true,
      locked: false,
      x: canvasWidth / 2 - 100,
      y: canvasHeight / 2 - 20,
      width: 200,
      height: fontSize * 1.5,
      rotation: 0,
      opacity: 1,
      data: {
        type: 'text',
        text: textContent,
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        color: fillColor,
        align: textAlign,
      },
    };

    setLayers(prev => [newLayer, ...prev]);
    setSelectedLayerId(newLayer.id);
  };

  // Add shape layer
  const addShapeLayer = (shapeType: 'rectangle' | 'circle' | 'line') => {
    const size = Math.min(canvasWidth, canvasHeight) * 0.3;
    const newLayer: Layer = {
      id: generateId(),
      name: `${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)} ${layers.length + 1}`,
      type: 'shape',
      visible: true,
      locked: false,
      x: (canvasWidth - size) / 2,
      y: (canvasHeight - (shapeType === 'line' ? strokeWidth : size)) / 2,
      width: size,
      height: shapeType === 'line' ? strokeWidth : size,
      rotation: 0,
      opacity: 1,
      data: {
        type: 'shape',
        shapeType,
        fill: shapeType === 'line' ? 'transparent' : fillColor,
        stroke: strokeColor,
        strokeWidth,
      },
    };

    setLayers(prev => [newLayer, ...prev]);
    setSelectedLayerId(newLayer.id);
  };

  // Update layer
  const updateLayer = (id: string, updates: Partial<Layer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  // Delete layer
  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // Move layer in stack
  const moveLayer = (id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const index = prev.findIndex(l => l.id === id);
      if (index === -1) return prev;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const newLayers = [...prev];
      [newLayers[index], newLayers[newIndex]] = [newLayers[newIndex], newLayers[index]];
      return newLayers;
    });
  };

  // Duplicate layer
  const duplicateLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;

    const newLayer: Layer = {
      ...layer,
      id: generateId(),
      name: `${layer.name} copy`,
      x: layer.x + 20,
      y: layer.y + 20,
    };

    setLayers(prev => [newLayer, ...prev]);
    setSelectedLayerId(newLayer.id);
  };

  // AI Generate Image
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const images = await generateImage(aiPrompt, {
        aspectRatio: canvasWidth === canvasHeight ? '1:1' :
                     canvasWidth > canvasHeight ? '16:9' : '9:16',
        numberOfImages: 1,
      });

      if (images && images.length > 0) {
        const src = `data:image/png;base64,${images[0]}`;
        const img = new window.Image();
        img.onload = () => {
          const newLayer: Layer = {
            id: generateId(),
            name: `AI Generated ${layers.length + 1}`,
            type: 'ai-generated',
            visible: true,
            locked: false,
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
            rotation: 0,
            opacity: 1,
            data: {
              type: 'image',
              src,
              originalWidth: img.width,
              originalHeight: img.height,
            },
          };

          setLayers(prev => [newLayer, ...prev]);
          setSelectedLayerId(newLayer.id);
        };
        img.src = src;

        // Add to prompt history
        setPromptHistory(prev => [aiPrompt, ...prev.slice(0, 19)]);
      }
    } catch (err) {
      console.error('AI generation failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // AI Iterate on existing image
  const handleAiIterate = async (modifier: string) => {
    if (!selectedLayer || selectedLayer.data.type !== 'image') return;

    const basePrompt = promptHistory[0] || 'an image';
    const newPrompt = `${basePrompt}, ${modifier}`;
    setAiPrompt(newPrompt);

    setIsGenerating(true);
    try {
      const images = await generateImage(newPrompt, {
        aspectRatio: canvasWidth === canvasHeight ? '1:1' :
                     canvasWidth > canvasHeight ? '16:9' : '9:16',
        numberOfImages: 1,
      });

      if (images && images.length > 0) {
        const src = `data:image/png;base64,${images[0]}`;
        updateLayer(selectedLayer.id, {
          data: { ...selectedLayer.data, src } as ImageLayerData,
        });
        setPromptHistory(prev => [newPrompt, ...prev.slice(0, 19)]);
      }
    } catch (err) {
      console.error('AI iteration failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Remove background (AI-powered simulation)
  const handleRemoveBackground = async () => {
    if (!selectedLayer || selectedLayer.data.type !== 'image') return;

    setIsRemovingBg(true);
    try {
      // For now, we'll use the AI to describe what we want
      // In a real implementation, you'd use a dedicated background removal API
      const prompt = `Create a transparent PNG of the main subject extracted from the image, with clean edges and no background. Focus on the primary object/person.`;

      const images = await generateImage(prompt, {
        aspectRatio: '1:1',
        numberOfImages: 1,
      });

      if (images && images.length > 0) {
        const src = `data:image/png;base64,${images[0]}`;
        const newLayer: Layer = {
          ...selectedLayer,
          id: generateId(),
          name: `${selectedLayer.name} (no bg)`,
          data: { ...selectedLayer.data, src } as ImageLayerData,
        };
        setLayers(prev => [newLayer, ...prev]);
        setSelectedLayerId(newLayer.id);
      }
    } catch (err) {
      console.error('Background removal failed:', err);
    } finally {
      setIsRemovingBg(false);
    }
  };

  // Save version
  const saveVersion = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const thumbnail = canvas.toDataURL('image/jpeg', 0.5);
    const newVersion: VersionEntry = {
      id: generateId(),
      timestamp: new Date(),
      thumbnail,
      description: `Version ${versions.length + 1}`,
    };

    setVersions(prev => [newVersion, ...prev]);
  };

  // Export canvas
  const handleExport = (format: 'png' | 'jpeg', quality = 1) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = canvas.toDataURL(mimeType, quality);

    const link = document.createElement('a');
    link.download = `brand-studio-export.${format}`;
    link.href = dataUrl;
    link.click();
  };

  // Add brand asset
  const handleAssetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const newAsset: BrandAsset = {
        id: generateId(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: 'image',
        src,
        tags: [],
      };
      setBrandAssets(prev => [...prev, newAsset]);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add asset to canvas
  const addAssetToCanvas = (asset: BrandAsset) => {
    const img = new window.Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      const maxSize = Math.min(canvasWidth, canvasHeight) * 0.3;

      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width *= scale;
        height *= scale;
      }

      const newLayer: Layer = {
        id: generateId(),
        name: asset.name,
        type: 'image',
        visible: true,
        locked: false,
        x: (canvasWidth - width) / 2,
        y: (canvasHeight - height) / 2,
        width,
        height,
        rotation: 0,
        opacity: 1,
        data: {
          type: 'image',
          src: asset.src,
          originalWidth: img.width,
          originalHeight: img.height,
        },
      };

      setLayers(prev => [newLayer, ...prev]);
      setSelectedLayerId(newLayer.id);
    };
    img.src = asset.src;
  };

  // Canvas click handler
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    // Find clicked layer (from top to bottom)
    for (const layer of layers) {
      if (!layer.visible || layer.locked) continue;

      if (
        x >= layer.x &&
        x <= layer.x + layer.width &&
        y >= layer.y &&
        y <= layer.y + layer.height
      ) {
        setSelectedLayerId(layer.id);
        return;
      }
    }

    setSelectedLayerId(null);
  };

  return (
    <div className="flex flex-col h-full bg-[hsl(222,47%,8%)]">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(222,47%,11%)] border-b border-white/10">
        <div className="flex items-center gap-4">
          {/* Canvas Preset Selector */}
          <div className="relative">
            <button
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm"
            >
              <span>{selectedPreset}</span>
              <span className="text-white/50">{canvasWidth} × {canvasHeight}</span>
              <ChevronDown className="w-4 h-4" />
            </button>

            {showPresetMenu && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[hsl(222,47%,13%)] border border-white/10 rounded-lg shadow-xl z-50 max-h-80 overflow-auto">
                {CANVAS_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetChange(preset)}
                    className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left ${
                      selectedPreset === preset.name ? 'bg-blue-500/20 text-blue-400' : ''
                    }`}
                  >
                    <span>{preset.icon}</span>
                    <div>
                      <div className="text-sm">{preset.name}</div>
                      <div className="text-xs text-white/50">{preset.width} × {preset.height}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
            <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-1 hover:bg-white/10 rounded">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1 hover:bg-white/10 rounded">
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={() => setZoom(0.5)} className="p-1 hover:bg-white/10 rounded text-xs">
              Fit
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={saveVersion}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm"
          >
            <History className="w-4 h-4" />
            Save Version
          </button>
          <button
            onClick={() => handleExport('png')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Tools Panel */}
        <div className="w-14 bg-[hsl(222,47%,11%)] border-r border-white/10 flex flex-col items-center py-3 gap-1">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-2.5 rounded-lg ${activeTool === 'select' ? 'bg-blue-600' : 'hover:bg-white/10'}`}
            title="Select"
          >
            <MousePointer className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTool('move')}
            className={`p-2.5 rounded-lg ${activeTool === 'move' ? 'bg-blue-600' : 'hover:bg-white/10'}`}
            title="Move"
          >
            <Move className="w-5 h-5" />
          </button>

          <div className="w-8 h-px bg-white/10 my-2" />

          <button
            onClick={() => { setActiveTool('text'); addTextLayer(); }}
            className={`p-2.5 rounded-lg ${activeTool === 'text' ? 'bg-blue-600' : 'hover:bg-white/10'}`}
            title="Add Text"
          >
            <Type className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setActiveTool('rectangle'); addShapeLayer('rectangle'); }}
            className={`p-2.5 rounded-lg ${activeTool === 'rectangle' ? 'bg-blue-600' : 'hover:bg-white/10'}`}
            title="Rectangle"
          >
            <Square className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setActiveTool('circle'); addShapeLayer('circle'); }}
            className={`p-2.5 rounded-lg ${activeTool === 'circle' ? 'bg-blue-600' : 'hover:bg-white/10'}`}
            title="Circle"
          >
            <Circle className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setActiveTool('line'); addShapeLayer('line'); }}
            className={`p-2.5 rounded-lg ${activeTool === 'line' ? 'bg-blue-600' : 'hover:bg-white/10'}`}
            title="Line"
          >
            <Minus className="w-5 h-5" />
          </button>

          <div className="w-8 h-px bg-white/10 my-2" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-lg hover:bg-white/10"
            title="Upload Image"
          >
            <Upload className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <div className="w-8 h-px bg-white/10 my-2" />

          {/* Color Pickers */}
          <div className="relative">
            <input
              type="color"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
              title="Fill Color"
            />
          </div>
          <div className="relative">
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-2 border-white/20"
              title="Stroke Color"
            />
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-[hsl(222,47%,6%)] overflow-auto p-8">
          <div
            className="relative shadow-2xl"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              onClick={handleCanvasClick}
              className="bg-white cursor-crosshair"
              style={{ imageRendering: 'auto' }}
            />
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-72 bg-[hsl(222,47%,11%)] border-l border-white/10 flex flex-col">
          {/* Panel Tabs */}
          <div className="flex border-b border-white/10">
            {[
              { id: 'layers', icon: Layers, label: 'Layers' },
              { id: 'brand', icon: Palette, label: 'Brand' },
              { id: 'ai', icon: Sparkles, label: 'AI' },
              { id: 'export', icon: Share2, label: 'Export' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs ${
                  activePanel === tab.id
                    ? 'bg-white/5 border-b-2 border-blue-500 text-blue-400'
                    : 'hover:bg-white/5 text-white/60'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-auto p-3">
            {/* Layers Panel */}
            {activePanel === 'layers' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Layers</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 hover:bg-white/10 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {layers.length === 0 ? (
                  <div className="text-center py-8 text-white/40 text-sm">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No layers yet</p>
                    <p className="text-xs mt-1">Add images, text, or shapes</p>
                  </div>
                ) : (
                  layers.map(layer => (
                    <div
                      key={layer.id}
                      onClick={() => setSelectedLayerId(layer.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                        selectedLayerId === layer.id
                          ? 'bg-blue-500/20 border border-blue-500/50'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateLayer(layer.id, { visible: !layer.visible });
                        }}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        {layer.visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-white/40" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{layer.name}</div>
                        <div className="text-xs text-white/40">{layer.type}</div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateLayer(layer.id, { locked: !layer.locked });
                        }}
                        className="p-1 hover:bg-white/10 rounded"
                      >
                        {layer.locked ? (
                          <Lock className="w-3.5 h-3.5 text-yellow-500" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-white/40" />
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(layer.id);
                        }}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}

                {/* Layer Properties */}
                {selectedLayer && (
                  <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                    <div className="text-sm font-medium">Properties</div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-white/50">X</label>
                        <input
                          type="number"
                          value={Math.round(selectedLayer.x)}
                          onChange={(e) => updateLayer(selectedLayer.id, { x: Number(e.target.value) })}
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/50">Y</label>
                        <input
                          type="number"
                          value={Math.round(selectedLayer.y)}
                          onChange={(e) => updateLayer(selectedLayer.id, { y: Number(e.target.value) })}
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/50">Width</label>
                        <input
                          type="number"
                          value={Math.round(selectedLayer.width)}
                          onChange={(e) => updateLayer(selectedLayer.id, { width: Number(e.target.value) })}
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/50">Height</label>
                        <input
                          type="number"
                          value={Math.round(selectedLayer.height)}
                          onChange={(e) => updateLayer(selectedLayer.id, { height: Number(e.target.value) })}
                          className="w-full px-2 py-1 bg-white/5 border border-white/10 rounded text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-white/50">Opacity</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={selectedLayer.opacity}
                        onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-white/50">Rotation</label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={selectedLayer.rotation}
                        onChange={(e) => updateLayer(selectedLayer.id, { rotation: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => duplicateLayer(selectedLayer.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicate
                      </button>
                      <button
                        onClick={() => deleteLayer(selectedLayer.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded text-sm text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Brand Panel */}
            {activePanel === 'brand' && (
              <div className="space-y-4">
                {/* Brand Colors */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Brand Colors</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brandKit.colors.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => setFillColor(color)}
                        className="w-8 h-8 rounded-lg border-2 border-white/20 hover:border-white/50"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <button
                      onClick={() => {
                        const newColor = fillColor;
                        setBrandKit(prev => ({
                          ...prev,
                          colors: [...prev.colors, newColor],
                        }));
                      }}
                      className="w-8 h-8 rounded-lg border-2 border-dashed border-white/20 hover:border-white/50 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Brand Fonts */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Brand Fonts</span>
                  </div>
                  <div className="space-y-1">
                    {brandKit.fonts.map((font, i) => (
                      <button
                        key={i}
                        onClick={() => setFontFamily(font)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                          fontFamily === font ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 hover:bg-white/10'
                        }`}
                        style={{ fontFamily: font }}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Brand Assets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Assets</span>
                    <button
                      onClick={() => assetInputRef.current?.click()}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    ref={assetInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAssetUpload}
                    className="hidden"
                  />

                  {brandAssets.length === 0 ? (
                    <div className="text-center py-6 text-white/40 text-sm border-2 border-dashed border-white/10 rounded-lg">
                      <FolderOpen className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <p>No assets yet</p>
                      <p className="text-xs">Upload logos & images</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {brandAssets.map(asset => (
                        <button
                          key={asset.id}
                          onClick={() => addAssetToCanvas(asset)}
                          className="aspect-square bg-white/5 rounded-lg p-1 hover:bg-white/10 border border-white/10"
                        >
                          <img
                            src={asset.src}
                            alt={asset.name}
                            className="w-full h-full object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI Panel */}
            {activePanel === 'ai' && (
              <div className="space-y-4">
                {/* Generate New */}
                <div>
                  <div className="text-sm font-medium mb-2">Generate Image</div>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Describe the image you want to create..."
                    className="w-full h-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm resize-none"
                  />
                  <button
                    onClick={handleAiGenerate}
                    disabled={isGenerating || !aiPrompt.trim()}
                    className="w-full mt-2 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Iterations */}
                {selectedLayer && selectedLayer.data.type === 'image' && (
                  <div>
                    <div className="text-sm font-medium mb-2">Quick Iterations</div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AI_ITERATION_PRESETS.map(preset => (
                        <button
                          key={preset.label}
                          onClick={() => handleAiIterate(preset.modifier)}
                          disabled={isGenerating}
                          className="px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs text-left"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Background Removal */}
                {selectedLayer && selectedLayer.data.type === 'image' && (
                  <div>
                    <div className="text-sm font-medium mb-2">Tools</div>
                    <button
                      onClick={handleRemoveBackground}
                      disabled={isRemovingBg}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      {isRemovingBg ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ImageOff className="w-4 h-4" />
                          Remove Background
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Prompt History */}
                {promptHistory.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Prompt History</div>
                    <div className="space-y-1 max-h-40 overflow-auto">
                      {promptHistory.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => setAiPrompt(prompt)}
                          className="w-full text-left px-2 py-1.5 bg-white/5 hover:bg-white/10 rounded text-xs truncate"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Export Panel */}
            {activePanel === 'export' && (
              <div className="space-y-4">
                {/* Quick Export */}
                <div>
                  <div className="text-sm font-medium mb-2">Quick Export</div>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleExport('png')}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      PNG (Best Quality)
                    </button>
                    <button
                      onClick={() => handleExport('jpeg', 0.9)}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      JPEG (90% Quality)
                    </button>
                    <button
                      onClick={() => handleExport('jpeg', 0.7)}
                      className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      JPEG (Web Optimized)
                    </button>
                  </div>
                </div>

                {/* Version History */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Version History</span>
                    <button
                      onClick={saveVersion}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Save Current
                    </button>
                  </div>

                  {versions.length === 0 ? (
                    <div className="text-center py-4 text-white/40 text-sm">
                      <History className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <p>No versions saved</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-auto">
                      {versions.map(version => (
                        <div
                          key={version.id}
                          className="flex items-center gap-2 p-2 bg-white/5 rounded-lg"
                        >
                          <img
                            src={version.thumbnail}
                            alt={version.description}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{version.description}</div>
                            <div className="text-xs text-white/40">
                              {version.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Share */}
                <div>
                  <div className="text-sm font-medium mb-2">Share</div>
                  <button
                    onClick={() => {
                      // Copy canvas as data URL to clipboard
                      const canvas = canvasRef.current;
                      if (canvas) {
                        canvas.toBlob(blob => {
                          if (blob) {
                            navigator.clipboard.write([
                              new ClipboardItem({ 'image/png': blob })
                            ]);
                          }
                        });
                      }
                    }}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Text Tool Properties (when text selected) */}
          {selectedLayer && selectedLayer.data.type === 'text' && (
            <div className="border-t border-white/10 p-3 space-y-3">
              <div className="text-sm font-medium">Text Properties</div>

              <input
                type="text"
                value={(selectedLayer.data as TextLayerData).text}
                onChange={(e) => {
                  updateLayer(selectedLayer.id, {
                    data: { ...selectedLayer.data, text: e.target.value } as TextLayerData,
                  });
                }}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm"
              />

              <div className="flex gap-2">
                <select
                  value={(selectedLayer.data as TextLayerData).fontFamily}
                  onChange={(e) => {
                    updateLayer(selectedLayer.id, {
                      data: { ...selectedLayer.data, fontFamily: e.target.value } as TextLayerData,
                    });
                  }}
                  className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm"
                >
                  {brandKit.fonts.map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>

                <input
                  type="number"
                  value={(selectedLayer.data as TextLayerData).fontSize}
                  onChange={(e) => {
                    updateLayer(selectedLayer.id, {
                      data: { ...selectedLayer.data, fontSize: Number(e.target.value) } as TextLayerData,
                      height: Number(e.target.value) * 1.5,
                    });
                  }}
                  className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm"
                />
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const current = (selectedLayer.data as TextLayerData).fontWeight;
                    updateLayer(selectedLayer.id, {
                      data: { ...selectedLayer.data, fontWeight: current === 'bold' ? 'normal' : 'bold' } as TextLayerData,
                    });
                  }}
                  className={`p-2 rounded ${(selectedLayer.data as TextLayerData).fontWeight === 'bold' ? 'bg-blue-600' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    const current = (selectedLayer.data as TextLayerData).fontStyle;
                    updateLayer(selectedLayer.id, {
                      data: { ...selectedLayer.data, fontStyle: current === 'italic' ? 'normal' : 'italic' } as TextLayerData,
                    });
                  }}
                  className={`p-2 rounded ${(selectedLayer.data as TextLayerData).fontStyle === 'italic' ? 'bg-blue-600' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <Italic className="w-4 h-4" />
                </button>
                <div className="w-px bg-white/10 mx-1" />
                <button
                  onClick={() => updateLayer(selectedLayer.id, {
                    data: { ...selectedLayer.data, align: 'left' } as TextLayerData,
                  })}
                  className={`p-2 rounded ${(selectedLayer.data as TextLayerData).align === 'left' ? 'bg-blue-600' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateLayer(selectedLayer.id, {
                    data: { ...selectedLayer.data, align: 'center' } as TextLayerData,
                  })}
                  className={`p-2 rounded ${(selectedLayer.data as TextLayerData).align === 'center' ? 'bg-blue-600' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateLayer(selectedLayer.id, {
                    data: { ...selectedLayer.data, align: 'right' } as TextLayerData,
                  })}
                  className={`p-2 rounded ${(selectedLayer.data as TextLayerData).align === 'right' ? 'bg-blue-600' : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs text-white/50">Color</label>
                <input
                  type="color"
                  value={(selectedLayer.data as TextLayerData).color}
                  onChange={(e) => {
                    updateLayer(selectedLayer.id, {
                      data: { ...selectedLayer.data, color: e.target.value } as TextLayerData,
                    });
                  }}
                  className="w-full h-8 rounded cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
