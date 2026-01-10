export function parseOddsString(input: string) {
    const groups = {
        "Full Time Result": {}, // apenas Casa
        "Correct Score": {},    // ftXY
        "Ambas Marcam": {},
        "Over/Under": {},
        "Goals Exact": {},
        "Outros": {}
    };

    if (!input || typeof input !== "string") return groups;

    const translations = {
        ambs: "Ambas Marcam",
        ambn: "Ambas Não Marcam",
        o25: "Over 2.5",
        u25: "Under 2.5",
        ftc: "Casa",
        fte: "Empate",
        ftv: "Fora"
    };

    const pairs = input.split(";");

    for (const pair of pairs) {
        if (!pair.trim()) continue;
        const [key, value] = pair.split("@");
        if (!key) continue;

        const numericValue = value ? parseFloat(value) : null;

        // ---- Agrupamentos ----
        if (key.startsWith("ft")) {
            // Captura placares tipo ft10, ft21, ft42 etc.
            const match = key.match(/^ft(\d)(\d)$/);
            if (match) {
                const home = match[1];
                const away = match[2];
                groups["Correct Score"][`${home}x${away} FT`] = numericValue;
            }
            else if (key === "ftc") {
                groups["Full Time Result"][translations[key]] = numericValue; // só Casa
            }
            else if (["fte", "ftv"].includes(key)) {
                const name = translations[key] || key;
                groups["Outros"][name] = numericValue; // Empate e Fora -> Outros
            }
        }
        else if (key.startsWith("amb")) {
            if (key === "ambs") groups["Ambas Marcam"]["Sim"] = numericValue;
            else if (key === "ambn") groups["Ambas Marcam"]["Não"] = numericValue;
        }
        else if (key.startsWith("o") || key.startsWith("u")) {
            const name = translations[key] || key;
            groups["Over/Under"][name] = numericValue;
        }
        else if (key.startsWith("ge")) {
            const match = key.match(/^ge(\d)$/);
            const label = match ? `Goals ${match[1]}` : key;
            groups["Goals Exact"][label] = numericValue;
        }
        else {
            // Qualquer outra chave vai para Outros
            groups["Outros"][key] = numericValue;
        }
    }

    return groups;
}
