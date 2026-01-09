import React, { useState, useEffect } from 'react';
import { useGemini } from '../../hooks/useGemini';
import { usePageContext } from '../../hooks/usePageContext';
import { useUserProfile } from '../../hooks/useUserProfile';
import { Map as MapIcon, Loader2, Info, Star, AlertTriangle, TrendingUp, Compass, UserCircle, Building2, ChevronDown, ChevronUp } from 'lucide-react';

interface NeighborhoodResult {
    neighborhoodName: string;
    vibe: string;
    marketWatch: {
        medianHomePrice: string;
        averageRent: string;
        priceTrend: 'Rising' | 'Stable' | 'Falling';
        inventoryLevel: string;
    };
    communityPulse: {
        demographics: string[];
        schoolRating: string;
        safetyMetric: string;
        lifestyle: string;
    };
    scores: {
        walkability: number;
        nightlife: number;
        safety: number;
        quietness: number;
        transit: number;
    };
    pros: string[];
    cons: string[];
    topSpots: string[];
}

import { useAppHistory } from '../../hooks/useAppHistory';

const NeighborhoodIntelAI: React.FC = () => {
    const { context } = usePageContext();
    const { generateContent, loading, error } = useGemini();
    const { saveHistoryEntry } = useAppHistory();
    const { profile, hasProfile, getProfileContext } = useUserProfile();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<NeighborhoodResult | null>(null);
    const [includeProfile, setIncludeProfile] = useState(false);

    // Build profile context for AI
    const buildProfileContext = () => {
        if (!includeProfile || !hasProfile) return '';
        const ctx = getProfileContext();
        return ctx ? `\n\nResearcher Context: ${ctx}\nProvide insights particularly relevant to this professional background and potential investment/relocation interests.` : '';
    };

    useEffect(() => {
        if (context?.selection && context.selection.length < 50) {
            setQuery(context.selection);
        }
    }, [context?.selection]);

    const handleResearch = async () => {
        if (!query) return;

        const profileContext = buildProfileContext();
        const prompt = `
      Detailed Research Task: Analyze the neighborhood/area: ${query}.
      ${profileContext}
      
      Requirements:
      1. Provide an expert-level Intel Report suitable for real estate investors.
      2. If precise data is unavailable, provide your BEST ESTIMATE based on general knowledge of the area. Never leave fields empty.
      3. For "vibe", capture the architectural style and social atmosphere in a compelling sentence.
      4. For "marketWatch", provide realistic price and rent ranges for 2024.
      
      Return ONLY the following JSON structure:
      {
        "neighborhoodName": "The common or formal name",
        "vibe": "Compelling atmosphere description",
        "marketWatch": {
          "medianHomePrice": "Estimate range (e.g. €600k - €800k)",
          "averageRent": "Estimate per sqm or total (e.g. €18/sqm)",
          "priceTrend": "Rising | Stable | Falling",
          "inventoryLevel": "Very Low | Low | Balanced"
        },
        "communityPulse": {
          "demographics": ["Predominant groups"],
          "schoolRating": "Rating out of 10 or descriptive quality",
          "safetyMetric": "Safety assessment with context",
          "lifestyle": "Core lifestyle/culture description"
        },
        "scores": {
          "walkability": 0-100,
          "nightlife": 0-100,
          "safety": 0-100,
          "quietness": 0-100,
          "transit": 0-100
        },
        "pros": ["Insight 1", "Insight 2", "Insight 3"],
        "cons": ["Realistic drawback 1", "2", "3"],
        "topSpots": ["Specific hotspot 1", "2", "3"]
      }
    `;

        try {
            const data = await generateContent(prompt, "You are a Senior Real Estate Analyst and Local Intelligence Expert. You provide deep, accurate, and professional neighborhood assessments.", { jsonMode: true });
            setResult(data);
            saveHistoryEntry('neighborhood-intel', 'Neighborhood Intel AI', { location: query }, data);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                        placeholder="Enter neighborhood, city, or zip code..."
                        style={{
                            background: 'hsl(222 47% 11%)',
                            borderColor: 'hsl(222 47% 18% / 0.5)',
                            color: 'hsl(210 40% 98%)',
                        }}
                        className="w-full pl-4 pr-12 py-3 border rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                    <MapIcon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
                <button
                    onClick={handleResearch}
                    disabled={loading || !query.trim()}
                    className="btn-primary w-full flex items-center justify-center gap-2 !bg-blue-600 shadow-blue-600/20"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>Researching...</span>
                        </>
                    ) : (
                        <>
                            <Compass size={18} />
                            <span>Get Neighborhood Intel</span>
                        </>
                    )}
                </button>

                {/* Profile Toggle */}
                {hasProfile && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: 'hsl(222 47% 11%)',
                        border: '1px solid hsl(222 47% 18%)',
                        borderRadius: '12px',
                        marginTop: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UserCircle size={14} style={{ color: 'hsl(207 90% 54%)' }} />
                            <span style={{ fontSize: '13px', color: 'hsl(215 20% 65%)' }}>Personalize for My Background</span>
                        </div>
                        <button
                            onClick={() => setIncludeProfile(!includeProfile)}
                            style={{
                                position: 'relative',
                                width: '40px',
                                height: '20px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: includeProfile ? 'hsl(207 90% 54%)' : 'hsl(222 47% 20%)',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: '2px',
                                left: includeProfile ? '22px' : '2px',
                                width: '16px',
                                height: '16px',
                                borderRadius: '8px',
                                backgroundColor: 'white',
                                transition: 'left 0.2s'
                            }} />
                        </button>
                    </div>
                )}
            </div>

            {result && (
                <div className="space-y-8 animate-in mt-8 pb-10">
                    <section className="text-center p-6 glass rounded-3xl border-white/5 bg-gradient-to-b from-blue-600/10 to-transparent">
                        <h2 className="text-2xl font-black tracking-tight mb-2 text-slate-200">{result.neighborhoodName}</h2>
                        <p className="text-sm text-slate-400 italic">"{result.vibe}"</p>
                    </section>

                    {/* Market Watch */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <TrendingUp size={14} className="text-blue-500" />
                            <h3 className="text-[10px] uppercase-tracking font-bold text-blue-500">Market Watch</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                style={{
                                    background: 'hsl(222 47% 11%)',
                                    borderColor: 'hsl(222 47% 18% / 0.5)',
                                }}
                                className="p-4 card border"
                            >
                                <p className="text-[10px] uppercase-tracking text-dim mb-1">Median Price</p>
                                <p style={{ color: 'hsl(210 40% 98%)' }} className="text-lg font-black">{result.marketWatch?.medianHomePrice || 'N/A'}</p>
                            </div>
                            <div
                                style={{
                                    background: 'hsl(222 47% 11%)',
                                    borderColor: 'hsl(222 47% 18% / 0.5)',
                                }}
                                className="p-4 card border"
                            >
                                <p className="text-[10px] uppercase-tracking text-dim mb-1">Avg Rent</p>
                                <p style={{ color: 'hsl(210 40% 98%)' }} className="text-lg font-black">{result.marketWatch?.averageRent || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="p-4 card bg-blue-600/5 border-blue-600/10 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] uppercase-tracking text-slate-500">Trend</p>
                                <p className="text-sm font-bold text-slate-200">{result.marketWatch?.priceTrend}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] uppercase-tracking text-slate-500">Inventory</p>
                                <p className="text-sm font-bold text-slate-400">{result.marketWatch?.inventoryLevel}</p>
                            </div>
                        </div>
                    </section>

                    {/* Community Pulse */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                            <Star size={14} className="text-accent-success" />
                            <h3 className="text-[10px] uppercase-tracking font-bold text-accent-success">Community Pulse</h3>
                        </div>
                        <div
                            style={{
                                background: 'hsl(222 47% 11%)',
                                borderColor: 'hsl(222 47% 18% / 0.5)',
                            }}
                            className="card p-5 space-y-4 border"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] uppercase-tracking text-slate-500 mb-1">Schools</p>
                                    <p className="text-sm font-bold text-slate-200">{result.communityPulse?.schoolRating}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] uppercase-tracking text-slate-500 mb-1">Lifestyle</p>
                                    <p className="text-sm font-bold text-slate-200">{result.communityPulse?.lifestyle}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase-tracking text-slate-500 mb-2">Key Demographics</p>
                                <div className="flex flex-wrap gap-2">
                                    {(result.communityPulse?.demographics || []).map((d, i) => (
                                        <span key={i} className="px-2 py-1 bg-white/5 rounded text-[10px] font-medium text-slate-300 border border-white/5">
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-2 gap-3">
                        <ScoreStat label="Walkability" score={result.scores?.walkability} />
                        <ScoreStat label="Transit" score={result.scores?.transit} />
                        <ScoreStat label="Safety" score={result.scores?.safety} />
                        <ScoreStat label="Nightlife" score={result.scores?.nightlife} />
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-2">
                        <div className="space-y-3">
                            <h3 className="text-[10px] uppercase-tracking text-accent-success flex items-center gap-2">
                                <Info size={12} className="fill-current" /> Pros
                            </h3>
                            <ul className="space-y-2">
                                {(result.pros || []).map((p, i) => (
                                    <li key={i} className="text-xs text-slate-300 flex gap-2 items-start leading-relaxed">
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent-success mt-1.5 flex-shrink-0" />
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-[10px] uppercase-tracking text-red-500 flex items-center gap-2">
                                <AlertTriangle size={12} className="fill-current" /> Cons
                            </h3>
                            <ul className="space-y-2">
                                {(result.cons || []).map((p, i) => (
                                    <li key={i} className="text-xs text-slate-300 flex gap-2 items-start leading-relaxed">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <section className="space-y-4">
                        <h3 className="text-[10px] uppercase-tracking text-blue-500 flex items-center gap-2">
                            <Compass size={14} /> Local Gems
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {(result.topSpots || []).map((spot, i) => (
                                <span key={i} className="px-4 py-2 bg-slate-800/40 text-[10px] font-black uppercase-tracking text-slate-200 rounded-xl border border-white/5 shadow-sm">
                                    {spot}
                                </span>
                            ))}
                        </div>
                    </section>
                </div>
            )}

            {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/20 text-red-500 text-xs rounded-lg">
                    {error}
                </div>
            )}
        </div>
    );
};

const ScoreStat: React.FC<{ label: string; score?: number }> = ({ label, score = 0 }) => (
    <div
        style={{
            background: 'hsl(222 47% 11%)',
            borderColor: 'hsl(222 47% 18% / 0.5)',
        }}
        className="p-4 card border"
    >
        <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] uppercase-tracking text-slate-500">{label}</span>
            <span className={`text-[10px] font-black ${score > 70 ? 'text-green-500' : score > 40 ? 'text-orange-500' : 'text-red-500'}`}>{score}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden shadow-inner">
            <div
                className={`h-full transition-all duration-1000 ${score > 70 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : score > 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                style={{ width: `${score}%` }}
            />
        </div>
    </div>
);

export default NeighborhoodIntelAI;
