import { Scene } from 'phaser';
import { Vector2 } from '../utils/Vector2';

export interface CharacterAbility {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  manaCost?: number;
  effect: AbilityEffect;
}

export interface AbilityEffect {
  type: 'kick_modifier' | 'area_attack' | 'movement' | 'environmental';
  kickForceMultiplier?: number;
  kickRangeMultiplier?: number;
  areaRadius?: number;
  damage?: number;
  movementSpeedBonus?: number;
  duration?: number;
  specialEffect?: string;
}

export interface CharacterConfig {
  id: string;
  name: string;
  title: string;
  description: string;
  baseKickForce: number;
  baseKickSpeed: number;
  baseKickRange: number;
  specialAbilities: CharacterAbility[];
  passiveAbility?: CharacterAbility;
  spriteKey: string;
  unlockRequirement: string;
  isUnlocked: boolean;
}

export class Character {
  public config: CharacterConfig;
  public lastAbilityUse: Map<string, number> = new Map();
  
  constructor(config: CharacterConfig) {
    this.config = config;
  }

  canUseAbility(abilityId: string): boolean {
    const ability = this.getAbility(abilityId);
    if (!ability) return false;
    
    const lastUse = this.lastAbilityUse.get(abilityId) || 0;
    const timeSinceLastUse = Date.now() - lastUse;
    
    return timeSinceLastUse >= ability.cooldown;
  }

  useAbility(abilityId: string): CharacterAbility | null {
    if (!this.canUseAbility(abilityId)) return null;
    
    const ability = this.getAbility(abilityId);
    if (!ability) return null;
    
    this.lastAbilityUse.set(abilityId, Date.now());
    return ability;
  }

  private getAbility(abilityId: string): CharacterAbility | undefined {
    return this.config.specialAbilities.find(ability => ability.id === abilityId);
  }

  getKickForce(): number {
    return this.config.baseKickForce;
  }

  getKickSpeed(): number {
    return this.config.baseKickSpeed;
  }

  getKickRange(): number {
    return this.config.baseKickRange;
  }
}

