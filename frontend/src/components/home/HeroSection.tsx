import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { HOME } from '@/copy/home';
import { FEATURES } from '@/constants/links';
import { useHomeChat } from '@/chat/useHomeChat';
import AgentChat, { PhoneLayer } from '@/components/chat/AgentChat';
import { SheetKey } from '@/content/sheets';
import { PHONE_QUERY, useMediaQuery } from '@/hooks/useMediaQuery';
import AnswerPlan from '@/components/chat/AnswerPlan';
import { useSiteDialogs } from '@/components/site/SiteDialogs';
import { useTurnstile } from '@/hooks/useTurnstile';
import { useLang } from '@/i18n/useLang';
import { CHAT } from '@/copy/chat';

/** The WhatsApp glyph, drawn inline so the button needs no icon font. */
export const WhatsAppIcon: React.FC = () => (
    <svg className="wi" viewBox="0 0 24 24" aria-hidden="true">
        <path
            fill="currentColor"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
        />
    </svg>
);

/** What the history entry says about the phone chat, so Back closes what is open. */
interface HeroState {
    ask?: string;
    /** The page load that opened the layer (see VISIT). */
    chatLayer?: number;
    chatSheet?: boolean;
}

// Marks history entries made by this page load. After a reload the entry
// still says "open", but the conversation it showed is gone, so only an
// entry with this load's mark opens the layer.
const VISIT = Math.random();

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]';
// How far the sheet has to be pulled down before letting go closes it.
const SWIPE_CLOSE_PX = 90;
// How far a finger goes down before the sheet starts to follow it.
const PULL_START_PX = 10;
// The parts of the first-screen card that may give way on a short phone (see site.css).
const FIT_STEPS = 5;
const FIT_MARGIN_PX = 4;

/** Keeps Tab inside `box`, the open layer or sheet. */
const trapTab = (event: KeyboardEvent, box: HTMLElement) => {
    const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (
        event.shiftKey &&
        (document.activeElement === first || !box.contains(document.activeElement))
    ) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
};

/*
 * The first screen: who this is and what he builds, then the chat beside the
 * drawing of how it answers. The chat is the proof of the claim above it.
 *
 * On a phone the two do not fit side by side or stacked, so the chat card
 * fills the rest of the first screen, opens to a full-screen layer once the
 * visitor starts, and an answer's drawing rises over it as a sheet. Both are
 * history entries, so the phone's Back closes them.
 */
