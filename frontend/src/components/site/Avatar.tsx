import React from 'react';
import { FOOTER } from '@/copy/site';
import { useLang } from '@/i18n/useLang';

// Hosted outside the repository; see `avatarUrl` in site.config.ts.
const AVATAR_URL = import.meta.env.VITE_AVATAR_URL as string;

/** The photo, round: large beside the about heading, small in the hiring band. Nothing when unset. */
const Avatar: React.FC<{ size: 'lg' | 'sm' }> = ({ size }) => {
    const { t } = useLang();
    if (!AVATAR_URL) return null;
    return (
        <img
            className={`avatar ${size}`}
            src={AVATAR_URL}
            alt={t(FOOTER).name}
            width={160}
            height={160}
        />
    );
};

export default Avatar;
