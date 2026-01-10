export default function formatDateBR(dateInput: string | Date): string {
  const date = new Date(dateInput);
  return (
    date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) +
    ' ' +
    date.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}
