-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'demo-user',
    "scenarioType" TEXT NOT NULL,
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VitalSignsLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloodPressure" TEXT NOT NULL,
    "heartRate" INTEGER NOT NULL,
    "respRate" INTEGER NOT NULL,
    "spO2" INTEGER NOT NULL,
    "painScore" INTEGER NOT NULL,

    CONSTRAINT "VitalSignsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PerformanceData" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "totalMessages" INTEGER NOT NULL,
    "hintsUsed" INTEGER NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "assessmentCompleteness" DOUBLE PRECISION NOT NULL,
    "criticalActions" JSONB NOT NULL,
    "safetyScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PerformanceData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceData_sessionId_key" ON "public"."PerformanceData"("sessionId");

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VitalSignsLog" ADD CONSTRAINT "VitalSignsLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PerformanceData" ADD CONSTRAINT "PerformanceData_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
