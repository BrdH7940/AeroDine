import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'

describe('AppController (e2e)', () => {
    let app: INestApplication<App>

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile()

        app = moduleFixture.createNestApplication()

        // Enable CORS to match main.ts configuration
        app.enableCors({
            origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
            credentials: true,
        })

        // Set global API prefix to match main.ts
        app.setGlobalPrefix('api')

        await app.init()
    })

    it('/api/hello (GET)', () => {
        return request(app.getHttpServer())
            .get('/api/hello')
            .expect(200)
            .expect({ message: 'Hello from Backend!' })
    })
})