// Italian Brainrot Character Definitions
export const ITALIAN_BRAINROT_CHARACTERS: CharacterConfig[] = [
  {
    id: 'br-br-patapim',
    name: 'Brr Brr Patapim',
    title: 'The Original Kicker',
    description: 'A hybrid of baboon and tree, master of basic kick techniques. The original brainrot survivor.',
    baseKickForce: 100,
    baseKickSpeed: 1.0,
    baseKickRange: 80,
    specialAbilities: [
      {
        id: 'tree-root-slam',
        name: 'Tree Root Slam',
        description: 'Slams the ground with tree roots, launching all nearby enemies',
        cooldown: 8000,
        effect: {
          type: 'area_attack',
          areaRadius: 120,
          damage: 50,
          specialEffect: 'root_eruption'
        }
      },
      {
        id: 'monkey-fury',
        name: 'Monkey Fury',
        description: 'Increases kick speed and force for a short time',
        cooldown: 12000,
        effect: {
          type: 'kick_modifier',
          kickForceMultiplier: 1.5,
          kickRangeMultiplier: 1.3,
          duration: 5000
        }
      }
    ],
    passiveAbility: {
      id: 'natural_balance',
      name: 'Natural Balance',
      description: 'Slight bonus to all kick stats due to tree-baboon hybrid nature',
      cooldown: 0,
      effect: {
        type: 'kick_modifier',
        kickForceMultiplier: 1.1,
        kickRangeMultiplier: 1.1
      }
    },
    spriteKey: 'patapim-idle',
    unlockRequirement: 'Default character',
    isUnlocked: true
  },

  {
    id: 'chimpanzini-bananini',
    name: 'Chimpanzini Bananini',
    title: 'The Indestructible Monkey',
    description: 'A monkey with a banana body, known for chaotic energy and indestructible kicks.',
    baseKickForce: 120,
    baseKickSpeed: 1.2,
    baseKickRange: 70,
    specialAbilities: [
      {
        id: 'banana-split-kick',
        name: 'Banana Split Kick',
        description: 'Splits into multiple banana projectiles that hit different enemies',
        cooldown: 6000,
        effect: {
          type: 'area_attack',
          areaRadius: 100,
          damage: 35,
          specialEffect: 'banana_split'
        }
      },
      {
        id: 'indestructible-charge',
        name: 'Indestructible Charge',
        description: 'Becomes temporarily invincible while charging through enemies',
        cooldown: 15000,
        effect: {
          type: 'movement',
          movementSpeedBonus: 200,
          duration: 3000,
          specialEffect: 'invincibility'
        }
      }
    ],
    passiveAbility: {
      id: 'chaotic_energy',
      name: 'Chaotic Energy',
      description: 'Random kick force variations make enemies fly in unpredictable directions',
      cooldown: 0,
      effect: {
        type: 'kick_modifier',
        specialEffect: 'chaos_kicks'
      }
    },
    spriteKey: 'zombie-male-idle', // Placeholder until we have banana monkey sprite
    unlockRequirement: 'Defeat Swarm King Chimpanzini',
    isUnlocked: false
  },

  {
    id: 'bombardiro-crocodilo',
    name: 'Bombardiro Crocodilo',
    title: 'The Bomber Commander',
    description: 'A crocodile-bomber hybrid with explosive kick attacks and military precision.',
    baseKickForce: 90,
    baseKickSpeed: 0.8,
    baseKickRange: 100,
    specialAbilities: [
      {
        id: 'bomb-kick',
        name: 'Bomb Kick',
        description: 'Kicks enemies that explode on impact with other enemies',
        cooldown: 10000,
        effect: {
          type: 'kick_modifier',
          kickForceMultiplier: 1.3,
          specialEffect: 'explosive_enemies'
        }
      },
      {
        id: 'carpet-bombing',
        name: 'Carpet Bombing',
        description: 'Rains explosive kicks in a line formation',
        cooldown: 18000,
        effect: {
          type: 'area_attack',
          areaRadius: 200,
          damage: 80,
          specialEffect: 'bombing_run'
        }
      }
    ],
    passiveAbility: {
      id: 'military_precision',
      name: 'Military Precision',
      description: 'Kicks have increased range and accuracy',
      cooldown: 0,
      effect: {
        type: 'kick_modifier',
        kickRangeMultiplier: 1.25,
        specialEffect: 'precise_targeting'
      }
    },
    spriteKey: 'black-warrior-idle', // Crocodile-like tank sprite
    unlockRequirement: 'Defeat Bombardiro Crocodilo',
    isUnlocked: false
  },

  {
    id: 'tralalero-tralala',
    name: 'Tralalero Tralala',
    title: 'The Three-Legged Shark',
    description: 'A athletic shark with Nike sneakers, master of swimming kicks and aquatic combat.',
    baseKickForce: 110,
    baseKickSpeed: 1.4,
    baseKickRange: 90,
    specialAbilities: [
      {
        id: 'tidal-wave-kick',
        name: 'Tidal Wave Kick',
        description: 'Creates a wave of force that pushes all enemies in one direction',
        cooldown: 8000,
        effect: {
          type: 'area_attack',
          areaRadius: 150,
          damage: 40,
          specialEffect: 'tidal_wave'
        }
      },
      {
        id: 'nike-speed-boost',
        name: 'Nike Speed Boost',
        description: 'Athletic sneakers provide incredible speed and kick frequency',
        cooldown: 12000,
        effect: {
          type: 'kick_modifier',
          kickForceMultiplier: 1.2,
          kickRangeMultiplier: 1.1,
          duration: 6000,
          specialEffect: 'speed_trails'
        }
      }
    ],
    passiveAbility: {
      id: 'athletic_prowess',
      name: 'Athletic Prowess',
      description: 'Superior speed and agility in all movements',
      cooldown: 0,
      effect: {
        type: 'movement',
        movementSpeedBonus: 30,
        specialEffect: 'athletic_movement'
      }
    },
    spriteKey: 'red-lancer-idle', // Shark-like elite sprite
    unlockRequirement: 'Defeat Tralalero Tralala',
    isUnlocked: false
  },

  {
    id: 'cappuccino-assassino',
    name: 'Cappuccino Assassino',
    title: 'The Coffee Ninja',
    description: 'An anthropomorphic coffee cup dressed as ninja, expert in stealth kicks and caffeine fury.',
    baseKickForce: 95,
    baseKickSpeed: 1.6,
    baseKickRange: 85,
    specialAbilities: [
      {
        id: 'stealth-kick',
        name: 'Stealth Kick',
        description: 'Become invisible and deliver a devastating surprise kick',
        cooldown: 10000,
        effect: {
          type: 'kick_modifier',
          kickForceMultiplier: 2.0,
          specialEffect: 'stealth_attack'
        }
      },
      {
        id: 'caffeine-rush',
        name: 'Caffeine Rush',
        description: 'Extreme speed boost that makes kicks nearly instantaneous',
        cooldown: 15000,
        effect: {
          type: 'kick_modifier',
          kickForceMultiplier: 1.1,
          kickRangeMultiplier: 1.2,
          duration: 4000,
          specialEffect: 'caffeine_jitters'
        }
      }
    ],
    passiveAbility: {
      id: 'ninja_agility',
      name: 'Ninja Agility',
      description: 'Faster kick animations and slight stealth bonus',
      cooldown: 0,
      effect: {
        type: 'kick_modifier',
        kickForceMultiplier: 1.0,
        specialEffect: 'ninja_kicks'
      }
    },
    spriteKey: 'yellow-monk-idle', // Ninja-like monk sprite
    unlockRequirement: 'Defeat 100 enemies with critical hits',
    isUnlocked: false
  },

  {
    id: 'lirili-larila',
    name: 'Lirili Larila',
    title: 'The Time Controller',
    description: 'A cactus-elephant hybrid with temporal powers, can slow time during kicks.',
    baseKickForce: 85,
    baseKickSpeed: 0.9,
    baseKickRange: 95,
    specialAbilities: [
      {
        id: 'time-slow-kick',
        name: 'Time Slow Kick',
        description: 'Slows down time allowing for precise kick placement',
        cooldown: 12000,
        effect: {
          type: 'environmental',
          duration: 3000,
          specialEffect: 'time_slow'
        }
      },
      {
        id: 'temporal-shockwave',
        name: 'Temporal Shockwave',
        description: 'Creates a time distortion that freezes enemies briefly',
        cooldown: 16000,
        effect: {
          type: 'area_attack',
          areaRadius: 130,
          damage: 30,
          duration: 2000,
          specialEffect: 'time_freeze'
        }
      }
    ],
    passiveAbility: {
      id: 'time_perception',
      name: 'Time Perception',
      description: 'Slightly slowed enemy movement from temporal aura',
      cooldown: 0,
      effect: {
        type: 'environmental',
        specialEffect: 'temporal_aura'
      }
    },
    spriteKey: 'zombie-female-idle', // Cactus-like sprite placeholder
    unlockRequirement: 'Complete Tutorial Grove in under 5 minutes',
    isUnlocked: false
  }
];

