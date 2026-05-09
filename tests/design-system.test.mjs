import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = resolve(import.meta.dirname, '..');
const htmlPath = resolve(rootDir, 'index.html');
const cssPath = resolve(rootDir, 'styles.css');
const sharedModulePath = resolve(rootDir, 'shared', 'order-application.mjs');
const apiModulePath = resolve(rootDir, 'api', 'order-applications.mjs');

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
    '当前设备最近提交记录',
    '仅展示当前设备提交的脱敏记录',
    '还没有提交记录',
  ];

  for (const text of requiredTexts) {
    assert.ok(html.includes(text), `${text} should be rendered`);
  }
});

test('application page exposes real submission hooks', () => {
  const html = read(htmlPath);

  assert.match(html, /<form class="application-form" id="application-form" novalidate>/);
  assert.match(html, /id="submit-application"/);
  assert.match(html, /id="form-feedback"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<script type="module" src="\.\/app\.js"><\/script>/);
});

test('detail page removes public fake records and prepares a safe template', () => {
  const html = read(htmlPath);

  assert.match(html, /id="order-list"/);
  assert.match(html, /id="order-card-template"/);
  assert.doesNotMatch(html, /林可宁/);
  assert.doesNotMatch(html, /周奕辰/);
  assert.doesNotMatch(html, /宋予安/);
  assert.doesNotMatch(html, /dy1284999292949124/);
});

test('styles support submission feedback and empty states', () => {
  const css = read(cssPath);

  assert.match(css, /\.form-feedback\s*\{/);
  assert.match(css, /\.form-feedback--error\s*\{/);
  assert.match(css, /\.empty-state\s*\{/);
  assert.match(css, /\.primary-button:disabled\s*\{/);
});

test('shared validation and masking helpers protect phone privacy', async () => {
  const module = await import(sharedModulePath);
  const normalized = module.validateApplicationInput({
    fanPhone: ' 13800138000 ',
    orderId: ' dy1284999292949124 ',
  });

  assert.deepEqual(normalized, {
    fanPhone: '13800138000',
    orderId: 'dy1284999292949124',
  });
  assert.equal(module.maskPhone('13800138000'), '138****8000');
  assert.throws(
    () => module.validateApplicationInput({ fanPhone: '12345', orderId: 'abc' }),
    /手机号/
  );
});

test('api handler sends safe payloads to supabase and returns masked records', async () => {
  const { createOrderApplicationsHandler } = await import(apiModulePath);
  const requests = [];
  const handler = createOrderApplicationsHandler({
    env: {
      SUPABASE_URL: 'https://demo-project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
    },
    fetchImpl: async (url, init) => {
      requests.push({ url, init });

      return new Response(
        JSON.stringify([
          {
            id: '5d0c59ad-fb12-4d5f-a9c8-d2df0ffb7d4a',
            created_at: '2026-05-08T07:00:00.000Z',
            masked_phone: '138****8000',
            order_id: 'dy1284999292949124',
            status: 'pending',
            status_label: '待确认',
            status_detail: '已提交，等待运营审核',
            source: 'public_web',
          },
        ]),
        {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }
      );
    },
  });

  const response = await handler(
    new Request('https://demo.vercel.app/api/order-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fanPhone: ' 13800138000 ',
        orderId: ' dy1284999292949124 ',
      }),
    })
  );

  assert.equal(response.status, 201);
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url,
    'https://demo-project.supabase.co/rest/v1/order_applications?select=id,created_at,masked_phone,order_id,status,status_label,status_detail,source'
  );
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(requests[0].init.headers.apikey, 'service-role-secret');
  assert.equal(
    requests[0].init.headers.Authorization,
    'Bearer service-role-secret'
  );
  assert.equal(requests[0].init.headers.Prefer, 'return=representation');
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    fan_phone: '13800138000',
    masked_phone: '138****8000',
    order_id: 'dy1284999292949124',
    status: 'pending',
    status_label: '待确认',
    status_detail: '已提交，等待运营审核',
    source: 'public_web',
  });

  const payload = await response.json();
  assert.deepEqual(payload.order, {
    id: '5d0c59ad-fb12-4d5f-a9c8-d2df0ffb7d4a',
    createdAt: '2026-05-08T07:00:00.000Z',
    maskedPhone: '138****8000',
    orderId: 'dy1284999292949124',
    status: 'pending',
    statusLabel: '待确认',
    statusDetail: '已提交，等待运营审核',
    source: 'public_web',
  });
  assert.ok(!JSON.stringify(payload).includes('13800138000'));
});

test('api handler blocks unsupported methods and bad input', async () => {
  const { createOrderApplicationsHandler } = await import(apiModulePath);
  const handler = createOrderApplicationsHandler({
    env: {
      SUPABASE_URL: 'https://demo-project.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
    },
    fetchImpl: async () => {
      throw new Error('fetch should not be called for invalid requests');
    },
  });

  const methodResponse = await handler(
    new Request('https://demo.vercel.app/api/order-applications', {
      method: 'GET',
    })
  );
  assert.equal(methodResponse.status, 405);

  const invalidResponse = await handler(
    new Request('https://demo.vercel.app/api/order-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fanPhone: '12345', orderId: 'abc' }),
    })
  );
  assert.equal(invalidResponse.status, 400);
  const invalidPayload = await invalidResponse.json();
  assert.match(invalidPayload.error, /手机号/);
});
