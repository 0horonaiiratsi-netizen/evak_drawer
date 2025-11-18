<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Малювальник — Професійний CAD-редактор

"Малювальник" — це повноцінна CAD-платформа для 2D/3D-моделювання, креслення та документації. Підтримує DXF/STL/STEP імпорт/експорт, параметричне скетчування, 3D-операції (extrude, revolve) та спеціалізовані інструменти для архітектури/евакуації.

## Функціональність
- **2D-скетчування:** Polyline, Circle, Arc, обмеження (Cassowary.js).
- **3D-моделювання:** Extrude, Revolve, Fillet/Chamfer.
- **Імпорт/Експорт:** DXF (LINE/POLYLINE/CIRCLE/ARC/TEXT/INSERT), STL (для 3D-друку), STEP (плейсхолдер).
- **UI:** Electron, Canvas рендеринг, динамічні панелі властивостей.
- **Робочі простори:** "Схеми евакуації" та "Класичне креслення".

## Встановлення та Запуск

**Передумови:** Node.js ≥18, npm.

1. Клонуйте репозиторій:
   ```
   git clone <repo-url>
   cd evak_drawer
   ```

2. Встановіть залежності:
   ```
   npm install
   ```

3. Налаштуйте Gemini API (опціонально, для AI-допомоги):
   - Створіть `.env.local` з `GEMINI_API_KEY=your_key`.

4. Запустіть у режимі розробки:
   ```
   npm run dev
   ```

5. Для збірки Electron (Windows/Linux/macOS):
   ```
   npm run build
   npm run electron:dev
   ```

## Використання

### Імпорт/Експорт Файлів
- **Імпорт DXF:** Меню `File > Import > DXF` (виберіть файл). Підтримує LINE, POLYLINE, CIRCLE, ARC, TEXT, INSERT, LAYER. Автоматична валідація (структура, розмір ≤50MB).
  - Приклад: Імпорт креслення з AutoCAD → об'єкти додаються до сцени з мапінгом шарів/кольорів.
- **Експорт DXF:** `File > Export > DXF` (збереже як export.dxf). Експортує видимі об'єкти з шарами.
- **Експорт STL:** `File > Export > STL` (для 3D-об'єктів як Extrude/Revolve). Тріангуляція з THREE.js mesh (розмір ≤100MB).
  - Приклад: Експорт 3D-моделі для друку в Cura.
- **Імпорт/Експорт STEP:** `File > Import/Export > STEP` (плейсхолдер). Повна реалізація потребує Open CASCADE. Базова валідація (ISO-10303, розмір ≤200MB).
- **Валідація:** Автоматична перевірка перед імпортом (помилки показуються в діалозі).

### Приклади Команд
- Новий проєкт: `File > New Project`.
- Імпорт DXF: `IMPORT DXF <шлях_до_файлу>` (командний рядок).
- Експорт PNG: `EXPORT PNG` (екранний знімок).
- Undo/Redo: Ctrl+Z / Ctrl+Y.

### Робочі Простори
- **Схеми евакуації:** Інструменти для шляхів евакуації, символів (двері, сходи, вогнегасники).
- **Класичне креслення:** Стандартні інструменти (polyline, circle, trim, offset).

### Тестування
```
npm test  # Vitest для unit-тестів (import-export, sketcher, three-d)
npm run test:e2e  # Playwright для UI-тестів
```

## Структура Проєкту
- `src/app.ts`: Головний клас, контролери, інструменти.
- `src/scene/`: Об'єкти (PolylineObject, ExtrudeObject).
- `src/services/`: Сервіси (dxf-import-service.ts, stl-export-service.ts).
- `src/tests/`: Unit-тести (import-export.test.ts).
- `panels/`: HTML-панелі (feature-tree-panel.html).
- `assets/icons/`: Іконки інструментів.

## Документація
- [TODO.md](TODO.md): Вичерпний план розвитку.
- [ROADMAP.md](ROADMAP.md): Фази (Фундамент → Професійні інструменти → Екосистема).
- [PROPERTIES_PANEL_SPEC.md](PROPERTIES_PANEL_SPEC.md): Специфікація панелі властивостей.
- [FUNCTION_HIERARCHY.md](FUNCTION_HIERARCHY.md): Ієрархія функцій.

## Внесок
1. Оберіть завдання з [TODO.md].
2. Створіть гілку: `git checkout -b feature/импорт-dxf`.
3. Зробіть зміни, додайте тести.
4. Запустіть `npm test` та `npm run lint`.
5. Pull Request з описом змін.

## Ліцензія
Apache-2.0. Див. [LICENSE](LICENSE).

## Контакти
- GitHub Issues для багів/ідей.
- Discord: [посилання на сервер].