export class CharacterManager {
  private static instance: CharacterManager;
  private unlockedCharacters: Set<string> = new Set(['br-br-patapim']); // Default character unlocked
  private currentCharacter: Character;
  
  private constructor() {
    // Start with default character
    const defaultCharConfig = ITALIAN_BRAINROT_CHARACTERS.find(c => c.id === 'br-br-patapim')!;
    this.currentCharacter = new Character(defaultCharConfig);
  }

  static getInstance(): CharacterManager {
    if (!CharacterManager.instance) {
      CharacterManager.instance = new CharacterManager();
    }
    return CharacterManager.instance;
  }

  getCurrentCharacter(): Character {
    return this.currentCharacter;
  }

  setCurrentCharacter(characterId: string): boolean {
    if (!this.isCharacterUnlocked(characterId)) {
      console.warn(`Character ${characterId} is not unlocked`);
      return false;
    }

    const characterConfig = ITALIAN_BRAINROT_CHARACTERS.find(c => c.id === characterId);
    if (!characterConfig) {
      console.warn(`Character ${characterId} not found`);
      return false;
    }

    this.currentCharacter = new Character(characterConfig);
    console.log(`Switched to character: ${characterConfig.name}`);
    return true;
  }

  unlockCharacter(characterId: string): boolean {
    const characterConfig = ITALIAN_BRAINROT_CHARACTERS.find(c => c.id === characterId);
    if (!characterConfig) {
      console.warn(`Character ${characterId} not found`);
      return false;
    }

    if (this.unlockedCharacters.has(characterId)) {
      console.log(`Character ${characterConfig.name} already unlocked`);
      return false;
    }

    this.unlockedCharacters.add(characterId);
    characterConfig.isUnlocked = true;
    console.log(`🎉 Character unlocked: ${characterConfig.name} - ${characterConfig.title}`);
    return true;
  }

  isCharacterUnlocked(characterId: string): boolean {
    return this.unlockedCharacters.has(characterId);
  }

  getUnlockedCharacters(): CharacterConfig[] {
    return ITALIAN_BRAINROT_CHARACTERS.filter(c => this.unlockedCharacters.has(c.id));
  }

  getAllCharacters(): CharacterConfig[] {
    return ITALIAN_BRAINROT_CHARACTERS;
  }

  getCharacterProgress(): { unlocked: number; total: number } {
    return {
      unlocked: this.unlockedCharacters.size,
      total: ITALIAN_BRAINROT_CHARACTERS.length
    };
  }

  // Method to unlock character by boss defeat
  unlockCharacterByBoss(bossType: string): boolean {
    let characterId: string;
    
    switch (bossType) {
      case 'swarm-king':
        characterId = 'chimpanzini-bananini';
        break;
      case 'desert-bomber':
        characterId = 'bombardiro-crocodilo';
        break;
      case 'ice-shark':
        characterId = 'tralalero-tralala';
        break;
      default:
        console.warn(`Unknown boss type: ${bossType}`);
        return false;
    }
    
    return this.unlockCharacter(characterId);
  }

  // Save/load functionality
  saveProgress(): string {
    return JSON.stringify({
      unlockedCharacters: Array.from(this.unlockedCharacters),
      currentCharacter: this.currentCharacter.config.id
    });
  }

  loadProgress(saveData: string): boolean {
    try {
      const data = JSON.parse(saveData);
      this.unlockedCharacters = new Set(data.unlockedCharacters);
      
      // Update character unlock status
      ITALIAN_BRAINROT_CHARACTERS.forEach(char => {
        char.isUnlocked = this.unlockedCharacters.has(char.id);
      });
      
      // Set current character
      if (data.currentCharacter && this.isCharacterUnlocked(data.currentCharacter)) {
        this.setCurrentCharacter(data.currentCharacter);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load character progress:', error);
      return false;
    }
  }
}