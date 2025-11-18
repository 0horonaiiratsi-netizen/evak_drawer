# Вичерпний список завдань для завершення розробки "Малювальник" — від 2D-редактора до повноцінної CAD-платформи

Цей документ є єдиним, повним та вичерпним переліком завдань для всіх фаз розвитку додатку. Він базується на аналізі ROADMAP.md, DOES.md, TODO.md та фазових файлах (ROADMAP_PHASE_*.md). Виконані завдання позначено [x] на основі поточного стану (з DOES.md та позначок у фазових файлах). Структура відповідає фазам з ROADMAP.md. Кожна фаза включає підзавдання, залежності, технічні деталі та кроки тестування/документації для повноти.

## Фаза 0: Фундамент та Стратегія (Місяці 1-3) — [x] Виконано частково (аналіз)

- [x] **Дослідження ринку:** Конкурентний аналіз (Onshape, Fusion 360, SolidWorks, Blender); визначення аудиторії (професіонали, архітектори, мейкери); збір "болей" користувачів з форумів/інтерв'ю.
- [x] **Унікальна ціннісна пропозиція (UVP):** Сформульовано: "Професійний CAD, швидкий як думка та спільний як Google Docs".
- [x] **Вибір технологічного стеку:** Геометричне ядро (Open CASCADE для старту, R&D для власного); мови (C++/Rust для ядра, TypeScript для UI); UI (Electron/HTML/CSS, план на Tauri); хмара (AWS/Google Cloud).
- [x] **Стратегія монетизації:** Freemium (безкоштовний/Pro/Enterprise); модульна оплата для аддонів (FEA, CAM).
- [x] **Документація стратегії:** Оновити DOES.md з повними звітами аналізу; створити внутрішній dashboard для відстеження UVP.

## Фаза 1: Архітектурний фундамент та MVP (Місяці 4-12) — [x] Базовий MVP реалізовано

### 1.1. Ядро додатку та UI
- [x] **Базовий каркас:** Electron, CanvasController для рендерингу, WindowManager для вікон, навігація (pan, zoom, orbit).
- [x] **Система робочих просторів:** WorkspaceManager; реалізовано "Схеми евакуації" та "Класичне креслення" з адаптацією UI/панелей.
- [x] **Покращення UI:** Додати drag-and-drop для панелей (розширити WindowComponent для resize/dock); інтеграція з PROPERTIES_PANEL_SPEC.md для динамічної панелі властивостей (динамічні поля для Door/Window/Stairs/Text/Polyline/Circle/Arc/Hatch/Group/PdfUnderlay/EvacuationPath/DimensionObject).
  - **Залежності:** src/window-component.ts (додати resize), src/properties-controller.ts (динамічні поля), PROPERTIES_PANEL_SPEC.md (специфікація).
  - **Кроки:** Розширити WindowComponent для resize (onMouseMove/onResizeStart); оновити properties-controller.ts для динамічних рядків (showPropertyRows); додати локалізацію (locales/uk.json/en.json).
  - **Тестування:** UI-тести для drag/resize (e2e з Playwright); unit-тести для properties (src/tests/properties-controller.test.ts).

### 1.2. Базове 2D-скетчування
- [x] **Інструменти примітивів:** Polyline, Circle, Arc; режим ескізу з SketchObject.
- [x] **Параметричний скетчер:** Cassowary.js для лінійних обмежень + ітеративний солвер; обмеження (горизонтальність, вертикальність, паралельність, перпендикулярність, довжина, кут, дотичність).
- [x] **Тестування скетчера:** Додати unit-тести для солвера (src/tests/sketcher.test.ts); інтеграційні тести для стабільності ескізів.

### 1.3. Основи 3D-моделювання
- [x] **Операції створення тіл:** Extrude, Revolve, Cut (CSG), Sweep, Loft.
- [x] **3D Fillet/Chamfer:** Реалізувати для ребер 3D-тіл (відкладено до Open CASCADE повної інтеграції); додати UI для радіуса/кута.
  - **Залежності:** src/scene/extrude-object.ts (додати fillet), src/tools/fillet-tool.ts (UI), Open CASCADE (інтеграція).
  - **Кроки:** Додати fillet/chamfer до ExtrudeObject/RevolveObject; створити fillet-tool.ts з preview; інтегрувати з command-manager.ts.
  - **Тестування:** Unit-тести (src/tests/three-d.test.ts); перевірка геометрії на інтерференції.
