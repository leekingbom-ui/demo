import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const htmlPath = resolve(rootDir, 'index.html');
const cssPath = resolve(rootDir, 'styles.css');

function read(path) {
  return readFileSync(path, 'utf8');
}

test('renders both mobile demo screens', () => {
  const html = read(htmlPath);

  assert.match(html, /id="apply-screen"/);
  assert.match(html, /id="detail-screen"/);
  assert.ok((html.match(/class="screen\b/g) || []).length >= 2);
});

test('defines required design tokens', () => {
  const css = read(cssPath);
  const requiredValues = [
    '#000000',
    '#008080',
    '#F02400',
    '#FF2667',
    '#87579F',
    '#F1B85A',
    '#555555',
    '#999999',
    '#B3B3B3',
    '#D2D2D2',
    '#EBEBEB',
    '#F7F7F7',
    '#FFFFFF',
  ];

  for (const value of requiredValues) {
    assert.ok(css.includes(value), `${value} should be present in styles.css`);
  }

  assert.match(css, /--screen-width:\s*375px/);
  assert.match(css, /--screen-height:\s*812px/);
  assert.match(css, /--page-gutter:\s*12px/);
});

test('uses specified component sizing', () => {
  const css = read(cssPath);

  assert.match(css, /--radius-card:\s*1px/);
  assert.match(css, /--radius-button:\s*0\.5px/);
  assert.match(css, /--button-height-primary:\s*40px/);
  assert.match(css, /--nav-title-size:\s*18px/);
});

test('does not add extra decorative styles outside the spec', () => {
  const css = read(cssPath);

  assert.doesNotMatch(
    css,
    /\.screen\s*\{[^}]*border\s*:/,
    'screen canvas should not add an extra preview border'
  );
  assert.doesNotMatch(css, /box-shadow\s*:/, 'shadow styles are not allowed');
});

test('contains the requested demo content', () => {
  const html = read(htmlPath);
  const requiredTexts = [
    '公域订单转私域',
    '公转私订单明细',
    '提交申请',
    '申请时间：2026.03.02 18:00',
    '已处理完成（升级、送券、积分）',
    '已驳回（订单不符合要求，请重新提交）',
  ];

  for (const text of requiredTexts) {
    assert.ok(html.includes(text), `${text} should be rendered`);
  }
});

test('detail page uses real avatar images and refined card structure', () => {
  const html = read(htmlPath);
  const css = read(cssPath);

  assert.match(html, /<img class="avatar-image" src="\.\/avatar-01\.jpg"/);
  assert.match(html, /class="order-head"/);
  assert.match(html, /class="status-chip status-chip--positive"/);
  assert.match(css, /\.avatar-image\s*\{/);
  assert.match(css, /\.status-chip\s*\{/);
});
