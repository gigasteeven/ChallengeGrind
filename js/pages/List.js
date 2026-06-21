import { store } from "../main.js";
import { embed, getYoutubeIdFromUrl } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList, fetchUserCountries } from "../content.js";

import Spinner from "../components/Spinner.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { Spinner },
    template: `
        <div v-if="loading" class="page-list" style="display:flex;align-items:center;justify-content:center;">
            <Spinner></Spinner>
        </div>
        <div v-else class="page-list" :class="{ 'mobile-list-view': mobileView === 'list', 'mobile-level-view': mobileView === 'level', 'mobile-rules-view': mobileView === 'rules' }">
            <!-- Список уровней -->
            <div class="list-container" v-show="mobileView === 'list'">
                <button class="mobile-rules-btn" v-if="isMobile" @click="showRules">
                    <span class="rules-btn-icon">📋</span> Правила
                </button>
                <div class="list">
                    <div v-for="([level, err], i) in list" 
                         :key="i"
                         :class="['level-row', { 'active': selected == i && !isMobile, 'error': !level }]"
                         @click="selectLevel(i)">
                        <span class="level-rank">
                            <span v-if="i + 1 <= 150">#{{ i + 1 }}</span>
                            <span v-else>Legacy</span>
                        </span>
                        <span class="level-name">{{ level ? level.name : 'Error (' + err + '.json)' }}</span>
                    </div>
                </div>
            </div>
            
            <!-- Карточка уровня -->
            <div class="level-container" v-show="mobileView === 'level' || !isMobile">
                <button class="mobile-back-btn" 
                        v-if="isMobile" 
                        @click="goBackToList"
                        @touchstart="onTouchStart"
                        @touchend="onTouchEnd"
                        @touchcancel="onTouchCancel"
                        @contextmenu="onContextMenu">
                    <span>←</span> Back to List
                </button>
                
                <div class="level-scroll" v-if="level">
                    <div class="level-header">
                        <div class="level-title-wrap">
                            <span class="level-rank-large" :class="{ 'legacy': currentRankLegacy }">{{ currentRankDisplay }}</span>
                            <span class="level-title">{{ level.name }}</span>
                        </div>
                        <div class="level-publisher" v-if="level.author" :style="isMobile ? 'margin-left: 0.95rem !important; display: block !important;' : ''">by {{ level.author }}</div>
                    </div>
                    
                    <!-- ===== ВИДЕО ИЛИ ПЛАШКА ===== -->
                    <div v-if="isTelegramLink(level.verification)" class="video-placeholder" @click="openVerificationLink(level.verification)">
                        <span class="placeholder-text">Watch Verification</span>
                    </div>
                    <iframe v-else-if="video" class="video" id="videoframe" :src="video" frameborder="0" allowfullscreen></iframe>
                    
                    <ul class="stats">
                        <li class="stat-points">
                            <div class="type-title-sm">Points</div>
                            <p>{{ getPoints() }}</p>
                        </li>
                        <li class="stat-id" @click="copyId(level.id)">
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                    </ul>
                    
                    <div class="records-wrapper">
                        <div class="records-header">
                            <h2>Records</h2>
                        </div>
                        
                        <div v-if="level.records && level.records.length > 0" class="records-list">
                            <div v-for="(record, idx) in level.records" :key="idx" class="record-item" :class="{ 'has-flag': countryCode(record.user) }" :style="flagStyle(record.user)">
                                <span class="record-percent">{{ record.percent }}%</span>
                                <a :href="record.link"
                                   target="_blank"
                                   class="record-user">{{ record.user }}</a>
                                <img v-if="record.mobile" class="record-mobile" :src="'/assets/phone-landscape' + (store.dark ? '-dark' : '') + '.svg'" alt="Mobile">
                            </div>
                        </div>
                        <p v-else class="no-records">No records yet</p>
                    </div>
                </div>
                <div v-else class="level-scroll" style="height: 100%; display: flex; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>
            
            <div class="meta-container" v-show="!isMobile || mobileView === 'rules'">
                <button class="mobile-back-btn"
                        v-if="isMobile"
                        @click="goBackToList"
                        @touchstart="onTouchStart"
                        @touchend="onTouchEnd"
                        @touchcancel="onTouchCancel"
                        @contextmenu="onContextMenu">
                    <span>←</span> Back to List
                </button>
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>

                    <!-- ===== ПРАВИЛА ===== -->
                    <div class="rules">
                        <div class="rules-tabs">
                            <button class="rules-tab" :class="{ active: activeRuleTab === 'general' }" @click="activeRuleTab = 'general'">Общие правила</button>
                            <button class="rules-tab" :class="{ active: activeRuleTab === 'submit' }" @click="activeRuleTab = 'submit'">Как предложить уровень?</button>
                            <button class="rules-tab" :class="{ active: activeRuleTab === 'record' }" @click="activeRuleTab = 'record'">Как отправить рекорд?</button>
                        </div>

                        <!-- Общие правила -->
                        <div class="rules-panel" v-show="activeRuleTab === 'general'">
                            <h3 class="rules-title">Общие правила</h3>
                            <ol class="rules-list">
                                <li>Без необоснованной токсичности</li>
                                <li>Без NSFW / NSFL контента</li>
                                <li>Не спамить</li>
                                <li>Не рекламить хуйню</li>
                            </ol>
                            <div class="rules-callout">
                                Все наказания индивидуальны!
                            </div>
                        </div>

                        <!-- Как предложить уровень -->
                        <div class="rules-panel" v-show="activeRuleTab === 'submit'">
                            <h3 class="rules-title">Как предложить уровень?</h3>
                            <p class="rules-intro">Пишем администратору листа, кидаем ID уровня вместе с видео-верифом по всем правилам ниже. Ваш уровень обязан соблюдать правила ниже:</p>
                            <h4 class="rules-subtitle">Правила принятия уровней в челлендж лист:</h4>
                            <ol class="rules-list">
                                <li>Ваш уровень должен быть построен участниками нашего сервера и проверен игроком, находящимся тут</li>
                                <li>Ваш уровень должен быть сложнее <strong>WOBN (135020844)</strong></li>
                                <li>Ваш уровень должен иметь смотрибельный декор, не созданный целиком с помощью шейдеров</li>
                                <li>Ваш уровень должен иметь оригинальный декор и геймплей</li>
                                <li>Длина вашего уровня должна составлять не более 29 секунд в игре (длина Tiny или Short)</li>
                                <li>Ваш уровень не должен быть полностью невидимым</li>
                                <li>Ваш уровень не должен более чем на 25% состоять из спамов и более чем на 75% из повторяющихся частей</li>
                                <li>Ваш уровень должен быть построен в классическом режиме</li>
                            </ol>
                            <div class="rules-note">
                                <span class="rules-note-label">P.S.</span>
                                Если вы увидели в топе уровень (или может даже не один) который не подходит по какому-то правилу (или может даже не одному!)) то не спешите пинать админов за некомпетентность, ведь скорей всего уровень который вы увидели был добавлен в топ до того, как то или иное правило вступило в силу. Если же уровень был добавлен в топ после создания какого-то правила, значит админ по какой-либо причине сделал исключение из правил, будь то идейность уровня или его сильная аура
                            </div>
                        </div>

                        <!-- Как отправить рекорд -->
                        <div class="rules-panel" v-show="activeRuleTab === 'record'">
                            <h3 class="rules-title">Как отправить рекорд?</h3>
                            <p class="rules-intro">Кидаем прохождение в тему ✅Футажи файлом или ссылкой на ютуб/медал и пингуем одного из экспоузеров (<strong>@mirpack19</strong> или <strong>@shadowstrafe</strong>). Если возникнут подозрения, мы можем попросить рау футаж, так что сохраняйте его, при его отсутствии прохождение будет отклонено/удалено</p>
                            <h4 class="rules-subtitle">Правила принятия рекордов:</h4>
                            <ol class="rules-list">
                                <li>Наличие отчетливо слышимых кликов (Click Sounds НЕ являются кликами, и прохождения с ним без кликов будет считаться за кликбот/отсутствие кликов), счетчика кпс и чит индикатора во время попытки/на победном экране обязательно</li>
                                <li>Если ваш рау футаж содержит личную информацию, обрезаем его/удаляем звук и кидаем оригинальную запись в лс администратору листа вместе со своим ником на сайте…</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: 0,
        errors: [],
        roleIconMap: roleIconMap,
        store: store,
        mobileView: 'list',
        isMobile: window.innerWidth <= 768,
        savedScrollPosition: 0,
        activeElements: new Set(),
        activeRuleTab: 'general',
        countryMap: {},
    }),
    computed: {
        level() {
            if (!this.list || !this.list[this.selected]) return null;
            return this.list[this.selected][0];
        },
        video() {
            if (!this.level || !this.level.verification) return '';
            return embed(this.level.verification);
        },
        currentRankDisplay() {
            const index = this.selected + 1;
            if (index <= 150) return '#' + index;
            return 'Legacy';
        },
        currentRankLegacy() {
            return this.selected + 1 > 150;
        }
    },
    methods: {
        embed,
        score,
        getYoutubeIdFromUrl,
        getPoints() {
            const rank = this.selected + 1;
            if (!this.level) return 0;
            return score(rank, 100, this.level.percentToQualify);
        },
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
        isTelegramLink(url) {
            if (!url) return false;
            return url.includes('t.me/') || url.includes('telegram.org');
        },
        openVerificationLink(url) {
            if (url) {
                window.open(url, '_blank');
            }
        },
        selectLevel(index) {
            if (this.isMobile) {
                const container = document.querySelector('.list-container');
                if (container) this.savedScrollPosition = container.scrollTop;
            }
            this.selected = index;
            if (this.isMobile) {
                this.mobileView = 'level';
                localStorage.removeItem('selectedLevelIndex');
                setTimeout(() => {
                    const el = document.querySelector('.level-container');
                    if (el) el.scrollTop = 0;
                }, 50);
            } else {
                setTimeout(() => {
                    const el = document.querySelector('.level-scroll');
                    if (el) el.scrollTop = 0;
                }, 50);
            }
        },
        goBackToList() {
            this.mobileView = 'list';
            setTimeout(() => {
                const container = document.querySelector('.list-container');
                if (container && this.savedScrollPosition !== undefined) {
                    container.scrollTop = this.savedScrollPosition;
                }
                localStorage.removeItem('selectedLevelIndex');
            }, 50);
        },
        showRules() {
            const container = document.querySelector('.list-container');
            if (container) this.savedScrollPosition = container.scrollTop;
            this.mobileView = 'rules';
            setTimeout(() => {
                const el = document.querySelector('.meta-container');
                if (el) el.scrollTop = 0;
            }, 50);
        },
        onTouchStart(e) {
            const el = e.currentTarget;
            el.classList.add('btn-active');
            this.activeElements.add(el);
        },
        onTouchEnd(e) {
            const el = e.currentTarget;
            this.removeFromActive(el);
        },
        onTouchCancel(e) {
            const el = e.currentTarget;
            this.removeFromActive(el);
        },
        onContextMenu(e) {
            const el = e.currentTarget;
            this.removeFromActive(el);
            e.preventDefault();
        },
        removeFromActive(el) {
            if (el && el.classList) {
                el.classList.remove('btn-active');
            }
            this.activeElements.delete(el);
        },
        resetAllHighlights() {
            this.activeElements.forEach(el => {
                if (el && el.classList) {
                    el.classList.remove('btn-active');
                }
            });
            this.activeElements.clear();
        },
        copyId(id) {
            if (!id) return;
            const el = document.querySelector('.stat-id');
            if (!el) return;
            const pEl = el.querySelector('p');
            const originalText = pEl ? pEl.textContent : '';
            const originalColor = pEl ? pEl.style.color : '';

            navigator.clipboard.writeText(String(id)).then(() => {
                el.style.background = 'rgba(74, 222, 128, 0.15)';
                el.style.borderColor = '#4ade80';
                if (pEl) {
                    pEl.textContent = '✓ Copied!';
                    pEl.style.color = '#4ade80';
                }
                setTimeout(() => {
                    el.style.background = '';
                    el.style.borderColor = '';
                    if (pEl) {
                        pEl.textContent = originalText;
                        pEl.style.color = originalColor || '';
                    }
                }, 800);
            }).catch(() => {
                const range = document.createRange();
                const textNode = pEl ? pEl.firstChild : el;
                if (textNode) {
                    range.selectNode(textNode);
                    window.getSelection().removeAllRanges();
                    window.getSelection().addRange(range);
                    document.execCommand('copy');
                    window.getSelection().removeAllRanges();
                }
                el.style.background = 'rgba(74, 222, 128, 0.15)';
                el.style.borderColor = '#4ade80';
                if (pEl) {
                    pEl.textContent = '✓ Copied!';
                    pEl.style.color = '#4ade80';
                }
                setTimeout(() => {
                    el.style.background = '';
                    el.style.borderColor = '';
                    if (pEl) {
                        pEl.textContent = originalText;
                        pEl.style.color = originalColor || '';
                    }
                }, 800);
            });
        },
        handleResize() {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;
            if (wasMobile && !this.isMobile) this.mobileView = 'level';
            if (!wasMobile && this.isMobile) this.mobileView = 'list';
        }
    },
    async mounted() {
        try {
            this.list = await fetchList();
            this.editors = await fetchEditors();
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
            if (this.list && this.list.length > 0) {
                if (this.isMobile) this.mobileView = 'list';
                localStorage.removeItem('selectedLevelIndex');
            }
            if (!this.list) {
                this.errors = ["Failed to load list. Retry in a few minutes or notify list staff."];
            } else {
                for (let i = 0; i < this.list.length; i++) {
                    if (this.list[i] && this.list[i][1]) {
                        this.errors.push("Failed to load level. (" + this.list[i][1] + ".json)");
                    }
                }
                if (!this.editors) this.errors.push("Failed to load list editors.");
            }
            window.addEventListener('resize', this.handleResize);

            document.addEventListener('touchend', this.resetAllHighlights);
            document.addEventListener('touchcancel', this.resetAllHighlights);
        } catch (err) {
            console.error("Error loading data:", err);
            this.errors.push("Failed to load data. Check console for details.");
        } finally {
            this.loading = false;
        }
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.handleResize);
        document.removeEventListener('touchend', this.resetAllHighlights);
        document.removeEventListener('touchcancel', this.resetAllHighlights);
    }
};
