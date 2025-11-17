# Ієрархія функцій та класів додатку "Малювальник"

Цей документ візуалізує основну архітектуру додатку, показуючи, як ключові класи та контролери взаємодіють між собою.

```
Головна точка входу (index.tsx -> main())
└── App (Центральний клас додатку)
    ├── InputHandler (Обробник вводу користувача)
    │   ├── onMouseDown(event) -> делегує до активного інструменту/команди
    │   ├── onMouseMove(event) -> делегує до активного інструменту/команди
    │   ├── onKeyDown(event)   -> обробляє глобальні гарячі клавіші та делегує інше
    │   └── updateCursor()
    │
    ├── CanvasController (Відповідає за рендеринг на полотні)
    │   ├── draw() (Головний цикл відмальовування)
    │   │   ├── drawGrid()
    │   │   └── drawObjects() -> викликає .draw() для кожного SceneObject
    │   ├── screenToWorld() / worldToScreen() (Перетворення координат)
    │   └── zoomOnWheel() / pan() (Навігація)
    │
    ├── CommandManager (Керує складними, багатоетапними командами)
    │   ├── startCommand(commandName) -> створює та запускає екземпляр команди
    │   └── activeCommand (Активна команда, що отримує ввід)
    │
    ├── HistoryManager (Керує історією змін для Undo/Redo)
    │   ├── addState()
    │   └── undo() / redo()
    │
    ├── ToolbarController (Керує логікою панелей інструментів)
    │
    ├── PropertiesController (Керує панеллю властивостей)
    │
    ├── LayersController (Керує панеллю шарів)
    │
    ├── StyleManager (Керує текстовими та розмірними стилями)
    │
    ├── ActiveTool (Поточний активний інструмент або команда)
    │   └── Tool (Абстрактний базовий клас)
    │       ├── SelectTool
    │       ├── WallTool
    │       ├── DoorTool
    │       ├── ... (інші прості інструменти)
    │       └── Command (Інтерфейс для складних команд, що також є Tool)
    │           ├── LineCommand (реалізована через XState)
    │           ├── TrimCommand (реалізована через XState)
    │           └── ... (інші команди)
    │
    └── SceneObjects (Масив об'єктів на сцені)
        └── SceneObject (Базовий інтерфейс для всіх об'єктів)
            ├── draw()
            ├── contains()
            ├── getBoundingBox()
            ├── move(), rotate(), scale()
            └── Реалізації:
                ├── Wall
                ├── WallMountedObject (Абстрактний)
                │   ├── Door
                │   └── BuildingWindow
                ├── TextObject
                ├── SymbolObject
                ├── PolylineObject
                ├── CircleObject
                ├── ArcObject
                ├── HatchObject
                ├── DimensionObject (Абстрактний)
                │   ├── LinearDimensionObject
                │   └── AlignedDimensionObject
                ├── GroupObject
                ├── SketchObject
                └── ... (інші об'єкти)
```

## Потік даних (спрощено)

1.  **Ввід:** `InputHandler` отримує подію (напр., клік миші).
2.  **Делегування:** `InputHandler` передає подію до поточного `App.activeTool` (яким може бути `SelectTool` або активна команда, напр., `LineCommand`).
3.  **Обробка:** Активний інструмент/команда обробляє подію, що може призвести до:
    - Зміни стану сцени (створення/редагування `SceneObject`).
    - Зміни стану самого інструменту/команди (перехід до наступного кроку).
4.  **Збереження стану:** Після завершення дії інструмент викликає `App.commitState()`, що зберігає поточний стан сцени в `HistoryManager`.
5.  **Рендеринг:** Інструмент/команда викликає `App.draw()`.
6.  **Відмальовування:** `CanvasController.draw()` очищує полотно та послідовно викликає метод `.draw()` для кожного видимого `SceneObject`.
