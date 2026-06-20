export class PrismaService {
  user = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  } as any;
  refreshToken = {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  } as any;
  $connect = jest.fn();
  $disconnect = jest.fn();
}
