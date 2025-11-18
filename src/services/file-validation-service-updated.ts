export class FileValidationService {
  /**
   * Валідація DXF файлу
   */
  static validateDxf(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Файл порожній');
      return { isValid: false, errors };
    }

    // Перевірка базової структури DXF
    if (!content.includes('SECTION') || !content.includes('ENDSEC')) {
      errors.push('Невірна структура DXF файлу');
    }

    // Перевірка на наявність сутностей
    if (!content.includes('ENTITIES')) {
      errors.push('Відсутня секція ENTITIES');
    }

    // Перевірка на наявність EOF
    if (!content.includes('EOF')) {
      errors.push('Файл не закінчується EOF');
    }

    // Перевірка розміру файлу (максимум 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (content.length > maxSize) {
      errors.push('Файл занадто великий (максимум 50MB)');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Валідація STL файлу
   */
  static validateStl(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Файл порожній');
      return { isValid: false, errors };
    }

    // Перевірка на ASCII формат
    if (content.includes('solid') && content.includes('facet')) {
      // ASCII STL
      if (!content.includes('endsolid')) {
        errors.push('Невірна структура ASCII STL файлу');
      }
    } else {
      // Можливо Binary STL - базова перевірка розміру
      const minBinarySize = 84; // Header + 4 bytes for triangle count
      if (content.length < minBinarySize) {
        errors.push('Файл занадто малий для Binary STL');
      }
    }

    // Перевірка розміру файлу (максимум 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (content.length > maxSize) {
      errors.push('Файл занадто великий (максимум 100MB)');
    }

    return { isValid: errors.length === 0, errors };
  }



  /**
   * Валідація DWG файлу
   */
  static async validateDwg(content: string): Promise<{ isValid: boolean; errors: string[]; version?: string }> {
    const errors: string[] = [];

    if (!content || content.length === 0) {
      errors.push('Файл порожній');
      return { isValid: false, errors };
    }

    // Перевірка розміру файлу (без обмежень, але попередження для великих файлів)
    const maxRecommendedSize = 500 * 1024 * 1024; // 500MB рекомендація
    if (content.length > maxRecommendedSize) {
      console.warn('DWG файл великий (>500MB), можливі проблеми з продуктивністю');
    }

    // Перевірка версії через DwgService
    const { DwgService } = await import('./dwg-service');
    const versionCheck = DwgService.validateDwgVersion(content);
    if (!versionCheck.isValid) {
      errors.push(...versionCheck.errors);
    }

    return { isValid: errors.length === 0, errors, version: versionCheck.version };
  }

  /**
   * Валідація JSON файлу додатку
   */
  static validateJson(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Файл порожній');
      return { isValid: false, errors };
    }

    try {
      const data = JSON.parse(content);

      // Перевірка базової структури
      if (!data || typeof data !== 'object') {
        errors.push('Невірна структура JSON файлу');
      }

      // Перевірка на наявність версії
      if (!data.version) {
        errors.push('Відсутня версія файлу');
      }

      // Перевірка на наявність об'єктів
      if (!data.objects || !Array.isArray(data.objects)) {
        errors.push('Відсутній масив об\'єктів');
      }

    } catch (e) {
      errors.push('Невірний JSON формат');
    }

    // Перевірка розміру файлу (максимум 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (content.length > maxSize) {
      errors.push('Файл занадто великий (максимум 100MB)');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Загальна валідація файлу за розширенням
   */
  static async validateFile(fileName: string, content: string): Promise<{ isValid: boolean; errors: string[] }> {
    const extension = fileName.toLowerCase().split('.').pop();

    switch (extension) {
      case 'dxf':
        return this.validateDxf(content);
      case 'stl':
        return this.validateStl(content);

      case 'dwg':
        return await this.validateDwg(content);
      case 'json':
        return this.validateJson(content);
      default:
        return { isValid: true, errors: [] }; // Для невідомих форматів пропускаємо валідацію
    }
  }
}
