import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { ClientsModule } from "./clients/clients.module";
import { ContactsModule } from "./contacts/contacts.module";
import { ContractsModule } from "./contracts/contracts.module";
import { CrewModule } from "./crew/crew.module";
import { FlatModule } from "./flat/flat.module";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";
import { QuotesModule } from "./quotes/quotes.module";
import { ReceivablesModule } from "./receivables/receivables.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ClientsModule,
    ContactsModule,
    ProjectsModule,
    QuotesModule,
    ContractsModule,
    CrewModule,
    ReceivablesModule,
    FlatModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
