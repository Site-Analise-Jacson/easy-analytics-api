export abstract class AggregateRoot<T extends Record<string, any>> {
  public readonly props: T;
  constructor(props: T) {
    this.props = props;
  }
}
