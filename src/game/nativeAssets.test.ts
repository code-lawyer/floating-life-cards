/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function pngHeader(relativePath: string) {
  const bytes = readFileSync(resolve(relativePath));
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
}

describe('原生发布资产', () => {
  it('iOS商店图标为不含透明通道的1024像素RGB图片', () => {
    expect(pngHeader('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png')).toEqual({
      width: 1024,
      height: 1024,
      colorType: 2,
    });
  });

  it('Android自适应前景按108dp密度族生成', () => {
    const sizes = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
    for (const [density, size] of Object.entries(sizes)) {
      expect(pngHeader(`android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`)).toMatchObject({
        width: size,
        height: size,
      });
    }
  });

  it('Android真机测试使用正式应用包名', () => {
    const source = readFileSync(resolve('android/app/src/androidTest/java/com/fusheng/cards/ExampleInstrumentedTest.java'), 'utf8');
    expect(source).toContain('package com.fusheng.cards;');
    expect(source).toContain('assertEquals("com.fusheng.cards", appContext.getPackageName());');
  });
});
