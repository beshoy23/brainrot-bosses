import { 
  Character, 
  CharacterConfig, 
  CharacterManager, 
  ITALIAN_BRAINROT_CHARACTERS,
  CharacterAbility,
  AbilityEffect
} from '../Character';

describe('Character', () => {
  let testCharacterConfig: CharacterConfig;
  let character: Character;

  beforeEach(() => {
    testCharacterConfig = {
      id: 'test-character',
      name: 'Test Character',
      title: 'The Tester',
      description: 'A test character for unit testing',
      baseKickForce: 100,
      baseKickSpeed: 1.0,
      baseKickRange: 80,
      specialAbilities: [
        {
          id: 'test-ability',
          name: 'Test Ability',
          description: 'A test ability',
          cooldown: 5000,
          effect: {
            type: 'kick_modifier',
            kickForceMultiplier: 1.5
          }
        },
        {
          id: 'short-cooldown',
          name: 'Short Cooldown',
          description: 'An ability with short cooldown',
          cooldown: 1000,
          effect: {
            type: 'area_attack',
            areaRadius: 50,
            damage: 25
          }
        }
      ],
      passiveAbility: {
        id: 'test-passive',
        name: 'Test Passive',
        description: 'A passive test ability',
        cooldown: 0,
        effect: {
          type: 'kick_modifier',
          kickForceMultiplier: 1.1
        }
      },
      spriteKey: 'test-sprite',
      unlockRequirement: 'Test requirement',
      isUnlocked: true
    };

    character = new Character(testCharacterConfig);
  });

  describe('constructor', () => {
    it('should initialize character with provided config', () => {
      expect(character.config).toBe(testCharacterConfig);
      expect(character.lastAbilityUse).toBeInstanceOf(Map);
      expect(character.lastAbilityUse.size).toBe(0);
    });
  });

  describe('ability usage', () => {
    it('should allow using ability initially', () => {
      expect(character.canUseAbility('test-ability')).toBe(true);
    });

    it('should prevent using ability during cooldown', () => {
      character.useAbility('test-ability');
      expect(character.canUseAbility('test-ability')).toBe(false);
    });

    it('should allow using ability after cooldown expires', (done) => {
      character.useAbility('short-cooldown');
      expect(character.canUseAbility('short-cooldown')).toBe(false);
      
      // Wait for cooldown to expire
      setTimeout(() => {
        expect(character.canUseAbility('short-cooldown')).toBe(true);
        done();
      }, 1100); // Wait slightly longer than 1000ms cooldown
    }, 2000);

    it('should return null for non-existent ability', () => {
      expect(character.canUseAbility('non-existent')).toBe(false);
      expect(character.useAbility('non-existent')).toBeNull();
    });

    it('should return ability object when successfully used', () => {
      const ability = character.useAbility('test-ability');
      expect(ability).toEqual(testCharacterConfig.specialAbilities[0]);
    });

    it('should return null when ability is on cooldown', () => {
      character.useAbility('test-ability');
      const secondUse = character.useAbility('test-ability');
      expect(secondUse).toBeNull();
    });

    it('should track multiple abilities independently', () => {
      character.useAbility('test-ability');
      expect(character.canUseAbility('test-ability')).toBe(false);
      expect(character.canUseAbility('short-cooldown')).toBe(true);
      
      character.useAbility('short-cooldown');
      expect(character.canUseAbility('short-cooldown')).toBe(false);
    });
  });

  describe('kick stats', () => {
    it('should return base kick force', () => {
      expect(character.getKickForce()).toBe(100);
    });

    it('should return base kick speed', () => {
      expect(character.getKickSpeed()).toBe(1.0);
    });

    it('should return base kick range', () => {
      expect(character.getKickRange()).toBe(80);
    });
  });

  describe('edge cases', () => {
    it('should handle character with no special abilities', () => {
      const minimalConfig: CharacterConfig = {
        ...testCharacterConfig,
        specialAbilities: []
      };
      const minimalChar = new Character(minimalConfig);
      
      expect(minimalChar.canUseAbility('any-ability')).toBe(false);
      expect(minimalChar.useAbility('any-ability')).toBeNull();
    });

    it('should handle very short cooldowns', () => {
      const shortCooldownConfig: CharacterConfig = {
        ...testCharacterConfig,
        specialAbilities: [{
          id: 'instant',
          name: 'Instant Ability',
          description: 'Near-instant cooldown',
          cooldown: 1,
          effect: { type: 'kick_modifier', kickForceMultiplier: 1.1 }
        }]
      };
      const char = new Character(shortCooldownConfig);
      
      char.useAbility('instant');
      expect(char.canUseAbility('instant')).toBe(false);
      
      // After a small delay, should be available again
      setTimeout(() => {
        expect(char.canUseAbility('instant')).toBe(true);
      }, 10);
    });
  });
});

