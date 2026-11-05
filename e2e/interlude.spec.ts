import { mkdirSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { canChooseAdultChoice, getAdultChoices, previewCardPlay } from '../src/game/game';
import { simulateStory } from '../src/game/storySimulation';
import { ALL_ADULT_EVENTS, getLifeThreads } from '../src/game/story';
import type { GameState } from '../src/game/types';

const states: GameState[] = [];
simulateStory(2, { strategy: 'careful', onState: (state) => states.push(state) });
const checkpoint = states.find((state) => state.phase === 'interlude')!;
const outgoing = checkpoint.cards.find((card) => card.id === checkpoint.selectedDeck[0])!;
const incoming = checkpoint.cards.find((card) => !checkpoint.selectedDeck.includes(card.id))!;
const readSave = (page: Page): Promise<GameState> => page.evaluate(() => JSON.parse(localStorage.getItem('floating-life-cards.save.v7')!));
const packCard = (page: Page, title: string) => page.locator('.packing-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).getByRole('button');

async function capture(page: Page, name: string) {
  if (process.env.INTERLUDE_CAPTURE !== '1') return;
  mkdirSync('.impeccable/review/1.7', { recursive: true });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).map((image) => image.decode())); window.scrollTo(0, 0); });
  await page.screenshot({ path: `.impeccable/review/1.7/${name}.png`, fullPage: true });
}

