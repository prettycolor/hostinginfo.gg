/**
 * Terminal Commands - No Fox Jargon, Game References Only
 * Contact flow directs to tawk.to
 */

export interface Command {
  name: string;
  description: string;
  aliases?: string[];
  execute: (args: string[]) => CommandResponse;
}

export interface CommandResponse {
  output: string;
  type?: 'success' | 'error' | 'info' | 'easter-egg';
  triggerEasterEgg?: string; // Trigger WebGL easter egg
}

const CONTACT_EMAIL = 'info@hostinginfo.gg';

export const commands: Record<string, Command> = {
  help: {
    name: 'help',
    description: 'Show available commands',
    execute: () => ({
      output: `
Available Commands:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  help              Show this help message
  about             Learn about HostingInfo
  contact           Get in touch with us
  clear             Clear the terminal
  
  🎮 Easter Eggs:
  materia           Summon the power of FF7
  chaos             Embrace the chaos emeralds
  warp              Enter the warp zone
  woah              Whoa...
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Type any command to get started!
`,
      type: 'info',
    }),
  },

  about: {
    name: 'about',
    description: 'Learn about HostingInfo',
    execute: () => ({
      output: `
╔═══════════════════════════════════════════════════════╗
║                    HOSTINGINFO                        ║
╚═══════════════════════════════════════════════════════╝

HostingInfo is your domain analysis and hosting
recommendation platform. We scan websites and provide
intelligent insights to help you make informed decisions
about your hosting needs.

🔍 Features:
  • Real-time domain scanning
  • Technology detection
  • Performance analysis
  • Security assessment
  • DNS configuration
  • Email setup analysis

Type 'contact' to get in touch!
`,
      type: 'info',
    }),
  },

  contact: {
    name: 'contact',
    description: 'Get in touch with us',
    aliases: ['support', 'help-me'],
    execute: () => {
      return {
        output: `
╔═══════════════════════════════════════════════════════╗
║                   CONTACT US                          ║
╚═══════════════════════════════════════════════════════╝

📧 Email: ${CONTACT_EMAIL}

We're here to help! Send us an email and our support
team will respond to your inquiry as soon as possible.
`,
        type: 'success',
      };
    },
  },

  clear: {
    name: 'clear',
    description: 'Clear the terminal',
    aliases: ['cls'],
    execute: () => ({
      output: '',
      type: 'info',
    }),
  },

  // ============================================
  // EASTER EGGS - WebGL/Three.js Triggers
  // ============================================

  materia: {
    name: 'materia',
    description: 'Summon the power of FF7',
    aliases: ['ff7', 'summon', 'knights'],
    execute: () => ({
      output: '\n🌟 Summoning Knights of the Round...\n',
      type: 'easter-egg',
      triggerEasterEgg: 'materia',
    }),
  },

  chaos: {
    name: 'chaos',
    description: 'Embrace the chaos emeralds',
    aliases: ['emerald', 'sonic', 'super'],
    execute: () => ({
      output: '\n💎 Collecting Chaos Emeralds...\n',
      type: 'easter-egg',
      triggerEasterEgg: 'chaos',
    }),
  },

  warp: {
    name: 'warp',
    description: 'Enter the warp zone',
    aliases: ['mario', 'pipe', 'warpzone'],
    execute: () => ({
      output: '\n🍄 Entering Warp Zone...\n',
      type: 'easter-egg',
      triggerEasterEgg: 'warp',
    }),
  },

  woah: {
    name: 'woah',
    description: 'Whoa...',
    aliases: ['crash', 'bandicoot', 'aku'],
    execute: () => ({
      output: '\n🎭 WOAH!\n',
      type: 'easter-egg',
      triggerEasterEgg: 'woah',
    }),
  },

  konami: {
    name: 'konami',
    description: 'The legendary code',
    execute: () => ({
      output: '\n⬆️⬆️⬇️⬇️⬅️➡️⬅️➡️🅱️🅰️\n',
      type: 'easter-egg',
      triggerEasterEgg: 'konami',
    }),
  },
};

export function executeCommand(input: string): CommandResponse {
  const [commandName, ...args] = input.trim().toLowerCase().split(' ');

  // Find command by name or alias
  const command = Object.values(commands).find(
    (cmd) => cmd.name === commandName || cmd.aliases?.includes(commandName)
  );

  if (!command) {
    return {
      output: `\nCommand not found: ${commandName}\nType 'help' for available commands.\n`,
      type: 'error',
    };
  }

  return command.execute(args);
}

export function getCommandSuggestions(partial: string): string[] {
  const lower = partial.toLowerCase();
  return Object.values(commands)
    .filter((cmd) => 
      cmd.name.startsWith(lower) || 
      cmd.aliases?.some(alias => alias.startsWith(lower))
    )
    .map((cmd) => cmd.name);
}
