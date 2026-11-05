import { mkdirSync } from 'node:fs';
import { expect, test } from './fixtures';
import { canChooseAdultChoice, createGame, getAdultChoices, getAdultEvent, getGrowthEvent, previewCardPlay, reduceGame } from '../src/game/game';
import { simulateStory } from '../src/game/storySimulation';
import type { GameAction, GameState } from '../src/game/types';

const childhood: Record<number, string> = { 8: '8c', 9: '9a', 10: '10r-a', 12: '12f-a' };
const adult: Record<string, string> = { 'repair-call': 'trace', 'old-classmate': 'ask' };
const SEED = 2;

for (const device of [
  { label: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
  { label: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
]) {
  test.describe(`人生回响 ${device.label}`, () => {
    test.use({ viewport: device.viewport, isMobile: device.isMobile, hasTouch: device.hasTouch, contextOptions: { reducedMotion: 'reduce' } });
    test('真实选择串起两条童年到成年故事，并在刷新与结局中保留', async ({ page }) => {
      test.setTimeout(120_000);
      let state = createGame(SEED);
      // Seed only the initial title. Every subsequent decision goes through the actual UI.
      await page.addInitScript((initial) => {
        if (sessionStorage.getItem('echo-journey-seeded')) return;
        localStorage.setItem('floating-life-cards.save.v7', JSON.stringify(initial));
        sessionStorage.setItem('echo-journey-seeded', 'true');
      }, state);
      await page.goto('/');
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
      const captures = new Set<string>();
      for (let step = 0; state.phase !== 'ending' && step < 200; step += 1) {
        await expect(page.locator('.app')).toHaveClass(`app app--${state.phase}`);
        expect(await page.locator('html').evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(device.viewport.width);
        let capture: string | null = null;
        let action: GameAction;
        if (state.phase === 'growth' && state.age === 10) {
          await expect(page.getByRole('heading', { name: '杂音里的第二个下午' })).toBeVisible();
          const remembered = await page.getByRole('complementary', { name: '这段经历从哪里来' }).textContent();
          await page.reload();
          await expect(page.getByRole('complementary', { name: '这段经历从哪里来' })).toHaveText(remembered!);
          capture = 'childhood';
        }
        if (state.phase === 'identity') {
          await expect(page.getByRole('heading', { name: '出发前，先喘一口气' })).toBeVisible();
          capture = 'departure';
        }
        if (state.phase === 'adult-event' && state.activeAdultEventId === 'repair-call') {
          await expect(page.getByRole('button', { name: /^拿出当年的排查顺序/ })).toBeEnabled();
          await expect(page.getByRole('complementary', { name: '这段经历从哪里来' })).toContainText('10');
          if (device.isMobile) {
            // Effects must occupy their own row; an implicit grid column used to crush the prose.
            const copy = await page.locator('.adult-choice .choice__copy').first().boundingBox();
            const effects = await page.locator('.adult-choice__effects').first().boundingBox();
            expect(copy!.width).toBeGreaterThan(280);
            expect(effects!.y).toBeGreaterThanOrEqual(copy!.y + copy!.height);
          }
          capture = 'echo';
        }
        if (await page.locator('.journal').count()) {
          const archive = await page.locator('.journal').boundingBox();
          const content = await page.locator('#game-content').boundingBox();
          expect(archive!.y).toBeGreaterThanOrEqual(content!.y + content!.height);
        }
        if (state.phase === 'encounter' && state.encounter!.chapterIndex === 1 && state.encounter!.round === 1) capture = 'cards';
        if (capture && process.env.ECHO_CAPTURE === '1' && !captures.has(capture)) {
          captures.add(capture);
          mkdirSync('.impeccable/review', { recursive: true });
          await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).map((image) => image.decode())); window.scrollTo(0, 0); });
          await page.screenshot({ path: `.impeccable/review/${capture}-${device.label}.png`, fullPage: true });
        }
        switch (state.phase) {
          case 'title':
            action = { type: 'BEGIN' };
            await page.getByRole('button', { name: '登记出生' }).click(); break;
          case 'origin':
            action = { type: 'ACCEPT_ORIGIN' };
            await page.getByRole('button', { name: '收下这份出身' }).click(); break;
          case 'growth': {
            const event = getGrowthEvent(state)!;
            const choice = childhood[event.age] ? event.choices.find((item) => item.id === childhood[event.age])! : event.choices[(SEED + event.age) % 3]!;
            action = { type: 'CHOOSE_GROWTH', choiceId: choice.id };
            await page.getByRole('button', { name: new RegExp(`^${choice.verb}`) }).click(); break;
          }
          case 'growth-result':
            action = { type: 'CONTINUE_GROWTH' };
            await page.locator('.result-screen .primary-button').click(); break;
          case 'deck':
            action = { type: 'CONFIRM_DECK' };
            await page.getByRole('button', { name: '十八岁，确认行囊' }).click(); break;
          case 'identity':
            action = { type: 'BEGIN_ADVENTURE' };
            await page.getByRole('button', { name: '以这个起点进入成年牌局' }).click(); break;
          case 'interlude':
            action = { type: 'CONFIRM_INTERLUDE' };
            await page.getByRole('button', { name: /^带上这八张牌/ }).click(); break;
          case 'encounter': {
            const skip = page.getByRole('button', { name: '跳过教学' });
            if (await skip.isVisible()) await skip.click();
            const cards = state.encounter!.hand.map((id) => state.cards.find((card) => card.id === id)!);
            cards.sort((a, b) => previewCardPlay(state, b)!.playerScore - previewCardPlay(state, a)!.playerScore);
            const card = cards[0]!;
            const option = page.locator('.hand-option').filter({ has: page.getByRole('heading', { name: card.title, exact: true }) });
            await expect(option.locator('.card__memory')).toHaveText(card.memory);
            action = { type: 'PLAY_CARD', cardId: card.id };
            await option.getByRole('button', { name: /^唤起/ }).click(); break;
          }
          case 'encounter-result':
            action = { type: 'CONTINUE_ADVENTURE' };
            await page.locator('.encounter-result .primary-button').click(); break;
          case 'adult-event': {
            const event = getAdultEvent(state)!;
            const choices = getAdultChoices(state).filter((item) => canChooseAdultChoice(state, item));
            const choice = adult[event.id] ? choices.find((item) => item.id === adult[event.id])! : choices.sort((a, b) => (b.changes.heart ?? 0) - (a.changes.heart ?? 0))[0]!;
            action = { type: 'CHOOSE_ADULT_EVENT', choiceId: choice.id };
            await page.getByRole('button', { name: new RegExp(`^${choice.verb}`) }).click(); break;
          }
          case 'adult-result':
            if (state.activeAdultEventId === 'repair-call') {
              await page.reload();
              await expect(page.getByRole('heading', { name: '你选择了：拿出当年的排查顺序' })).toBeVisible();
            }
            action = { type: 'CONTINUE_ADULT_EVENT' };
            await page.getByRole('button', { name: '继续往下生活' }).click(); break;
          default: throw new Error(`Unexpected phase ${state.phase}`);
        }
        state = reduceGame(state, action);
        await expect(page.locator('.app')).toHaveClass(`app app--${state.phase}`);
        if (state.phase === 'encounter') await expect(page.locator('.progress-block small')).toHaveText(new RegExp(`第 ${state.encounter!.round} /`));
      }
      expect(state.phase).toBe('ending');
      expect(state.chapterResults).toHaveLength(5);
      await expect(page.locator('.life-thread')).toHaveCount(2);
      await expect(page.locator('.life-threads')).toContainText('拿出当年的排查顺序');
      await expect(page.locator('.life-threads')).toContainText('先问他最需要哪一种帮助');
      expect(await page.locator('html').evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(device.viewport.width);
      if (process.env.ECHO_CAPTURE === '1') {
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).map((image) => image.decode())); window.scrollTo(0, 0); });
        await page.screenshot({ path: `.impeccable/review/ending-${device.label}.png`, fullPage: true });
      }
    });
  });
}

test('没有对应童年做法时，记忆专属回应说明缺口并禁用', async ({ page }) => {
  let checkpoint: GameState | undefined;
  simulateStory(1, { strategy: 'careful', growthChoices: { 9: '9a', 10: '10r-b' }, onState: (state) => {
    if (state.phase === 'adult-event' && state.activeAdultEventId === 'repair-call') checkpoint = state;
  } });
  expect(checkpoint).toBeDefined();
  await page.addInitScript((state) => localStorage.setItem('floating-life-cards.save.v7', JSON.stringify(state)), checkpoint);
  await page.goto('/');
  const blocked = page.getByRole('button', { name: /^拿出当年的排查顺序/ });
  await expect(blocked).toBeDisabled();
  await expect(blocked).toContainText('需要十岁时选择');
  await expect(page.getByRole('button', { name: /^请师傅分担一半排查/ })).toBeEnabled();
});
