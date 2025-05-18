import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';

dotenv.config();

const options: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'postgres',
  logging: process.env.NODE_ENV === 'development' ? true : false,
  synchronize: process.env.NODE_ENV === 'development' ? true : false,
  entities: [__dirname + '../../src/**/entities/**.entity{.ts,.js}'],
  migrations: [__dirname + '../../src/database/migrations/**/*{.ts,.js}'],
  seeds: [__dirname + '../../src/database/seeds/**/*{.ts,.js}'],
  factories: [__dirname + '../../src/database/factories/**/*{.ts,.js}'],
};

console.log('Database connection options:', __dirname);
const dataSource = new DataSource(options);

export default dataSource;
//entities: [`dist/**/entities/**.entity{.ts,.js}`],
//migrations: [`dist/database/migrations/*{.ts,.js}`],
//migrations: [`${__dirname}/migrations/**/*.ts`],
//seeds: ['src/database/seeds/**/*{.ts,.js}'],
//factories: ['src/database/factories/**/*{.ts,.js}'],
