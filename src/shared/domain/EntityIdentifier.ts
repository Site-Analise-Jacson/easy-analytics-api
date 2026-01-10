import { v4 as uuidv4 } from 'uuid';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class EntityIdentifier {
  private readonly _value: string;

  constructor(id?: string) {
    if (id && !uuidRegex.test(id)) {
      throw new Error('Invalid UUID format');
    }

    this._value = id ?? uuidv4();
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: EntityIdentifier): boolean {
    return this._value === other.value;
  }
}
