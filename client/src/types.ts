export interface Game {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  game_id: string;
  name: string;
  description: string;
  map_image: string;
  map_width: number;
  map_height: number;
  created_at: string;
}

export interface Check {
  id: string;
  section_id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  logic: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
