import {
  Dumbbell, Volleyball, Bike, Footprints, Waves, Timer, AlarmClock,
  Sunrise, Sunset, Sun, Moon, MoonStar, Coffee, Salad, UtensilsCrossed,
  BookOpen, GraduationCap, Briefcase, HeartPulse, Sparkles, Star,
  Target, Trophy, Music, Headphones, Zap, Leaf, Droplets,
  ShowerHead, Bath, BedDouble,
} from 'lucide-react';
import { cn } from '../../lib/cn';

const MAP = {
  Dumbbell, Volleyball, Bike, Footprints, Waves, Timer, AlarmClock,
  Sunrise, Sunset, Sun, Moon, MoonStar, Coffee, Salad, UtensilsCrossed,
  BookOpen, GraduationCap, Briefcase, HeartPulse, Sparkles, Star,
  Target, Trophy, Music, Headphones, Zap, Leaf, Droplets,
  ShowerHead, Bath, BedDouble,
};

/** Migrazione automatica: vecchie emoji → icone monocromatiche. */
const EMOJI_FALLBACK = {
  '🏐': 'Volleyball', '💪': 'Dumbbell', '🌅': 'Sunrise', '🌙': 'MoonStar',
  '🧘': 'Leaf', '🏃': 'Footprints', '📚': 'BookOpen', '🦷': 'Sparkles',
  '🧖': 'Droplets', '🥗': 'Salad', '🎯': 'Target', '⭐': 'Star',
};

/** Nome icona di un template (con fallback per i dati legacy con emoji). */
export function routineIconName(template) {
  if (template?.icon && MAP[template.icon]) return template.icon;
  if (template?.emoji && EMOJI_FALLBACK[template.emoji]) return EMOJI_FALLBACK[template.emoji];
  return 'Dumbbell';
}

/**
 * RoutineIcon — Icona vettoriale monocromatica (grigi) per le schede routine.
 * Sostituisce le vecchie emoji con uno stile pulito e professionale.
 */
export default function RoutineIcon({ template, icon, size = 18, className, style }) {
  const name = icon || routineIconName(template);
  const Icon = MAP[name] || Dumbbell;
  return <Icon size={size} className={cn('text-label-secondary', className)} style={style} aria-hidden />;
}
