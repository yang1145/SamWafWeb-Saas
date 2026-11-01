import NProgress from 'nprogress';
import 'nprogress/nprogress.css';
import router from '@/router';
import i18n from '@/i18n';
import { watchEffect } from 'vue';
import { adminTitles } from '@/utils/adminTitles';
import { getBrandName } from '@/config/brand';

NProgress.configure({ showSpinner: false });

const whiteList = ['/login'];

watchEffect(() => {
  const titleKey = router.currentRoute.value.meta?.title;
  if (adminTitles.admin_title) {
    document.title = adminTitles.admin_title;
  } else if (titleKey) {
    // 动态 key 场景下收窄函数签名，避免泛型推导过深。
    const translate = (i18n.global as unknown as { t: (key: string) => string }).t;
    document.title = `${translate(titleKey)} - ${getBrandName()}`;
  }
});

router.beforeEach((to, _from, next) => {
  NProgress.start();
  const token = localStorage.getItem('access_token');
  if (token) {
    if (to.path === '/login') {
      next({ path: '/' });
    } else {
      next();
    }
  } else if (whiteList.includes(to.path)) {
    next();
  } else {
    next(`/login?redirect=${encodeURIComponent(to.fullPath)}`);
  }
});

router.afterEach(() => {
  NProgress.done();
});
