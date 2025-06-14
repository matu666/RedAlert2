export class Serializable {
  // 基础序列化接口
  serialize(): any {
    return {};
  }

  deserialize(data: any): void {
    // 默认实现为空
  }
}