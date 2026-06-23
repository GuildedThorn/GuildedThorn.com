import { createContext, useContext, useState, type ReactNode } from "react";

const STORAGE_KEY = "gt-cookie-consent-v1";

export interface ConsentCategories {
    /** Sign-in / security. Always on, can't be disabled. */
    necessary: true;
    /** Third-party embeds (e.g. donation widgets) that may set their own cookies. */
    functional: boolean;
}

export interface ConsentRecord {
    categories: ConsentCategories;
    decidedAt: string;
}

interface ConsentContextValue {
    consent: ConsentRecord | null;
    /** True once the visitor has made any choice. */
    decided: boolean;
    /** Convenience: has the visitor allowed third-party content? */
    functional: boolean;
    settingsOpen: boolean;
    openSettings: () => void;
    closeSettings: () => void;
    acceptAll: () => void;
    rejectNonEssential: () => void;
    savePreferences: (categories: { functional: boolean }) => void;
}

const ConsentContext = createContext<ConsentContextValue | undefined>(undefined);

function loadConsent(): ConsentRecord | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as ConsentRecord;
            if (parsed?.categories) return parsed;
        }
    } catch (e) {
        console.error("Failed to read cookie consent:", e);
    }
    return null;
}

export function ConsentProvider({ children }: { children: ReactNode }) {
    const [consent, setConsent] = useState<ConsentRecord | null>(loadConsent);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const persist = (functional: boolean) => {
        const record: ConsentRecord = {
            categories: { necessary: true, functional },
            decidedAt: new Date().toISOString(),
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
        } catch (e) {
            console.error("Failed to save cookie consent:", e);
        }
        setConsent(record);
        setSettingsOpen(false);
    };

    const value: ConsentContextValue = {
        consent,
        decided: consent !== null,
        functional: consent?.categories.functional ?? false,
        settingsOpen,
        openSettings: () => setSettingsOpen(true),
        closeSettings: () => setSettingsOpen(false),
        acceptAll: () => persist(true),
        rejectNonEssential: () => persist(false),
        savePreferences: ({ functional }) => persist(functional),
    };

    return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useConsent() {
    const ctx = useContext(ConsentContext);
    if (!ctx) throw new Error("useConsent must be used within a ConsentProvider");
    return ctx;
}