describe('CharacterManager', () => {
  let manager: CharacterManager;

  beforeEach(() => {
    // Reset singleton instance for testing
    (CharacterManager as any).instance = undefined;
    // Reset character unlock status
    ITALIAN_BRAINROT_CHARACTERS.forEach(char => {
      char.isUnlocked = char.id === 'br-br-patapim';
    });
    manager = CharacterManager.getInstance();
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const manager2 = CharacterManager.getInstance();
      expect(manager).toBe(manager2);
    });

    it('should initialize with default character', () => {
      const currentChar = manager.getCurrentCharacter();
      expect(currentChar.config.id).toBe('br-br-patapim');
      expect(currentChar.config.name).toBe('Brr Brr Patapim');
    });
  });

  describe('character unlocking', () => {
    it('should start with only default character unlocked', () => {
      expect(manager.isCharacterUnlocked('br-br-patapim')).toBe(true);
      expect(manager.isCharacterUnlocked('chimpanzini-bananini')).toBe(false);
      expect(manager.isCharacterUnlocked('bombardiro-crocodilo')).toBe(false);
    });

    it('should unlock characters successfully', () => {
      const result = manager.unlockCharacter('chimpanzini-bananini');
      expect(result).toBe(true);
      expect(manager.isCharacterUnlocked('chimpanzini-bananini')).toBe(true);
    });

    it('should not unlock already unlocked characters', () => {
      const result = manager.unlockCharacter('br-br-patapim');
      expect(result).toBe(false); // Already unlocked
    });

    it('should not unlock non-existent characters', () => {
      const result = manager.unlockCharacter('non-existent-character');
      expect(result).toBe(false);
    });

    it('should unlock characters by boss type', () => {
      expect(manager.unlockCharacterByBoss('swarm-king')).toBe(true);
      expect(manager.isCharacterUnlocked('chimpanzini-bananini')).toBe(true);

      expect(manager.unlockCharacterByBoss('desert-bomber')).toBe(true);
      expect(manager.isCharacterUnlocked('bombardiro-crocodilo')).toBe(true);

      expect(manager.unlockCharacterByBoss('ice-shark')).toBe(true);
      expect(manager.isCharacterUnlocked('tralalero-tralala')).toBe(true);
    });

    it('should not unlock for unknown boss types', () => {
      const result = manager.unlockCharacterByBoss('unknown-boss');
      expect(result).toBe(false);
    });
  });

  describe('character switching', () => {
    beforeEach(() => {
      manager.unlockCharacter('chimpanzini-bananini');
    });

    it('should switch to unlocked characters', () => {
      const result = manager.setCurrentCharacter('chimpanzini-bananini');
      expect(result).toBe(true);
      
      const currentChar = manager.getCurrentCharacter();
      expect(currentChar.config.id).toBe('chimpanzini-bananini');
      expect(currentChar.config.name).toBe('Chimpanzini Bananini');
    });

    it('should not switch to locked characters', () => {
      const result = manager.setCurrentCharacter('bombardiro-crocodilo');
      expect(result).toBe(false);
      
      // Should remain on previous character
      const currentChar = manager.getCurrentCharacter();
      expect(currentChar.config.id).toBe('br-br-patapim');
    });

    it('should not switch to non-existent characters', () => {
      const result = manager.setCurrentCharacter('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('character lists and progress', () => {
    beforeEach(() => {
      manager.unlockCharacter('chimpanzini-bananini');
      manager.unlockCharacter('bombardiro-crocodilo');
    });

    it('should return all characters', () => {
      const allChars = manager.getAllCharacters();
      expect(allChars).toBe(ITALIAN_BRAINROT_CHARACTERS);
      expect(allChars.length).toBe(6); // Total number of Italian Brainrot characters
    });

    it('should return only unlocked characters', () => {
      const unlockedChars = manager.getUnlockedCharacters();
      expect(unlockedChars.length).toBe(3); // br-br-patapim + 2 unlocked
      
      const unlockedIds = unlockedChars.map(c => c.id);
      expect(unlockedIds).toContain('br-br-patapim');
      expect(unlockedIds).toContain('chimpanzini-bananini');
      expect(unlockedIds).toContain('bombardiro-crocodilo');
    });

    it('should return correct progress', () => {
      const progress = manager.getCharacterProgress();
      expect(progress.unlocked).toBe(3);
      expect(progress.total).toBe(6);
    });
  });

  describe('save/load functionality', () => {
    beforeEach(() => {
      manager.unlockCharacter('chimpanzini-bananini');
      manager.setCurrentCharacter('chimpanzini-bananini');
    });

    it('should save progress correctly', () => {
      const saveData = manager.saveProgress();
      const parsed = JSON.parse(saveData);
      
      expect(parsed.unlockedCharacters).toContain('br-br-patapim');
      expect(parsed.unlockedCharacters).toContain('chimpanzini-bananini');
      expect(parsed.currentCharacter).toBe('chimpanzini-bananini');
    });

    it('should load progress correctly', () => {
      const saveData = JSON.stringify({
        unlockedCharacters: ['br-br-patapim', 'bombardiro-crocodilo'],
        currentCharacter: 'bombardiro-crocodilo'
      });
      
      const result = manager.loadProgress(saveData);
      expect(result).toBe(true);
      
      expect(manager.isCharacterUnlocked('bombardiro-crocodilo')).toBe(true);
      expect(manager.getCurrentCharacter().config.id).toBe('bombardiro-crocodilo');
    });

    it('should handle invalid save data gracefully', () => {
      const result = manager.loadProgress('invalid json');
      expect(result).toBe(false);
    });

    it('should not set locked character as current when loading', () => {
      const saveData = JSON.stringify({
        unlockedCharacters: ['br-br-patapim'],
        currentCharacter: 'bombardiro-crocodilo' // Not in unlocked list
      });
      
      const result = manager.loadProgress(saveData);
      expect(result).toBe(true);
      
      // Should stay on default character since bombardiro-crocodilo is not unlocked
      expect(manager.getCurrentCharacter().config.id).toBe('br-br-patapim');
    });
  });

  describe('console output verification', () => {
    it('should log character unlock messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      manager.unlockCharacter('chimpanzini-bananini');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🎉 Character unlocked: Chimpanzini Bananini')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log character switch messages', () => {
      manager.unlockCharacter('chimpanzini-bananini');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      manager.setCurrentCharacter('chimpanzini-bananini');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Switched to character: Chimpanzini Bananini')
      );
      
      consoleSpy.mockRestore();
    });

    it('should warn about locked characters', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      manager.setCurrentCharacter('bombardiro-crocodilo');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Character bombardiro-crocodilo is not unlocked')
      );
      
      consoleSpy.mockRestore();
    });
  });
});

