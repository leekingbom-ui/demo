import {
  formatCreatedAt,
  normalizeOrderRecord,
  validateApplicationInput,
} from './shared/order-application.mjs';

const STORAGE_KEY = 'order-application-history';
const MAX_LOCAL_RECORDS = 5;

const form = document.querySelector('#application-form');
const submitButton = document.querySelector('#submit-application');
const feedback = document.querySelector('#form-feedback');
const orderList = document.querySelector('#order-list');
const emptyState = document.querySelector('#empty-state');
const cardTemplate = document.querySelector('#order-card-template');

function readLocalHistory() {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalHistory(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_LOCAL_RECORDS)));
}

function feedbackState(message, tone = 'default') {
  feedback.textContent = message;
  feedback.className = 'form-feedback';

  if (tone === 'error') {
    feedback.classList.add('form-feedback--error');
  }

  if (tone === 'success') {
    feedback.classList.add('form-feedback--success');
  }
}

function getStatusTone(status) {
  if (status === 'rejected') {
    return 'warning';
  }

  if (status === 'completed' || status === 'processing') {
    return 'positive';
  }

  return 'neutral';
}

function renderOrders(records) {
  orderList.innerHTML = '';

  if (!records.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  for (const record of records) {
    const fragment = cardTemplate.content.cloneNode(true);
    const createdAt = fragment.querySelector('[data-field="created-at"]');
    const statusChip = fragment.querySelector('[data-field="status-chip"]');
    const maskedPhone = fragment.querySelector('[data-field="masked-phone"]');
    const orderId = fragment.querySelector('[data-field="order-id"]');
    const statusDetail = fragment.querySelector('[data-field="status-detail"]');
    const statusTone = getStatusTone(record.status);

    createdAt.textContent = formatCreatedAt(record.createdAt);
    statusChip.textContent = record.statusLabel;
    statusChip.classList.toggle('status-chip--positive', statusTone === 'positive');
    statusChip.classList.toggle('status-chip--warning', statusTone === 'warning');
    maskedPhone.textContent = `手机号：${record.maskedPhone}`;
    orderId.textContent = record.orderId;
    statusDetail.textContent = record.statusDetail;
    statusDetail.classList.toggle('status-value--positive', statusTone === 'positive');
    statusDetail.classList.toggle('status-value--warning', statusTone === 'warning');

    orderList.append(fragment);
  }
}

async function submitApplication(event) {
  event.preventDefault();

  const formData = new FormData(form);
  let validatedInput;

  try {
    validatedInput = validateApplicationInput({
      fanPhone: formData.get('fanPhone'),
      orderId: formData.get('orderId'),
    });
  } catch (error) {
    feedbackState(error.message, 'error');
    return;
  }

  submitButton.disabled = true;
  feedbackState('正在提交，请稍候...');

  try {
    const response = await fetch('/api/order-applications', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validatedInput),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || '提交失败，请稍后再试。');
    }

    const nextRecord = normalizeOrderRecord({
      id: payload.order.id,
      created_at: payload.order.createdAt,
      masked_phone: payload.order.maskedPhone,
      order_id: payload.order.orderId,
      status: payload.order.status,
      status_label: payload.order.statusLabel,
      status_detail: payload.order.statusDetail,
      source: payload.order.source,
    });
    const updatedHistory = [nextRecord, ...readLocalHistory().filter((item) => item.id !== nextRecord.id)];

    writeLocalHistory(updatedHistory);
    renderOrders(updatedHistory);
    form.reset();
    feedbackState('提交成功，已写入数据库并同步到当前设备记录。', 'success');
    location.hash = '#detail-screen';
  } catch (error) {
    feedbackState(error.message || '提交失败，请稍后再试。', 'error');
  } finally {
    submitButton.disabled = false;
  }
}

renderOrders(readLocalHistory());
form.addEventListener('submit', submitApplication);
