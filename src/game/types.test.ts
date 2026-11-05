import { describe, expectTypeOf, it } from 'vitest';
import type { CardEffect, GameAction, ResourceKey } from './types';

// Vitest执行测试，生产构建中的tsc负责验证这些编译期契约。
describe('领域类型约束', () => {
  it('重开动作必须携带种子', () => {
    expectTypeOf<Extract<GameAction, { type: 'RESTART' }>>().toEqualTypeOf<{ type: 'RESTART'; seed: number }>();
  });

  it('资源效果必须同时带资源名和数值', () => {
    expectTypeOf<Extract<CardEffect, { kind: 'resource' }>>().toEqualTypeOf<{
      kind: 'resource'; resource: ResourceKey; amount: number; description: string;
    }>();
    expectTypeOf<{ kind: 'resource'; description: string }>().not.toMatchTypeOf<CardEffect>();
    expectTypeOf<{ kind: 'resource'; resource: ResourceKey; description: string }>().not.toMatchTypeOf<CardEffect>();
    expectTypeOf<{ kind: 'resource'; amount: number; description: string }>().not.toMatchTypeOf<CardEffect>();
  });

  it('非资源效果不要求资源字段', () => {
    expectTypeOf<{ kind: 'draw'; description: string }>().toMatchTypeOf<CardEffect>();
    expectTypeOf<{ kind: 'echo'; description: string }>().toMatchTypeOf<CardEffect>();
    expectTypeOf<{ kind: 'steady'; description: string }>().toMatchTypeOf<CardEffect>();
  });
});
