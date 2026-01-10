type Scoreboard = {
    home: number;
    away: number;
};

type Odds = {
    ams: number;
    amn: number;
    o05: number;
    o15: number;
    o25: number;
    o35: number;
    u05: number;
    u15: number;
    u25: number;
    u35: number;
};

type VirtualSportHook = {
    subId: string; // ID único para o jogo
    champion: string; // Nome do campeão
    date: string; // Data do jogo (usando ISO string)
    scoreboardFT: Scoreboard; // Placar final (FT)
    scoreboardHT: Scoreboard; // Placar do primeiro tempo (HT)
    teamA: string; // Nome do time A
    teamB: string; // Nome do time B
    odds: Odds; // Probabilidades
};
