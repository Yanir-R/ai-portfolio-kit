import React, { useMemo } from 'react';
import qrcode from 'qrcode-generator';

/**
 * A QR code drawn as one SVG path, so it stays sharp at any size and needs no
 * image request. Error correction M survives a phone held at an angle.
 */
const QrCode: React.FC<{ value: string; label: string }> = ({ value, label }) => {
    const { size, path } = useMemo(() => {
        const qr = qrcode(0, 'M');
        qr.addData(value, 'Byte');
        qr.make();
        const count = qr.getModuleCount();
        let d = '';
        for (let r = 0; r < count; r++) {
            for (let c = 0; c < count; c++) {
                if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
            }
        }
        return { size: count, path: d };
    }, [value]);
    // Four modules of quiet zone on each side, as scanners expect.
    const box = size + 8;
    return (
        <svg
            className="qr"
            viewBox={`-4 -4 ${box} ${box}`}
            role="img"
            aria-label={label}
            shapeRendering="crispEdges"
        >
            <rect x={-4} y={-4} width={box} height={box} fill="#fff" />
            <path d={path} fill="currentColor" />
        </svg>
    );
};

export default QrCode;
