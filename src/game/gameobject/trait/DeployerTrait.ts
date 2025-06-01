import { StanceType } from "../infantry/StanceType";
import { NotifyTick } from "./interface/NotifyTick";

// 部署开火状态枚举
enum DeployFireState {
  None = 0,
  PreparingToFire = 1,
  FiringUp = 2,
  Firing = 3
}

// 游戏对象接口定义
interface GameObject {
  isInfantry(): boolean;
  stance: StanceType;
  ammo: number;
  art: { fireUp: number };
  isFiring: boolean;
  onBridge: boolean;
  tile: any;
  primaryWeapon?: Weapon;
  secondaryWeapon?: Weapon;
  armedTrait?: {
    getDeployFireWeapon(): Weapon | undefined;
  };
  rules: {
    undeployDelay?: number;
  };
}

// 武器接口定义
interface Weapon {
  rules: {
    areaFire?: boolean;
    fireOnce?: boolean;
    radLevel?: number;
  };
  fire(target: any, context: any): void;
  getCooldownTicks(): number;
  resetCooldown(): void;
}

// 游戏上下文接口定义
interface GameContext {
  map: {
    tileOccupation: {
      getBridgeOnTile(tile: any): any;
    };
  };
  mapRadiationTrait: {
    getRadSiteLevel(tile: any): number;
  };
  rules: {
    radiation: {
      radDurationMultiple: number;
      radLevelDelay: number;
    };
  };
  createTarget(bridge: any, tile: any): any;
}

/**
 * 部署者特性类 - 处理单位的部署和部署开火逻辑
 */
export class DeployerTrait implements NotifyTick {
  private gameObject: GameObject;
  private deployed: boolean = false;
  private deployFireDelay: number = 0;
  private deployFireState: DeployFireState = DeployFireState.None;
  private fireUpDelay: number = 0;
  private deployFireCount: number = 0;
  private deployWeapon?: Weapon;
  private undeployDelay?: number;

  constructor(gameObject: GameObject) {
    this.gameObject = gameObject;
  }

  /**
   * 检查是否已部署
   */
  isDeployed(): boolean {
    return this.deployed;
  }

  /**
   * 设置部署状态
   */
  setDeployed(deployed: boolean): void {
    const wasDeployed = this.deployed;
    
    if ((this.deployed = deployed) !== wasDeployed) {
      const gameObject = this.gameObject;
      
      // 如果是步兵，更新姿态
      if (gameObject.isInfantry()) {
        gameObject.stance = deployed ? StanceType.Deployed : StanceType.None;
      }
      
      if (deployed) {
        // 开始部署
        this.deployFireState = DeployFireState.PreparingToFire;
        
        // 获取部署武器
        const deployWeapon = gameObject.armedTrait?.getDeployFireWeapon();
        this.deployWeapon = deployWeapon?.rules.areaFire ? deployWeapon : undefined;
        
        // 设置部署开火延迟
        const otherWeapon = deployWeapon === gameObject.primaryWeapon 
          ? gameObject.secondaryWeapon 
          : gameObject.primaryWeapon;
        this.deployFireDelay = 15 + (otherWeapon?.getCooldownTicks() ?? 0);
        
        this.deployFireCount = 0;
        this.undeployDelay = gameObject.rules.undeployDelay || undefined;
      } else {
        // 取消部署
        if (this.deployFireState === DeployFireState.FiringUp) {
          gameObject.isFiring = false;
        }
        this.deployFireState = DeployFireState.None;
        this.deployWeapon = undefined;
      }
    }
  }

  /**
   * 切换部署状态
   */
  toggleDeployed(): void {
    this.setDeployed(!this.isDeployed());
  }

  /**
   * 每帧更新逻辑
   */
  [NotifyTick.onTick](gameObject: GameObject, context: GameContext): void {
    // 处理自动取消部署
    if (this.undeployDelay !== undefined) {
      if (this.undeployDelay > 0) {
        this.undeployDelay--;
      }
      
      if (this.undeployDelay <= 0 && 
          [DeployFireState.None, DeployFireState.PreparingToFire].includes(this.deployFireState)) {
        this.undeployDelay = undefined;
        this.setDeployed(false);
        return;
      }
    }

    // 处理部署武器开火逻辑
    if (this.deployWeapon && this.deployFireState !== DeployFireState.None) {
      
      // 准备开火阶段
      if (this.deployFireState === DeployFireState.PreparingToFire) {
        if (this.deployFireDelay > 0) {
          this.deployFireDelay--;
          return;
        }
        
        if (gameObject.ammo === 0) {
          return;
        }
        
        if (this.computeDeployFireCooldown(this.deployWeapon, context) > 0) {
          return;
        }
        
        this.fireUpDelay = Math.max(1, gameObject.art.fireUp);
        this.deployFireState = DeployFireState.FiringUp;
      }
      
      // 开火准备阶段
      if (this.deployFireState === DeployFireState.FiringUp) {
        gameObject.isFiring = true;
        
        if (this.fireUpDelay > 0) {
          this.fireUpDelay--;
          return;
        }
        
        this.deployFireState = DeployFireState.Firing;
      }
      
      // 开火阶段
      if (this.deployFireState === DeployFireState.Firing) {
        gameObject.isFiring = false;
        
        // 确定目标（考虑桥梁）
        const bridge = gameObject.onBridge 
          ? context.map.tileOccupation.getBridgeOnTile(gameObject.tile)
          : undefined;
        
        // 开火
        this.deployWeapon.fire(context.createTarget(bridge, gameObject.tile), context);
        this.deployFireCount++;
        
        // 重置其他武器冷却
        const otherWeapon = this.deployWeapon === gameObject.primaryWeapon 
          ? gameObject.secondaryWeapon 
          : gameObject.primaryWeapon;
        otherWeapon?.resetCooldown();
        
        // 检查是否只开火一次
        if (this.deployWeapon.rules.fireOnce) {
          this.deployFireState = DeployFireState.None;
          this.deployWeapon = undefined;
        } else {
          this.deployFireState = DeployFireState.PreparingToFire;
        }
      }
    }
  }

  /**
   * 计算部署开火冷却时间
   */
  private computeDeployFireCooldown(weapon: Weapon, context: GameContext): number {
    if (weapon.rules.radLevel && weapon.rules.areaFire) {
      const tile = this.gameObject.tile;
      const radLevel = context.mapRadiationTrait.getRadSiteLevel(tile);
      
      if (!radLevel) {
        return 0;
      }
      
      const radiation = context.rules.radiation;
      let cooldown = Math.max(
        0,
        radLevel * radiation.radDurationMultiple - radiation.radLevelDelay
      );
      
      // 首次开火减少冷却时间
      if (this.deployFireCount === 1) {
        const radDuration = radiation.radDurationMultiple * weapon.rules.radLevel!;
        cooldown = Math.max(0, cooldown - Math.floor(0.25 * radDuration));
      }
      
      return cooldown;
    }
    
    return weapon.getCooldownTicks();
  }

  /**
   * 获取状态哈希值
   */
  getHash(): number {
    return this.deployed ? 1 : 0;
  }

  /**
   * 获取调试状态
   */
  debugGetState(): { deployed: boolean } {
    return { deployed: this.deployed };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.gameObject = undefined as any;
  }
}
  