- [x] **Параметричне дерево фіч:** UI-компонент (FeatureTreePanel) для відображення/редагування послідовності (скетч → extrude → fillet); інтеграція з history-manager.ts.
  - **Залежності:** panels/feature-tree-panel.html (HTML), src/controllers/feature-tree-controller.ts (логіка), src/services/history-manager.ts (undo/redo).
  - **Кроки:** Створити FeatureTreeController (відображення дерева, drag для порядку); додати редагування (видалення/вставка фіч); синхронізувати з scene/.
  - **Тестування:** UI-тести (e2e); unit-тести для дерева (src/tests/feature-tree.test.ts).
- [x] **Тестування 3D:** Unit-тести для операцій (src/tests/three-d.test.ts); перевірка на інтерференції.

### 1.4. Робота з файлами
- [x] **Власний формат:** Збереження/завантаження .json; імпорт PDF як підложки; експорт PNG/PDF.
- [x] **Підтримка DXF/DWG:**
  - [x] **Імпорт DXF:** DxfImportService для LINE, POLYLINE, CIRCLE, ARC, TEXT, INSERT (блоки), LAYER; мапінг властивостей (колір, тип лінії).
    - **Залежності:** src/services/dxf-import-service.ts (новий), dxf-parser (npm).
    - **Кроки:** Парсити DXF (entities: LINE/POLYLINE/CIRCLE/ARC/TEXT); створити SceneObject; мапінг шарів/властивостей.
    - **Тестування:** Unit-тести (src/tests/dxf-import.test.ts); інтеграційні (імпорт файлів).
  - [x] **Експорт DXF:** DxfExportService для зворотного перетворення; збереження шарів/геометрії.
    - **Залежності:** src/services/dxf-export-service.ts (новий), dxf-writer (npm).
    - **Кроки:** Перетворити SceneObject у DXF-entities; експорт шарів/властивостей.
    - **Тестування:** Unit-тести (src/tests/dxf-export.test.ts); перевірка сумісності з AutoCAD.
  - [ ] **DWG (довгостроково):** Дослідити бібліотеки (LibreDWG); інтеграція читання/запису.
- [x] **3D-формати:**
  - [x] **Експорт STL:** Для ExtrudeObject/RevolveObject; стандарт для 3D-друку.
    - **Залежності:** src/services/stl-export-service.ts (новий), stl-writer (npm).
    - **Кроки:** Тріангуляція 3D-геометрії; експорт у ASCII/Binary STL.
    - **Тестування:** Unit-тести (src/tests/stl-export.test.ts); перевірка в slicer'ах (Cura).
- [x] **Документація файлів:** Оновити README.md з прикладами імпорту/експорту; додати валідацію форматів.
  - **Залежності:** README.md, src/services/file-validation-service.ts (новий).
  - **Кроки:** Додати приклади команд (імпорт DXF: "File > Import > DXF"); валідація (перевірка версії/структури).
  - **Тестування:** Документаційні тести (перевірка прикладів).

### 1.5. Невыполненные задачи фазы 1
- [x] **Підтримка DXF/DWG:**
  - [x] **Імпорт DXF:** DxfImportService для LINE, POLYLINE, CIRCLE, ARC, TEXT, INSERT (блоки), LAYER; мапінг властивостей (колір, тип лінії).
    - **Залежності:** src/services/dxf-import-service.ts, dxf-parser (npm).
    - **Кроки:** Парсити DXF (entities: LINE/POLYLINE/CIRCLE/ARC/TEXT); створити SceneObject; мапінг шарів/властивостей.
    - **Тестування:** Unit-тести (src/tests/dxf-import.test.ts); інтеграційні (імпорт файлів).
  - [x] **Експорт DXF:** DxfExportService для зворотного перетворення; збереження шарів/геометрії.
    - **Залежності:** src/services/dxf-export-service.ts, dxf-writer (npm).
    - **Кроки:** Перетворити SceneObject у DXF-entities; експорт шарів/властивостей.
    - **Тестування:** Unit-тести (src/tests/dxf-export.test.ts); перевірка сумісності з AutoCAD.
  - [ ] **DWG (довгостроково):** Дослідити бібліотеки (LibreDWG); інтеграція читання/запису.
