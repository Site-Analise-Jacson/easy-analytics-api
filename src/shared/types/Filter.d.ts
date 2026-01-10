export type Filter = {
  /** Lista de IDs ou nomes dos campeonatos */
  champs?: string[];

  /** Lista de IDs ou nomes dos jogos */
  games?: string[];

  /** Data inicial do intervalo de busca */
  startDate?: Date;

  /** Data final do intervalo de busca */
  endDate?: Date;

  /** Quantidade máxima de registros por página (default: 10) */
  limit?: number;

  /** Página atual para paginação (default: 1) */
  page?: number;

  status?: 'finalizado' | 'pendente';
};
