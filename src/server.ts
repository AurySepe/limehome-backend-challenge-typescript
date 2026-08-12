import http from 'http';
import express, { Express, NextFunction, Request, Response } from 'express';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApi } from '@ts-rest/open-api';
import prisma from './prisma.js';
import bookingRoutes from './modules/bookings/booking.routes.js';
import { bookingContract } from './modules/bookings/booking.contract.js';

export const app: Express = express();

app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Generate OpenAPI spec dynamically from @ts-rest contract (Zero Drift)
export const openApiDocument = generateOpenApi(
    bookingContract,
    {
        info: {
            title: 'Limehome Booking API',
            version: '1.0.0',
            description: 'Contract-first Express API using @ts-rest and Zod',
        },
    },
    {
        setOperationId: true,
    }
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use('/', bookingRoutes);

app.use((req: Request, res: Response, next: NextFunction) => {
    const error = new Error('Not found');
    res.status(404).json({
        message: error.message,
    });
});

let server: http.Server;

export async function startServer() {
    return new Promise((resolve, reject) => {
        const port = 8000;
        server = http.createServer(app);
        server.listen(port, () => {
            console.log(`The server is running on http://localhost:${port}`);
            resolve('Server started');
        }).on('error', (error) => {
            reject(error);
        });
    });
}

export async function stopServer() {
    return new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve('Server stopped');
        });
    });
}

async function initialize() {
    try {
        await prisma.$connect();
        if (!server) {
            await startServer();
        }
    } catch (error) {
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

if (process.env.NODE_ENV !== 'test') {
    initialize().then(() => {
        console.log('Initialized');
    }).catch((error) => {
        console.error(error);
    });
}
