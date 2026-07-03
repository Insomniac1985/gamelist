export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es-ES", label: "Español (España)" },
];

const STRINGS = {
  "es-ES": {
    "Site settings": "Ajustes del sitio",
    "Shelf settings": "Ajustes de la estantería",
    Settings: "Ajustes",
    Save: "Guardar",
    Close: "Cerrar",
    Page: "Página",
    Details: "Detalles",
    "PlayStation account": "Cuenta de PlayStation",
    "Microsoft account": "Cuenta de Microsoft",
    "Steam account": "Cuenta de Steam",
    Currency: "Moneda",
    Region: "Región",
    Language: "Idioma",
    "Default owner": "Propietario predeterminado",
    Stores: "Tiendas",
    "CSV data": "Datos CSV",
    Search: "Buscar",
    Platform: "Plataforma",
    Category: "Categoría",
    Order: "Orden",
    Preordered: "Reservado",
    "All platforms": "Todas las plataformas",
    "All categories": "Todas las categorías",
    "All regions": "Todas las regiones",
    "All conditions": "Todos los estados",
    Condition: "Estado",
    "Available now": "Disponible ahora",
    Upcoming: "Próximamente",
    Backlog: "Pendientes",
    "Currently Playing": "Jugando ahora",
    "Last Finished": "Último terminado",
    Achievements: "Logros",
    Calendar: "Calendario",
    Highlights: "Resumen",
    Gamelist: "Lista de juegos",
    Shelf: "Estantería",
    "New additions": "Nuevas incorporaciones",
    "Physical games": "Juegos físicos",
    Platforms: "Plataformas",
    "Estimated value": "Valor estimado",
    "Last edit": "Última edición",
    "Last edit -": "Última edición -",
    "Fetch New Prices": "Actualizar precios",
    "Fetch New Data": "Actualizar datos",
    "Stop Editing": "Dejar de editar",
    Edit: "Editar",
    "Sort ascending": "Orden ascendente",
    "Sort descending": "Orden descendente",
    "Add Game": "Añadir juego",
    "Edit Game": "Editar juego",
    "No description yet.": "Sin descripción todavía.",
    "No completed games tracked yet.": "Aún no hay juegos completados.",
    COMPLETED: "COMPLETADOS",
    TROPHIES: "TROFEOS",
    ACHIEVEMENTS: "LOGROS",
    "Loading earned trophies...": "Cargando trofeos obtenidos...",
    "Could not load trophies right now.": "No se pudieron cargar los trofeos ahora.",
    "Loading earned achievements...": "Cargando logros obtenidos...",
    "Could not load achievements right now.": "No se pudieron cargar los logros ahora.",
    Custom: "Personalizado",
    "Default order": "Orden predeterminado",
    "Default list order": "Orden predeterminado de la lista",
    "Finished Games": "Juegos terminados",
    "Move up": "Subir",
    "Move down": "Bajar",
    "Move {title} up": "Subir {title}",
    "Move {title} down": "Bajar {title}",
    Time: "Tiempo",
    Playtime: "Tiempo jugado",
    Name: "Nombre",
    Value: "Valor",
    "Last added": "Último añadido",
    Visible: "Visible",
    Hidden: "Oculto",
    Fixed: "Fijo",
    Show: "Mostrar",
    Hide: "Ocultar",
    Enabled: "Activado",
    Prices: "Precios",
    "Prices {current}/{total}": "Precios {current}/{total}",
    "Fetching prices for {count} games...": "Actualizando precios de {count} juegos...",
    "Checking {current}/{total}": "Comprobando {current}/{total}",
    "Updated prices for {updated} games{failed}.": "Precios actualizados para {updated} juegos{failed}.",
    ", {count} failed": ", {count} fallidos",
    "Show prices": "Mostrar precios",
    "Show Prices": "Mostrar precios",
    Export: "Exportar",
    Import: "Importar",
    "Shelf Sync": "Sincronizar Shelf",
    Complete: "Completo",
    "Complete +": "Completo +",
    Loose: "Suelto",
    Sealed: "Precintado",
    Game: "Juego",
    Manual: "Manual",
    Box: "Caja",
    Other: "Otro",
    Released: "Lanzamiento",
    Added: "Añadido",
    "Physical edition": "Edición física",
    "Add to Collection": "Añadir a colección",
    "Add to Backlog": "Añadir a pendientes",
    Delete: "Eliminar",
    "Try another filter or search.": "Prueba otro filtro o búsqueda.",
    "Clear filters": "Borrar filtros",
    "Game, platform, store, status...": "Juego, plataforma, tienda, estado...",
    "Game, publisher, genre...": "Juego, editora, género...",
    "Xbox gamertag or XUID": "Gamertag de Xbox o XUID",
    "SteamID64, profile URL, or vanity name": "SteamID64, URL del perfil o nombre personalizado",
    Spain: "España",
    Italy: "Italia",
    "United States": "Estados Unidos",
    UK: "Reino Unido",
  },
};

export function normalizeLanguage(value) {
  return LANGUAGES.some((language) => language.value === value) ? value : "en";
}

export function t(language, key, values = {}) {
  const normalized = normalizeLanguage(language);
  const template = STRINGS[normalized]?.[key] || key;
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
}

export function languageOptions(selected = "en", escape = escapeHtmlFallback) {
  const value = normalizeLanguage(selected);
  return LANGUAGES.map((language) => `<option value="${escape(language.value)}" ${language.value === value ? "selected" : ""}>${escape(language.label)}</option>`).join("");
}

export function applyDocumentTranslations(language, root = document) {
  const normalized = normalizeLanguage(language);
  root.documentElement?.setAttribute("lang", normalized === "es-ES" ? "es-ES" : "en");
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(normalized, node.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.title = t(normalized, node.dataset.i18nTitle);
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(normalized, node.dataset.i18nAriaLabel));
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(normalized, node.dataset.i18nPlaceholder));
  });
}

function escapeHtmlFallback(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}
