import { ObjectType } from "@/engine/type/ObjectType";
import { SideType } from "@/game/SideType";
import { SpeedType } from "@/game/type/SpeedType";
import { PipColor } from "@/game/type/PipColor";
import { LocomotorType } from "@/game/type/LocomotorType";
import { MovementZone } from "@/game/type/MovementZone";
import { ArmorType } from "@/game/type/ArmorType";
import { LandTargeting } from "@/game/type/LandTargeting";
import { NavalTargeting } from "@/game/type/NavalTargeting";
import { ObjectRules } from "@/game/rules/ObjectRules";
import { WeaponType } from "@/game/WeaponType";
import { VeteranAbility } from "@/game/gameobject/unit/VeteranAbility";
import { VhpScan } from "@/game/type/VhpScan";
import { Vector3 } from "@/game/math/Vector3";

// Minimal definition to satisfy type references within this file
interface House {
  name: string;
}

export enum BuildCat {
  Combat = 0,
  Tech = 1,
  Resource = 2,
  Power = 3
}

export enum FactoryType {
  None = 0,
  BuildingType = 1,
  InfantryType = 2,
  UnitType = 3,
  NavalUnitType = 4,
  AircraftType = 5
}

export class TechnoRules extends ObjectRules {
  static readonly MAX_SIGHT = 11;

