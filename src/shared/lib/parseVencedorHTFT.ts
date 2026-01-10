export function parseVencedorHTFT(text: string) {
    if (!text) return null;

    const regex = /^(.*?)\s*-\s*(.*?)\s+([\d.,]+)$/;
    const match = text.match(regex);

    if (!match) return { raw: text };

    const [, team, result, value] = match;
    return {
        team: team.trim(),
        result: result.trim(),
        price: parseFloat(value.replace(',', '.')),
    };
}
