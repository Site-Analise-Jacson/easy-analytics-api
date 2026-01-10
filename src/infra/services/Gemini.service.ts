import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import { AsyncResult, failure, success } from 'src/shared/types/result';

@Injectable()
export class GeminiService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    }

    private fileToGenerativePart(path: string, mimeType: string) {
        return {
            inlineData: {
                data: fs.readFileSync(path).toString('base64'),
                mimeType,
            },
        };
    }

    async analyzeImage(filePath: string): AsyncResult<string, Error> {
        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-2.5-flash-native-audio-dialog',
            });

            const prompt = `
                Você é um sistema de extração de dados visuais.

                Analise a imagem fornecida e IDENTIFIQUE o placar da partida exibido nela.

                Extraia:
                - Placar do tempo final (FT)
                - Placar do intervalo (HT)

                Regras OBRIGATÓRIAS:
                - Responda SOMENTE com um JSON válido.
                - Não inclua texto adicional, explicações ou markdown.
                - Não use comentários.
                - Se algum valor não estiver visível ou não puder ser identificado com certeza, retorne 0.

                Formato EXATO da resposta:
                {
                "ftHome": 0,
                "ftAway": 0,
                "htHome": 0,
                "htAway": 0
                }
            `;

            const imagePart = this.fileToGenerativePart(
                filePath,
                'image/png',
            );

            const result = await model.generateContent([
                prompt,
                imagePart,
            ]);

            return success(result.response.text());
        } catch (error) {
            console.log(error);
            return failure(new Error(error));
        }
    }
}
