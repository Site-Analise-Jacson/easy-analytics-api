import { AggregateRoot } from 'src/shared/domain/AggregateRoot';
import { EntityIdentifier } from 'src/shared/domain/EntityIdentifier';
import { failure, Result, success } from 'src/shared/types/result';
import z from 'zod';
import { VirtualSportTeamSchema } from './VirtualSportTeam';
import { VirtualSportEventSchema } from './VirtualSportEvent';

// === Resultado do Jogo (HT/FT) ===
export const VirtualSportGameResultSchema = z.object({
  price: z.number().nullable().optional(),
  home: z.string().nullable().optional(),
  away: z.string().nullable().optional(),
});

// === Entidade Principal do Jogo ===
export const VirtualSportGameSchema = z.object({
  id: z.string(),
  external_id: z.string().optional(),
  tag: z.string(),
  status: z.string(),
  startDate: z.coerce.date(),
  champion: z.string(),
  championId: z.number(),
  teams: z.array(VirtualSportTeamSchema),
  event_groups: z.array(VirtualSportEventSchema),
  FT: VirtualSportGameResultSchema.optional(),
  HT: VirtualSportGameResultSchema.optional(),

  // 🆕 Novos campos:
  dbId: z.number(),
  eventId: z.number(),
  subId: z.number(),
});

type VirtualSportGameResultProps = z.infer<typeof VirtualSportGameResultSchema>;
type VirtualSportGameSchemaProps = z.infer<typeof VirtualSportGameSchema>;

export class VirtualSportGame extends AggregateRoot<VirtualSportGameSchemaProps> {
  get id(): string {
    return this.props.id;
  }

  get ft() {
    return this.props.FT;
  }

  get ht() {
    return this.props.HT;
  }

  get tag(): string {
    return this.props.tag;
  }

  get teams() {
    return this.props.teams;
  }

  get externalId(): string | undefined {
    return this.props.external_id;
  }

  get champion(): string {
    return this.props.champion;
  }

  get status(): string {
    return this.props.status;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get championId(): number {
    return this.props.championId;
  }

  get eventGroups() {
    return this.props.event_groups;
  }

  // 🆕 Getters dos novos campos
  get dbId(): number {
    return this.props.dbId;
  }

  get eventId(): number {
    return this.props.eventId;
  }

  get subId(): number {
    return this.props.subId;
  }

  set ht(data: VirtualSportGameResultProps | undefined) {
    if (data) this.props.HT = data;
  }

  set ft(data: VirtualSportGameResultProps | undefined) {
    if (data) this.props.FT = data;
  }

  static create(
    props: Omit<VirtualSportGameSchemaProps, 'id'> & { id?: string },
  ): Result<VirtualSportGame, Error> {
    const id = new EntityIdentifier(props?.id).value;

    const validation = VirtualSportGameSchema.safeParse({ ...props, id });

    if (!validation.success) {
      const message = JSON.stringify(validation.error.format(), null, 2);
      return failure(new Error(message));
    }

    const result = new VirtualSportGame(validation.data);
    return success(result);
  }
}
