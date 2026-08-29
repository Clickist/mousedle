import { randomUUID } from 'crypto';
import { evalCommandScript, redis, redisKey } from '../redis';

const localLocks = new Map<string, Promise<void>>();

// 锁持有方通常要做多次 Redis/DB 往返,百毫秒级预算会让并发第二个请求
// 直接失败(跨天每日挑战分配是典型场景);放宽到秒级,让等待替代失败。
// 锁本身有 15s PX 兜底,预算耗尽仍会抛 RESOURCE_BUSY(errorHandler 映射为 503)。
const LOCK_RETRY_BUDGET_MS = 2_000;
const LOCK_RETRY_BASE_DELAY_MS = 20;
const LOCK_RETRY_MAX_DELAY_MS = 200;

export async function withKeyLock<T>(key: string, handler: () => Promise<T>): Promise<T> {
  const client = redis();
  if (client) {
    const lockKey = redisKey(`lock:${key}`);
    const token = randomUUID();
    const deadline = Date.now() + LOCK_RETRY_BUDGET_MS;
    for (let attempt = 0; ; attempt++) {
      if (await client.set(lockKey, token, { NX: true, PX: 15_000 })) {
        try {
          return await handler();
        } finally {
          await evalCommandScript(
            'key-lock-release-v1',
            'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
            [lockKey],
            [token]
          );
        }
      }
      const delay = Math.min(LOCK_RETRY_BASE_DELAY_MS * 2 ** attempt, LOCK_RETRY_MAX_DELAY_MS) +
        Math.floor(Math.random() * LOCK_RETRY_BASE_DELAY_MS);
      if (Date.now() + delay > deadline) throw new Error('RESOURCE_BUSY');
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const previous = localLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  localLocks.set(key, queued);
  await previous;
  try {
    return await handler();
  } finally {
    release();
    if (localLocks.get(key) === queued) localLocks.delete(key);
  }
}
