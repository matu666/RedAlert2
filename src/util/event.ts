// src/util/event.ts

// Type for the event listener callback
// T is the type of the sender, U is the type of the event arguments
export type EventListener<T, U> = (args: U, sender: T) => void;

export class EventDispatcher<T, U> {
  private listeners: Set<EventListener<T, U>> = new Set();

  constructor() {}

  public subscribe(listener: EventListener<T, U>): void {
    this.listeners.add(listener);
  }

  public subscribeOnce(listener: EventListener<T, U>): void {
    const onceWrapper: EventListener<T, U> = (args, sender) => {
      listener(args, sender);
      this.unsubscribe(onceWrapper);
    };
    this.subscribe(onceWrapper);
  }

  public unsubscribe(listener: EventListener<T, U>): void {
    this.listeners.delete(listener);
  }

  public dispatch(sender: T, args: U): void {
    // Iterate over a copy of listeners in case a listener unsubscribes itself during dispatch
    const listenersToNotify = Array.from(this.listeners);
    listenersToNotify.forEach((listener) => listener(args, sender));
  }

  /**
   * Returns an interface that only exposes subscription-related methods.
   * This can be used to prevent external code from dispatching events.
   */
  public asEvent(): { 
    subscribe: (listener: EventListener<T, U>) => void;
    subscribeOnce: (listener: EventListener<T, U>) => void;
    unsubscribe: (listener: EventListener<T, U>) => void;
  } {
    return {
      subscribe: this.subscribe.bind(this),
      subscribeOnce: this.subscribeOnce.bind(this),
      unsubscribe: this.unsubscribe.bind(this),
    };
  }
} 