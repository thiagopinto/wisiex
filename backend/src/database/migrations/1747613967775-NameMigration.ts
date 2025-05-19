import { MigrationInterface, QueryRunner } from "typeorm";

export class NameMigration1747613967775 implements MigrationInterface {
    name = 'NameMigration1747613967775'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "btcBalanceAvailable" numeric(20,8) NOT NULL DEFAULT '100', "btcBalanceOnHold" numeric(20,8) NOT NULL DEFAULT '0', "usdBalanceAvailable" numeric(20,2) NOT NULL DEFAULT '100000', "usdBalanceOnHold" numeric(20,2) NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "type" "public"."orders_type_enum" NOT NULL, "amount" numeric(18,8) NOT NULL, "price" numeric(18,2) NOT NULL, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'active', "filled" numeric(18,8) NOT NULL DEFAULT '0', "baseCurrency" "public"."orders_basecurrency_enum" NOT NULL, "quoteCurrency" "public"."orders_quotecurrency_enum" NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "matches" ("id" SERIAL NOT NULL, "orderId" integer NOT NULL, "counterOrderId" integer, "takerId" integer NOT NULL, "makerId" integer, "amount" numeric(18,8) NOT NULL, "price" numeric(18,2) NOT NULL, "takerFee" numeric(18,8), "makerFee" numeric(18,8), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8a22c7b2e0828988d51256117f4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "FK_88bc733bc30085b27ee1679a8d1" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "matches" ADD CONSTRAINT "FK_1d56a2f498a619c5fbb1cb5a9b1" FOREIGN KEY ("counterOrderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_1d56a2f498a619c5fbb1cb5a9b1"`);
        await queryRunner.query(`ALTER TABLE "matches" DROP CONSTRAINT "FK_88bc733bc30085b27ee1679a8d1"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_151b79a83ba240b0cb31b2302d1"`);
        await queryRunner.query(`DROP TABLE "matches"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