- [x] **3D-формати:**
  - [x] **Експорт STL:** Для ExtrudeObject/RevolveObject; стандарт для 3D-друку.
    - **Залежності:** src/services/stl-export-service.ts, stl-writer (npm).
    - **Кроки:** Тріангуляція 3D-геометрії; експорт у ASCII/Binary STL.
    - **Тестування:** Unit-тести (src/tests/stl-export.test.ts); перевірка в slicer'ах (Cura).

- [x] **Документація файлів:** Оновити README.md з прикладами імпорту/експорту; додати валідацію форматів.
  - **Залежності:** README.md, src/services/file-validation-service.ts.
  - **Кроки:** Додати приклади команд (імпорт DXF: "File > Import > DXF"); валідація (перевірка версії/структури).
  - **Тестування:** Документаційні тести (перевірка прикладів).

## Фаза 2: Професійні інструменти модифікації та інтерактивності (Місяці 13-24) — [x] Базові інструменти реалізовано

### 2.1. Фундамент інтерактивності
- [x] **CommandManager на XState:** State machines для команд (вибір → ввід → завершення); інтеграція з command-line-controller.ts.
- [x] **Командний рядок:** Відображення запитів (e.g., "TRIM: Виберіть..."); введення опцій/чисел.
- [x] **Система виділення:** Noun-verb та verb-noun парадигми; множинне виділення, групування (Ctrl+G).

### 2.2. Інструменти модифікації (на JSTS)
- [x] **Інтеграція JSTS:** Сервіс для перетинів, буферів, об'єднання/різниці.
- [x] **Trim/Extend:** Знаходження перетинів; модифікація об'єктів.
- [x] **Offset:** Буфер для паралельних копій (лінії, дуги).
- [x] **Mirror:** Афінне віддзеркалення.
- [x] **Fillet/Chamfer:** Перетин + створення Arc/Polyline; UI для радіуса.
- [x] **Match Properties:** Копіювання властивостей (шар, колір, товщина).
- [x] **Додаткові інструменти:** Rotate by Reference, Scale by Reference; інтеграція з grips.ts.
  - **Залежності:** src/tools/rotate-by-reference-tool.ts, src/tools/scale-by-reference-tool.ts, src/scene/grips.ts (інтеграція).
  - **Кроки:** Створити RotateByReferenceTool (вибір осі/кута за reference); ScaleByReferenceTool (масштаб за reference-точкою); додати grips для preview/введення.
  - **Тестування:** Unit-тести (src/tests/rotate-scale.test.ts); перевірка геометрії після трансформації.
- [x] **Тестування:** Unit-тести для JSTS-операцій (src/tests/geometry-service.test.ts); UI-тести для preview.
  - **Залежності:** Vitest/Jest, src/services/geometry-service.ts (JSTS wrapper).
  - **Кроки:** Тестувати перетини/буфери (intersection/buffer); UI-preview (canvas рендеринг під час команди).
  - **Тестування:** Coverage >80%; e2e для інструментів (Playwright).

### 2.3. UI/UX покращення
- [x] **Динамічний курсор, preview:** "Гумові" лінії; активація кнопок на панелях (modification-toolbar.html).
- [x] **Іконки:** Перехід на PNG/WEBP в assets/icons/; оновлення HTML/CSS.
- [ ] **Документація:** Оновити PROPERTIES_PANEL_SPEC.md; додати туторіали для інструментів.
  - **Залежності:** PROPERTIES_PANEL_SPEC.md (оновити специфікації), docs/tutorials/ (нові файли), src/i18n.ts (локалізація).
  - **Кроки:** Розширити SPEC для нових типів (DimensionObject, GroupObject); створити туторіали (HTML/MD: "Як використовувати Trim", "Скетчер обмеження"); інтегрувати в UI (help-menu).
  - **Тестування:** Перевірка документації (лінки/точність); user-testing для туторіалів.

