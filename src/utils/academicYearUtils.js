/**
 * Zjistí aktuální akademický rok ve formátu "RRRR/RRRR".
 * @returns {string} Aktuální akademický rok.
 */
export const getCurrentAcademicYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0 (leden) - 11 (prosinec)
    return month >= 8 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

/**
 * Generuje seznam akademických roků pro výběr.
 * Formát roku: "RRRR/RRRR" pro hodnotu a "RRRR - RRRR/RR" pro zobrazení.
 * @returns {{value: string, label: string}[]} Pole objektů s akademickými roky.
 */
export const generateAcademicYears = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    const startYear = 1990;
    const endYear = currentYear + 10;

    for (let i = endYear; i >= startYear; i--) {
        const academicYearValue = `${i}/${i + 1}`;
        const shortNextYear = (i + 1).toString().slice(-2);
        const academicYearLabel = `${i}/${shortNextYear}`;
        years.push({ value: academicYearValue, label: academicYearLabel });
    }
    return years;
};
