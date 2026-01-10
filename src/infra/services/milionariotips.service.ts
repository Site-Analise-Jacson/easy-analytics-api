import { Injectable } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { MilionarioTipsLatestMatchesChamp, MilionarioTipsLatestMatchesDetails } from "src/shared/types/milionario-tips";
import { AsyncResult, failure, success } from "src/shared/types/result";

@Injectable()
export class MilionarioTipsService {
    private readonly instance: AxiosInstance = axios.create({
        baseURL: 'https://milionariotips.com.br/api',
        timeout: 120000,
        headers: {
            'Cookie': '__RequestVerificationToken=yjT-BjKJc3zGhXXwN2hp5e_EVYXxDcRs962Wq-gdDRXQ3YLWyQr1MK-zRB1wQF2RFGy4x0zFcYH0fdxtqc3ntlIgHFtGk6f1JLOtD4FljU81; .AspNet.ApplicationCookie=8Bj7pfJ1db6gG4ESrmbNWtZzDF2KAojd7TlK1EZYS_EcslSjKv5zt4jMhv6wYi240nikKJLbQswA2sSxrYFjlN5pASYrpYQZdNmmiD9uTTSdiaHFty863Gr8kp07OQ0-LsX_AkVj3291L6QQf9NigsBJwaJ2X2MBHrUCtldHxwrc7pkiRAw7f0sSQ9G4lufFD224iLX6y1EZeuJUcLjAwYP6v7YtVdsCX3qWFd39wxXItDtEDL5540kEIvVWdWDMvCc11NI4wwxXqYVgzAUyWki9epFhfLyQICH6LNX9QkFrxfZVN_0B-t0XbQljvOYbsTP1q6jjSNKN_fJeqdAKxRQJJYLRGzv-90bZfzGhY5ZFYK2br9JDb68YfrLMnslVrcFdHhVmiGiRYbxgQHT4I_6SeQCvm-RxpdSpt_cDF71usNSJjF2S4PXlOfQd_OEJFbo9cWDXOWtl5qA2ETGDZSkGkSx9C0PUx7Q1sltW1LWd-4X5JdiqcLV8fhrC5Nno',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        },
    });

    async getMatchDetails(matchId: number): AsyncResult<MatchOddsPayload, Error> {
        try {
            const { data } = await this.instance.get<MilionarioTipsLatestMatchesDetails>(`/view/odds/${matchId}`);

            const payload = {
                teamA: data.TeamHome,
                teamB: data.TeamAway,

                // Odds - Ambas Marcam
                ams: data.ParaAmbosMarcarem_Sim,    // Ambas Marcam SIM
                amn: data.ParaAmbosMarcarem_Nao,    // Ambas Marcam NÃO

                // Odds - Over
                o05: data.TotalGols_MaisDe_05,      // Mais de 0.5 gols
                o15: data.TotalGols_MaisDe_15,      // Mais de 1.5 gols
                o25: data.TotalGols_MaisDe_25,      // Mais de 2.5 gols
                o35: data.TotalGols_MaisDe_35,      // Mais de 3.5 gols

                // Odds - Under
                u05: data.TotalGols_MenosDe_05,     // Menos de 0.5 gols
                u15: data.TotalGols_MenosDe_15,     // Menos de 1.5 gols
                u25: data.TotalGols_MenosDe_25,     // Menos de 2.5 gols
                u35: data.TotalGols_MenosDe_35,     // Menos de 3.5 gols

                // Odds - Goals
                g0: data.TimeGols_Casa0,
                g1: data.TimeGols_Casa1,
                g2: data.TimeGols_Casa2,
                g3: data.TimeGols_Casa3,
                g4: data.TimeGols_Casa4,
                g5: data.TimeGols_Casa5mais,
                g6: 0,
                g7: 0,
                g8: 0,

                away: data.PartidaVencedor_Visitante,
                draw: data.PartidaVencedor_Empate,
                home: data.PartidaVencedor_Casa,
            }

            return success(payload);
        } catch (error) {
            return failure(new Error(error));
        }
    }

    async getLatestMatches(date: Date): AsyncResult<LatestMatchesResult[], Error> {
        try {
            const formattedDate = date.toISOString().split("T")[0];

            const { data } = await this.instance.get<MilionarioTipsLatestMatchesChamp[]>(
                `/view/ultimosjogos/${formattedDate}`
            );

            const result = data.map((champ) => ({
                championId: champ.Id,
                champion: champ.competition.toLowerCase(),
                provider: "bet365",
                games: champ.matches.map(match => {
                    const [ftHome, ftAway] = match.FinalTimeResult.split("-").map(Number);
                    const [htHome, htAway] = match.HalfTimeResult.split("-").map(Number);

                    return {
                        id: match.Id,
                        teamA: match.TeamHome,
                        teamB: match.TeamAway,
                        ftHome,
                        ftAway,
                        htHome,
                        htAway,
                        date: match.Date,
                        homeImg: match.HomeImg,
                        awayImg: match.AwayImg
                    };
                })
            }));

            return success(result);
        } catch (error) {
            return failure(new Error(error));
        }
    }
}

export type LatestMatchesResult = {
    championId: number;
    champion: string;
    provider: string;
    games: GameMatch[];
};

export type GameMatch = {
    id: number;
    teamA: string;
    teamB: string;
    ftHome: number;
    ftAway: number;
    htHome: number;
    htAway: number;
    date: string;
    homeImg: string | null;
    awayImg: string | null;
};

export type MatchOddsPayload = {
    teamA: string;
    teamB: string;

    // Odds - Both Teams To Score
    ams: number; // Ambas Marcam SIM
    amn: number; // Ambas Marcam NÃO

    // Odds - Over
    o05: number; // Mais de 0.5 gols
    o15: number; // Mais de 1.5 gols
    o25: number; // Mais de 2.5 gols
    o35: number; // Mais de 3.5 gols

    // Odds - Under
    u05: number; // Menos de 0.5 gols
    u15: number; // Menos de 1.5 gols
    u25: number; // Menos de 2.5 gols
    u35: number; // Menos de 3.5 gols

    // Odds - Exact Goals
    g0: number;
    g1: number;
    g2: number;
    g3: number;
    g4: number;
    g5: number;
    g6: number;
    g7: number;
    g8: number;

    // Odds - Match Result
    away: number; // Visitante
    draw: number; // Empate
    home: number; // Casa
};
