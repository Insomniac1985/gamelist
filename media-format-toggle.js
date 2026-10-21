/** One shared three-state format control for Gamelist and collection browsing. */
const controls = new WeakMap();
const modes = ["physical", "digital", "all"];
const labels = { physical: "Physical", digital: "Digital", all: "All" };
const css = `
.unified-media-toggle { display:flex; align-items:center; }
.unified-media-toggle > .media-format-toggle {
  display:grid; place-items:center; box-sizing:border-box;
  width:var(--toolbar-control-height,42px); min-width:var(--toolbar-control-height,42px);
  height:var(--toolbar-control-height,42px); min-height:var(--toolbar-control-height,42px);
  margin:0; padding:9px; color:#fff; flex:0 0 auto;
}
.media-format-toggle > img, .media-format-toggle > svg, .media-format-toggle > .media-format-all-icon {
  display:block; width:22px; height:22px; flex:0 0 22px; margin:0;
}
.media-format-toggle > svg { fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
.media-format-toggle > .media-format-all-icon {
  background:#fff; -webkit-mask:url('/assets/Icon.png') center/contain no-repeat;
  mask:url('/assets/Icon.png') center/contain no-repeat;
}
`;

export function syncMediaFormatToggle(root, { value = "all", icon, translate = key => key, onChange }) {
  if (!root) return;
  const scope = root.getRootNode();
  if (!scope.querySelector('style[data-media-format-toggle]')) {
    const style = root.ownerDocument.createElement("style");
    style.dataset.mediaFormatToggle = "";
    style.textContent = css;
    (scope.head || scope).append(style);
  }
  let control = controls.get(root);
  if (!control) {
    const button = root.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "icon-button view-toggle media-format-toggle";
    root.removeAttribute("role");
    root.removeAttribute("aria-label");
    root.replaceChildren(button);
    control = { button };
    controls.set(root, control);
    button.addEventListener("click", () => {
      const current = controls.get(root);
      current.onChange?.(modes[(modes.indexOf(current.value) + 1) % modes.length]);
    });
  }
  control.value = modes.includes(value) ? value : "all";
  control.onChange = onChange;
  const next = modes[(modes.indexOf(control.value) + 1) % modes.length];
  const currentLabel = translate(labels[control.value]);
  const nextLabel = translate(labels[next]);
  control.button.dataset.media = control.value;
  control.button.title = `${currentLabel} → ${nextLabel}`;
  control.button.setAttribute("aria-label", `${translate("Collection format")}: ${currentLabel}. ${translate("Switch to {format}", { format: nextLabel })}`);
  control.button.innerHTML = control.value === "all"
    ? '<span class="media-format-all-icon" aria-hidden="true"></span>'
    : icon(control.value);
}
