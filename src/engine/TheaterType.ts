export enum TheaterType {
  None = 0,
  Temperate = 1,
  Urban = 2,
  Snow = 4,
  Lunar = 8,
  Desert = 16,
  NewUrban = 32,
  All = 63, // Sum of all previous specific types (1+2+4+8+16+32)
} 