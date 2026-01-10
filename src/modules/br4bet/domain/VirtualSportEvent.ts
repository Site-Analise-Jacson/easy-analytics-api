import { AggregateRoot } from 'src/shared/domain/AggregateRoot';
import { EntityIdentifier } from 'src/shared/domain/EntityIdentifier';
import { failure, Result, success } from 'src/shared/types/result';
import z from 'zod';

const VirtualSportOddSchema = z.object({
  price: z.number(),
  tag: z.string(),
});

const VirtualSportSingleEventSchema = z.object({
  tag: z.string(),
  odds: z.array(VirtualSportOddSchema),
});

export const VirtualSportEventSchema = z.object({
  id: z.string(),
  tag: z.string(),
  events: z.array(VirtualSportSingleEventSchema),
});

type VirtualSportEventSchemaProps = z.infer<typeof VirtualSportEventSchema>;

export class VirtualSportEvent extends AggregateRoot<VirtualSportEventSchemaProps> {
  get id(): string {
    return this.props.id;
  }

  get tag(): string {
    return this.props.tag;
  }

  get events() {
    return this.props.events;
  }

  static create(
    props: Omit<VirtualSportEventSchemaProps, 'id'> & { id?: string },
  ): Result<VirtualSportEvent, Error> {
    const id = new EntityIdentifier(props.id).value;

    const validation = VirtualSportEventSchema.safeParse({ ...props, id });

    if (!validation.success) {
      const message = JSON.stringify(validation.error.format(), null, 2);
      return failure(new Error(message));
    }

    const result = new VirtualSportEvent(validation.data);
    return success(result);
  }
}
