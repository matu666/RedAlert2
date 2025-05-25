// 事件监听器函数类型
type EventListener<T = any> = (data: T, eventType: string) => void;

// 事件接口
interface IEvent<T = any> {
  subscribe(listener: EventListener<T>): void;
  subscribeOnce(listener: EventListener<T>): void;
  unsubscribe(listener: EventListener<T>): void;
}

// 事件分发器类
export class EventDispatcher<T = any> implements IEvent<T> {
  private listeners: Set<EventListener<T>>;

  constructor() {
    this.listeners = new Set<EventListener<T>>();
  }

  subscribe(listener: EventListener<T>): void {
    this.listeners.add(listener);
  }

  subscribeOnce(listener: EventListener<T>): void {
    let onceListener: EventListener<T> | undefined = (data: T, eventType: string) => {
      listener(data, eventType);
      this.unsubscribe(onceListener!);
      onceListener = undefined;
    };
    this.subscribe(onceListener);
  }

  unsubscribe(listener: EventListener<T>): void {
    this.listeners.delete(listener);
  }

  dispatch(eventType: string, data: T): void {
    this.listeners.forEach((listener) => listener(data, eventType));
  }

  asEvent(): IEvent<T> {
    return this;
  }
}
