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
   * Валідація STEP файлу
   */
  static validateStep(content: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Файл порожній');
      return { isValid: false, errors };
    }

    // Перевірка на наявність STEP заголовків
    if (!content.includes('ISO-10303-21') && !content.includes('STEP;')) {
      errors.push('Невірний формат STEP файлу');
    }

    // Перевірка на наявність DATA секції
    if (!content.includes('DATA;')) {
      errors.push('Відсутня секція DATA в STEP файлі');
    }

    // Перевірка на наявність ENDSEC
    if (!content.includes('ENDSEC;')) {
      errors.push('Відсутній кінець секції в STEP файлі');
    }

    // Перевірка розміру файлу (максимум 200MB)
    const maxSize = 200 * 1024 * 1024;
    if (content.length > maxSize) {
      errors.push('Файл занадто великий (максимум 200MB)');
    }

    return { isValid: errors.length === 0, errors };
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
  static validateFile(fileName: string, content: string): { isValid: boolean; errors: string[] } {
    const extension = fileName.toLowerCase().split('.').pop();

    switch (extension) {
      case 'dxf':
        return this.validateDxf(content);
      case 'stl':
        return this.validateStl(content);
      case 'step':
      case 'stp':
        return this.validateStep(content);
      case 'json':
        return this.validateJson(content);
      default:
        return { isValid: true, errors: [] }; // Для невідомих форматів пропускаємо валідацію
    }
  }
}
