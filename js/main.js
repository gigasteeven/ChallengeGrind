import routes from './routes.js';

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
});

const app = Vue.createApp({
    data: () => ({ store }),
});

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

window.__VUE_ROUTER__ = router;

app.use(router);
app.mount('#app');

console.log('ChallengeGrind app mounted!');

// ===== УБИРАЕМ ВСЕ ГЛОБАЛЬНЫЕ СБРОСЫ =====
// Теперь выделение управляется через pointerdown / pointerup в компонентах
