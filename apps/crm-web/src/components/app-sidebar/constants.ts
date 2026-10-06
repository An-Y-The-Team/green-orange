// Plain module, NOT the "use client" sidebar file: a server component that
// imports a non-component export from a client module gets a client reference,
// not the value — the layout then read the wrong cookie and never collapsed.

/** Cookie the dashboard layout reads, so a collapsed sidebar renders collapsed
 *  on the server too — no flash of the wide sidebar on every navigation. */
export const SIDEBAR_COOKIE = "sidebar";
export const SIDEBAR_COLLAPSED = "collapsed";
