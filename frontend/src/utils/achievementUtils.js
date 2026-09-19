/**
 * Helper utility for mapping and rendering achievement icons & badges
 */

export const PRESET_ACHIEVEMENT_ICONS = [
  { label: 'Trophy', value: '🏆' },
  { label: 'Gold Medal', value: '🥇' },
  { label: 'Medal', value: '🎖️' },
  { label: 'Crown', value: '👑' },
  { label: 'Swords', value: '⚔️' },
  { label: 'Fire / Flame', value: '🔥' },
  { label: 'Lightning', value: '⚡' },
  { label: 'Shield', value: '🛡️' },
  { label: 'Football', value: '⚽' },
  { label: 'Target', value: '🎯' },
  { label: 'Star', value: '⭐' },
  { label: 'Diamond', value: '💎' },
  { label: 'Rocket', value: '🚀' },
  { label: 'Heart', value: '❤️' },
  { label: 'Boots', value: '👟' },
  { label: 'Gamepad', value: '🎮' }
];

export const ICON_MAP = {
  sword: '⚔️',
  swords: '⚔️',
  flame: '🔥',
  fire: '🔥',
  zap: '⚡',
  lightning: '⚡',
  crown: '👑',
  shield: '🛡️',
  medal: '🎖️',
  trophy: '🏆',
  football: '⚽',
  soccer: '⚽',
  star: '⭐',
  gold: '🥇',
  target: '🎯',
  diamond: '💎',
  rocket: '🚀',
  gamepad: '🎮',
};

export function renderAchievementIcon(icon) {
  if (!icon) return '🏆';
  const trimmed = icon.trim();
  const lower = trimmed.toLowerCase();
  if (ICON_MAP[lower]) return ICON_MAP[lower];
  return trimmed;
}

export const REQUIREMENT_TYPES = [
  { value: 'MANUAL', label: 'Manual Admin Award (Badge given directly by Admin)' },
  { value: 'WINS', label: 'Total Wins (Player reaches N wins)' },
  { value: 'STREAK', label: 'Winning Streak (Player reaches N win streak)' },
  { value: 'MATCHES', label: 'Matches Played (Player plays N matches)' },
  { value: 'TOP_3', label: 'Top 3 Global Leaderboard' },
  { value: 'CLEAN_SHEET', label: 'Clean Sheet / Zero Conceded' },
  { value: 'CUSTOM', label: 'Custom Milestone / Tournament' }
];
