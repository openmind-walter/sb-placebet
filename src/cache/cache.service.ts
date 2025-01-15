import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import configuration from 'src/configuration';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private clients: { [name: string]: Redis } = {};

  constructor() {
    this.initializeClient(configuration.dragonflyClient, process.env.DRAGONFLY_URL);
  

  }

  private initializeClient(clientName: string, url: string) {
    try {
      const client = new Redis(url);
      client.on('error', (err) => {
        console.error(`Cache client ${clientName} URL:${url} encountered an error:`, err);
      });
      this.clients[clientName] = client;
    } catch (err) {
      console.error(`Failed to initialize Cache client ${clientName} URL:${url}`, err);
    }
  }

  async get(client: string, key: string): Promise<string | null> {
    const redis = this.getClient(client);
    return redis ? await redis.get(key) : null;
  }

  async set(client: string, key: string, seconds: number, value: string): Promise<string | null> {
    const redis = this.getClient(client);
    return redis ? await redis.setex(key, seconds, value) : null;
  }

 



  async subscribe(client: string, channel: string, handler: (message: string) => void): Promise<void> {
    const redis = this.getClient(client);
    if (redis) {
      await redis.subscribe(channel);
      redis.on('message', (subChannel, message) => {
        if (subChannel === channel) {
          handler(message);
        }
      });
    }
  }



  private getClient(clientName: string): Redis {
    return this.clients[clientName];
  }

  async hset(client: string, key: string, field: string, value: string): Promise<void> {
    const redis = this.getClient(client);
    if (redis) await redis.hset(key, field, value);
  }

  async hGet(client: string, key: string, field: string): Promise<string | null> {
    const redis = this.getClient(client);
    return redis ? await redis.hget(key, field) : null;
  }

  async onModuleDestroy() {
    for (const client of Object.values(this.clients)) {
      await client.quit();
    }
  }

 


}
