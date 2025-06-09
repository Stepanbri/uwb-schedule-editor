// Paleta barev vybraná pro dobrou vizuální odlišitelnost a kontrast.
// Byly vynechány základní odstíny červené, zelené a modré, které jsou použity pro typy akcí.

// POZOR: Tyto barvy byly vygenerovány pomocí chatGPT a nějak si tento kus kódu nepřivlasňuji
export const courseColorPalette = [
    '#E91E63', // Pink 500
    '#9C27B0', // Purple 500
    '#673AB7', // Deep Purple 500
    '#3F51B5', // Indigo 500
    '#00ACC1', // Cyan 600
    '#00897B', // Teal 600
    '#F57C00', // Orange 800
    '#FF5722', // Deep Orange 500
    '#795548', // Brown 500
    '#546E7A', // Blue Grey 600
    '#AD1457', // Pink 800
    '#7B1FA2', // Purple 800
    '#4527A0', // Deep Purple 800
    '#283593', // Indigo 800
    '#006064', // Cyan 900
    '#BF360C', // Deep Orange 900
    '#4E342E', // Brown 800
    '#37474F', // Blue Grey 800
];

/**
 * Získá konzistentní barvu pro předmět na základě jeho indexu v poli.
 * @param {number} courseIndex - Index předmětu v poli všech kurzů.
 * @returns {string} Hex kód barvy.
 */
export const getColorForCourse = courseIndex => {
    if (courseIndex < 0) return courseColorPalette[0];
    return courseColorPalette[courseIndex % courseColorPalette.length];
};
