interface GameOpts {
  gameSpeed: number;
  credits: number;
  unitCount: number;
  shortGame: boolean;
  superWeapons: boolean;
  buildOffAlly: boolean;
  mcvRepacks: boolean;
  cratesAppear: boolean;
  hostTeams?: boolean;
  destroyableBridges: boolean;
  multiEngineer: boolean;
  noDogEngiKills: boolean;
}

interface MpDialogSettings {
  gameSpeed: number;
  money: number;
  unitCount: number;
  shortGame: boolean;
  mcvRedeploys: boolean;
  crates: boolean;
  superWeapons: boolean;
  bridgeDestruction: boolean;
  multiEngineer: boolean;
}

export class PreferredHostOpts {
  public gameSpeed: number = 6;
  public credits: number = 10000;
  public unitCount: number = 10;
  public shortGame: boolean = true;
  public superWeapons: boolean = false;
  public buildOffAlly: boolean = true;
  public mcvRepacks: boolean = true;
  public cratesAppear: boolean = false;
  public hostTeams: boolean = false;
  public destroyableBridges: boolean = true;
  public multiEngineer: boolean = false;
  public noDogEngiKills: boolean = false;
  public slotsClosed: Set<number> = new Set();

  serialize(): string {
    return [
      this.gameSpeed,
      this.credits,
      this.unitCount,
      Number(this.shortGame),
      Number(this.superWeapons),
      Number(this.buildOffAlly),
      Number(this.mcvRepacks),
      Number(this.cratesAppear),
      [...this.slotsClosed].join(","),
      Number(this.hostTeams),
      Number(this.destroyableBridges),
      Number(this.multiEngineer),
      Number(this.noDogEngiKills),
    ].join(";");
  }

  unserialize(data: string): this {
    const [
      gameSpeed,
      credits,
      unitCount,
      shortGame,
      superWeapons,
      buildOffAlly,
      mcvRepacks,
      cratesAppear,
      slotsClosed,
      hostTeams,
      destroyableBridges = "1",
      multiEngineer,
      noDogEngiKills,
    ] = data.split(";");

    this.gameSpeed = Number(gameSpeed);
    this.credits = Number(credits);
    this.unitCount = Number(unitCount);
    this.shortGame = Boolean(Number(shortGame));
    this.superWeapons = Boolean(Number(superWeapons));
    this.buildOffAlly = Boolean(Number(buildOffAlly));
    this.mcvRepacks = Boolean(Number(mcvRepacks));
    this.cratesAppear = Boolean(Number(cratesAppear));
    this.hostTeams = Boolean(Number(hostTeams));
    this.destroyableBridges = Boolean(Number(destroyableBridges));
    this.multiEngineer = Boolean(Number(multiEngineer));
    this.noDogEngiKills = Boolean(Number(noDogEngiKills));
    this.slotsClosed = new Set(
      slotsClosed ? slotsClosed.split(",").map((slot) => Number(slot)) : [],
    );

    return this;
  }

  applyGameOpts(gameOpts: GameOpts): this {
    this.gameSpeed = gameOpts.gameSpeed;
    this.credits = gameOpts.credits;
    this.unitCount = gameOpts.unitCount;
    this.shortGame = gameOpts.shortGame;
    this.superWeapons = gameOpts.superWeapons;
    this.buildOffAlly = gameOpts.buildOffAlly;
    this.mcvRepacks = gameOpts.mcvRepacks;
    this.cratesAppear = gameOpts.cratesAppear;
    this.hostTeams = !!gameOpts.hostTeams;
    this.destroyableBridges = gameOpts.destroyableBridges;
    this.multiEngineer = gameOpts.multiEngineer;
    this.noDogEngiKills = gameOpts.noDogEngiKills;

    return this;
  }

  applyMpDialogSettings(settings: MpDialogSettings): this {
    this.gameSpeed = 6 - settings.gameSpeed;
    this.credits = settings.money;
    this.unitCount = settings.unitCount;
    this.shortGame = settings.shortGame;
    this.mcvRepacks = settings.mcvRedeploys;
    this.cratesAppear = settings.crates;
    this.superWeapons = settings.superWeapons;
    this.destroyableBridges = settings.bridgeDestruction;
    this.multiEngineer = settings.multiEngineer;

    return this;
  }
}
