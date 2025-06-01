import { ObjectType } from '@/engine/type/ObjectType';

interface Unit {
  name: string;
  cost: number;
  isAvailableTo: (owner: any) => boolean;
  hasOwner: (owner: any) => boolean;
}

interface GeneratedUnit {
  name: string;
  type: ObjectType;
  count: number;
}

export class StartingUnitsGenerator {
  /**
   * 生成初始单位
   * @param multiplier 成本乘数
   * @param preferredUnits 优先单位列表
   * @param availableUnits 可用单位列表
   * @param owner 所有者
   * @returns 生成的单位列表
   */
  static generate(
    multiplier: number,
    preferredUnits: string[],
    availableUnits: Unit[],
    owner: any
  ): GeneratedUnit[] {
    // 计算总成本
    const totalCost = (availableUnits.reduce((sum, unit) => sum + unit.cost, 0) / availableUnits.length) * multiplier;
    
    const generatedUnits: GeneratedUnit[] = [];
    let remainingCost = totalCost;

    // 过滤可用单位
    const filteredUnits = availableUnits.filter(
      unit => unit.isAvailableTo(owner) && unit.hasOwner(owner)
    );

    // 处理优先单位(车辆)
    const preferredUnitList = filteredUnits.filter(unit => preferredUnits.includes(unit.name));
    for (const unit of preferredUnitList) {
      if (remainingCost <= 0) break;

      const costPerUnit = (2/3) / preferredUnitList.length;
      const unitCount = Math.ceil((costPerUnit * totalCost) / unit.cost);
      
      remainingCost -= unitCount * unit.cost;
      generatedUnits.push({
        name: unit.name,
        type: ObjectType.Vehicle,
        count: unitCount
      });
    }

    // 处理剩余单位(步兵)
    const remainingUnits = filteredUnits.filter(unit => !preferredUnitList.includes(unit));
    const costPerRemainingUnit = remainingCost / remainingUnits.length;

    for (const unit of remainingUnits) {
      if (remainingCost <= 0) break;

      const unitCount = Math.ceil(costPerRemainingUnit / unit.cost);
      remainingCost -= unitCount * unit.cost;
      
      generatedUnits.push({
        name: unit.name,
        type: ObjectType.Infantry,
        count: unitCount
      });
    }

    return generatedUnits;
  }
}