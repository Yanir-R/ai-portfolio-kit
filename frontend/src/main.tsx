import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App';
import { ErrorBoundary } from '@/components/site/ErrorBoundary';
import '@/styles/fonts.css';
import '@/styles/site.css';
import '@/styles/direction.css';
import '@/styles/additions.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {/* The last line of defence: a failure in the site's frame itself. */}
        <ErrorBoundary bare>
            <App />
        </ErrorBoundary>
    </React.StrictMode>
);
