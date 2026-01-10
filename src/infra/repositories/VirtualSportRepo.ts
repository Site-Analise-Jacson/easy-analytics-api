import axios, { AxiosError, AxiosInstance } from 'axios';

import { Injectable } from '@nestjs/common';
import { VirtualSportChampGame, VirtualSportChampGameDetail, VirtualSportNode } from 'src/shared/types/VirtualSport';

@Injectable()
export default class VirtualSportRepo {
  private static readonly instance: AxiosInstance = axios.create({
    baseURL: 'https://sb2virtuals-altenar2.biahosted.com/api/WidgetVirtuals',
    timeout: 5000,
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    },
  });

  static async getChampions(): Promise<VirtualSportNode[]> {
    try {
      const { data } = await this.instance.get<{
        virtualSportNodes: VirtualSportNode[];
      }>(
        'GetVirtualSports?culture=pt-BR&timezoneOffset=180&integration=goldebet&deviceType=1&numFormat=en-GB&countryCode=BR',
      );

      return data.virtualSportNodes;
    } catch (error) {
      console.error('[GetChampions] Error:', error);
      return [];
    }
  }

  static async getGames(req: {
    dbId: number;
    id: number;
    champId: number;
  }): Promise<VirtualSportChampGame[]> {
    try {
      const { data } = await this.instance.get<{
        events: VirtualSportChampGame[];
      }>(
        `GetVirtualEventList?culture=pt-BR&timezoneOffset=180&integration=goldebet&deviceType=1&numFormat=en-GB&countryCode=BR&champId=${req.champId}&id=${req.id}&dbId=${req.dbId}`,
      );

      await new Promise(resolve => setTimeout(resolve, 1500))
      return data.events;
    } catch (error) {
      console.error('[GetGames] Error:', error);
      return [];
    }
  }

  static async getGameDetails(req: {
    dbId: number;
    id: number;
    eventId: number;
  }): Promise<VirtualSportChampGameDetail | undefined> {
    try {
      const { data } = await this.instance.get<VirtualSportChampGameDetail>(
        `GetVirtualEventDetails?culture=pt-BR&timezoneOffset=180&integration=goldebet&deviceType=1&numFormat=en-GB&countryCode=BR&eventId=${req.eventId}&id=${req.id}&dbId=${req.dbId}`,
      );

      return data;
    } catch (error) {
      const axiosError = error as AxiosError;

      if (axiosError.response) {
        console.log('[GetGameDetails] Error Response:', {
          status: axiosError.response.status,
          data: axiosError.response.data,
          headers: axiosError.response.headers,
        });
      } else {
        console.log('[GetGameDetails] Error:', axiosError.message);
      }
    }
  }
}
