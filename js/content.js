import { round, score } from './score.js';

/**
 * Path to directory containing `_list.json` and all levels
 */
const dir = './data';

// ===== КЭШ =====
let cachedList = null;
let cachedLeaderboard = null;
let cachedEditors = null;

export async function fetchList(forceRefresh = false) {
    if (cachedList !== null && !forceRefresh) {
        console.log('📦 List data from cache');
        return cachedList;
    }
    
    console.log('🔄 Fetching list data...');
    try {
        const listResult = await fetch(`${dir}/_list.json`);
        if (!listResult.ok) {
            console.error(`Failed to fetch _list.json: ${listResult.status}`);
            return null;
        }
        const list = await listResult.json();
        const result = await Promise.all(
            list.map(async (path, rank) => {
                try {
                    const levelResult = await fetch(`${dir}/${path}.json`);
                    if (!levelResult.ok) {
                        console.error(`Failed to fetch level #${rank + 1} ${path}.json: ${levelResult.status}`);
                        return [null, path];
                    }
                    const level = await levelResult.json();
                    return [
                        {
                            ...level,
                            path,
                            records: level.records ? level.records.sort((a, b) => b.percent - a.percent) : [],
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load level #${rank + 1} ${path}.`);
                    return [null, path];
                }
            }),
        );
        cachedList = result;
        return result;
    } catch (error) {
        console.error('Failed to load list:', error);
        return null;
    }
}

export async function fetchEditors(forceRefresh = false) {
    if (cachedEditors !== null && !forceRefresh) {
        console.log('📦 Editors data from cache');
        return cachedEditors;
    }
    
    console.log('🔄 Fetching editors...');
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        if (!editorsResults.ok) return null;
        const editors = await editorsResults.json();
        cachedEditors = editors;
        return editors;
    } catch {
        return null;
    }
}

export async function fetchLeaderboard(forceRefresh = false) {
    if (cachedLeaderboard !== null && !forceRefresh) {
        console.log('📦 Leaderboard data from cache');
        return cachedLeaderboard;
    }
    
    console.log('🔄 Building leaderboard...');
    const list = await fetchList(forceRefresh);
    
    if (!list) {
        console.error('Failed to fetch list for leaderboard');
        return [[], ['Failed to load list']];
    }

    const scoreMap = {};
    const errs = [];
    
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }
        
        if (!level) return;

        // ===== ВЕРИФИКАЦИЯ — ОЧКИ НЕ НАЧИСЛЯЮТСЯ =====
        // if (level.verifier) {
        //     const verifier = Object.keys(scoreMap).find(
        //         (u) => u.toLowerCase() === level.verifier.toLowerCase(),
        //     ) || level.verifier;
        //     scoreMap[verifier] = scoreMap[verifier] || {
        //         verified: [],
        //         completed: [],
        //         progressed: [],
        //     };
        //     const { verified } = scoreMap[verifier];
        //     verified.push({
        //         rank: rank + 1,
        //         level: level.name || 'Unknown',
        //         score: score(rank + 1, 100, level.percentToQualify || 0),
        //         link: level.verification || '#',
        //     });
        // }

        // Records
        if (level.records && Array.isArray(level.records)) {
            level.records.forEach((record) => {
                if (!record.user) return;
                const user = Object.keys(scoreMap).find(
                    (u) => u.toLowerCase() === record.user.toLowerCase(),
                ) || record.user;
                scoreMap[user] = scoreMap[user] || {
                    verified: [],
                    completed: [],
                    progressed: [],
                };
                const { completed, progressed } = scoreMap[user];
                if (record.percent === 100) {
                    completed.push({
                        rank: rank + 1,
                        level: level.name || 'Unknown',
                        score: score(rank + 1, 100, level.percentToQualify || 0),
                        link: record.link || '#',
                    });
                } else {
                    progressed.push({
                        rank: rank + 1,
                        level: level.name || 'Unknown',
                        percent: record.percent || 0,
                        score: score(rank + 1, record.percent || 0, level.percentToQualify || 0),
                        link: record.link || '#',
                    });
                }
            });
        }
    });

    // Wrap in extra Object containing the user and total score
    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const total = [verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + (cur.score || 0), 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    const result = [res.sort((a, b) => b.total - a.total), errs];
    cachedLeaderboard = result;
    return result;
}

export function clearCache() {
    console.log('🗑️ Clearing cache...');
    cachedList = null;
    cachedLeaderboard = null;
    cachedEditors = null;
}
