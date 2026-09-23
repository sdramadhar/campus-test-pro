import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      lazyConnect: true,
      connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 1500),
      commandTimeout: Number(process.env.REDIS_COMMAND_TIMEOUT_MS ?? 1500),
      enableOfflineQueue: false,
      maxRetriesPerRequest: 2,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
