import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'

import en from './en/translations'
import esES from './es-ES/translations'
import zhCN from './zh-CN/translations'
console.log(Localization.locale)
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  lng: Localization.locale,
  fallbackLng: 'en',
  resources: {
    // 'es-ES': {
    //   translation: esES,
    // },
    // 'zh-CN': {
    //   translation: zhCN,
    // },
    // 'zh-Hans-CN': {
    //   translation: zhCN,
    // },
    en: {
      translation: en,
    },
  },
})

export default i18n