  // Properties from parsing
  owner: string[];
  aiBasePlanningSide?: number;
  requiredHouses: string[];
  forbiddenHouses: string[];
  requiresStolenAlliedTech: boolean;
  requiresStolenSovietTech: boolean;
  techLevel: number;
  cost: number;
  points: number;
  power: number;
  powered: boolean;
  prerequisite: string[];
  soylent: number;
  crateGoodie: boolean;
  buildCat: BuildCat;
  adjacent: number;
  baseNormal: boolean;
  buildLimit: number;
  airRangeBonus: number;
  guardRange: number;
  defaultToGuardArea: boolean;
  eligibileForAllyBuilding: boolean;
  numberImpassableRows: number;
  bridgeRepairHut: boolean;
  constructionYard: boolean;
  refinery: boolean;
  unitRepair: boolean;
  unitReload: boolean;
  unitSell: boolean;
  isBaseDefense: boolean;
  superWeapon?: string;
  chargedAnimTime: number;
  naval: boolean;
  underwater: boolean;
  waterBound: boolean;
  orePurifier: boolean;
  cloning: boolean;
  grinding: boolean;
  nukeSilo: boolean;
  repairable: boolean;
  clickRepairable: boolean;
  unsellable: boolean;
  returnable: boolean;
  gdiBarracks: boolean;
  nodBarracks: boolean;
  numberOfDocks: number;
  factory: FactoryType;
  weaponsFactory: boolean;
  helipad: boolean;
  hospital: boolean;
  landTargeting: LandTargeting;
  navalTargeting: NavalTargeting;
  tooBigToFitUnderBridge: boolean;
  canBeOccupied: boolean;
  maxNumberOccupants: number;
  leaveRubble: boolean;
  undeploysInto: string;
  deploysInto: string;
  deployTime: number;
  capturable: boolean;
  spyable: boolean;
  needsEngineer: boolean;
  c4: boolean;
  canC4: boolean;
  eligibleForDelayKill: boolean;
  produceCashStartup: number;
  produceCashAmount: number;
  produceCashDelay: number;
  explosion: string[];
  explodes: boolean;
  ifvMode: number;
  turretIndexesByIfvMode: Map<number, number>;
  turret: boolean;
  turretCount: number;
  turretAnim: string;
  turretAnimIsVoxel: boolean;
  turretAnimX: number;
  turretAnimY: number;
  turretAnimZAdjust: number;
  isChargeTurret: boolean;
  overpowerable: boolean;
  freeUnit: string;
  primary?: string;
  secondary?: string;
  elitePrimary?: string;
  eliteSecondary?: string;
  weaponCount: number;
  deathWeapon?: string;
  deathWeaponDamageModifier: number;
  occupyWeapon?: string;
  eliteOccupyWeapon?: string;
  veteranAbilities: Set<VeteranAbility>;
  eliteAbilities: Set<VeteranAbility>;
  selfHealing: boolean;
  wall: boolean;
  gate: boolean;
  armor: ArmorType;
  strength: number;
  immune: boolean;
  immuneToRadiation: boolean;
  immuneToPsionics: boolean;
  typeImmune: boolean;
  warpable: boolean;
  isTilter: boolean;
  walkRate: number;
  idleRate: number;
  noSpawnAlt: boolean;
  crusher: boolean;
  consideredAircraft: boolean;
  crashable: boolean;
  landable: boolean;
  airportBound: boolean;
  balloonHover: boolean;
  hoverAttack: boolean;
  omniFire: boolean;
  fighter: boolean;
  flightLevel?: number;
  locomotor: LocomotorType;
  speedType?: SpeedType;
  speed: number;
  movementZone: MovementZone;
  fearless: boolean;
  deployer: boolean;
  deployFire: boolean;
  deployFireWeapon: number;
  undeployDelay: number;
  fraidycat: boolean;
  isHuman: boolean;
  organic: boolean;
  occupier: boolean;
  engineer: boolean;
  ivan: boolean;
  civilian: boolean;
  agent: boolean;
  infiltrate: boolean;
  threatPosed: number;
  specialThreatValue: number;
  canPassiveAquire: boolean;
  canRetaliate: boolean;
  preventAttackMove: boolean;
  opportunityFire: boolean;
  distributedFire: boolean;
  radialFireSegments: number;
  attackCursorOnFriendlies: boolean;
  bombable: boolean;
  trainable: boolean;
  crewed: boolean;
  parasiteable: boolean;
  suppressionThreshold: number;
  reselectIfLimboed: boolean;
  rejoinTeamIfLimboed: boolean;
  weight: number;
  accelerates: boolean;
  accelerationFactor: number;
  teleporter: boolean;
  canDisguise: boolean;
  disguiseWhenStill: boolean;
  permaDisguise: boolean;
  detectDisguise: boolean;
  detectDisguiseRange: number;
  cloakable: boolean;
  sensors: boolean;
  sensorArray: boolean;
  sensorsSight: number;
  burstDelay: (number | undefined)[];
  vhpScan: VhpScan;
  pip: PipColor;
  passengers: number;
  gunner: boolean;
  ammo: number;
  initialAmmo: number;
  manualReload: boolean;
  storage: number;
  spawned: boolean;
  spawns: string;
  spawnsNumber: number;
  spawnRegenRate: number;
  spawnReloadRate: number;
  missileSpawn: boolean;
  size: number;
  sizeLimit: number;
  sight: number;
  spySat: boolean;
  gapGenerator: boolean;
  gapRadiusInCells: number;
  psychicDetectionRadius: number;
  hasRadialIndicator: boolean;
  harvester: boolean;
  unloadingClass: string;
  dock: string[];
  radar: boolean;
  radarInvisible: boolean;
  revealToAll: boolean;
  selectable: boolean;
  isSelectableCombatant: boolean;
  invisibleInGame: boolean;
  moveToShroud: boolean;
  leadershipRating: number;
  unnatural: boolean;
  natural: boolean;
  buildTimeMultiplier: number;
  allowedToStartInMultiplayer: boolean;
  rot: number;
  jumpjetAccel: number;
  jumpjetClimb: number;
  jumpjetCrash: number;
  jumpjetDeviation: number;
  jumpjetHeight: number;
  jumpjetNoWobbles: boolean;
  jumpjetSpeed: number;
  jumpjetTurnRate: number;
  jumpjetWobbles: number;
  pitchSpeed: number;
  pitchAngle: number;
  damageParticleSystems: string[];
  damageSmokeOffset: Vector3;
  minDebris: number;
  maxDebris: number;
  debrisTypes: string[];
  debrisAnims: string[];
  isLightpost: boolean;
  lightVisibility: number;
  lightIntensity: number;
  lightRedTint: number;
  lightGreenTint: number;
  lightBlueTint: number;
  ambientSound?: string;
  createSound?: string;
  deploySound?: string;
  undeploySound?: string;
  voiceSelect?: string;
  voiceMove?: string;
  voiceAttack?: string;
  voiceFeedback?: string;
  voiceSpecialAttack?: string;
  voiceEnter?: string;
  voiceCapture?: string;
  voiceCrashing?: string;
  crashingSound?: string;
  impactLandSound?: string;
  auxSound1?: string;
  auxSound2?: string;
  dieSound?: string;
  moveSound?: string;
  enterWaterSound?: string;
  leaveWaterSound?: string;
  turretRotateSound?: string;
  workingSound?: string;
  notWorkingSound?: string;
  chronoInSound?: string;
  chronoOutSound?: string;
  enterTransportSound?: string;
  leaveTransportSound?: string;