for (const device of [
  { label: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { label: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { label: 'landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true },
]) {
  test.describe(`重新上路 ${device.label}`, () => {
    test.use({ viewport: device.viewport, isMobile: device.isMobile, hasTouch: device.hasTouch, contextOptions: { reducedMotion: 'reduce' } });
    test('换入旧记忆、刷新草稿、下一程再带回，结局保留实际选择', async ({ page }) => {
      test.setTimeout(120_000);
      await page.addInitScript((initial) => {
        if (sessionStorage.getItem('interlude-seeded')) return;
        localStorage.setItem('floating-life-cards.save.v7', JSON.stringify(initial));
        sessionStorage.setItem('interlude-seeded', 'true');
      }, checkpoint);
      await page.goto('/');
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      await expect(page.getByRole('heading', { name: '下一程，带上哪些自己' })).toBeVisible();
      await expect(page.getByRole('heading', { name: '陌生城市的押金', exact: true })).toBeVisible();
      await expect(page.locator('.packing-count')).toContainText('8 / 8');
      expect(await page.locator('html').evaluate((html) => html.scrollWidth)).toBeLessThanOrEqual(device.viewport.width);
      const actionBox = await page.locator('.packing-actions').boundingBox();
      const archiveBox = await page.locator('.packing-archive').boundingBox();
      expect(actionBox!.y + actionBox!.height).toBeLessThan(archiveBox!.y);
      await capture(page, `interlude-${device.label}`);

      await expect(packCard(page, incoming.title)).toBeDisabled();
      await expect(packCard(page, incoming.title)).toHaveCSS('opacity', '1');
      await packCard(page, outgoing.title).click();
      await expect(page.getByRole('button', { name: /^带上这八张牌/ })).toBeDisabled();
      await expect(packCard(page, incoming.title)).toBeEnabled();
      await page.reload();
      await expect(page.locator('.packing-count')).toContainText('7 / 8');
      const draft = await readSave(page);
      expect(draft.selectedDeck).toEqual(checkpoint.selectedDeck);
      expect(draft.encounter).toEqual(checkpoint.encounter);
      expect(draft.resources).toEqual(checkpoint.resources);
      expect(draft.rng).toBe(checkpoint.rng);
      await page.getByRole('button', { name: '恢复原来的八张' }).click();
      await expect(page.locator('.packing-count')).toContainText('8 / 8');
      await packCard(page, outgoing.title).click();
      await packCard(page, incoming.title).click();
      await expect(page.locator('.packing-actions')).toContainText('新带上 1 张');
      await expect(page.getByRole('status')).toContainText(incoming.title);
      await page.getByRole('button', { name: incoming.approach, exact: true }).click();
      await page.getByRole('link', { name: '整理好了，回到出发处' }).click();
      const departure = await page.getByRole('button', { name: /^带上这八张牌/ }).boundingBox();
      const appHeader = await page.locator('.app-header').boundingBox();
      expect(departure!.y).toBeGreaterThanOrEqual(appHeader!.y + appHeader!.height);
      expect(departure!.y + departure!.height).toBeLessThanOrEqual(device.viewport.height);
      await capture(page, `chosen-${device.label}`);
      await page.getByRole('button', { name: /^带上这八张牌/ }).click();
      await expect(page.locator('.app')).toHaveClass('app app--encounter');
      const entered = await readSave(page);
      expect(entered.selectedDeck).toContain(incoming.id);
      expect(entered.selectedDeck).not.toContain(outgoing.id);
      expect(entered.cards).toEqual(checkpoint.cards);
      expect(entered.cardExperience).toEqual(checkpoint.cardExperience);
      expect(entered.upgradedCards).toEqual(checkpoint.upgradedCards);
      expect(entered.deckRevisions).toHaveLength(1);
      await page.reload();
      await expect(page.locator('.app')).toHaveClass('app app--encounter');
      expect((await readSave(page)).encounter).toEqual(entered.encounter);

      for (let step = 0; step < 150; step += 1) {
        const state = await readSave(page);
        if (state.phase === 'ending') break;
        expect(await page.locator('html').evaluate((html) => html.scrollWidth)).toBeLessThanOrEqual(device.viewport.width);
        switch (state.phase) {
          case 'encounter': {
            const cards = state.encounter!.hand.map((id) => state.cards.find((card) => card.id === id)!);
            cards.sort((a, b) => previewCardPlay(state, b)!.playerScore - previewCardPlay(state, a)!.playerScore);
            await page.locator('.hand-option').filter({ has: page.getByRole('heading', { name: cards[0]!.title, exact: true }) }).getByRole('button', { name: /^唤起/ }).click();
            break;
          }
          case 'encounter-result': await page.locator('.encounter-result .primary-button').click(); break;
          case 'adult-event': {
            const choices = getAdultChoices(state).filter((choice) => canChooseAdultChoice(state, choice));
            choices.sort((a, b) => (b.changes.heart ?? 0) - (a.changes.heart ?? 0));
            await page.getByRole('button', { name: new RegExp(`^${choices[0]!.verb}`) }).click(); break;
          }
          case 'adult-result': await page.getByRole('button', { name: '继续往下生活' }).click(); break;
          case 'interlude':
            if (state.encounter!.chapterIndex === 1) {
              await packCard(page, incoming.title).click();
              await packCard(page, outgoing.title).click();
            }
            await page.getByRole('button', { name: /^带上这八张牌/ }).click(); break;
          default: throw new Error(`Unexpected phase ${state.phase}`);
        }
        await expect.poll(async () => JSON.stringify(await readSave(page))).not.toBe(JSON.stringify(state));
      }
      await expect(page.locator('.app')).toHaveClass('app app--ending');
      const ending = await readSave(page);
      expect(ending.chapterResults).toHaveLength(5);
      expect(ending.deckRevisions).toHaveLength(4);
      expect(getLifeThreads(ending)).toEqual([]);
      const lastEvent = ALL_ADULT_EVENTS.find((event) => event.id === ending.adultEventsResolved.at(-1))!;
      const lastChoice = lastEvent.choices.find((choice) => choice.id === ending.storyChoices[`adult:${lastEvent.id}`])!;
      await expect(page.locator('.ending-screen blockquote')).toContainText(lastEvent.title);
      await expect(page.locator('.ending-screen blockquote')).toContainText(lastChoice.verb);
      await page.reload();
      await expect(page.locator('.ending-screen blockquote')).toHaveText(ending.ending!.postscript);
      const history = page.getByRole('region', { name: '你曾这样重新上路' });
      await expect(history.locator('li')).toHaveCount(4);
      await expect(history.locator('li').nth(0)).toContainText(`带上 「${incoming.title}」`);
      await expect(history.locator('li').nth(1)).toContainText(`带上 「${outgoing.title}」`);
      await expect(history.locator('li').nth(2)).toContainText('保留了原来的八张');
      await capture(page, `ending-${device.label}`);
    });
  });
}

test('v6旧回响存档原位恢复，下一次转换出现整理入口', async ({ page }) => {
  const oldState = states.filter((state) => state.phase === 'adult-result' && state.encounter?.chapterIndex === 0).at(-1)!;
  const legacy: Record<string, unknown> = { ...oldState, version: 6 };
  delete legacy.deckDraft; delete legacy.deckRevisions;
  await page.addInitScript((initial) => localStorage.setItem('floating-life-cards.save.v6', JSON.stringify(initial)), legacy);
  await page.goto('/');
  await expect(page.locator('.app')).toHaveClass('app app--adult-result');
  await expect(page.getByRole('heading', { name: `你选择了：${oldState.adultEventResult!.choice}` })).toBeVisible();
  await page.getByRole('button', { name: '继续往下生活' }).click();
  await expect(page.locator('.app')).toHaveClass('app app--interlude');
  const current = await readSave(page);
  expect(current.deckRevisions).toEqual([]);
  expect(current.resources).toEqual(oldState.resources);
  expect(current.selectedDeck).toEqual(oldState.selectedDeck);
});
