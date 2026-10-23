/** Always discard the document/router cache on private identity changes. */
export function navigateAfterSessionChange() {
  // A client-side router transition can preserve private RSC and component state.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/");
}
