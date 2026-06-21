import { fetchLeaderboard, fetchUserCountries } from '../content.js';
import { localize } from '../util.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    data: () => ({
        leaderboard: [],
        loading: true,
        selected: 0,
        err: [],
        mobileView: 'list',
        isMobile: window.innerWidth <= 768,
        savedScrollPosition: 0,
        countryMap: {},
    }),
    template: `
        <div v-if="loading" class="page-leaderboard-container" style="display:flex;align-items:center;justify-content:center;height:100%;">
            <Spinner />
        </div>
        <div v-else class="page-leaderboard-container" :class="{ 'mobile-list-view': mobileView === 'list', 'mobile-player-view': mobileView === 'player' }">
            <div class="board-container" v-show="mobileView === 'list'">
                <div v-for="(ientry, i) in leaderboard"
                     :key="ientry.user"
                     :class="['board-row', { 'active': selected == i && !isMobile, 'has-flag': countryCode(ientry.user) }]"
                     :style="flagStyle(ientry.user)"
                     @click="selectPlayer(i)"
                     @touchstart="onTouchStart($event, i)"
                     @touchend="onTouchEnd($event)"
                     @touchcancel="onTouchEnd($event)">
                    <span class="rank" :class="getRankClass(i)">#{{ i + 1 }}</span>
                    <span class="user">{{ ientry.user }}</span>
                    <span class="total">{{ localize(ientry.total) }}</span>
                </div>
                <div v-if="leaderboard.length === 0" style="text-align:center;color:rgba(255,255,255,0.3);padding:2rem;">
                    No records yet
                </div>
            </div>
            
            <div class="player-container" v-show="mobileView === 'player' || !isMobile">
                <button class="mobile-back-btn" 
                        v-if="isMobile" 
                        @click="goBackToList"
                        @pointerdown="onPointerDown"
                        @pointerup="onPointerUp"
                        @pointerleave="onPointerUp">
                    <span>←</span> Back to Leaderboard
                </button>
                
                <div v-if="entry">
                    <div class="player-profile-box" :class="{ 'has-flag': countryCode(entry.user) }" :style="flagStyle(entry.user)">
                        <div class="profile-row">
                            <span class="profile-rank">#{{ selected + 1 }}</span>
                            <span class="profile-name">{{ entry.user }}</span>
                            <span class="profile-points">{{ localize(entry.total) }} points</span>
                        </div>
                    </div>
                    
                    <!-- ===== ПЛАШКА HARDEST CHALLENGE ===== -->
                    <div class="hardest-badge" v-if="getHardestLevel(entry)">
                        <div class="hardest-badge-content">
                            <span class="hardest-icon">🔥</span>
                            <div class="hardest-text">
                                <span class="hardest-title">Hardest Challenge</span>
                                <span class="hardest-level">{{ getHardestLevel(entry) }}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="player-completed-box" v-if="entry.completed && entry.completed.length > 0">
                        <h2>Completed ({{ entry.completed.length }})</h2>
                        <table class="table">
                            <tr v-for="(score, idx) in entry.completed" :key="score.level">
                                <td colspan="2" style="padding: 0.75rem 0;">
                                    <span class="rank" style="margin-right: 0.5rem;">#{{ score.rank || idx + 1 }}</span>
                                    <a :href="score.link" target="_blank" class="user" style="text-decoration: none;">{{ cleanLevelName(score.level) }}</a>
                                </td>
                                <td style="text-align: right; color: #888; font-weight: 500;">+{{ localize(score.score) }}</td>
                            </tr>
                        </table>
                    </div>
                    <div v-else class="player-completed-box" style="display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.3);min-height:100px;">
                        <p>No completed levels yet</p>
                    </div>
                </div>
                <div v-else style="display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.3);height:100%;">
                    <p>Select a player from the list</p>
                </div>
            </div>
        </div>
    `,
    computed: {
        entry() { 
            return this.leaderboard && this.leaderboard.length > 0 
                ? this.leaderboard[this.selected] 
                : null; 
        },
    },
    methods: {
        localize,
        countryCode(user) {
            if (!user || !this.countryMap) return null;
            return this.countryMap[user.toLowerCase()] || null;
        },
        flagStyle(user) {
            const code = this.countryCode(user);
            if (!code) return {};
            if (code.startsWith('ru:')) {
                const file = code.slice(3);
                return { '--flag-url': `url('https://commons.wikimedia.org/wiki/Special:FilePath/${file}')` };
            }
            return { '--flag-url': `url('https://flagcdn.com/w640/${code}.png')` };
        },
        getRankClass(index) {
            if (index === 0) return 'gold';
            if (index === 1) return 'silver';
            if (index === 2) return 'bronze';
            return '';
        },
        cleanLevelName(name) {
            if (!name) return '';
            return name.replace(/\t/g, ' ').trim().replace(/\s+/g, ' ');
        },
        /**
         * Находит самый сложный пройденный уровень для игрока
         * (самый низкий ранг = самое маленькое число)
         */
        getHardestLevel(player) {
            if (!player || !player.completed || player.completed.length === 0) {
                return null;
            }
            
            // Находим запись с наименьшим рангом (самый сложный уровень)
            let hardest = null;
            let lowestRank = Infinity;
            
            for (const completed of player.completed) {
                if (completed.rank && completed.rank < lowestRank) {
                    lowestRank = completed.rank;
                    hardest = completed;
                }
            }
            
            return hardest ? hardest.level : null;
        },
        selectPlayer(index) {
            if (this.isMobile) {
                const container = document.querySelector('.board-container');
                if (container) {
                    this.savedScrollPosition = container.scrollTop;
                }
            }
            this.selected = index;
            if (this.isMobile) {
                this.mobileView = 'player';
                localStorage.removeItem('selectedPlayerIndex');
                setTimeout(() => {
                    const playerContainer = document.querySelector('.player-container');
                    if (playerContainer) {
                        playerContainer.scrollTop = 0;
                    }
                }, 50);
            }
        },
        goBackToList() {
            this.mobileView = 'list';
            setTimeout(() => {
                const container = document.querySelector('.board-container');
                if (container && this.savedScrollPosition !== undefined) {
                    container.scrollTop = this.savedScrollPosition;
                }
                localStorage.removeItem('selectedPlayerIndex');
            }, 50);
        },
        onTouchStart(e, index) {
            const el = e.currentTarget;
            el.classList.add('touch-active');
        },
        onTouchEnd(e) {
            const el = e.currentTarget;
            el.classList.remove('touch-active');
        },
        onPointerDown(e) {
            const el = e.currentTarget;
            if (e.pointerType === 'touch' || e.pointerType === 'pen') {
                el.classList.add('btn-active');
                el._pointerActive = true;
            }
        },
        onPointerUp(e) {
            const el = e.currentTarget;
            if (el._pointerActive) {
                el.classList.remove('btn-active');
                el._pointerActive = false;
            }
        },
        handleResize() {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            if (wasMobile && !this.isMobile) {
                this.mobileView = 'player';
            }
            if (!wasMobile && this.isMobile) {
                this.mobileView = 'list';
            }
        }
    },
    async mounted() {
        try {
            console.log('Leaderboard mounting...');

            const result = await fetchLeaderboard();
            console.log('Leaderboard data:', result);

            const [data, err] = result || [[], []];

            const countries = await fetchUserCountries();
            if (countries && typeof countries === 'object') {
                const lowered = {};
                for (const [user, code] of Object.entries(countries)) {
                    if (typeof user === 'string' && typeof code === 'string') {
                        lowered[user.toLowerCase()] = code.toLowerCase();
                    }
                }
                this.countryMap = lowered;
            }
            
            if (data && data.length > 0) {
                data.forEach(player => {
                    if (player.completed && player.completed.length > 0) {
                        player.completed.forEach(score => {
                            if (score.level) {
                                score.level = score.level.replace(/\t/g, ' ').trim().replace(/\s+/g, ' ');
                            }
                        });
                    }
                });
            }
            
            this.leaderboard = data || [];
            this.err = err || [];
            
            if (this.isMobile) {
                this.mobileView = 'list';
            }
            
            localStorage.removeItem('selectedPlayerIndex');
            
            this.loading = false;
            console.log('Leaderboard loaded:', this.leaderboard.length, 'entries');
            
            window.addEventListener('resize', this.handleResize);
            
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            this.err = ['Failed to load leaderboard. Check console for details.'];
            this.leaderboard = [];
            this.loading = false;
        }
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.handleResize);
    }
};
