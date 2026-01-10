import { Injectable } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";

@Injectable()
export class SportingBetService {
    private readonly instance: AxiosInstance;

    constructor() {
        this.instance = axios.create({
            baseURL: "https://www.sportingbet.bet.br/cds-api/bettingoffer/virtual",
            timeout: 120000,
            headers: {
                Accept: "application/json, text/plain, */*",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
            },
        });
    }

    async getTest() {
        const response = await this.instance.get("/sports", {
            params: {
                "x-bwin-accessid": "YTRhMjczYjctNTBlNy00MWZlLTliMGMtMWNkOWQxMThmZTI2",
                lang: "pt-br",
                country: "BR",
                userCountry: "BR",
                scheduleSize: 10,
            },
        });

        return response.data;
    }
}