  constructor(e: any, t: any, i: any, r: any) {
    super(e, t, i, r);
  }

  parse(): void {
    super.parse();
    this.owner = this.ini.getArray("Owner");

    const aiBasePlanningValue = this.ini.getNumber("AIBasePlanningSide");
    this.aiBasePlanningSide = (-1 !== aiBasePlanningValue && void 0 !== SideType[aiBasePlanningValue]) ? aiBasePlanningValue : void 0;

    this.requiredHouses = this.ini.getArray("RequiredHouses");
    this.forbiddenHouses = this.ini.getArray("ForbiddenHouses");
    this.requiresStolenAlliedTech = this.ini.getBool("RequiresStolenAlliedTech");
    this.requiresStolenSovietTech = this.ini.getBool("RequiresStolenSovietTech");
    this.techLevel = this.ini.getNumber("TechLevel", -1);
    this.cost = this.ini.getNumber("Cost");
    this.points = this.ini.getNumber("Points");
    this.power = this.ini.getNumber("Power");
    this.powered = this.ini.getBool("Powered");
    this.prerequisite = this.ini.getArray("Prerequisite");
    this.soylent = this.ini.getNumber("Soylent");
    this.crateGoodie = this.ini.getBool("CrateGoodie");
    this.buildCat = this.ini.getEnum("BuildCat", BuildCat, BuildCat.Combat);
    this.adjacent = this.ini.getNumber("Adjacent", 1);
    this.baseNormal = this.ini.getBool("BaseNormal", true);
    this.buildLimit = this.ini.getNumber("BuildLimit", Number.POSITIVE_INFINITY);
    this.airRangeBonus = this.ini.getNumber("AirRangeBonus");
    this.guardRange = this.ini.getNumber("GuardRange");
    this.defaultToGuardArea = this.ini.getBool("DefaultToGuardArea");
    this.eligibileForAllyBuilding = this.ini.getBool("EligibileForAllyBuilding");
    this.numberImpassableRows = this.ini.getNumber("NumberImpassableRows");
    this.bridgeRepairHut = this.ini.getBool("BridgeRepairHut");
    this.constructionYard = this.ini.getBool("ConstructionYard");
    this.refinery = this.ini.getBool("Refinery");
    this.unitRepair = this.ini.getBool("UnitRepair");
    this.unitReload = this.ini.getBool("UnitReload");
    this.unitSell = this.ini.getBool("UnitSell");
    this.isBaseDefense = this.ini.getBool("IsBaseDefense");
    this.superWeapon = this.parseWeaponName(this.ini.getString("SuperWeapon"));
    this.chargedAnimTime = this.ini.getNumber("ChargedAnimTime");

    const naval = this.ini.getBool("Naval");
    this.naval = naval;
    this.underwater = this.ini.getBool("Underwater");
    this.waterBound = this.ini.getBool("WaterBound");
    this.orePurifier = this.ini.getBool("OrePurifier");
    this.cloning = this.ini.getBool("Cloning");
    this.grinding = this.ini.getBool("Grinding");
    this.nukeSilo = this.ini.getBool("NukeSilo");
    this.repairable = this.ini.getBool("Repairable", this.type === ObjectType.Building);
    this.clickRepairable = this.ini.getBool("ClickRepairable", this.type === ObjectType.Building);
    this.unsellable = this.ini.getBool("Unsellable", this.type !== ObjectType.Building && this.generalRules.unitsUnsellable);
    this.returnable = this.ini.getBool("Returnable", this.generalRules.returnStructures);
    this.gdiBarracks = this.ini.getBool("GDIBarracks");
    this.nodBarracks = this.ini.getBool("NODBarracks");
    this.numberOfDocks = this.ini.getNumber("NumberOfDocks");

    if (this.unitRepair && !this.numberOfDocks) {
      this.numberOfDocks = 1;
    }

    this.factory = this.ini.getEnum("Factory", FactoryType, FactoryType.None);
    if (this.factory === FactoryType.UnitType && naval) {
      this.factory = FactoryType.NavalUnitType;
    }

    this.weaponsFactory = this.ini.getBool("WeaponsFactory");
    this.helipad = this.ini.getBool("Helipad");
    this.hospital = this.ini.getBool("Hospital");
    this.landTargeting = this.ini.getEnumNumeric("LandTargeting", LandTargeting, LandTargeting.LandOk);
    this.navalTargeting = this.ini.getEnumNumeric("NavalTargeting", NavalTargeting, NavalTargeting.UnderwaterNever);
    this.tooBigToFitUnderBridge = this.ini.getBool("TooBigToFitUnderBridge", this.type === ObjectType.Building);
    this.canBeOccupied = this.ini.getBool("CanBeOccupied");
    this.maxNumberOccupants = this.ini.getNumber("MaxNumberOccupants");
    this.leaveRubble = this.ini.getBool("LeaveRubble");
    this.undeploysInto = this.ini.getString("UndeploysInto");
    this.deploysInto = this.ini.getString("DeploysInto");
    this.deployTime = this.ini.getNumber("DeployTime");
    this.capturable = this.ini.getBool("Capturable");
    this.spyable = this.ini.getBool("Spyable");
    this.needsEngineer = this.ini.getBool("NeedsEngineer");
    this.c4 = this.ini.getBool("C4");
    this.canC4 = this.ini.getBool("CanC4", true);
    this.eligibleForDelayKill = this.ini.getBool("EligibleForDelayKill");
    this.produceCashStartup = this.ini.getNumber("ProduceCashStartup");
    this.produceCashAmount = this.ini.getNumber("ProduceCashAmount");
    this.produceCashDelay = this.ini.getNumber("ProduceCashDelay");
    this.explosion = this.ini.getArray("Explosion");
    this.explodes = this.ini.getBool("Explodes");
    this.ifvMode = this.ini.getNumber("IFVMode");
    this.turretIndexesByIfvMode = this.parseTurretIndexes();
    this.turret = this.ini.getBool("Turret");
    this.turretCount = this.ini.getNumber("TurretCount", this.turret ? 1 : 0);
    this.turretAnim = this.ini.getString("TurretAnim");
    this.turretAnimIsVoxel = this.ini.getBool("TurretAnimIsVoxel");
    this.turretAnimX = this.ini.getNumber("TurretAnimX");
    this.turretAnimY = this.ini.getNumber("TurretAnimY");
    this.turretAnimZAdjust = this.ini.getNumber("TurretAnimZAdjust");
    this.isChargeTurret = this.ini.getBool("IsChargeTurret");
    this.overpowerable = this.ini.getBool("Overpowerable");
    this.freeUnit = this.ini.getString("FreeUnit");
    this.primary = this.parseWeaponName(this.ini.getString("Primary"));
    this.secondary = this.parseWeaponName(this.ini.getString("Secondary"));
    this.elitePrimary = this.parseWeaponName(this.ini.getString("ElitePrimary"));
    this.eliteSecondary = this.parseWeaponName(this.ini.getString("EliteSecondary"));
    this.weaponCount = this.ini.getNumber("WeaponCount");
    this.deathWeapon = this.parseWeaponName(this.ini.getString("DeathWeapon"));
    this.deathWeaponDamageModifier = this.ini.getNumber("DeathWeaponDamageModifier", 1);
    this.occupyWeapon = this.parseWeaponName(this.ini.getString("OccupyWeapon"));
    this.eliteOccupyWeapon = this.parseWeaponName(this.ini.getString("EliteOccupyWeapon"));
    this.veteranAbilities = new Set(this.ini.getEnumArray("VeteranAbilities", VeteranAbility));
    this.eliteAbilities = new Set([
      ...this.veteranAbilities,
      ...this.ini.getEnumArray("EliteAbilities", VeteranAbility)
    ]);
    this.selfHealing = this.ini.getBool("SelfHealing");
    this.wall = this.ini.getBool("Wall");
    this.gate = this.ini.getBool("Gate");
    this.armor = this.ini.getEnum("Armor", ArmorType, ArmorType.None, true);
    this.strength = Math.floor(this.ini.getNumber("Strength"));
    this.immune = this.ini.getBool("Immune");
    this.immuneToRadiation = this.ini.getBool("ImmuneToRadiation");
    this.immuneToPsionics = this.ini.getBool("ImmuneToPsionics");
    this.typeImmune = this.ini.getBool("TypeImmune");
    this.warpable = this.ini.getBool("Warpable", true);
    this.isTilter = this.ini.getBool("IsTilter", true);
    this.walkRate = this.ini.getNumber("WalkRate", 1);
    this.idleRate = this.ini.getNumber("IdleRate", 0);
    this.noSpawnAlt = this.ini.getBool("NoSpawnAlt");
    this.crusher = this.ini.getBool("Crusher");
    this.consideredAircraft = this.ini.getBool("ConsideredAircraft");
    this.crashable = this.ini.getBool("Crashable");

    const landable = this.ini.getBool("Landable");
    this.landable = landable;
    this.airportBound = this.ini.getBool("AirportBound");
    this.balloonHover = this.ini.getBool("BalloonHover");
    this.hoverAttack = this.ini.getBool("HoverAttack");
    this.omniFire = this.ini.getBool("OmniFire");
    this.fighter = this.ini.getBool("Fighter");
    this.flightLevel = this.ini.getNumber("FlightLevel") || void 0;

    const locomotorString = this.ini.getString("Locomotor");
    let defaultLocomotor = this.type === ObjectType.Building ? LocomotorType.Statue : LocomotorType.Chrono;

    if (locomotorString) {
      const locomotorType = (LocomotorType as any).locomotorTypesByClsId?.get(locomotorString);
      if (locomotorType) {
        this.locomotor = locomotorType;
      } else {
        console.warn(`Object rules "${this.name}" has invalid Locomotor "${locomotorString}"`);
        this.locomotor = defaultLocomotor;
      }
    } else {
      this.locomotor = defaultLocomotor;
    }

    if (this.locomotor !== LocomotorType.Statue) {
      let defaultSpeed = (LocomotorType as any).defaultSpeedsByLocomotor?.get(this.locomotor);
      if (void 0 === defaultSpeed) {
        if (this.type === ObjectType.Aircraft || this.consideredAircraft) {
          defaultSpeed = SpeedType.Winged;
        } else if (this.type === ObjectType.Vehicle) {
          defaultSpeed = this.crusher ? SpeedType.Track : SpeedType.Wheel;
        } else if (this.type === ObjectType.Infantry) {
          defaultSpeed = SpeedType.Foot;
        }
      }
      this.speedType = this.ini.getEnum("SpeedType", SpeedType, defaultSpeed, true);
    }

    const speedMultiplier = [
      LocomotorType.Ship,
      LocomotorType.Vehicle,
      LocomotorType.Chrono
    ].includes(this.locomotor) ? 65 : 100;

    this.speed = ObjectRules.iniSpeedToLeptonsPerTick(this.ini.getNumber("Speed"), speedMultiplier);
    this.movementZone = this.ini.getEnum("MovementZone", MovementZone, MovementZone.Normal);
    this.fearless = this.ini.getBool("Fearless");
    this.deployer = this.ini.getBool("Deployer");
    this.deployFire = this.ini.getBool("DeployFire");
    this.deployFireWeapon = this.ini.getNumber("DeployFireWeapon", WeaponType.Secondary);
    this.undeployDelay = this.ini.getNumber("UndeployDelay");
    this.fraidycat = this.ini.getBool("Fraidycat", false);
    this.isHuman = !this.ini.getBool("NotHuman");
    this.organic = this.type === ObjectType.Infantry || this.ini.getBool("Organic");
    this.occupier = this.ini.getBool("Occupier");
    this.engineer = this.ini.getBool("Engineer");
    this.ivan = this.ini.getBool("Ivan");
    this.civilian = this.ini.getBool("Civilian");
    this.agent = this.ini.getBool("Agent");
    this.infiltrate = this.ini.getBool("Infiltrate");
    this.threatPosed = this.ini.getNumber("ThreatPosed");
    this.specialThreatValue = this.ini.getNumber("SpecialThreatValue");
    this.canPassiveAquire = this.ini.getBool("CanPassiveAquire", true);
    this.canRetaliate = this.ini.getBool("CanRetaliate", true);
    this.preventAttackMove = this.ini.getBool("PreventAttackMove");
    this.opportunityFire = this.ini.getBool("OpportunityFire");
    this.distributedFire = this.ini.getBool("DistributedFire");
    this.radialFireSegments = this.ini.getNumber("RadialFireSegments");
    this.attackCursorOnFriendlies = this.ini.getBool("AttackCursorOnFriendlies");
    this.bombable = this.ini.getBool("Bombable", true);
    this.trainable = this.ini.getBool("Trainable", this.type !== ObjectType.Building);
    this.crewed = this.ini.getBool("Crewed");
    this.parasiteable = this.ini.getBool("Parasiteable", this.type !== ObjectType.Building);
    this.suppressionThreshold = this.ini.getNumber("SuppressionThreshold");
    this.reselectIfLimboed = this.ini.getBool("ReselectIfLimboed");
    this.rejoinTeamIfLimboed = this.ini.getBool("RejoinTeamIfLimboed");
    this.weight = this.ini.getNumber("Weight");
    this.accelerates = this.ini.getBool("Accelerates", true);
    this.accelerationFactor = this.ini.getNumber("AccelerationFactor", 0.03);
    this.teleporter = this.ini.getBool("Teleporter");
    this.canDisguise = this.ini.getBool("CanDisguise");
    this.disguiseWhenStill = this.ini.getBool("DisguiseWhenStill");
    this.permaDisguise = this.ini.getBool("PermaDisguise");
    this.detectDisguise = this.ini.getBool("DetectDisguise");
    this.detectDisguiseRange = this.ini.getNumber("DetectDisguiseRange");
    this.cloakable = this.ini.getBool("Cloakable");
    this.sensors = this.ini.getBool("Sensors");
    this.sensorArray = this.ini.getBool("SensorArray");
    this.sensorsSight = this.ini.getNumber("SensorsSight");
    this.burstDelay = this.parseBurstDelay();
    this.vhpScan = this.ini.getEnum("VHPScan", VhpScan, VhpScan.None, true);
    this.pip = this.ini.getEnum("Pip", PipColor, PipColor.Green, true);
    this.passengers = this.ini.getNumber("Passengers");
    this.gunner = this.ini.getBool("Gunner");
    this.ammo = this.ini.getNumber("Ammo", -1);
    this.initialAmmo = this.ini.getNumber("InitialAmmo", -1);
    this.manualReload = this.ini.getBool("ManualReload", this.type === ObjectType.Aircraft);
    this.storage = this.ini.getNumber("Storage");
    this.spawned = this.ini.getBool("Spawned");
    this.spawns = this.ini.getString("Spawns");
    this.spawnsNumber = this.ini.getNumber("SpawnsNumber");
    this.spawnRegenRate = this.ini.getNumber("SpawnRegenRate");
    this.spawnReloadRate = this.ini.getNumber("SpawnReloadRate");
    this.missileSpawn = this.ini.getBool("MissileSpawn");
    this.size = this.ini.getNumber("Size", 1);
    this.sizeLimit = this.ini.getNumber("SizeLimit");
    this.sight = Math.min(TechnoRules.MAX_SIGHT, this.needsEngineer ? 6 : this.ini.getNumber("Sight", 1));
    this.spySat = this.ini.getBool("SpySat");
    this.gapGenerator = this.ini.getBool("GapGenerator");
    this.gapRadiusInCells = this.ini.getNumber("GapRadiusInCells");
    this.psychicDetectionRadius = this.ini.getNumber("PsychicDetectionRadius");
    this.hasRadialIndicator = this.ini.getBool("HasRadialIndicator");
    this.harvester = this.ini.getBool("Harvester");
    this.unloadingClass = this.ini.getString("UnloadingClass");
    this.dock = this.ini.getArray("Dock");
    this.radar = this.ini.getBool("Radar");
    this.radarInvisible = this.ini.getBool("RadarInvisible");
    this.revealToAll = this.ini.getBool("RevealToAll");
    this.selectable = !(this.type === ObjectType.Aircraft && !landable) && this.ini.getBool("Selectable", true);
    this.isSelectableCombatant = this.ini.getBool("IsSelectableCombatant");
    this.invisibleInGame = this.ini.getBool("InvisibleInGame");
    this.moveToShroud = this.ini.getBool("MoveToShroud", this.type !== ObjectType.Aircraft);
    this.leadershipRating = this.ini.getNumber("LeadershipRating", 5);
    this.unnatural = this.ini.getBool("Unnatural");
    this.natural = this.ini.getBool("Natural");
    this.buildTimeMultiplier = this.ini.getFixed("BuildTimeMultiplier", 1);
    this.allowedToStartInMultiplayer = this.ini.getBool("AllowedToStartInMultiplayer", true);
    this.rot = ObjectRules.iniRotToDegsPerTick(this.ini.getNumber("ROT", 0));
    this.jumpjetAccel = this.ini.getNumber("JumpJetAccel", 2);
    this.jumpjetClimb = this.ini.getNumber("JumpjetClimb", 5);
    this.jumpjetCrash = this.ini.getNumber("JumpjetCrash", 5);
    this.jumpjetDeviation = this.ini.getNumber("JumpjetDeviation", 40);
    this.jumpjetHeight = this.ini.getNumber("JumpjetHeight", 500);
    this.jumpjetNoWobbles = this.ini.getBool("JumpjetNoWobbles");
    this.jumpjetSpeed = this.ini.getNumber("JumpjetSpeed", 14);
    this.jumpjetTurnRate = ObjectRules.iniRotToDegsPerTick(
      this.ini.getNumber("JumpJetTurnRate", 4)
    );
    this.jumpjetWobbles = this.ini.getNumber("JumpjetWobbles", 0.15);
    this.pitchSpeed = this.ini.getNumber("PitchSpeed", 0.25);
    this.pitchAngle = this.pitchSpeed >= 1 ? 0 : 20;
    this.damageParticleSystems = this.ini.getArray("DamageParticleSystems");
    
    const damageSmokeOffsetArray = this.ini.getNumberArray(
      "DamageSmokeOffset",
      undefined,
      [0, 0, 0]
    );
    
    this.damageSmokeOffset = new Vector3(
      damageSmokeOffsetArray[0],
      damageSmokeOffsetArray[2] / Math.SQRT2,
      damageSmokeOffsetArray[1]
    );
    
    this.minDebris = this.ini.getNumber("MinDebris");
    this.maxDebris = this.ini.getNumber("MaxDebris");
    this.debrisTypes = this.ini.getArray("DebrisTypes");
    this.debrisAnims = this.ini.getArray("DebrisAnims");
    this.isLightpost = this.imageName === "GALITE";
    this.lightVisibility = this.ini.getNumber("LightVisibility", 5000);
    this.lightIntensity = this.ini.getNumber("LightIntensity");
    this.lightRedTint = this.ini.getNumber("LightRedTint", 1);
    this.lightGreenTint = this.ini.getNumber("LightGreenTint", 1);
    this.lightBlueTint = this.ini.getNumber("LightBlueTint", 1);
    
    this.ambientSound = this.ini.getString("AmbientSound") || undefined;
    this.createSound = this.ini.getString("CreateSound") || undefined;
    this.deploySound = this.ini.getString("DeploySound") || undefined;
    this.undeploySound = this.ini.getString("UndeploySound") || undefined;
    this.voiceSelect = this.ini.getString("VoiceSelect") || undefined;
    this.voiceMove = this.ini.getString("VoiceMove") || undefined;
    this.voiceAttack = this.ini.getString("VoiceAttack") || undefined;
    this.voiceFeedback = this.ini.getString("VoiceFeedback") || undefined;
    this.voiceSpecialAttack = this.ini.getString("VoiceSpecialAttack") || undefined;
    this.voiceEnter = this.ini.getString("VoiceEnter") || undefined;
    this.voiceCapture = this.ini.getString("VoiceCapture") || undefined;
    this.voiceCrashing = this.ini.getString("VoiceCrashing") || undefined;
    this.crashingSound = this.ini.getString("CrashingSound") || undefined;
    this.impactLandSound = this.ini.getString("ImpactLandSound") || undefined;
    this.auxSound1 = this.ini.getString("AuxSound1") || undefined;
    this.auxSound2 = this.ini.getString("AuxSound2") || undefined;
    this.dieSound = this.ini.getString("DieSound") || undefined;
    this.moveSound = this.ini.getString("MoveSound") || undefined;
    this.enterWaterSound = this.ini.getString("EnterWaterSound") || undefined;
    this.leaveWaterSound = this.ini.getString("LeaveWaterSound") || undefined;
    this.turretRotateSound = this.ini.getString("TurretRotateSound") || undefined;
    this.workingSound = this.ini.getString("WorkingSound") || undefined;
    this.notWorkingSound = this.ini.getString("NotWorkingSound") || undefined;
    this.chronoInSound = this.ini.getString("ChronoInSound") || undefined;
    this.chronoOutSound = this.ini.getString("ChronoOutSound") || undefined;
    this.enterTransportSound = this.ini.getString("EnterTransportSound") || undefined;
    this.leaveTransportSound = this.ini.getString("LeaveTransportSound") || undefined;
  }

