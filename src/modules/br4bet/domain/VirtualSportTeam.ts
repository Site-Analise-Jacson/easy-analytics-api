import { AggregateRoot } from 'src/shared/domain/AggregateRoot';
import { EntityIdentifier } from 'src/shared/domain/EntityIdentifier';
import { failure, Result, success } from 'src/shared/types/result';
import z from 'zod';

export const VirtualSportTeamSchema = z.object({
  id: z.string(),
  external_id: z.string().optional(),
  name: z.string(),
});

type VirtualSportTeamSchemaProps = z.infer<typeof VirtualSportTeamSchema>;

export class VirtualSportTeam extends AggregateRoot<VirtualSportTeamSchemaProps> {
  get id(): string {
    return new EntityIdentifier(this.props.id).value;
  }

  get externalId() {
    return this.props.external_id;
  }

  get name(): string {
    return this.props.name;
  }

  static create(
    props: Omit<VirtualSportTeamSchemaProps, 'id'> & { id?: string },
  ): Result<VirtualSportTeam, Error> {
    const id = new EntityIdentifier(props.id).value;

    const validation = VirtualSportTeamSchema.safeParse({ ...props, id });

    if (!validation.success) {
      const message = JSON.stringify(validation.error.format(), null, 2);
      return failure(new Error(message));
    }

    const result = new VirtualSportTeam(validation.data);
    return success(result);
  }
}
