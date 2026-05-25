import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('auth signup, me, and pitch list smoke flow', async () => {
    const email = `e2e-${Date.now()}@example.com`;
    const signup = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        email,
        password: 'Passw0rd!',
        name: 'E2E User',
        phone: `010${String(Date.now()).slice(-8)}`,
      })
      .expect(201);

    const token = signup.body.access_token as string;
    expect(token).toBeDefined();

    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe(email);
      });

    await request(app.getHttpServer())
      .get('/api/pitches')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body.pitches)).toBe(true);
      });

    await request(app.getHttpServer())
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('/api/auth/me rejects anonymous requests', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
