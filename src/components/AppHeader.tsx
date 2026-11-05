import { useCallback, useEffect, useRef, useState } from 'react';
import { DialogShell } from './DialogShell';
import { ResourceStrip } from './ResourceStrip';
import { requestJudgeNarration } from '../game/judge';
import type { GameState } from '../game/types';

export function AppHeader({ state, onReset, onGuide, endpoint, setEndpoint }: {
  state: GameState;
  onReset: () => void;
  onGuide: () => void;
  endpoint: string;
  setEndpoint: (value: string) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'failure'>('idle');
  const testRequest = useRef<AbortController | null>(null);
  const cancelTest = useCallback(() => {
    testRequest.current?.abort();
    testRequest.current = null;
    setTestState('idle');
  }, []);
  useEffect(() => () => testRequest.current?.abort(), []);
  const closeSettings = useCallback(() => {
    cancelTest();
    setSettingsOpen(false);
    setDeveloperOpen(false);
  }, [cancelTest]);

  async function testJudge() {
    if (!endpoint.trim()) return;
    testRequest.current?.abort();
    const controller = new AbortController();
    testRequest.current = controller;
    setTestState('testing');
    const text = await requestJudgeNarration(endpoint, {
      chapter: '连接测试', situation: '玩家第一次接通叙事裁判。',
      card: { title: '普通人的底牌', memory: '没有天赋加成，也可以把日子一张张攒起来。', approach: '共情' },
      intent: { title: '未知的明天', text: '世界没有提前给出答案。', approach: '行动' },
    }, controller.signal);
    if (controller.signal.aborted || testRequest.current !== controller) return;
    testRequest.current = null;
    setTestState(text ? 'success' : 'failure');
  }

  return (
    <>
      <header className="app-header">
        <div className="wordmark">浮生牌局 <span>FL/{state.origin?.serial ?? '未登记'}</span></div>
        <ResourceStrip state={state} />
        <div className="header-actions">
          <button onClick={onGuide}>玩法说明</button>
          <button aria-expanded={settingsOpen} onClick={() => setSettingsOpen(true)}>设置</button>
          <button onClick={onReset}>重开</button>
        </div>
        <button className="mobile-menu-button" aria-expanded={mobileMenuOpen} aria-controls="mobile-game-menu" onClick={() => setMobileMenuOpen(true)}>菜单</button>
      </header>
      {mobileMenuOpen && (
        <DialogShell className="mobile-menu" labelledBy="mobile-menu-title" onClose={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu__handle" aria-hidden="true" />
          <header>
            <div><p className="eyebrow">局内操作</p><h2 id="mobile-menu-title">浮生牌局</h2></div>
            <button className="mobile-menu__close" data-autofocus onClick={() => setMobileMenuOpen(false)} aria-label="关闭菜单">关闭</button>
          </header>
          <div className="mobile-menu__actions" id="mobile-game-menu">
            <button onClick={() => { setMobileMenuOpen(false); onGuide(); }}><b>玩法说明</b><span>流程、牌力、同型与 LLM 用法</span></button>
            <button onClick={() => { setMobileMenuOpen(false); setSettingsOpen(true); }}><b>叙事设置</b><span>{endpoint ? '自定义叙事已配置' : '当前使用离线叙事'}</span></button>
            <button className="mobile-menu__danger" onClick={() => { setMobileMenuOpen(false); onReset(); }}><b>重开人生</b><span>清除这一次的人生进度</span></button>
          </div>
        </DialogShell>
      )}
      {settingsOpen && (
        <DialogShell className="settings-panel" labelledBy="settings-title" onClose={closeSettings}>
          <header className="settings-header"><div><p className="eyebrow">游戏设置</p><h2 id="settings-title">叙事方式</h2></div><button data-autofocus onClick={closeSettings} aria-label="关闭设置">关闭</button></header>
          <section className="narration-status" aria-live="polite">
            <span>{endpoint ? '自定义叙事已配置' : '默认 · 离线叙事'}</span>
            <b>{endpoint ? '每次出牌会尝试请求自定义裁判' : '无需联网，也不会上传你的游戏内容'}</b>
            <p>{endpoint ? '若连接失败，游戏会立即使用内置文案，胜负和随机结果始终由本地规则决定。' : '游戏当前使用内置裁判文案。LLM 只是可选的文字扩展，不影响牌力、抽牌或胜负。'}</p>
          </section>
          <details className="developer-settings" open={developerOpen} onToggle={(event) => setDeveloperOpen(event.currentTarget.open)}>
            <summary>开发者接入：连接 LLM 叙事裁判</summary>
            <div className="developer-settings__body">
              <ol className="judge-steps">
                <li><b>启动安全中转。</b>在另一个终端配置模型环境变量，再运行 <code>npm run judge</code>。</li>
                <li><b>填写地址。</b>本地示例为 <code>http://localhost:8787/judge</code>，也可使用自己部署的兼容端点。</li>
                <li><b>测试连接。</b>连接成功后，每次出牌会请求一段专属叙述；失败时自动回到内置文案。</li>
              </ol>
              <label>
                <span>中转端点 URL</span>
                <input type="url" value={endpoint} onChange={(event) => { cancelTest(); setEndpoint(event.target.value); }} placeholder="http://localhost:8787/judge" />
              </label>
              <div className="judge-test-row">
                <button className="primary-button" disabled={!endpoint.trim() || testState === 'testing'} onClick={() => void testJudge()}>{testState === 'testing' ? '正在测试…' : '测试端点'}</button>
                <span className={`judge-test judge-test--${testState}`} aria-live="polite">
                  {testState === 'success' ? '连接成功，远程叙事已启用。' : testState === 'failure' ? '没有收到有效文字。检查中转服务、模型配置与地址。' : endpoint ? '尚未测试。' : '尚未填写自定义端点。'}
                </span>
              </div>
              <details className="endpoint-contract"><summary>自定义端点的数据格式</summary><p>接受游戏发送的 JSON POST，并返回 <code>{'{ "text": "不超过 70 个汉字的叙述" }'}</code>。完整示例见 <code>docs/LLM_JUDGE.md</code>。</p></details>
              <p className="security-note">模型密钥只能放在中转服务的环境变量中，绝不要填进这个页面。LLM 只写叙述，本地规则仍负责全部胜负。</p>
            </div>
          </details>
          <button className="primary-button settings-done" onClick={closeSettings}>保存并回到人生</button>
        </DialogShell>
      )}
    </>
  );
}
