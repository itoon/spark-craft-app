// https://nuxt.com/docs/api/configuration/nuxt-config
import { randomBytes } from "node:crypto";

// In `nuxt dev`, Nitro answers from a worker behind an internal proxy, so the
// app can't see who connected (and x-forwarded-for can be faked by the client).
// The outer server stamps every request with the real address + this secret;
// server/utils/localOnly.ts trusts only stamps carrying it. Env is inherited by
// the Nitro worker.
const clientStampToken = (process.env.CODECRAFT_CLIENT_STAMP ||= randomBytes(16).toString("hex"));

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  hooks: {
    listen(server) {
      server.prependListener("request", (req) => {
        req.headers["x-codecraft-client"] = `${clientStampToken} ${req.socket.remoteAddress ?? ""}`;
      });
    },
  },
  modules: ["@nuxt/ui", "@nuxtjs/ionic"],
  ssr: false,
  // scripts/build-apk.sh builds into its own folder so a running dev server
  // is never disturbed
  buildDir: process.env.CODECRAFT_BUILD_DIR || ".nuxt",
  // Disable Ionic's basic CSS (normalize + structure + typography) globally —
  // those rules override Tailwind's resets on html/body/headings and break the
  // editor layout.  core.css is safe (only sets ion-* CSS variables).
  // Basic CSS is loaded only on the /ionic-test page via layouts/ionic.vue.
  css: ["~/assets/css/main.css"],
  ionic: {
    css: {
      core: true,
      basic: false,
      utilities: true,
    },
  },
  devtools: { enabled: true },
  runtimeConfig: {
    public: {
      // Set NUXT_PUBLIC_CODECRAFT_EMBEDDED=1 when building the APK player
      // (scripts/build-apk.sh): the app then opens straight into /app.
      codecraftEmbedded: "",
      // Set NUXT_PUBLIC_CODECRAFT_WEB=1 for the GitHub Pages build: no server,
      // so APK / Share / Live (มือถือ) / Export are hidden (useEdition).
      codecraftWeb: "",
    },
  },
  devServer: {
    host: "0.0.0.0",
    port: 3000,
  },
});
