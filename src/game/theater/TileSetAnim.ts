export class TileSetAnim {
    public name: string;       // Animation name (often references an anim in animations.ini or similar)
    public subTile: number;    // Sub-tile index this animation attaches to or represents
    public offsetX: number;    // X offset for placing the animation relative to the tile
    public offsetY: number;    // Y offset for placing the animation

    constructor(name: string, subTile: number, offsetX: number, offsetY: number) {
        this.name = name;
        this.subTile = subTile;
        this.offsetX = offsetX;
        this.offsetY = offsetY;
    }
}