  private parseWeaponName(weaponName: string | undefined): string | undefined {
    return weaponName && weaponName.toLowerCase() !== "none" ? weaponName : undefined;
  }

  private parseTurretIndexes(): Map<number, number> {
    const turretIndexMap = new Map<number, number>();
    
    if (this.ini.getBool("Gunner")) {
      this.ini.entries.forEach((value: string, key: string) => {
        const match = key.match(/^(.*)TurretWeapon$/i);
        if (match) {
          const turretIndexKey = match[1] + "TurretIndex";
          if (this.ini.has(turretIndexKey)) {
            turretIndexMap.set(Number(value), this.ini.getNumber(turretIndexKey));
          }
        }
      });
    }
    
    return turretIndexMap;
  }

  private parseBurstDelay(): (number | undefined)[] {
    const burstDelays: (number | undefined)[] = [];
    
    for (let i = 0; i < 4; i++) {
      const key = "BurstDelay" + i;
      burstDelays.push(
        this.ini.has(key) ? this.ini.getNumber(key) : undefined
      );
    }
    
    return burstDelays;
  }

  public hasOwner(house: House): boolean {
    return this.owner.length > 0 && this.owner.indexOf(house.name) !== -1;
  }

  public isAvailableTo(house: House): boolean {
    const hasRequiredHouse = this.requiredHouses.length === 0 || 
                           this.requiredHouses.indexOf(house.name) !== -1;
    const isForbidden = this.forbiddenHouses.indexOf(house.name) !== -1;
    
    return hasRequiredHouse && !isForbidden;
  }

  public getWeaponAtIndex(index: number): string | undefined {
    return this.parseWeaponName(
      this.ini.getString("Weapon" + (index + 1))
    );
  }

  public getEliteWeaponAtIndex(index: number): string | undefined {
    return this.parseWeaponName(
      this.ini.getString("EliteWeapon" + (index + 1))
    );
  }
}