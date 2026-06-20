/**
 * Calculate the score awarded when having a certain percentage on a list level
 * @param {Number} rank Position on the list
 * @param {Number} percent Percentage of completion
 * @param {Number} minPercent Minimum percentage required
 * @returns {Number}
 */
export function score(rank, percent, minPercent) {
    if (rank > 150) {
        return 0;
    }
    if (rank > 75 && percent < 100) {
        return 0;
    }

    // Формула: 500 / позиция^0.8
    let baseScore = 500 / Math.pow(rank, 0.8);
    
    // Множитель за прогресс
    let progressMultiplier = (percent - (minPercent - 1)) / (100 - (minPercent - 1));
    
    let result = baseScore * progressMultiplier;
    
    result = Math.max(0, result);

    // За неполные прохождения — минус 33%
    if (percent !== 100) {
        result = result - result / 3;
    }

    return Math.round(Math.max(result, 0));
}

// round нужен для content.js
export function round(num) {
    return Math.round(num);
}
