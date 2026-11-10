import {
  Car,
  Droplets,
  Zap,
  Snowflake,
  Sparkles,
  Trees,
  Hammer,
  PaintRoller,
  DoorOpen,
  Truck,
  Laptop,
  WashingMachine,
  Shield,
  Scissors,
  GraduationCap,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  car: Car,
  droplets: Droplets,
  zap: Zap,
  snowflake: Snowflake,
  sparkles: Sparkles,
  trees: Trees,
  hammer: Hammer,
  'paint-roller': PaintRoller,
  'door-open': DoorOpen,
  truck: Truck,
  laptop: Laptop,
  'washing-machine': WashingMachine,
  shield: Shield,
  scissors: Scissors,
  'graduation-cap': GraduationCap,
  wrench: Wrench,
};

export function categoryIcon(name?: string | null): LucideIcon {
  if (!name) return Wrench;
  return ICONS[name] || Wrench;
}

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon_name?: string | null;
};