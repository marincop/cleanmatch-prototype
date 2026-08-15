import redis
import time
import logging
from contextlib import contextmanager
from config import settings

logger = logging.getLogger(__name__)

# Fallback in-memory lock store for offline testing
_local_locks = {}

class RedisLockException(Exception):
    pass

@contextmanager
def order_claim_lock(order_id: str, expire_seconds: int = 3):
    lock_key = f"lock:order:{order_id}"
    redis_client = None
    
    # Try to initialize redis client
    try:
        redis_client = redis.from_url(settings.REDIS_URL, socket_timeout=1.0)
        redis_client.ping()
    except Exception:
        # Fallback to local memory dictionary lock simulator
        redis_client = None

    acquired = False
    
    if redis_client:
        try:
            # nx=True means only set if not exists, ex=seconds expire
            acquired = bool(redis_client.set(lock_key, "locked", ex=expire_seconds, nx=True))
        except Exception as e:
            logger.error(f"Redis error: {e}. Falling back to in-memory lock.")
            redis_client = None

    if redis_client is None:
        # Memory lock check
        now = time.time()
        # Clean expired
        expired = [k for k, v in _local_locks.items() if v < now]
        for k in expired:
            _local_locks.pop(k, None)
            
        if lock_key in _local_locks:
            acquired = False
        else:
            _local_locks[lock_key] = now + expire_seconds
            acquired = True

    if not acquired:
        raise RedisLockException(f"無法取得訂單鎖 {lock_key}。搶單併發衝突 (409 Conflict)。")

    try:
        yield
    finally:
        # Release lock
        if redis_client:
            try:
                redis_client.delete(lock_key)
            except Exception:
                pass
        else:
            _local_locks.pop(lock_key, None)
