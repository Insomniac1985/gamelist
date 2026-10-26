// Keep previously saved theme URLs working after organizing the asset folders.
const legacyFolders = {
  "backdrop.png": "backgrounds",
  "backdrop_light.png": "backgrounds",
  "Icon.png": "branding",
  "Icon_shelf.png": "branding",
  "kh_icon.png": "branding",
  "shabii_logo.png": "branding",
  "app-Icon.png": "branding/app-icons",
  "app-Icon-bw.png": "branding/app-icons",
  "app-Icon-monochrome.png": "branding/app-icons",
  "kh_app-icon.png": "branding/app-icons",
  "kh_app-icon-monochrome.png": "branding/app-icons",
};

export function organizedAssetPath(pathname) {
  const name = pathname.startsWith("/assets/") ? pathname.slice(8) : "";
  return legacyFolders[name] ? `/assets/${legacyFolders[name]}/${name}` : pathname;
}
