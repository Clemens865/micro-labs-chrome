import { useState, useCallback, useEffect } from 'react';

export interface Experience {
    company: string;
    role: string;
    duration: string;
    highlights: string;
}

export interface UserProfile {
    // Personal Info
    name: string;
    role: string;
    email: string;
    phone: string;
    linkedInUrl: string;

    // Company Info
    companyName: string;
    companyIndustry: string;
    companySize: string;
    companyWebsite: string;

    // Sales/Outreach Context
    valueProposition: string;
    targetAudience: string;
    productService: string;
    typicalPainPoints: string;

    // Personal Background (for personal outreach)
    skills: string;
    interests: string;
    education: string;
    achievements: string;
    experiences: Experience[];
}

const emptyProfile: UserProfile = {
    name: '',
    role: '',
    email: '',
    phone: '',
    linkedInUrl: '',
    companyName: '',
    companyIndustry: '',
    companySize: '',
    companyWebsite: '',
    valueProposition: '',
    targetAudience: '',
    productService: '',
    typicalPainPoints: '',
    skills: '',
    interests: '',
    education: '',
    achievements: '',
    experiences: []
};

export const useUserProfile = () => {
    const [profile, setProfile] = useState<UserProfile>(emptyProfile);
    const [loading, setLoading] = useState(true);
    const [hasProfile, setHasProfile] = useState(false);

    const loadProfile = useCallback(async () => {
        setLoading(true);
        try {
            const data = await chrome.storage.local.get('user_profile') as { user_profile?: UserProfile };
            if (data.user_profile) {
                setProfile(data.user_profile);
                setHasProfile(true);
            } else {
                setProfile(emptyProfile);
                setHasProfile(false);
            }
        } catch (err) {
            console.error('Failed to load user profile:', err);
            setProfile(emptyProfile);
            setHasProfile(false);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    const saveProfile = useCallback(async (newProfile: UserProfile) => {
        try {
            await chrome.storage.local.set({ user_profile: newProfile });
            setProfile(newProfile);
            setHasProfile(true);
            return true;
        } catch (err) {
            console.error('Failed to save user profile:', err);
            return false;
        }
    }, []);

    const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
        const updatedProfile = { ...profile, ...updates };
        return saveProfile(updatedProfile);
    }, [profile, saveProfile]);

    const clearProfile = useCallback(async () => {
        try {
            await chrome.storage.local.remove('user_profile');
            setProfile(emptyProfile);
            setHasProfile(false);
            return true;
        } catch (err) {
            console.error('Failed to clear user profile:', err);
            return false;
        }
    }, []);

    // Generate context string for AI prompts
    const getProfileContext = useCallback(() => {
        if (!hasProfile) return '';

        const parts: string[] = [];

        if (profile.name || profile.role) {
            parts.push(`The user is ${profile.name || 'a professional'}${profile.role ? `, working as ${profile.role}` : ''}.`);
        }

        if (profile.companyName) {
            let companyInfo = `They work at ${profile.companyName}`;
            if (profile.companyIndustry) companyInfo += ` in the ${profile.companyIndustry} industry`;
            if (profile.companySize) companyInfo += ` (${profile.companySize} employees)`;
            parts.push(companyInfo + '.');
        }

        if (profile.productService) {
            parts.push(`They offer: ${profile.productService}.`);
        }

        if (profile.valueProposition) {
            parts.push(`Their value proposition: ${profile.valueProposition}.`);
        }

        if (profile.targetAudience) {
            parts.push(`Their target audience: ${profile.targetAudience}.`);
        }

        if (profile.typicalPainPoints) {
            parts.push(`Common pain points they solve: ${profile.typicalPainPoints}.`);
        }

        return parts.length > 0 ? parts.join(' ') : '';
    }, [profile, hasProfile]);

    // Generate outreach context for personalized templates
    const getOutreachContext = useCallback(() => {
        if (!hasProfile) return null;

        return {
            senderName: profile.name,
            senderRole: profile.role,
            senderEmail: profile.email,
            senderPhone: profile.phone,
            senderLinkedIn: profile.linkedInUrl,
            companyName: profile.companyName,
            companyIndustry: profile.companyIndustry,
            companyWebsite: profile.companyWebsite,
            valueProposition: profile.valueProposition,
            productService: profile.productService,
            // Personal context
            skills: profile.skills,
            interests: profile.interests,
            education: profile.education,
            achievements: profile.achievements,
            experiences: profile.experiences
        };
    }, [profile, hasProfile]);

    // Generate personal context for personal outreach
    const getPersonalContext = useCallback(() => {
        if (!hasProfile) return '';

        const parts: string[] = [];

        if (profile.skills) {
            parts.push(`Skills: ${profile.skills}`);
        }

        if (profile.interests) {
            parts.push(`Personal interests: ${profile.interests}`);
        }

        if (profile.education) {
            parts.push(`Education: ${profile.education}`);
        }

        if (profile.achievements) {
            parts.push(`Notable achievements: ${profile.achievements}`);
        }

        if (profile.experiences && profile.experiences.length > 0) {
            const expSummary = profile.experiences
                .map(e => `${e.role} at ${e.company}${e.highlights ? ` (${e.highlights})` : ''}`)
                .join('; ');
            parts.push(`Past experience: ${expSummary}`);
        }

        return parts.join('. ');
    }, [profile, hasProfile]);

    return {
        profile,
        loading,
        hasProfile,
        saveProfile,
        updateProfile,
        clearProfile,
        refreshProfile: loadProfile,
        getProfileContext,
        getOutreachContext,
        getPersonalContext
    };
};