const HeroSection: React.FC = () => {
    const { t } = useLang();
    const copy = t(HOME).hero;
    const { openContact } = useSiteDialogs();
    const { containerRef: turnstileRef, getToken, reset: resetToken } = useTurnstile();
    const chat = useHomeChat({ getToken, resetToken });
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as HeroState | null;
    const phone = useMediaQuery(PHONE_QUERY);

    const full = phone && state?.chatLayer === VISIT;
    const sheetOpen = full && !!state?.chatSheet;

    const chatRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const resumeRef = useRef<HTMLButtonElement>(null);
    const sheetOpener = useRef<HTMLElement | null>(null);
    const here = location.pathname + location.search + location.hash;

    const openLayer = useCallback(() => {
        if (full || !phone) return;
        navigate(here, { state: { chatLayer: VISIT } satisfies HeroState });
    }, [full, phone, navigate, here]);

    const closeLayer = useCallback(() => navigate(-1), [navigate]);

    const showSheet = useCallback(
        (key: SheetKey) => {
            chat.openSheet(key);
            if (sheetOpen) return;
            sheetOpener.current = document.activeElement as HTMLElement | null;
            navigate(here, { state: { chatLayer: VISIT, chatSheet: true } satisfies HeroState });
        },
        [chat, sheetOpen, navigate, here]
    );
    const closeSheet = useCallback(() => navigate(-1), [navigate]);

    // A reloaded page, or one widened past a phone, starts with the chat closed.
    useEffect(() => {
        if (state?.chatLayer && !full) navigate(here, { replace: true, state: null });
    }, [state, full, navigate, here]);

    // A question carried from another page ("ask the agent about X" on the
    // blog) is asked once, as if typed here.
    const carried = state?.ask;
    const askedCarried = useRef(false);
    useEffect(() => {
        if (!carried || askedCarried.current) return;
        askedCarried.current = true;
        chat.submit(carried);
        if (phone) openLayer();
        else document.getElementById('top')?.scrollIntoView({ block: 'start' });
    }, [carried, chat, phone, openLayer]);

    // The process drawing has no card in the conversation: on a phone it
    // rises as soon as it is drawn, and the team-size chips wait behind it.
    useEffect(() => {
        if (full && !sheetOpen && chat.plan.kind === 'cmp') showSheet('cmp' as SheetKey);
        // Only a new drawing opens it, not closing the sheet on top of one.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chat.plan]);

    // The card on the page reaches the bottom of the first screen.
    useLayoutEffect(() => {
        const el = chatRef.current;
        if (!phone || full || !el) return;
        const measure = () => {
            const top = el.getBoundingClientRect().top + window.scrollY;
            el.style.setProperty('--fill-top', `${top}px`);
            // Drop optional parts, one step at a time, until the input is on screen.
            const input = el.querySelector('.inp');
            const bottom = () => (input?.getBoundingClientRect().bottom ?? 0) + window.scrollY;
            let fit = 0;
            el.dataset.fit = '0';
            while (fit < FIT_STEPS && bottom() > window.innerHeight - FIT_MARGIN_PX) {
                el.dataset.fit = String(++fit);
            }
        };
        measure();
        window.addEventListener('resize', measure);
        void document.fonts?.ready.then(measure);
        return () => window.removeEventListener('resize', measure);
    }, [phone, full]);

    // While open: the page behind does not scroll, and the layer follows the
    // visible viewport, so the input sits right above the keyboard.
    useEffect(() => {
        const el = chatRef.current;
        if (!full || !el) return;
        const root = document.documentElement;
        const resume = resumeRef;
        root.classList.add('chat-open');
        const vv = window.visualViewport;
        const fit = () => {
            if (!vv) return;
            el.style.setProperty('--vv-h', `${vv.height}px`);
            el.style.setProperty('--vv-top', `${vv.offsetTop}px`);
        };
        fit();
        vv?.addEventListener('resize', fit);
        vv?.addEventListener('scroll', fit);
        if (!el.contains(document.activeElement)) el.focus({ preventScroll: true });
        return () => {
            root.classList.remove('chat-open');
            vv?.removeEventListener('resize', fit);
            vv?.removeEventListener('scroll', fit);
            // Back on the page, at the entry that reopens the conversation.
            requestAnimationFrame(() => resume.current?.focus({ preventScroll: true }));
        };
    }, [full]);

    // The sheet takes focus when it rises and gives it back to the card that opened it.
    useEffect(() => {
        if (!sheetOpen) return;
        sheetRef.current?.focus({ preventScroll: true });
        return () => {
            const opener = sheetOpener.current;
            if (opener?.isConnected) opener.focus({ preventScroll: true });
        };
    }, [sheetOpen]);

    // Escape closes the top-most of the two; Tab stays inside it.
    useEffect(() => {
        if (!full) return;
        const onKey = (event: KeyboardEvent) => {
            const box = sheetOpen ? sheetRef.current : chatRef.current;
            if (event.key === 'Escape') {
                event.preventDefault();
                if (sheetOpen) closeSheet();
                else closeLayer();
            } else if (event.key === 'Tab' && box) trapTab(event, box);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [full, sheetOpen, closeSheet, closeLayer]);

    // The sheet follows a finger pulling it down: from the handle or header at
    // any time, or from its content only while that is scrolled to the top.
    // Nothing moves until the finger has clearly gone down, so a swipe up
    // always reaches the content's own scrolling untouched.
    const pull = useRef<{ y: number; dy: number } | null>(null);
    const onTouchStart = (event: React.TouchEvent) => {
        const scroller = sheetRef.current?.querySelector('.plan');
        const onHandle = (event.target as Element).closest('.grab, .ph');
        if (!onHandle && scroller && scroller.scrollTop > 0) return;
        pull.current = { y: event.touches[0].clientY, dy: 0 };
    };
    const onTouchMove = (event: React.TouchEvent) => {
        const panel = sheetRef.current;
        if (!pull.current || !panel) return;
        const dy = event.touches[0].clientY - pull.current.y;
        if (dy < 0 && pull.current.dy === 0) {
            // Going up: this is a scroll, not a pull.
            pull.current = null;
            return;
        }
        pull.current.dy = Math.max(0, dy);
        if (pull.current.dy > PULL_START_PX) {
            panel.style.transform = `translateY(${pull.current.dy}px)`;
        }
    };
    const onTouchEnd = () => {
        const panel = sheetRef.current;
        if (!pull.current || !panel) return;
        const close = pull.current.dy > SWIPE_CLOSE_PX;
        pull.current = null;
        panel.style.transform = '';
        if (close) closeSheet();
    };

    const layer: PhoneLayer | undefined = phone
        ? { full, engage: openLayer, close: closeLayer, showSheet }
        : undefined;
    // Under the chat on a phone: the five stops as a still explainer. The live
    // drawing belongs to the sheet.
    const still = useMemo(() => ({ ...chat, plan: { kind: 'base' as const } }), [chat]);

    return (
        <div className="sheet" id="top">
            <div className="hero-top">
                <div>
                    <span className="tagline">{copy.tagline}</span>
                    <h1>
                        <span>{copy.title}</span> <em>{copy.em}</em>
                    </h1>
                </div>
                <div>
                    <p>
                        {copy.lead[0]}
                        <span className="only-wide"> {copy.lead[1]}</span> {copy.lead[2]}
                    </p>
                    <div className="acts">
                        <a className="btn" href="#brief">
                            {copy.cta}
                        </a>
                        {FEATURES.whatsapp && (
                            <button
                                type="button"
                                className="btn line wa"
                                aria-label={copy.whatsapp}
                                onClick={() => openContact({ kind: 'whatsapp' })}
                            >
                                <WhatsAppIcon />
                                <span>{copy.whatsapp}</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <div className="duo">
                <AgentChat
                    chat={chat}
                    turnstileRef={turnstileRef}
                    phone={layer}
                    rootRef={chatRef}
                    resumeRef={resumeRef}
                >
                    {phone && (
                        <div className="psheet" hidden={!sheetOpen}>
                            <div className="scrim" onClick={closeSheet} aria-hidden="true" />
                            <div
                                className="panel"
                                ref={sheetRef}
                                role="dialog"
                                aria-modal="true"
                                aria-label={t(CHAT).art.diagram}
                                tabIndex={-1}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                            >
                                <span className="grab" aria-hidden="true" />
                                {sheetOpen && <AnswerPlan chat={chat} onClose={closeSheet} />}
                            </div>
                        </div>
                    )}
                </AgentChat>
                <AnswerPlan chat={phone ? still : chat} idless={phone} />
            </div>
        </div>
    );
};

export default HeroSection;
