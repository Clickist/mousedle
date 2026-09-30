/**
 * 购买直达链接服务（Cloudflare Worker affiliate-links）。
 * token 只是轻量门禁，会打包进前端；真正的联盟密钥都在 Worker Secrets。
 * 空串视为未配置——CI 未设置变量时 build-args 会传空串，须回退到内置默认值。
 */
export const AFFILIATE_SERVICE_URL =
  (import.meta.env.VITE_AFFILIATE_SERVICE_URL as string | undefined)?.trim() ||
  'https://affiliate.gearclickist.com';

export const AFFILIATE_TOKEN =
  (import.meta.env.VITE_AFFILIATE_TOKEN as string | undefined)?.trim() ||
  '192ca3900b6a7ea3c6efee8371103ab04476d959a4de7699';
