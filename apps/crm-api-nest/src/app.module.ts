import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { ClientsModule } from "./clients/clients.module";
import { ContractsModule } from "./contracts/contracts.module";
import { CrewModule } from "./crew/crew.module";
import { HealthController } from "./health/health.controller";
import { PaperworkModule } from "./paperwork/paperwork.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";
import { QuotesModule } from "./quotes/quotes.module";
import { ReceivablesModule } from "./receivables/receivables.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ClientsModule,
    ProjectsModule,
    QuotesModule,
    ContractsModule,
    PaperworkModule,
    CrewModule,
    ReceivablesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
