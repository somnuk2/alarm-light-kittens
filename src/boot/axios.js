import { defineBoot } from '#q-app/wrappers'
import axios from 'axios'

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
// Use environment variable for API base URL (production vs development)
// Use environment variable for API base URL (production vs development)
// Note: In Quasar webpack mode, process.env is often used, but import.meta.env is for Vite.
// Since you had a syntax error with import.meta before (likely due to Webpack config),
// let's use process.env which Quasar Webpack supports by default for env vars defined in quasar.config.js or dotenv.
// However, the previous error "Cannot use 'import.meta' outside a module" suggests the file wasn't treated as a module during some step.
// But standard Quasar/Vue 3 project usually supports import.meta.env if using Vite or properly configured Webpack.
// Given the error, let's try a safer approach compatible with both or rely on the standard Quasar way.

// Let's stick to the standard way that was there but ensure it works.
const baseURL = process.env.NODE_ENV === 'production'
  ? ''
  : (process.env.VITE_API_BASE_URL || 'http://localhost:3000');
const api = axios.create({ baseURL })

export default defineBoot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API
})

export { api }
