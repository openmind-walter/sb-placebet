import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from 'pg';
import { LoggerService } from 'src/common';
import { Placebet } from '../dto/placebet';


@Injectable()
export class OrderService implements OnModuleInit, OnModuleDestroy {

    private client: Client;
    constructor(private logger: LoggerService) {
    }
    async onModuleInit() {
        try {
            this.client = new Client({
                connectionString: process.env.DATABASE_URL
            });
            await this.client.connect();

            this.client.on('notification', async (msg) => {
                console.log('DB place bet notification ', msg)
                const payloadObject = JSON.parse(msg?.payload) as Placebet;

            });
            await this.client.query('LISTEN sb_placebet');

        } catch (err) {
            this.logger.error(` subscribe sb placebet databse notification : can't connect  to database`, OrderService.name);
        }

    }

    async onModuleDestroy() {
        await this.client.end();
        console.log('Disconnected from PostgreSQL');
    }
}