### 2.4. Просунуті збірки та креслення
- [ ] **Assemblies:**
  - [ ] **Mates/Joints:** Rigid, Revolute, Slider; інтеграція з scene/.
    - **Залежності:** src/scene/assembly-object.ts (новий), src/services/mate-service.ts (логіка), Open CASCADE (для joints).
    - **Кроки:** Створити AssemblyObject (додати компоненти); реалізувати Mates (rigid/revolute/slider з обмеженнями); інтегрувати з scene/ (рендеринг ієрархії).
    - **Тестування:** Unit-тести (src/tests/assembly-mates.test.ts); перевірка руху/обмежень.
  - [ ] **Collision Detection:** Виявлення інтерференцій.
    - **Залежності:** src/services/collision-service.ts (новий), JSTS або Open CASCADE (для bounding boxes/перетинів).
    - **Кроки:** Реалізувати bounding box перевірку; візуалізація конфліктів (highlight); інтеграція з assemblies.
    - **Тестування:** Unit-тести (src/tests/collision.test.ts); симуляція сценаріїв інтерференції.
  - [ ] **BOM:** Генерація таблиці компонентів.
    - **Залежності:** src/services/bom-service.ts (новий), panels/bom-panel.html (UI).
    - **Кроки:** Збирати ієрархію з AssemblyObject; генерувати таблицю (Excel/CSV/HTML); експорт.
    - **Тестування:** Unit-тести (src/tests/bom.test.ts); перевірка точності таблиці.
- [ ] **2D-Креслення:**
  - [ ] **Layouts:** Простори моделі/листа.
    - **Залежності:** src/scene/layout-object.ts (новий), src/services/layout-service.ts.
    - **Кроки:** Створити LayoutObject (модель/лист); перемикання viewport; масштабування.
    - **Тестування:** Unit-тести (src/tests/layout.test.ts); UI-тести перемикання.
  - [ ] **Види з 3D:** Ортогональні, ізометричні, розрізи.
    - **Залежності:** src/tools/view-tool.ts (новий), CanvasController (рендеринг).
    - **Кроки:** Генерувати проекції з 3D-моделі; додати команди (ORTHO, ISO, SECTION); інтеграція з layouts.
    - **Тестування:** Unit-тести (src/tests/view-projection.test.ts); перевірка точності проекцій.
  - [ ] **Анотації:** Допуски, шорсткості.
    - **Залежності:** src/scene/annotation-object.ts (новий), dimension-style.ts (стилі).
    - **Кроки:** Створити ToleranceObject/SurfaceObject; UI для введення (текст/символи); рендеринг.
    - **Тестування:** Unit-тести (src/tests/annotations.test.ts); валідація символів.
- [ ] **Параметризація:**
  - [ ] **Глобальні змінні/рівняння:** Використання в скетчах/операціях.
    - **Залежності:** src/services/parameter-service.ts (новий), Cassowary.js (розширення).
    - **Кроки:** Створити ParameterManager (змінні/рівняння); інтеграція з скетчером/операціями (e.g., довжина = param1 + param2).
    - **Тестування:** Unit-тести (src/tests/parameters.test.ts); перевірка оновлення при зміні.
  - [ ] **Конфігурації:** Таблиці параметрів для варіантів.
    - **Залежності:** src/services/config-service.ts (новий), panels/config-table.html (UI).
    - **Кроки:** Створити ConfigTable (рядки для варіантів); застосування до моделі; збереження в .json.
    - **Тестування:** Unit-тести (src/tests/configurations.test.ts); перевірка варіантів.

## Фаза 3: Глибока інтеграція з ОС та преміум UX (Місяці 25-36) — [x] Базова інтеграція реалізовано

- [x] **Файли/ОС:** Нативні dialog API; асоціація .json; recent documents.
- [x] **Windows UI:** Progress bar, Notification API; збереження стану вікна.
- [x] **Поведінка:** Single Instance Lock; electron-updater для оновлень.
- [ ] **Розширення:** Tray icon для фону; deep linking для файлів.
  - **Залежності:** src/main.ts (Electron main), tray-icon.png (asset).
  - **Кроки:** Додати tray menu (відкрити/вийти); deep linking (protocol handler для .json); інтеграція з app.ts.
  - **Тестування:** Крос-платформенні тести (Windows/Linux/macOS); перевірка tray/deep linking.
