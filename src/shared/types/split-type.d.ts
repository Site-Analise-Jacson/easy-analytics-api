export type SplitType = SplitDataType[];

export type SplitColSportingBet = {
    Id: number;
    Horario: string;
    Hora: string;
    Minuto: string;
    TimeA: string;
    TimeB: string;
    Resultado: string;
    Resultado_FT: string;
    Resultado_HT: string;
    Odds: string;
}

export type SplitColBet365 = {
    Horario: string;                // "4.02"
    Hora: string;                   // "4"
    Minuto: string;                 // "02"
    SiglaA: string;                 // "ESC"
    SiglaB: string;                 // "ROM"
    TimeA: string;                  // "Escócia"
    TimeB: string;                  // "Romênia"
    Resultado: string;              // "1-1"
    Resultado_FT: string;           // "1-1"
    Resultado_HT: string;           // "1-0"
    Odds: string;                   // odds concatenadas ("ambs@1.93;ftv@2.90;...")
    PrimeiroMarcar: string | null;  // "A"
    UltimoMarcar: string | null;    // "B"
    Id: number;                     // 2229929
    Vencedor_HT_FT?: string;        // "Escócia - Empate 0.00"
    Resultado_HT_Odd?: string;      // "7.00"
}

export type SplitDataType = {
    DataAtualizacao: Date;
    Linhas: {
        Hora: number;
        Colunas: SplitColSportingBet[] | SplitColBet365[]
    }[];
    Minutos: {
        Numero: string;
    }[];
}