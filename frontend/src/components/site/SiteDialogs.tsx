import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ContactKind } from '@/copy/site';
import ContactDialog from '@/components/site/ContactDialog';
import CvDialog from '@/components/site/CvDialog';

/*
 * The two dialogs any part of a page can open: talking to Yanir (call, email,
 * WhatsApp) and the CV. Held here, once, so a button deep inside a chat answer
 * opens the same window the top bar does, carrying the subject with it.
 */
export interface ContactRequest {
    kind: ContactKind;
    /** What the visitor was asking about, shown at the top of the window. */
    topic?: string;
    /** The visitor's own words, prefilled into the email. */
    message?: string;
    /** A route the visitor marked, e.g. fixed price or hourly. */
    pref?: string;
}

/** A link to any page with this hash opens the booking window, e.g. from an email. */
export const CALL_HASH = '#call';

interface SiteDialogsApi {
    openContact: (request: ContactRequest) => void;
    openCv: () => void;
}

const SiteDialogsContext = createContext<SiteDialogsApi | null>(null);

export const SiteDialogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [contact, setContact] = useState<ContactRequest | null>(null);
    const [cvOpen, setCvOpen] = useState(false);

    const openContact = useCallback((request: ContactRequest) => setContact(request), []);
    const openCv = useCallback(() => setCvOpen(true), []);
    const api = useMemo(() => ({ openContact, openCv }), [openContact, openCv]);

    return (
        <SiteDialogsContext.Provider value={api}>
            {children}
            {contact && (
                <ContactDialog
                    request={contact}
                    onChange={setContact}
                    onClose={() => setContact(null)}
                />
            )}
            {cvOpen && <CvDialog onClose={() => setCvOpen(false)} />}
        </SiteDialogsContext.Provider>
    );
};

export const useSiteDialogs = (): SiteDialogsApi => {
    const api = useContext(SiteDialogsContext);
    if (!api) throw new Error('useSiteDialogs must be used inside SiteDialogsProvider');
    return api;
};
