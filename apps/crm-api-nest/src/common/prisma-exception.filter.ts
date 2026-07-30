import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Response } from "express";

// Safety net for constraint violations that reach the client. Every child
// relation in this schema is required, so a delete without an explicit cascade
// raises P2003 — which used to surface as a bare 500 "Internal server error"
// naming nothing. Controllers should still refuse explicitly (see
// ProjectsController.remove); this only stops the next one being a 500.
const STATUS: Record<string, { status: HttpStatus; message: string }> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: "a record with these unique values already exists",
  },
  P2003: {
    status: HttpStatus.CONFLICT,
    message: "record is still referenced by related records",
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: "record not found" },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(err: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const mapped = STATUS[err.code];
    if (!mapped) throw err; // unmapped codes keep the default 500 + logging
    const res = host.switchToHttp().getResponse<Response>();
    const target = (err.meta as { target?: unknown } | undefined)?.target;
    res.status(mapped.status).json({
      statusCode: mapped.status,
      message: target ? `${mapped.message}: ${String(target)}` : mapped.message,
      error: err.code,
    });
  }
}
