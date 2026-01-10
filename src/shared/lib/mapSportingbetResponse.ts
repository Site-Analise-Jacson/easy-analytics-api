type Price = {
    odds: number;
}

type Option = {
    name: {
        value: string;
    };
    price: Price;
}

type OptionMarket = {
    name: {
        value: string;
    };
    options: Option[];
}

type Participant = {
    name: {
        value: string;
    };
    properties: {
        type: "HomeTeam" | "AwayTeam"
    }
}

type Fixture = {
    id: string;
    name: {
        value: string;
    };
    startDate: string;
    stage: string;
    participants: Participant[];
    optionMarkets: OptionMarket[];
    competition: {
        sportId: number;
        name: {
            value: string;
        }
    }
}

type SportingbetResponse = {
    fixture: Fixture;
}

// Interface para a estrutura de dados de saída desejada
type Scoreboard = {
    home: number;
    away: number;
}

type Odds = {
    home: number; // Adicionei home pois estava faltando na sua estrutura de 'odds'
    away: number;
    draw: number;
    ams: number; // Ambas Marcam Sim (Yes)
    amn: number; // Ambas Marcam Não (No)
    o05: number;
    o15: number; // Estes Over/Under não existem no JSON fornecido, serão 0
    o25: number;
    o35: number; // Este Over/Under não existe no JSON fornecido, será 0
    u05: number; // Este Over/Under não existe no JSON fornecido, será 0
    u15: number; // Este Over/Under não existe no JSON fornecido, será 0
    u25: number;
    u35: number; // Este Over/Under não existe no JSON fornecido, será 0
    g0: number; // Total Goals 0
    g1: number; // Total Goals 1
    g2: number; // Total Goals 2
    g3: number; // Total Goals 3
    g4: number; // Total Goals 4
    g5: number; // Total Goals 5
    g6: number; // Total Goals 6
    g7: number; // Total Goals 7
    g8: number; // Total Goals 8
}

type MatchData = {
    id: string;
    status: "finalizado" | "pendente";
    date: string | Date; // Usando string para manter o formato ISO do JSON, ou Date se for para ser um objeto Date
    champion: string;
    scoreboardFT: Scoreboard;
    scoreboardHT: Scoreboard; // Não há dados de HT no JSON, então será 0-0
    teamA: string; // Time da Casa
    teamB: string; // Time de Fora
    odds: Odds;
}

/**
 * Mapeia a resposta da Sportingbet para o formato de dados de partida desejado.
 * @param data O objeto JSON da resposta da Sportingbet.
 * @returns Um objeto MatchData no formato desejado.
 */
export function mapSportingbetResponse(data: SportingbetResponse): { isValid: boolean; payload: MatchData; } {
    const fixture = data.fixture;

    // O placar e o campeão são definidos como nulos/0-0 pois a partida é 'PreMatch' (pendente)
    const isFinalized = fixture.stage === 'Resulted';
    const homeTeamName = fixture.participants.find(p => p.properties.type === "HomeTeam")?.name.value || "Time A";
    const awayTeamName = fixture.participants.find(p => p.properties.type === "AwayTeam")?.name.value || "Time B";

    // Funções auxiliares para buscar odds
    const findOptionPrice = (marketName: string, optionName: string): number => {
        const market = fixture.optionMarkets.find(m => m.name.value === marketName);
        const option = market?.options.find(o => o.name.value === optionName);
        // Retorna a odd decimal, ou 0 se não for encontrada
        return option?.price.odds ?? 0;
    };

    // 1. Extraindo Odds
    const matchResultOdds = {
        home: findOptionPrice("Match Result", homeTeamName),
        draw: findOptionPrice("Match Result", "X"),
        away: findOptionPrice("Match Result", awayTeamName),
    };

    const bothTeamsToScoreOdds = {
        yes: findOptionPrice("Both Teams to Score", "Yes"),
        no: findOptionPrice("Both Teams to Score", "No"),
    };

    const overUnderOdds = {
        over25: findOptionPrice("Over/Under - Total Goals", "Over 2.5"),
        under25: findOptionPrice("Over/Under - Total Goals", "Under 2.5"),
    };

    const totalGoalsOdds = {
        g0: findOptionPrice("Total Goals", "0"),
        g1: findOptionPrice("Total Goals", "1"),
        g2: findOptionPrice("Total Goals", "2"),
        g3: findOptionPrice("Total Goals", "3"),
        g4: findOptionPrice("Total Goals", "4"),
        g5: findOptionPrice("Total Goals", "5"),
        g6: findOptionPrice("Total Goals", "6"),
        g7: findOptionPrice("Total Goals", "7"),
        g8: findOptionPrice("Total Goals", "8"),
    };

    // Mapeando para o formato de saída
    const payload: MatchData = {
        id: data.fixture.id.split(":")[1],
        status: isFinalized ? "finalizado" : "pendente",
        date: fixture.startDate,
        champion: fixture.competition.name.value, // Não há informação de campeão para PreMatch
        scoreboardFT: { home: 0, away: 0 }, // Placar final 0-0 para PreMatch
        scoreboardHT: { home: 0, away: 0 }, // Placar HT 0-0 para PreMatch (não há dados)
        teamA: homeTeamName,
        teamB: awayTeamName,
        odds: {
            home: matchResultOdds.home, // Novo campo para Home (Suíça)
            away: matchResultOdds.away,
            draw: matchResultOdds.draw,
            ams: bothTeamsToScoreOdds.yes,
            amn: bothTeamsToScoreOdds.no,
            o05: 0, // Não encontrado no JSON fornecido, usando 0
            o15: 0, // Não encontrado no JSON fornecido, usando 0
            o25: overUnderOdds.over25,
            o35: 0, // Não encontrado no JSON fornecido, usando 0
            u05: 0, // Não encontrado no JSON fornecido, usando 0
            u15: 0, // Não encontrado no JSON fornecido, usando 0
            u25: overUnderOdds.under25,
            u35: 0, // Não encontrado no JSON fornecido, usando 0
            g0: totalGoalsOdds.g0,
            g1: totalGoalsOdds.g1,
            g2: totalGoalsOdds.g2,
            g3: totalGoalsOdds.g3,
            g4: totalGoalsOdds.g4,
            g5: totalGoalsOdds.g5,
            g6: totalGoalsOdds.g6,
            g7: totalGoalsOdds.g7,
            g8: totalGoalsOdds.g8,
        },
    };
    const zeros = ['o05', 'o15', 'o35', 'u05', 'u15', 'u35'];
    const allZeros = zeros.every(key => payload.odds[key] === 0);

    return {
        isValid: allZeros,
        payload
    }
}