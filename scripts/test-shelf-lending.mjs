import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { isMainOwnerGame } from '../game-editor-controls.js';

const source = readFileSync(new URL('../collection-ui.js', import.meta.url), 'utf8');
const lending = source.slice(source.indexOf('function canLendShelfGame('), source.indexOf('function visibleShelfCardOwners('));
let dialog;
let saveSucceeds = true;
let renders = 0;
const state = { canEdit: true, gamelistSettings: { defaultOwner: "User" }, additions: [{ id: 'one', title: 'Test game' }], overrides: {} };
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const context = vm.createContext({
  state, Map, Date, String, isMainOwnerGame,
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
const physicalMeta = context.physicalShelfIdentityMeta({ title: 'Test game', platform: 'PS5', country: 'UK' });
assert.ok(physicalMeta.indexOf('region-flag') < physicalMeta.indexOf('PS5'));
assert.ok(physicalMeta.indexOf('PS5') < physicalMeta.indexOf('Complete'));
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
const appSource = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const shelfRecord = { id: 'shelf-one', gamelistId: 'list-one', lentTo: 'Judy' };
let returnedId;
const backlogContext = vm.createContext({
  isMainOwnerGame,
  state: { canEdit: true, settings: {} },
  collectionData: { games: [shelfRecord] },
  collectionUI: { returnLentGame: id => { returnedId = id; } },
  ensureCollectionWorkspace: async () => {},
  ownerCardColorClass: name => `owner-color-card-${name.toLowerCase()}`,
  escapeHtml, tt: (value, args = {}) => value.replace(/\{(\w+)\}/g, (_, key) => args[key]),
  ownerColorClass: name => `owner-color-${name.toLowerCase()}`,
  collectionAddIcon: () => '<svg class="collection-arrow"></svg>',
  playIcon: () => '<svg class="play-icon"></svg>',
  backlogStreamAction: () => '',
});
vm.runInContext(appSource.slice(appSource.indexOf('let collectionRecordSnapshot = null;'), appSource.indexOf('function collectionRecordValue(')), backlogContext);
vm.runInContext(appSource.slice(appSource.indexOf('function rowPrimaryAction('), appSource.indexOf('function backlogStreamAction(')), backlogContext);
const backlogGame = { id: 'list-one', section: 'backlog' };
assert.equal(backlogContext.lentCollectionRecordFor(backlogGame).id, 'shelf-one');
assert.match(backlogContext.backlogLentBadge(backlogGame), /Lent to Judy/);
assert.match(backlogContext.rowPrimaryAction(backlogGame, 'backlog'), /Get back/);
assert.doesNotMatch(backlogContext.rowPrimaryAction(backlogGame, 'backlog'), /play-icon/);
assert.equal(backlogContext.lentCollectionRecordFor({ ...backlogGame, digital: true }), null);
assert.equal(backlogContext.lentCollectionRecordFor({ ...backlogGame, section: 'wanted' }), null);
assert.equal(backlogContext.lentCollectionRecordFor({ id: 'unlinked', section: 'backlog' }), null);
const classes = new Set(['game-card', 'owner-color-card-original']);
backlogContext.applyBacklogLendingStyle({ classList: { [Symbol.iterator]: () => classes.values(), remove: (...names) => names.forEach(name => classes.delete(name)), add: (...names) => names.forEach(name => classes.add(name)) } }, backlogGame);
assert.ok(classes.has('lent-card'));
assert.ok(classes.has('owner-color-card-judy'));
assert.ok(!classes.has('owner-color-card-original'));
await backlogContext.returnLentBacklogGame(backlogGame);
assert.equal(returnedId, 'shelf-one');
shelfRecord.lentTo = '';
assert.equal(backlogContext.lentCollectionRecordFor(backlogGame), null);
assert.equal(backlogContext.backlogLentBadge(backlogGame), '');
assert.match(backlogContext.rowPrimaryAction(backlogGame, 'backlog'), /play-icon/);
console.log('Linked Backlog lending checks passed.');
backlogContext.normalizeGameRecords = games => games;
backlogContext.persistLocal = () => {};
backlogContext.collectionDataSignature = '';
vm.runInContext(appSource.slice(appSource.indexOf('function applyCommittedCollectionChange('), appSource.indexOf('function ensureCollectionWorkspace(')), backlogContext);
assert.equal(backlogContext.applyCommittedCollectionChange(), false);
const justSavedGames = [{ id: 'new-backlog', section: 'backlog', shelfId: 'shelf-one' }];
assert.equal(backlogContext.applyCommittedCollectionChange({ games: justSavedGames }), true);
assert.equal(backlogContext.state.games[0].id, 'new-backlog', 'Shelf additions must update the main game list immediately');
const savedShelf = { games: [{ ...shelfRecord, lentTo: 'Alex' }] };
assert.equal(backlogContext.applyCommittedCollectionChange({ shelf: savedShelf }), true);
assert.equal(backlogContext.lentCollectionRecordFor(justSavedGames[0]).lentTo, 'Alex', 'Saved lending data must invalidate the linked Shelf lookup immediately');
backlogContext.applyCommittedCollectionChange({ shelf: { games: [{ ...shelfRecord, lentTo: '' }] } });
assert.equal(backlogContext.lentCollectionRecordFor(justSavedGames[0]), null);
assert.match(backlogContext.rowPrimaryAction(justSavedGames[0], 'backlog'), /play-icon/);
console.log('Immediate Shelf-to-Backlog updates passed.');

assert.equal(isMainOwnerGame({ owners: ['Judy'] }, 'User'), false);
assert.equal(isMainOwnerGame({ owners: [' user '] }, 'User'), true);
assert.equal(isMainOwnerGame({ owners: [] }, 'User'), true);
assert.equal(isMainOwnerGame({ owners: ['Judy', 'User'] }, 'User'), true);
assert.equal(context.lendButton({ owners: ['Judy'] }), '');
assert.equal(context.lentBadge({ owners: ['Judy'], lentTo: 'Alex' }), '');
assert.equal(context.shelfLentCountPill([{ owners: ['Judy'], lentTo: 'Alex' }]), '');
backlogContext.applyCommittedCollectionChange({ shelf: { games: [{ ...shelfRecord, owners: ['Judy'], lentTo: 'Alex' }] } });
assert.equal(backlogContext.lentCollectionRecordFor(justSavedGames[0]), null);
console.log('Main-owner lending restrictions passed.');
