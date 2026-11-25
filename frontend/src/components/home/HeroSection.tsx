import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HOME } from '@/copy/home';
import { FEATURES } from '@/constants/links';
import { AnswerRecord, useHomeChat } from '@/chat/useHomeChat';
import AgentChat, { ChatSize, PhoneLayer } from '@/components/chat/AgentChat';
import { SheetKey } from '@/content/sheets';
import {
    GROW_QUERY,
    PHONE_QUERY,
    REDUCED_MOTION_QUERY,
    useMediaQuery,
} from '@/hooks/useMediaQuery';
import { useHistoryLayer, useLayerChrome } from '@/hooks/usePhoneLayer';
import { KEYBOARD_COVER_PX } from '@/hooks/useKeyboardFit';
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
    chatSheet?: boolean;
}

// How far the sheet has to be pulled down before letting go closes it.
const SWIPE_CLOSE_PX = 90;
// How far a finger goes down before the sheet starts to follow it.
const PULL_START_PX = 10;
// The parts of the first-screen card that may give way on a short phone (see site.css).
const FIT_STEPS = 5;
const FIT_MARGIN_PX = 4;
// The parts of the open layer that give way above a keyboard (see site.css).
const KB_FIT_STEPS = 5;
// The grown chat keeps this much of the page around it, above and below.
const GROW_EDGE_PX = 16;

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
    const phone = useMediaQuery(PHONE_QUERY);
    const layer = useHistoryLayer('chatLayer', phone);
    const state = layer.state as HeroState | null;
    const full = layer.open;
    const sheetOpen = full && !!state?.chatSheet;

    const chatRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const resumeRef = useRef<HTMLButtonElement>(null);
    const sheetOpener = useRef<HTMLElement | null>(null);

    const { show, close } = layer;
    const openLayer = useCallback(() => show(), [show]);
    const closeLayer = close;
    const showSheet = useCallback(
        (key: SheetKey, record?: AnswerRecord | null) => {
            chat.openSheet(key, record);
            if (sheetOpen) return;
            sheetOpener.current = document.activeElement as HTMLElement | null;
            show({ chatSheet: true });
        },
        [chat, sheetOpen, show]
    );
    const closeSheet = close;
    // The six stations as they are now, in the sheet, opening the layer under it if needed.
    const showHow = useCallback(() => {
        if (sheetOpen) return;
        sheetOpener.current = document.activeElement as HTMLElement | null;
        show({ chatSheet: true });
    }, [sheetOpen, show]);

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
        const vv = window.visualViewport;
        const measure = () => {
            // Not while a keyboard is up (the layer just closed, or a field on
            // the page has focus): the screen is short only for now, and the
            // card would drop parts it has room for. It measures again once
            // the keyboard has gone.
            if (vv && window.innerHeight - vv.height > KEYBOARD_COVER_PX) return;
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
        vv?.addEventListener('resize', measure);
        void document.fonts?.ready.then(measure);
        // The headline above and the card's own content can still settle
        // after the first paint (a late font, the starters): measure again
        // whenever either changes size. A measure ends on the same layout it
        // found, so this does not loop.
        const watch = new ResizeObserver(measure);
        const top = el.closest('#top');
        if (top) watch.observe(top);
        const log = el.querySelector('.log');
        if (log) watch.observe(log);
        return () => {
            window.removeEventListener('resize', measure);
            vv?.removeEventListener('resize', measure);
            watch.disconnect();
        };
    }, [phone, full]);

    // The open layer, before the first question, while a keyboard is up: the
    // greeting must not sit half under the header. Drop optional parts, one
    // step at a time, until the whole conversation fits (see site.css).
    useLayoutEffect(() => {
        const el = chatRef.current;
        const log = el?.querySelector<HTMLElement>('.log');
        if (!phone || !full || !el || !log) return;
        const measure = () => {
            let fit = 0;
            el.dataset.kfit = '0';
            if (!el.hasAttribute('data-kb') || el.classList.contains('live')) return;
            while (fit < KB_FIT_STEPS && log.scrollHeight > log.clientHeight + 1) {
                el.dataset.kfit = String(++fit);
            }
        };
        measure();
        // data-kb comes and goes with the keyboard; the log changes with the
        // visible height and with the conversation.
        const kb = new MutationObserver(measure);
        kb.observe(el, { attributes: true, attributeFilter: ['data-kb', 'class'] });
        const size = new ResizeObserver(measure);
        size.observe(log);
        return () => {
            kb.disconnect();
            size.disconnect();
            delete el.dataset.kfit;
        };
    }, [phone, full]);

    // While open: the page behind is locked and the layer follows the visible
    // viewport. Escape closes the top-most of the layer and its sheet, and Tab
    // stays inside it.
    useLayerChrome(chatRef, full, {
        onEscape: sheetOpen ? closeSheet : closeLayer,
        trapRef: sheetOpen ? sheetRef : chatRef,
        returnRef: resumeRef,
    });

    // The sheet takes focus when it rises and gives it back to the card that opened it.
    useEffect(() => {
        if (!sheetOpen) return;
        sheetRef.current?.focus({ preventScroll: true });
        return () => {
            const opener = sheetOpener.current;
            if (opener?.isConnected) opener.focus({ preventScroll: true });
        };
    }, [sheetOpen]);

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

    /*
     * On a computer the chat grows to the screen's height with the first
     * question, the page scrolls the headline away, and the chat and the
     * drawing share that height, each scrolling inside. "Smaller" takes it
     * back to the first-screen size and keeps the conversation. Phones and
     * narrow windows keep the layer and the sheet; GROW_QUERY never overlaps
     * them, so one behaviour holds at any width, also after a resize.
     */
    const roomy = useMediaQuery(GROW_QUERY);
    const asked = chat.entries.some((e) => e.kind === 'user');
    const [small, setSmall] = useState(false);
    const grown = roomy && asked && !small;
    const topRef = useRef<HTMLDivElement>(null);
    const stillMotion = useMediaQuery(REDUCED_MOTION_QUERY);
    useEffect(() => {
        const duo = topRef.current?.querySelector('.duo');
        if (!roomy || !asked || !duo) return;
        const behavior = stillMotion ? 'auto' : 'smooth';
        // Grown: the chat's top just under the screen's edge. Smaller: the first screen again.
        const top = grown ? duo.getBoundingClientRect().top + window.scrollY - GROW_EDGE_PX : 0;
        window.scrollTo({ top, behavior });
        // Only growing or shrinking scrolls the page, not a change of motion setting.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [grown]);
    const size: ChatSize | undefined = roomy
        ? { grown, toggle: () => setSmall((s) => !s) }
        : undefined;

    const phoneLayer: PhoneLayer | undefined = phone
        ? { full, engage: openLayer, close: closeLayer, showSheet, showHow }
        : undefined;

    return (
        <div className={grown ? 'sheet grown' : 'sheet'} id="top" ref={topRef}>
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
                    phone={phoneLayer}
                    rootRef={chatRef}
                    resumeRef={resumeRef}
                    size={size}
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
                {/* On a phone the stations live in the chat and its sheet. */}
                {!phone && <AnswerPlan chat={chat} />}
            </div>
        </div>
    );
};

export default HeroSection;
