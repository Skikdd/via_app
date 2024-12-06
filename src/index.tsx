import '@webscopeio/react-textarea-autocomplete/style.css';
import { createRoot } from 'react-dom/client';
import Root from './containers/Root';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import './app.global.css';
import {
  getLanguageNameFormStroe,
  getThemeModeFromStore,
  getThemeNameFromStore,
} from './utils/device-store';
import { updateCSSVariables } from './utils/color-math';
import { THEMES } from './utils/themes';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';

import enTranslation from './constants/en.json'
import zhCNTranslation from './constants/zh-CN.json'

const { MODE } = import.meta.env;

Sentry.init({
  dsn: 'https://1083464e2a864de791972ab8c976849a@o4504817817747456.ingest.sentry.io/4504817834655749',
  integrations: [new BrowserTracing()],
  tracesSampleRate: 1.0,
  normalizeDepth: 10,
  environment: MODE,
});

const i18nConfig = {
  lng: getLanguageNameFormStroe() || navigator.language,
  fallbackLng: 'en',
  resources: {
    "en": {
      translation: enTranslation,
    },
    "zh-CN": {
      translation: zhCNTranslation,
    },
  },
};

i18n.init(i18nConfig);

const appInsights = new ApplicationInsights({
  config: {
    instrumentationKey: 'b3c046b8-137c-47f3-b28d-9049abfa9fe8',
    /* ...Other Configuration Options... */
  },
});
appInsights.loadAppInsights();
appInsights.trackPageView(); // Manually call trackPageView to establish the current user/session/pageview
const elem = document.getElementById('root');
if (elem) {
  const root = createRoot(elem);
  root.render(
    <I18nextProvider i18n={i18n}>
      <Root />
    </I18nextProvider>
  );
  document.documentElement.dataset['themeMode'] = getThemeModeFromStore();
  updateCSSVariables(getThemeNameFromStore() as keyof typeof THEMES);
}
