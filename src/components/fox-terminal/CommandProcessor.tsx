import { commands } from '@/lib/fox-terminal/commands';
import { easterEggs } from '@/lib/fox-terminal/easter-eggs';
import { useAchievements } from '@/lib/fox-terminal/achievements';

export class CommandProcessor {
  static process(input: string): string[] {
    const trimmed = input.trim().toLowerCase();
    
    // Check for easter eggs first
    const easterEgg = easterEggs[trimmed];
    if (easterEgg) {
      // Unlock achievement
      const { unlockAchievement } = useAchievements.getState();
      unlockAchievement(trimmed);
      return easterEgg();
    }

    // Check for regular commands
    const command = commands[trimmed];
    if (command) {
      return command();
    }

    // Command not found
    return [
      '',
      `❌ Command not found: "${input}"`,
      '',
      'Type "help" for available commands',
      'Type "easter" for hidden features',
      '',
    ];
  }
}
