import React from 'react';
import { FOOTER } from '@/copy/site';
import { useLang } from '@/i18n/useLang';

// Hosted outside the repository; see `avatarUrl` and `avatarHiResUrl` in site.config.ts.
const AVATAR_URL = import.meta.env.VITE_AVATAR_URL as string;
const AVATAR_HIRES_URL = import.meta.env.VITE_AVATAR_HIRES_URL as string;

/**
 * The photo, round: large beside the about heading, small in the hiring band.
 * The large one gives sharp screens the full-size original. Nothing when unset.
 */
const Avatar: React.FC<{ size: 'lg' | 'sm' }> = ({ size }) => {
    const { t } = useLang();
    if (!AVATAR_URL) return null;
    const srcSet =
        size === 'lg' && AVATAR_HIRES_URL ? `${AVATAR_URL} 1x, ${AVATAR_HIRES_URL} 2x` : undefined;
    return (
        <img
            className={`avatar ${size}`}
            src={AVATAR_URL}
            srcSet={srcSet}
            alt={t(FOOTER).name}
            width={160}
            height={160}
        />
    );
};

export default Avatar;