describe('Italian Brainrot Characters', () => {
  it('should have all required characters defined', () => {
    expect(ITALIAN_BRAINROT_CHARACTERS.length).toBe(6);
    
    const characterIds = ITALIAN_BRAINROT_CHARACTERS.map(c => c.id);
    expect(characterIds).toContain('br-br-patapim');
    expect(characterIds).toContain('chimpanzini-bananini');
    expect(characterIds).toContain('bombardiro-crocodilo');
    expect(characterIds).toContain('tralalero-tralala');
    expect(characterIds).toContain('cappuccino-assassino');
    expect(characterIds).toContain('lirili-larila');
  });

  it('should have only default character unlocked initially', () => {
    const defaultChar = ITALIAN_BRAINROT_CHARACTERS.find(c => c.id === 'br-br-patapim');
    expect(defaultChar?.isUnlocked).toBe(true);
    
    const otherChars = ITALIAN_BRAINROT_CHARACTERS.filter(c => c.id !== 'br-br-patapim');
    otherChars.forEach(char => {
      expect(char.isUnlocked).toBe(false);
    });
  });

  it('should have valid kick stats for all characters', () => {
    ITALIAN_BRAINROT_CHARACTERS.forEach(char => {
      expect(char.baseKickForce).toBeGreaterThan(0);
      expect(char.baseKickSpeed).toBeGreaterThan(0);
      expect(char.baseKickRange).toBeGreaterThan(0);
      expect(char.baseKickForce).toBeLessThan(200); // Reasonable upper limit
      expect(char.baseKickSpeed).toBeLessThan(3.0); // Reasonable upper limit
      expect(char.baseKickRange).toBeLessThan(150); // Reasonable upper limit
    });
  });

  it('should have special abilities for all characters', () => {
    ITALIAN_BRAINROT_CHARACTERS.forEach(char => {
      expect(char.specialAbilities.length).toBeGreaterThan(0);
      expect(char.passiveAbility).toBeDefined();
      
      char.specialAbilities.forEach(ability => {
        expect(ability.id).toBeTruthy();
        expect(ability.name).toBeTruthy();
        expect(ability.description).toBeTruthy();
        expect(ability.cooldown).toBeGreaterThanOrEqual(0);
        expect(ability.effect).toBeDefined();
        expect(ability.effect.type).toMatch(/kick_modifier|area_attack|movement|environmental/);
      });
    });
  });

  it('should have unique character IDs', () => {
    const ids = ITALIAN_BRAINROT_CHARACTERS.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have balanced stats across characters', () => {
    const forces = ITALIAN_BRAINROT_CHARACTERS.map(c => c.baseKickForce);
    const speeds = ITALIAN_BRAINROT_CHARACTERS.map(c => c.baseKickSpeed);
    const ranges = ITALIAN_BRAINROT_CHARACTERS.map(c => c.baseKickRange);
    
    // Should have variety in stats (not all the same)
    expect(new Set(forces).size).toBeGreaterThan(1);
    expect(new Set(speeds).size).toBeGreaterThan(1);
    expect(new Set(ranges).size).toBeGreaterThan(1);
    
    // Stats should be within reasonable ranges
    const avgForce = forces.reduce((a, b) => a + b) / forces.length;
    const avgSpeed = speeds.reduce((a, b) => a + b) / speeds.length;
    const avgRange = ranges.reduce((a, b) => a + b) / ranges.length;
    
    expect(avgForce).toBeGreaterThan(80);
    expect(avgForce).toBeLessThan(130);
    expect(avgSpeed).toBeGreaterThan(0.8);
    expect(avgSpeed).toBeLessThan(1.8);
    expect(avgRange).toBeGreaterThan(70);
    expect(avgRange).toBeLessThan(110);
  });
});