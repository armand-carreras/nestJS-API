import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/cities (GET)', () => {
    return request(app.getHttpServer())
      .get('/cities?q=to')
      .expect(200)
      .expect((response) => {
        if (!Array.isArray(response.body)) {
          throw new Error('Expected an array response');
        }

        if (response.body[0] !== 'Tokyo') {
          throw new Error('Expected the first ASCII city value to be Tokyo');
        }
      });
  });

  it('/cities/pairs (GET)', () => {
    return request(app.getHttpServer())
      .get('/cities/pairs?q=to')
      .expect(200)
      .expect((response) => {
        if (!Array.isArray(response.body)) {
          throw new Error('Expected an array response');
        }

        if (response.body[0]?.realname !== 'Tokyo') {
          throw new Error('Expected the first city real name to be Tokyo');
        }

        if (response.body[0]?.ascii_name !== 'Tokyo') {
          throw new Error('Expected the first ASCII city value to be Tokyo');
        }
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
