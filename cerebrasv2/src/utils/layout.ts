const BASE_POSITIONS = [
  { x: 32, y: 60 },
  { x: 420, y: 80 },
  { x: 140, y: 300 },
  { x: 520, y: 320 },
];

export function generateLayout(index: number) {
  const pattern = BASE_POSITIONS[index % BASE_POSITIONS.length];
  const offset = Math.floor(index / BASE_POSITIONS.length) * 30;
  return {
    position: {
      x: pattern.x + offset,
      y: pattern.y + offset,
    },
    size: {
      width: 360,
      height: 240,
    },
  };
}
