-- CreateTable
CREATE TABLE "VirtualSportGame" (
    "eventId" TEXT NOT NULL,
    "dbId" TEXT NOT NULL,
    "subid" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "champion" TEXT NOT NULL,
    "championId" INTEGER NOT NULL,
    "teams" JSONB NOT NULL,
    "event_groups" JSONB NOT NULL,
    "FT" JSONB,
    "HT" JSONB,

    CONSTRAINT "VirtualSportGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualSport" (
    "id" SERIAL NOT NULL,
    "origin" JSONB NOT NULL,
    "externalId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ft" TEXT NOT NULL,
    "ht" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "teamA" TEXT NOT NULL,
    "teamB" TEXT NOT NULL,
    "winTeam" TEXT,
    "winResult" TEXT,
    "winPrice" DOUBLE PRECISION,
    "oddsFullTimeJson" JSONB,
    "oddsCorrectScoreJson" JSONB,
    "oddsAmbasMarcamJson" JSONB,
    "oddsOverUnderJson" JSONB,
    "oddsGoalsExactJson" JSONB,
    "oddsOutrosJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualSport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "subId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL,
    "champion" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "teamA" TEXT NOT NULL,
    "teamB" TEXT NOT NULL,
    "ftHome" INTEGER NOT NULL,
    "ftAway" INTEGER NOT NULL,
    "htHome" INTEGER NOT NULL,
    "htAway" INTEGER NOT NULL,
    "ams" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "o05" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "o15" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "o25" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "o35" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "u05" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "u15" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "u25" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "u35" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "g0" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "g1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "g2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "g3" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "g4" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "g5" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "g6" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "g7" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "g8" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "away" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "draw" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VirtualSportGame_subid_key" ON "VirtualSportGame"("subid");

-- CreateIndex
CREATE UNIQUE INDEX "VirtualSport_externalId_key" ON "VirtualSport"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_subId_key" ON "Game"("subId");

-- CreateIndex
CREATE INDEX "Game_subId_idx" ON "Game"("subId");
