import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../collection-ui.js', import.meta.url), 'utf8');
const lending = source.slice(source.indexOf('function canLendShelfGame('), source.indexOf('function visibleShelfCardOwners('));
let dialog;
let saveSucceeds = true;
let renders = 0;
const state = { canEdit: true, additions: [{ id: 'one', title: 'Test game' }], overrides: {} };
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const context = vm.createContext({
  state, Map, Date, String,
  isDigitalShelfGame: game => Boolean(game?.digital || game?.dlc),
  isPendingCollectionGame: game => Boolean(game?.pendingCollection),
  svgAsset: name => `<svg data-asset="${name}"></svg>`,
  escapeHtml,
  platformBadge: platform => `<span>${platform || 'PS5'}</span>`,
  flagIcon: country => `<img alt="${country}">`,
  conditionBadge: condition => `<span>${condition}</span>`,
  conditionLabel: () => 'Complete',
  coverUrl: value => value,
  platformFallback: () => "/platform.png",
  tt: (value, args = {}) => value.replace(/\{(\w+)\}/g, (_, key) => args[key]),
  ownerColorClass: name => `owner-color-${name.toLowerCase()}`,
  canonicalOwner: value => value.trim(),
  stripRuntimeFields: ({ sourceRecord, ...game }) => game,
  persistShelf: async () => saveSucceeds,
  rebuildGames: () => {}, renderAll: () => renders++,
  openDialog: node => { node.open = true; },
  closeDialog: node => { node.open = false; },
  document: {
    body: { append: node => { dialog = node; }, classList: { toggle() {} } },
    querySelector: () => null,
    createElement: () => {
      const input = { value: '', reportValidity() {} };
      const submit = { disabled: false };
      const error = { hidden: true };
      const form = { addEventListener: (_, handler) => { form.submit = handler; } };
      return { input, submit, error, form, setAttribute() {}, addEventListener() {}, querySelectorAll: () => [],
        querySelector: selector => ({ input, '[type=submit]': submit, '[role=alert]': error, form })[selector] };
    },
  },
});
vm.runInContext(lending, context);
assert.equal(context.shelfLentCountPill(state.additions), '');
assert.match(context.lendButton(state.additions[0]), /data-action="lend"/);
context.openLendingDialog(state.additions[0]);
dialog.input.value = '  Judy  ';
await dialog.form.submit({ preventDefault() {} });
assert.equal(state.additions[0].lentTo, 'Judy');
assert.equal(dialog.open, false);
assert.equal(renders, 1);
assert.match(context.lentBadge(state.additions[0]), /Lent to Judy/);
assert.match(context.shelfLendingSearchText(state.additions[0]), /lent borrow borrowed Judy/);
assert.equal(context.shelfLendingSearchText({ lentTo: '' }), '');
assert.equal(context.shelfLendingSearchText({ lentTo: '  ' }), '');
assert.equal(context.shelfLendingSearchText({ lentTo: 'Judy', digital: true }), '');
assert.match(context.lendButton(state.additions[0]), /data-action="returned"/);
assert.match(context.lendButton(state.additions[0]), /icons\/actions\/forward-2/);
assert.match(context.lendButton(state.additions[0]), /Get back/);
const pill = context.shelfLentCountPill([state.additions[0], { lentTo: 'Judy' }, { lentTo: '<Alex>' }]);
assert.match(pill, /3 Lent/);
assert.match(pill, /icons\/actions\/lend-hand/);
assert.match(pill, /<strong>Judy<\/strong><em>2<\/em>/);
assert.match(pill, /&lt;Alex>/);
context.openLendingDialog(state.additions[0]);
assert.equal(state.additions[0].lentTo, 'Judy', 'Opening return confirmation must not clear the borrower');
await dialog.form.submit({ preventDefault() {} });
assert.equal(state.additions[0].lentTo, '');
assert.equal(context.shelfLendingSearchText(state.additions[0]), '', 'Returned games must stop matching lending keywords');
assert.equal(context.shelfLentCountPill(state.additions), '');
const sourceGame = { id: 'imported', title: 'Imported game', sourceRecord: true };
context.openLendingDialog(sourceGame);
dialog.input.value = 'Alex';
await dialog.form.submit({ preventDefault() {} });
assert.equal(state.overrides.imported.lentTo, 'Alex');
assert.equal(state.overrides.imported.sourceRecord, undefined);
saveSucceeds = false;
context.openLendingDialog(state.additions[0]);
dialog.input.value = 'Failed save';
await dialog.form.submit({ preventDefault() {} });
assert.equal(state.additions[0].lentTo, '', 'Failed saves must restore the previous status');
assert.equal(dialog.error.hidden, false);
assert.equal(dialog.submit.disabled, false);
assert.equal(dialog.open, true);
for (const excluded of [{ digital: true }, { dlc: true }, { pendingCollection: true }, { preorderProjection: true }, { wishlistProjection: true }, { _gamelistProjection: true }]) {
  const game = { id: 'excluded', title: 'Not a physical Shelf game', lentTo: 'Judy', ...excluded };
  assert.equal(context.lendButton(game), '');
  assert.equal(context.lentBadge(game), '');
  assert.equal(context.shelfLentCountPill([game]), '');
  const previousDialog = dialog;
  context.openLendingDialog(game);
  assert.equal(dialog, previousDialog, 'Excluded games must not open a lending dialog');
}
assert.match(context.lendButton({ id: 'physical' }), /icons\/actions\/lend-hand/);
console.log('Shelf lending checks passed.');
