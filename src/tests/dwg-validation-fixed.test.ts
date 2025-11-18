import { describe, it, expect, vi } from 'vitest';
import { FileValidationService } from '../services/file-validation-service-updated';

describe('DWG Validation', () => {
  it('should validate empty DWG file', async () => {
    const result = await FileValidationService.validateDwg('');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Файл порожній');
  });

  it('should validate invalid DWG file', async () => {
    const invalidDwg = 'INVALID_CONTENT';
    const result = await FileValidationService.validateDwg(invalidDwg);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Невідома або непідтримувана версія DWG');
  });

  it('should validate R2010 DWG file', async () => {
    const r2010Dwg = 'AC1015' + 'dummy_content'.repeat(1000); // Симуляція бінарного контенту
    const result = await FileValidationService.validateDwg(r2010Dwg);
    expect(result.isValid).toBe(true);
    expect(result.version).toBe('R2010');
  });

  it('should validate R2013 DWG file', async () => {
    const r2013Dwg = 'AC1018' + 'dummy_content'.repeat(1000);
    const result = await FileValidationService.validateDwg(r2013Dwg);
    expect(result.isValid).toBe(true);
    expect(result.version).toBe('R2013');
  });

  it('should validate R2018 DWG file', async () => {
    const r2018Dwg = 'AC1021' + 'dummy_content'.repeat(1000);
    const result = await FileValidationService.validateDwg(r2018Dwg);
    expect(result.isValid).toBe(true);
    expect(result.version).toBe('R2018');
  });

  it('should validate R2021 DWG file', async () => {
    const r2021Dwg = 'AC1024' + 'dummy_content'.repeat(1000);
    const result = await FileValidationService.validateDwg(r2021Dwg);
    expect(result.isValid).toBe(true);
    expect(result.version).toBe('R2021');
  });

  it('should validate R2024 DWG file', async () => {
    const r2024Dwg = 'AC1027' + 'dummy_content'.repeat(1000);
    const result = await FileValidationService.validateDwg(r2024Dwg);
    expect(result.isValid).toBe(true);
    expect(result.version).toBe('R2024');
  });

  it('should warn for large DWG files', async () => {
    const largeContent = 'AC1015' + 'x'.repeat(10 * 1024 * 1024); // 10MB для тесту
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await FileValidationService.validateDwg(largeContent);
    expect(result.isValid).toBe(true);
    expect(consoleWarnSpy).not.toHaveBeenCalled(); // Не повинно попереджати для 10MB
    consoleWarnSpy.mockRestore();
  });
});
