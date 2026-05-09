const PHONE_PATTERN = /^1\d{10}$/;
const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;

export function validateApplicationInput(input) {
  const fanPhone = String(input?.fanPhone ?? '').replace(/\s+/g, '');
  const orderId = String(input?.orderId ?? '').trim();

  if (!PHONE_PATTERN.test(fanPhone)) {
    throw new Error('手机号格式不正确，请输入 11 位大陆手机号。');
  }

  if (!ORDER_ID_PATTERN.test(orderId)) {
    throw new Error('订单号格式不正确，请检查后重新输入。');
  }

  return { fanPhone, orderId };
}

export function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function formatCreatedAt(isoString) {
  const date = new Date(isoString);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `申请时间：${map.year}.${map.month}.${map.day} ${map.hour}:${map.minute}`;
}

export function normalizeOrderRecord(record) {
  return {
    id: record.id,
    createdAt: record.created_at,
    maskedPhone: record.masked_phone,
    orderId: record.order_id,
    status: record.status,
    statusLabel: record.status_label,
    statusDetail: record.status_detail,
    source: record.source,
  };
}