- [ ] **Тестування:** Крос-платформенні тести (Windows/Linux/macOS); автоматизовані оновлення.
  - **Залежності:** CI/CD (GitHub Actions), electron-builder (для пакетів).
  - **Кроки:** Налаштувати тести на всіх ОС; автоматизація оновлень (electron-updater); збірка пакетів.
  - **Тестування:** Coverage >80%; інтеграційні тести оновлень.
- [ ] **Симуляція (FEA):** Статичний/термічний аналіз; інтеграція з Open CASCADE.
  - **Залежності:** src/services/fea-service.ts (новий), Open CASCADE (FEA модуль), panels/fea-panel.html (UI).
  - **Кроки:** Інтегрувати статичний аналіз (навантаження/фіксації); термічний (температури); візуалізація результатів (деформації/напруги).
  - **Тестування:** Unit-тести (src/tests/fea.test.ts); валідація з аналітичними рішеннями.
- [ ] **Рендеринг:** Cycles/LuxCoreRender; PBR-матеріали, HDRI.
  - **Залежності:** src/services/render-service.ts (новий), LuxCoreRender (інтеграція), assets/hdri/ (нові).
  - **Кроки:** Інтегрувати LuxCoreRender для ray-tracing; додати PBR-матеріали (metallic/roughness); HDRI для освітлення; експорт зображень.
  - **Тестування:** Unit-тести (src/tests/rendering.test.ts); перевірка якості рендерингу.

## Фаза 4: Інструменти для анотацій та професійної документації — [ ] Не розпочато

- [ ] **Анотації:** Розміри (dimlinear, dimaligned), текст, хетч; dimension-style.ts.
  - **Залежності:** src/scene/dimension-object.ts (оновити), src/tools/dim-tool.ts (новий), dimension-style.ts (стилі).
  - **Кроки:** Реалізувати DimLinear/DimAligned (лінійні/кутові розміри); додати хетч (HatchObject з шаблонами); інтеграція з snapping/grips.
  - **Тестування:** Unit-тести (src/tests/dimensions.test.ts); перевірка точності розмірів.
- [ ] **Документація:** BOM, специфікації; експорт DWG/PDF з анотаціями.
  - **Залежності:** src/services/doc-service.ts (новий), panels/bom-panel.html (UI), dxf-export-service.ts (розширення).
  - **Кроки:** Генерувати BOM/специфікації (таблиці з атрибутами); експорт з анотаціями (DWG/PDF); UI для редагування.
  - **Тестування:** Unit-тести (src/tests/documentation.test.ts); перевірка експорту.
- [ ] **Спеціалізоване моделювання:** Sheet Metal (згини, розгортки); NURBS поверхні; Weldments (профілі, різання).
  - **Залежності:** src/scene/sheet-metal-object.ts (новий), src/services/nurbs-service.ts (NURBS), Open CASCADE (для згинів/розгорток).
  - **Кроки:** Sheet Metal: команди BEND/UNFOLD; NURBS: B-Spline поверхні; Weldments: профілі (I-beam), різання (coping/miter).
  - **Тестування:** Unit-тести (src/tests/sheet-metal.test.ts, src/tests/nurbs.test.ts); перевірка розгорток.
- [ ] **CAM:** G-код для 2.5D фрезерування (контур, кишеня).
  - **Залежності:** src/services/cam-service.ts (новий), gcode-generator (npm), panels/cam-panel.html (UI).
  - **Кроки:** Генерація G-коду (контур/кишеня/дрилювання); інструменти (endmill/drill); симуляція шляху.
  - **Тестування:** Unit-тести (src/tests/cam.test.ts); валідація G-коду в CAM-софті (Fusion 360).
- [ ] **Тестування:** Валідація анотацій на точність; інтеграція з експортом.
  - **Залежності:** Vitest, src/tests/integration.test.ts (експорт).
  - **Кроки:** Тестувати розміри/хетч на точність; інтеграція (експорт з анотаціями); coverage >80%.
  - **Тестування:** e2e для CAM/документації; user-testing для UI.

## Фаза 5: Професійні робочі процеси та масштабування проєктів — [ ] Частково описано

