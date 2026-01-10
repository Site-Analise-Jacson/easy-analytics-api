export const VirtualSportChampGameStatus = {
  0: 'PENDENTE',
  2: 'FINALIZADO',
} as const;

type StatusKey = keyof typeof VirtualSportChampGameStatus;

export function getStatusText(status: number) {
  const key = status as StatusKey;
  return VirtualSportChampGameStatus[key] ?? 'Status desconhecido';
}
