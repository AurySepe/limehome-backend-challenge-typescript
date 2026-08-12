import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import prisma from './prisma';
import { AppModule } from './app.module';

@Catch(HttpException)
export class StringHttpExceptionFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const status = exception.getStatus();
        const resObj = exception.getResponse();

        if (typeof resObj === 'string') {
            response.status(status).json(resObj);
        } else if (typeof resObj === 'object' && resObj !== null && 'message' in resObj && typeof (resObj as any).message === 'string') {
            response.status(status).json((resObj as any).message);
        } else {
            response.status(status).json(resObj);
        }
    }
}

export let app: INestApplication | undefined;

export async function bootstrap(): Promise<INestApplication> {
    if (!app) {
        app = await NestFactory.create(AppModule, { logger: false });
        app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
        app.useGlobalFilters(new StringHttpExceptionFilter());

        const config = new DocumentBuilder()
            .setTitle('Booking API')
            .setDescription('NestJS Booking Management API')
            .setVersion('1.0')
            .build();
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api-docs', app, document);

        const outputPath = path.resolve(process.cwd(), 'openapi.json');
        fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
    }
    return app;
}

export async function startServer(port: number = Number(process.env.PORT) || 8000) {
    const nestApp = await bootstrap();
    if (!nestApp.getHttpServer().listening) {
        await nestApp.listen(port);
    }
    return 'Server started';
}

export async function stopServer() {
    if (app) {
        const temp = app;
        app = undefined;
        await temp.close();
    }
    return 'Server stopped';
}

async function initialize() {
    try {
        await prisma.$connect();
        await startServer();
        console.log('The server is running on http://localhost:8000');
        console.log('Initialized');
    } catch (error) {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

const isTestEnv = process.env.NODE_ENV === 'test' || process.execArgv.includes('--test') || process.argv.some(a => a.includes('test'));

if (!isTestEnv) {
    initialize();
}
