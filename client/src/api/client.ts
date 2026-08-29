import axios from 'axios';
import { translate } from '../i18n/messages';
import { createRegisterPow, ensurePow, notePowExpiry } from './pow';
import { hasAuthHint, refreshAuthenticatedSession } from './authSession';

// 跨境链路(大陆→CF 美西)晚高峰丢包,无超时会让请求挂到 TCP 放弃;
// 20s 覆盖常规接口,admin 导入导出单独放宽
export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 20_000 });

// start 服务端有 resume 路径,重放安全;guess 会推进对局,超时重试会造成
// 客户端与服务端状态错位,绝不能自动重试
const RETRYABLE_START_PATHS = ['/game/start', '/daily-challenge/start'];

function isRetryableStart(url: string | undefined): boolean {
  return RETRYABLE_START_PATHS.includes(String(url ?? '').replace(/^.*\/api/, ''));
}

function isIdempotentGet(config: { method?: string; url?: string }): boolean {
  return (config.method ?? '').toLowerCase() === 'get';
}

api.interceptors.request.use(async (request) => {
  const isRegisterRequest = request.method?.toLowerCase() === 'post' &&
    String(request.url ?? '').replace(/^.*\/api/, '') === '/auth/register';
  if (isRegisterRequest) {
    const proof = await createRegisterPow();
    request.headers.set('X-Register-PoW-Id', proof.id);
    request.headers.set('X-Register-PoW-Nonce', proof.nonce);
  } else {
    await ensurePow();
  }
  if (hasAuthHint()) request.headers.set('X-Auth-Expected', '1');
  else request.headers.delete('X-Auth-Expected');
  return request;
});

api.interceptors.response.use(
  (response) => {
    notePowExpiry(response.headers['x-pow-expires-in']);
    return response;
  },
  async (error) => {
    if (!axios.isAxiosError(error)) throw error;
    const config = error.config as (typeof error.config & {
      _powRetried?: boolean;
      _authRetried?: boolean;
      _netRetried?: boolean;
    }) | undefined;
    const code = String(error.response?.data?.code ?? '');
    // 断网/超时对幂等请求(start 与全部 GET)只补一次:跨境链路瞬时拥塞占比高,
    // start 由服务端 resume 收敛,GET 本身无副作用
    if (
      (!error.response || error.code === 'ECONNABORTED') &&
      config &&
      !config._netRetried &&
      (isRetryableStart(config.url) || isIdempotentGet(config))
    ) {
      config._netRetried = true;
      await new Promise((resolve) => setTimeout(resolve, 500));
      return api.request(config);
    }
    if (code === 'POW_REQUIRED' && config && !config._powRetried) {
      config._powRetried = true;
      const isRegisterRequest = String(config?.url ?? '').replace(/^.*\/api/, '') === '/auth/register';
      if (!isRegisterRequest) await ensurePow(true);
      return api.request(config);
    }
    if (
      error.response?.status === 401 &&
      (code === 'AUTH_REQUIRED' || code === 'AUTH_EXPIRED') &&
      config &&
      !config._authRetried
    ) {
      config._authRetried = true;
      await refreshAuthenticatedSession();
      return api.request(config);
    }
    throw error;
  }
);

/** 从 axios 错误中取出后端错误码并翻译成文案 */
export function errMsg(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return translate('NETWORK_ERROR');
    const code = String(err.response.data?.code || '');
    if (code.startsWith('POW_')) return translate('NETWORK_ERROR');
    return translate(code);
  }
  return translate('INTERNAL_ERROR');
}
