import { PointerType } from "@/engine/type/PointerType";
import { OrderFeedbackType } from "./OrderFeedbackType";

export abstract class Order {
  protected orderType: any;
  protected targetOptional: boolean = true;
  protected minimapAllowed: boolean = true;
  protected singleSelectionRequired: boolean = false;
  protected terminal: boolean = false;
  protected feedbackType: OrderFeedbackType = OrderFeedbackType.None;
  protected sourceObject: any;
  protected target: any;

  constructor(orderType: any) {
    this.orderType = orderType;
  }

  getPointerType(isMini: boolean, target?: any): PointerType {
    return isMini ? PointerType.Mini : PointerType.Default;
  }

  set(sourceObject: any, target: any): Order {
    this.sourceObject = sourceObject;
    this.target = target;
    return this;
  }

  isValid(): boolean {
    return true;
  }

  isAllowed(): boolean {
    return true;
  }

  onAdd(tasks: any[], isQueued: boolean): boolean {
    return true;
  }
}