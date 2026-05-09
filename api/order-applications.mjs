import {
  maskPhone,
  normalizeOrderRecord,
  validateApplicationInput,
} from '../shared/order-application.mjs';

const RESPONSE_FIELDS =
  'id,created_at,masked_phone,order_id,status,status_label,status_detail,source';

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function createSupabaseHeaders(serviceRoleKey) {
  return {
    'content-type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: 'return=representation',
  };
}

export function createOrderApplicationsHandler({
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  return async function handler(request) {
    if (request.method !== 'POST') {
      return jsonResponse(405, { error: 'Method not allowed.' });
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(500, { error: '服务端环境变量未配置完成。' });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(400, { error: '请求体不是合法的 JSON。' });
    }

    let validatedInput;
    try {
      validatedInput = validateApplicationInput(payload);
    } catch (error) {
      return jsonResponse(400, { error: error.message });
    }

    const body = {
      fan_phone: validatedInput.fanPhone,
      masked_phone: maskPhone(validatedInput.fanPhone),
      order_id: validatedInput.orderId,
      status: 'pending',
      status_label: '待确认',
      status_detail: '已提交，等待运营审核',
      source: 'public_web',
    };

    try {
      const supabaseResponse = await fetchImpl(
        `${env.SUPABASE_URL}/rest/v1/order_applications?select=${RESPONSE_FIELDS}`,
        {
          method: 'POST',
          headers: createSupabaseHeaders(env.SUPABASE_SERVICE_ROLE_KEY),
          body: JSON.stringify(body),
        }
      );

      if (!supabaseResponse.ok) {
        const errorText = await supabaseResponse.text();
        return jsonResponse(502, {
          error: '写入数据库失败，请稍后再试。',
          detail: errorText,
        });
      }

      const [record] = await supabaseResponse.json();
      return jsonResponse(201, { order: normalizeOrderRecord(record) });
    } catch {
      return jsonResponse(502, { error: '服务暂时不可用，请稍后再试。' });
    }
  };
}

export default createOrderApplicationsHandler();
