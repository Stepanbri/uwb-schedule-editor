import { alpha } from '@mui/material/styles';

const getPatternUrl = svg => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

// Pozor, tyto paterny byly vygenerované pomocí chatGPT a nějak si je nepřivlastnuji.

export const getEventTypePatterns = theme => {
    const patternColor = alpha(theme.palette.text.primary, 0.3);

    return {
        lecture: getPatternUrl(
            `<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><path d='M-1 1l2-2, M0 10l10-10, M9 11l2-2' stroke='${patternColor}' stroke-width='0.8'/></svg>`
        ), // Diagonal lines
        practical: getPatternUrl(
            `<svg xmlns='http://www.w3.org/2000/svg' width='10' height='10'><circle cx='3' cy='3' r='1.2' fill='${patternColor}'/></svg>`
        ), // Polka dots
        seminar: getPatternUrl(
            `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><path d='M0 0L8 8ZM8 0L0 8Z' stroke-width='0.4' stroke='${patternColor}'/></svg>`
        ), // Cross-hatch
    };
};
