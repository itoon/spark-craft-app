// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  modules: ["@nuxt/ui", "@nuxtjs/ionic"],
  ssr: false,
  // Disable Ionic's basic CSS (normalize + structure + typography) globally —
  // those rules override Tailwind's resets on html/body/headings and break the
  // editor layout.  core.css is safe (only sets ion-* CSS variables).
  // Basic CSS is loaded only on the /ionic-test page via layouts/ionic.vue.
  ionic: {
    css: {
      core: true,
      basic: false,
      utilities: false,
    },
  },
  css: ["~/assets/css/main.css"],
  devtools: { enabled: true },
  devServer: {
    host: "0.0.0.0",
    port: 3000,
  },
});
