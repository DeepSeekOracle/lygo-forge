// Genex Studio's preview connects a game that loads the Genex SDK through this module. On the
// preview's own address the SDK runs in local test mode: no account and no network. Publishing
// to Genex replaces this module with one that names the game's project.
import { initEmbed } from "./embed-sdk/index.js";

const served = window.__GENEX__ ?? {};
initEmbed({
  slug: "studio-preview",
  apiUrl: served.apiUrl ?? "https://api.genex.games",
  dashboardOrigins: served.dashboardOrigins ?? ["https://genex.games"],
});
