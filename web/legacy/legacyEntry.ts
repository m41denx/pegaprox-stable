/**
 * Entry for esbuild: concatenates the historical SPA modules in build order.
 * Relies on React / ReactDOM globals (UMD) loaded by the legacy shell before this runs.
 */
// @ts-nocheck

import "./constants.js";
import "./translations.js";
import "./contexts.js";
import "./auth.js";
import "./icons.js";
import "./ui.js";
import "./datacenter.js";
import "./security.js";
import "./storage.js";
import "./networking.js";
import "./tables.js";
import "./vm_modals.js";
import "./vm_config.js";
import "./node_modals.js";
import "./create_modals.js";
import "./settings_modal.js";
import "./dashboard.js";
