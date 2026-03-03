-- CreateIndex
CREATE INDEX "Game_provider_champion_date_idx" ON "Game"("provider", "champion", "date" DESC);

-- CreateIndex
CREATE INDEX "Game_provider_date_idx" ON "Game"("provider", "date" DESC);
