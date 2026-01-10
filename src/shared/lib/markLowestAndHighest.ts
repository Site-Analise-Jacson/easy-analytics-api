type Odd = {
  typeId: number;
  price: number;
  name: string; // formato "X:Y"
};

const parseScore = (score: string) => score.split(":").map(Number);

export function markLowestAndHighest(odds: Odd[]) {
  const filtered = odds.filter(o => {
    const [a, b] = parseScore(o.name);
    return a + b !== 0;
  });

  if (filtered.length === 0) {
    // Se todos forem 0:0, retorna o array original sem marcar
    return odds.map(o => ({ ...o, isLowest: false, isHighest: false }));
  }

  const withTotals = filtered.map(o => {
    const [a, b] = parseScore(o.name);
    return { ...o, total: a + b };
  });

  const minTotal = Math.min(...withTotals.map(o => o.total));
  const maxTotal = Math.max(...withTotals.map(o => o.total));

  return odds.map(o => {
    const found = withTotals.find(wt => wt.typeId === o.typeId); // ou outra chave única
    if (!found) return { ...o, isLowest: false, isHighest: false };
    return {
      ...o,
      isLowest: found.total === minTotal,
      isHighest: found.total === maxTotal,
    };
  });
}