- [ ] **Блоки/Атрибути:** AttributeDefinition в BlockDefinition; EATTEDIT діалог.
  - **Залежності:** src/scene/block-object.ts (оновити), src/controllers/attribute-controller.ts (новий), panels/attribute-dialog.html (UI).
  - **Кроки:** Додати AttributeDefinition (текст/числа); EATTEDIT діалог для редагування; інтеграція з BlockDefinition.
  - **Тестування:** Unit-тести (src/tests/blocks-attributes.test.ts); перевірка атрибутів у блоках.
- [ ] **Xref:** XrefManager/Object; команди XATTACH/XBIND; динамічне завантаження/відстеження.
  - **Залежності:** src/services/xref-service.ts (новий), src/scene/xref-object.ts (новий), src/controllers/xref-controller.ts.
  - **Кроки:** Реалізувати XATTACH (прив'язка зовнішніх файлів); XBIND (імпорт); динамічне оновлення при зміні файлів.
  - **Тестування:** Unit-тести (src/tests/xref.test.ts); перевірка синхронізації.
- [ ] **Шари розширені:** Linetype менеджер/рендеринг; Lineweight з видимістю; Layer States (збереження конфігурацій).
  - **Залежності:** src/services/linetype-service.ts (новий), src/services/layer-state-service.ts (новий), panels/layer-manager.html (оновити).
  - **Кроки:** Linetype: менеджер шаблонів (dashed/dotted); Lineweight: видимість/товщина; Layer States: збереження/відновлення станів шарів.
  - **Тестування:** Unit-тести (src/tests/layers.test.ts); перевірка рендерингу.
- [ ] **Топографія/Геодезія:**
  - [ ] **Імпорт пікетажу:** Команда для даних зйомок; парсер; символи Topomap 7.5.
    - **Залежності:** src/services/survey-import-service.ts (новий), src/scene/survey-point.ts (новий), Topomap 7.5 (інтеграція).
    - **Кроки:** Парсер пікетажу (X/Y/Z); створення SurveyPoint; символи (тригонометричні знаки).
    - **Тестування:** Unit-тести (src/tests/survey-import.test.ts); перевірка точності.
  - [ ] **CONTOUR:** Тріангуляція Делоне (TIN); Marching Squares для горизонталей; UI (крок, шари).
    - **Залежності:** src/services/contour-service.ts (новий), JSTS (для TIN), panels/contour-panel.html (UI).
    - **Кроки:** TIN з точок; Marching Squares для ізоліній; UI для кроку/шарів; рендеринг горизонталей.
    - **Тестування:** Unit-тести (src/tests/contour.test.ts); перевірка точності ізоліній.
- [ ] **Масштабування:** Оптимізація для великих збірок; багатопотоковість.
  - **Залежності:** src/services/optimization-service.ts (новий), Web Workers (для багатопотоковості).
  - **Кроки:** Оптимізація рендерингу (LOD); багатопотокові операції (CSG/рендеринг); кешування геометрії.
  - **Тестування:** Профайлінг (Chrome DevTools); unit-тести для оптимізацій.
- [ ] **Документація:** Оновити i18n.ts для нових команд; тести (src/tests/).
  - **Залежності:** src/i18n.ts (оновити), locales/uk.json/en.json (нові ключі).
  - **Кроки:** Додати переклади для команд (XREF, CONTOUR); документація (README.md з прикладами).
  - **Тестування:** Локалізаційні тести; перевірка документації.

## Фаза 6: Екосистема, Сумісність та 3D — [ ] Не розпочато

- [ ] **API/SDK:** Публічний API; документоване SDK для плагінів (TypeScript/C++).
  - **Залежності:** src/api/public-api.ts (новий), docs/sdk-docs.md (документація), TypeScript declarations.
  - **Кроки:** Створити REST API (endpoints для сцен/операцій); SDK з класами (Scene, Tool); документація з прикладами.
  - **Тестування:** API-тести (Postman); SDK unit-тести (src/tests/sdk.test.ts).
- [ ] **Marketplace:** Веб-платформа для публікації/монетизації плагінів.
  - **Залежності:** marketplace-web-app/ (новий проект), src/services/plugin-manager.ts (оновити).
  - **Кроки:** Веб-платформа (React/Node.js); інтеграція з додатком (завантаження плагінів); монетизація (Stripe).
  - **Тестування:** e2e для marketplace; unit-тести для plugin-manager.
- [ ] **Співпраця:**
  - [ ] **Версії (Git-like):** Check-in/out, branches, порівняння.
    - **Залежності:** src/services/version-control-service.ts (новий), Git-like API.
    - **Кроки:** Реалізувати check-in/out; branches для варіантів; diff/merge для сцен.
    - **Тестування:** Unit-тести (src/tests/version-control.test.ts); перевірка конфліктів.
  - [ ] **Коментарі:** Прив'язка до геометрії/фіч.
    - **Залежності:** src/scene/comment-object.ts (новий), panels/comments-panel.html (UI).
    - **Кроки:** CommentObject (текст/позиція); прив'язка до фіч; UI для додавання/редагування.
    - **Тестування:** Unit-тести (src/tests/comments.test.ts); перевірка прив'язки.
  - [ ] **Реальний час:** Спільне редагування (як Figma); чат/презентація.
    - **Залежності:** WebSocket server (Node.js), src/services/collaboration-service.ts (новий).
    - **Кроки:** Синхронізація операцій (CRDT); чат (WebSocket); презентація (shared viewport).
    - **Тестування:** e2e для collaboration; unit-тести для синхронізації.
- [ ] **Спільнота:** Публічна roadmap; голосування ідей; форум/Discord.
  - **Залежності:** community-website/ (новий), Discord bot.
  - **Кроки:** Roadmap на GitHub; голосування (GitHub Issues); форум (Discourse); Discord для чату.
  - **Тестування:** User-testing для community features.
- [ ] **Навчання:** База знань; вбудовані туторіали.
  - **Залежності:** docs/knowledge-base.md (новий), src/controllers/tutorial-controller.ts (новий).
  - **Кроки:** База знань (MD/HTML); вбудовані туторіали (step-by-step guides); інтеграція в UI.
  - **Тестування:** User-testing для туторіалів; перевірка бази знань.
- [ ] **Запуск:** Бета-тестування; контент-маркетинг; регулярні релізи (6 міс. мажорні).
  - **Залежності:** Beta program (TestFlight/Google Play Beta), marketing-site/ (новий).
  - **Кроки:** Бета-тестування (збір фідбеку); маркетинг (YouTube/Reddit); релізи (semantic versioning).
  - **Тестування:** Beta feedback analysis; release testing.

## Загальні кроки для всіх фаз
- [ ] **Тестування:** Unit/integration/e2e тести (Jest/Vitest); coverage >80%.
  - **Залежності:** Vitest/Jest, CI/CD (GitHub Actions).
  - **Кроки:** Налаштувати unit-тести для нових модулів; integration для API; e2e з Playwright; досягти coverage >80%.
  - **Тестування:** Автоматичні запуски; аналіз coverage.
- [ ] **Локалізація:** Оновити locales/en.json, uk.json для нових UI/команд.
  - **Залежності:** src/i18n.ts, locales/uk.json/en.json.
  - **Кроки:** Додати ключі для нових команд/UI; переклади українською/англійською; тестування на відсутність ключів.
  - **Тестування:** Локалізаційні тести; перевірка UI на мовах.
- [ ] **Документація:** Оновити README.md, FUNCTION_HIERARCHY.md; API docs.
  - **Залежності:** README.md, docs/ (нові файли), FUNCTION_HIERARCHY.md.
  - **Кроки:** Оновити README з новими фіч; додати API docs (Swagger); FUNCTION_HIERARCHY.md з ієрархією функцій.
  - **Тестування:** Перевірка документації на актуальність; user-testing.
- [ ] **Оптимізація:** Профайлінг продуктивності; рефакторинг src/.
  - **Залежності:** Chrome DevTools, src/services/profiling-service.ts (новий).
  - **Кроки:** Профайлінг (CPU/memory); оптимізація (LOD, кешування); рефакторинг для читабельності.
  - **Тестування:** Benchmarking до/після; unit-тести для оптимізацій.
- [ ] **Безпека:** Валідація імпорту; шифрування проєктів у хмарі.
  - **Залежності:** src/services/validation-service.ts (новий), crypto API (для шифрування).
  - **Кроки:** Валідація імпорту (перевірка форматів/шкідливого коду); шифрування файлів у хмарі (AES); аудит безпеки.
  - **Тестування:** Security tests (penetration testing); unit-тести для валідації.
