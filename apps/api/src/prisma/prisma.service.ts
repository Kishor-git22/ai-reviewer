import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    let url = process.env.DATABASE_URL || "";

    if (url) {
      try {
        // Parse url using URL API (replacing deprecated url.parse internally)
        const urlObj = new URL(url);

        // Ensure pool_timeout is at least 30s to allow cold-sleeping databases (like Neon) to wake up
        if (!urlObj.searchParams.has("pool_timeout")) {
          urlObj.searchParams.set("pool_timeout", "30");
        }
        // Set optimal connection limit for serverless functions
        if (!urlObj.searchParams.has("connection_limit")) {
          urlObj.searchParams.set("connection_limit", "2");
        }

        url = urlObj.toString();
      } catch {
        // Fallback if URL parsing fails for any reason
        if (!url.includes("pool_timeout")) {
          const separator = url.includes("?") ? "&" : "?";
          url = `${url}${separator}pool_timeout=30&connection_limit=2`;
        }
      }
    }

    super({
      datasources: {
        db: {
          url,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log("📦 Connected to PostgreSQL database");
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log("📦 Disconnected from PostgreSQL database");
  }
}
