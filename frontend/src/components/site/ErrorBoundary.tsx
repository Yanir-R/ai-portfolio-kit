import React from 'react';
import CrashScreen from '@/components/site/CrashScreen';

/*
 * What a visitor sees when a page throws while drawing, instead of a blank
 * screen. Two places use it: around the page inside the site's frame (the top
 * bar and footer stay, so the visitor can go on), and around the whole app,
 * for a failure in the frame itself.
 *
 * The inner boundary is keyed by the address in SiteLayout, so navigating to
 * another page gives that page a fresh start.
 */
export class ErrorBoundary extends React.Component<
    { children: React.ReactNode; bare?: boolean },
    { failed: boolean }
> {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo) {
        // The console is the only place this goes: nothing about the visitor's
        // page or input is sent anywhere.
        console.error('Page failed to render:', error, info.componentStack);
    }

    render() {
        return this.state.failed ? <CrashScreen bare={this.props.bare} /> : this.props.children;
    }
}
