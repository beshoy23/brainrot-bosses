import { Vector2 } from '../Vector2';

describe('Vector2', () => {
  describe('constructor', () => {
    it('should initialize with default values (0, 0)', () => {
      const vec = new Vector2();
      expect(vec.x).toBe(0);
      expect(vec.y).toBe(0);
    });

    it('should initialize with provided values', () => {
      const vec = new Vector2(3, 4);
      expect(vec.x).toBe(3);
      expect(vec.y).toBe(4);
    });
  });

  describe('set', () => {
    it('should set x and y values', () => {
      const vec = new Vector2();
      vec.set(5, 7);
      expect(vec.x).toBe(5);
      expect(vec.y).toBe(7);
    });

    it('should return itself for method chaining', () => {
      const vec = new Vector2();
      const result = vec.set(1, 2);
      expect(result).toBe(vec);
    });
  });

  describe('copy', () => {
    it('should copy values from another vector', () => {
      const vec1 = new Vector2(3, 4);
      const vec2 = new Vector2();
      vec2.copy(vec1);
      expect(vec2.x).toBe(3);
      expect(vec2.y).toBe(4);
    });

    it('should not affect the original vector', () => {
      const vec1 = new Vector2(3, 4);
      const vec2 = new Vector2();
      vec2.copy(vec1);
      vec2.x = 10;
      expect(vec1.x).toBe(3);
    });
  });

  describe('add', () => {
    it('should add another vector', () => {
      const vec1 = new Vector2(3, 4);
      const vec2 = new Vector2(1, 2);
      vec1.add(vec2);
      expect(vec1.x).toBe(4);
      expect(vec1.y).toBe(6);
    });

    it('should return itself for method chaining', () => {
      const vec1 = new Vector2(3, 4);
      const vec2 = new Vector2(1, 2);
      const result = vec1.add(vec2);
      expect(result).toBe(vec1);
    });
  });

  describe('subtract', () => {
    it('should subtract another vector', () => {
      const vec1 = new Vector2(5, 7);
      const vec2 = new Vector2(2, 3);
      vec1.subtract(vec2);
      expect(vec1.x).toBe(3);
      expect(vec1.y).toBe(4);
    });
  });

  describe('multiply', () => {
    it('should multiply by scalar', () => {
      const vec = new Vector2(3, 4);
      vec.multiply(2);
      expect(vec.x).toBe(6);
      expect(vec.y).toBe(8);
    });

    it('should handle negative scalar', () => {
      const vec = new Vector2(3, 4);
      vec.multiply(-1);
      expect(vec.x).toBe(-3);
      expect(vec.y).toBe(-4);
    });
  });

  describe('magnitude', () => {
    it('should calculate magnitude correctly', () => {
      const vec = new Vector2(3, 4);
      expect(vec.magnitude()).toBe(5); // 3-4-5 triangle
    });

    it('should return 0 for zero vector', () => {
      const vec = new Vector2(0, 0);
      expect(vec.magnitude()).toBe(0);
    });
  });

  describe('normalize', () => {
    it('should normalize vector to unit length', () => {
      const vec = new Vector2(3, 4);
      vec.normalize();
      expect(vec.magnitude()).toBeCloseTo(1, 5);
      expect(vec.x).toBeCloseTo(0.6, 5);
      expect(vec.y).toBeCloseTo(0.8, 5);
    });

    it('should handle zero vector gracefully', () => {
      const vec = new Vector2(0, 0);
      vec.normalize();
      expect(vec.x).toBe(0);
      expect(vec.y).toBe(0);
    });
  });

  describe('distanceTo', () => {
    it('should calculate distance to another vector', () => {
      const vec1 = new Vector2(0, 0);
      const vec2 = new Vector2(3, 4);
      expect(vec1.distanceTo(vec2)).toBe(5);
    });

    it('should return 0 for same position', () => {
      const vec1 = new Vector2(5, 5);
      const vec2 = new Vector2(5, 5);
      expect(vec1.distanceTo(vec2)).toBe(0);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const vec1 = new Vector2(3, 4);
      const vec2 = vec1.clone();
      expect(vec2.x).toBe(3);
      expect(vec2.y).toBe(4);
      
      vec2.x = 10;
      expect(vec1.x).toBe(3); // Original unchanged
    });
  });

  describe('static distance', () => {
    it('should calculate distance between two vectors', () => {
      const vec1 = new Vector2(0, 0);
      const vec2 = new Vector2(3, 4);
      expect(Vector2.distance(vec1, vec2)).toBe(5);
    });

    it('should be symmetric', () => {
      const vec1 = new Vector2(1, 2);
      const vec2 = new Vector2(4, 6);
      expect(Vector2.distance(vec1, vec2)).toBe(Vector2.distance(vec2, vec1));
    });

    it('should return 0 for same vectors', () => {
      const vec1 = new Vector2(5, 5);
      const vec2 = new Vector2(5, 5);
      expect(Vector2.distance(vec1, vec2)).toBe(0);
    });

    it('should match instance distanceTo method', () => {
      const vec1 = new Vector2(2, 3);
      const vec2 = new Vector2(5, 7);
      expect(Vector2.distance(vec1, vec2)).toBe(vec1.distanceTo(vec2));
    });
  });

  describe('edge cases', () => {
    it('should handle very large numbers', () => {
      const vec = new Vector2(1e6, 1e6);
      expect(vec.magnitude()).toBeCloseTo(Math.sqrt(2) * 1e6, 0);
    });

    it('should handle very small numbers', () => {
      const vec = new Vector2(1e-10, 1e-10);
      expect(vec.magnitude()).toBeCloseTo(Math.sqrt(2) * 1e-10, 15);
    });

    it('should handle negative coordinates', () => {
      const vec1 = new Vector2(-3, -4);
      const vec2 = new Vector2(0, 0);
      expect(Vector2.distance(vec1, vec2)).toBe(5);
    });
  });
});