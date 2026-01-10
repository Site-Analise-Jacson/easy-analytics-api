export type VirtualSportChamp = {
  id: number;
  type: number;
  name: string;
  catName: string;
  iconName: string;
};

export type VirtualSportNode = {
  dbId: number;
  id: number;
  champs: VirtualSportChamp[] | undefined;
  name: string;
};

export type VirtualSportChampGame = {
  id: number;
  name: string;
  number: string;
  status: number;
  startDate: string;
};

export type VirtualSportChampGameDetail = {
  dbId: number;
  id: number;
  name: string;
  sport: {
    typeId: number;
    hasLiveEvents: boolean;
    id: number;
    name: string;
  };
  champ: {
    hasLiveEvents: boolean;
    id: number;
    name: string;
  };
  competitors: {
    id: number;
    name: string;
  }[];
  marketGroups: {
    type: number;
    marketIds: number[];
    isBundle: boolean;
    sortOrder: number;
    id: number;
    name: string;
  }[];
  childMarketGroups: any[]; // vazio no exemplo
  markets: {
    desktopOddIds: number[][];
    mobileOddIds: number[][];
    isBB: boolean;
    so: number;
    typeId: number;
    isMB: boolean;
    sportMarketId: number;
    id: number;
    name: string;
  }[];
  childMarkets: any[]; // vazio no exemplo
  odds: {
    typeId: number;
    price: number;
    isMB: boolean;
    oddStatus: number;
    sv: string;
    id: number;
    name: string;
  }[];
  isParlay: boolean;
  startDate: string; // formato ISO
};

interface Team {
  id: number;
  name: string;
}

interface EventGroup {
  id: number;
  tag: string;
  events: any[]; // ou um tipo mais detalhado
}

interface GameDetail {
  id?: number;
  tag?: string;
  status?: string;
  startDate?: string;
  teams?: Team[];
  event_groups?: EventGroup[];
}

interface ChampionResult {
  champion: {
    id: number;
    fullName: string;
  };
  games: GameDetail[];
}

export interface ResultsData {
  results: ChampionResult[];
}
