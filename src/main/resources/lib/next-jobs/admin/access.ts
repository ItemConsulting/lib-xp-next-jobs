import { createRole, getPrincipal, hasRole } from "/lib/xp/auth";
import { run } from "/lib/xp/context";
import { localize } from "/lib/xp/i18n";

/* ============================================================================
 * Who may use the admin tool.
 *
 * An administrator of XP may do everything. So that the tool can be handed to
 * the people who work with the positions, there is a role for it as well. The
 * role sets everything but the link to Next: the calls carry the API key, so
 * whoever sets the address decides where the key is sent, and that stays with
 * the administrators.
 *
 * The app lists the role in the descriptor of its tool, next to system.admin.
 * A user also needs the role that lets them log in to the admin
 * (system.admin.login), and read access to the site to find it in the tool.
 * ========================================================================== */

const ADMIN_ROLE = "system.admin";

/**
 * The role of the tool. Named after the app, so two apps with the tool on one
 * XP don't share it. In a descriptor it is `role:<the app's name>.next-jobs`
 */
export const TOOL_ROLE = `${app.name}.next-jobs`;

const LOCALE = "no";
const BUNDLES = ["i18n/next-jobs"];

/** May open the tool and change what the site shows */
export function canUseTool(): boolean {
  return hasRole(ADMIN_ROLE) || hasRole(TOOL_ROLE);
}

/** May set the address of Next and the API key: where the key is sent, and the key itself */
export function canSetConnection(): boolean {
  return hasRole(ADMIN_ROLE);
}

/**
 * Makes the role on app start, when it isn't there. On a cluster another node
 * can get there first, which is fine. Who has the role is set in the «Users»
 * app, and is never changed from here
 */
export function initToolRole(): void {
  try {
    run({ repository: "system-repo", branch: "master", principals: [`role:${ADMIN_ROLE}`] }, () => {
      if (getPrincipal(`role:${TOOL_ROLE}`)) {
        return;
      }

      createRole({
        name: TOOL_ROLE,
        displayName: phrase("tool.role.displayName"),
        description: phrase("tool.role.description"),
      });
      log.info("next-jobs-tool: created the role %s", TOOL_ROLE);
    });
  } catch (e) {
    log.error("next-jobs-tool: could not make the role %s: %s", TOOL_ROLE, String(e));
  }
}

function phrase(key: string): string {
  return localize({ key, locale: LOCALE, bundles: BUNDLES });
}
