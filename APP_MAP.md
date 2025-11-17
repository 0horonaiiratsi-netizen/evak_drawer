# Карта Додатку "Малювальник"

Цей документ візуалізує архітектуру та основні потоки даних у вашому CAD-редакторі "Малювальник". Він показує, як взаємодіють ключові компоненти, від інтерфейсу користувача до ядра рендерингу та сервісів управління станом.

Для візуалізації використано синтаксис Mermaid.js.

```mermaid
graph TD
    subgraph "Користувацька взаємодія"
        User[Користувач] --> UI(Інтерфейс);
        UI --> Canvas(🎨 Полотно Canvas);
        UI --> Toolbars(Інструменти);
        UI --> Windows(Вікна: Шари, Властивості);
        UI --> CommandLine(Командний рядок);
    end

    subgraph "Ядро Додатку (App.ts)"
        App[Клас App];
    end

    UI --> App;

    subgraph "Основні Контролери"
        App --> InputHandler[⌨️ InputHandler];
        App --> CanvasController[🖼️ CanvasController];
        App --> ThreeDController[🧊 ThreeDController];
        App --> CommandManager[▶️ CommandManager];
    end

    subgraph "Сервіси (Управління Станом та Даними)"
        App --> ProjectStateService[💾 ProjectStateService];
        ProjectStateService --> HistoryManager[🔄 HistoryManager];
        App --> SceneService[🌳 SceneService];
        App --> LayerService[ layered_architecture LayerService];
        App --> SelectionService[🖱️ SelectionService];
        App --> GeometryService[📐 GeometryService (JSTS)];
        App --> I18nService[🌐 I18nService];
    end

    subgraph "UI Контролери"
        App --> ToolbarManager[🔧 ToolbarManager];
        App --> PropertiesController[📊 PropertiesController];
        App --> LayersController[📚 LayersController];
        App --> WindowManager[🪟 WindowManager];
        App --> DialogController[💬 DialogController];
    end
    
    %% Потоки даних та взаємодії
    Canvas --> InputHandler;
    InputHandler --> ActiveTool{Активний Інструмент / Команда};
    Toolbars --> App;
    CommandLine --> CommandManager;
    CommandManager --> ActiveTool;

    ActiveTool --> SceneService;
    ActiveTool --> ProjectStateService;
    ActiveTool --> SelectionService;

    SceneService --> SceneObjects{{Об'єкти сцени}};
    CanvasController -- Рендерить --> SceneObjects;
    SceneService -- Змінює дані --> CanvasController;

    SelectionService -- Сповіщає --> PropertiesController;
    SelectionService -- Сповіщає --> LayersController;
    ProjectStateService -- Сповіщає --> ToolbarManager;

    classDef services fill:#284,stroke:#fff,stroke-width:2px,color:#fff;
    classDef controllers fill:#446,stroke:#fff,stroke-width:2px,color:#fff;
    classDef core fill:#732,stroke:#fff,stroke-width:2px,color:#fff;
    classDef data fill:#663,stroke:#fff,stroke-width:2px,color:#fff;
    
    class App,InputHandler,CanvasController,ThreeDController,CommandManager core;
    class ProjectStateService,SceneService,LayerService,SelectionService,GeometryService,I18nService,HistoryManager services;
    class ToolbarManager,PropertiesController,LayersController,WindowManager,DialogController controllers;
    class SceneObjects data;
```

### Пояснення карти:

1.  **Користувацька взаємодія:** Користувач взаємодіє з **Інтерфейсом (UI)**, який складається з основного **Полотна (Canvas)**, **Панелей інструментів**, **Вікон** та **Командного рядка**.
2.  **Ядро Додатку:** Центральним елементом є клас **`App`**. Він створює та координує роботу всіх інших компонентів.
3.  **Основні Контролери:**
    *   `InputHandler`: Перехоплює всі дії користувача (миша, клавіатура) на полотні.
    *   `CanvasController` / `ThreeDController`: Відповідають за відмальовування 2D та 3D сцени.
    *   `CommandManager`: Керує виконанням складних, багатоетапних команд (`LINE`, `TRIM` тощо).
4.  **Сервіси:** Це "мізки" додатку, що управляють даними та станом:
    *   `SceneService`: Керує масивом об'єктів на сцені (додавання, видалення, пошук).
    *   `LayerService`: Керує шарами та приналежністю об'єктів до них.
    *   `SelectionService`: Відстежує, які об'єкти зараз виділені, та сповіщає про це інші частини програми.
    *   `ProjectStateService`: Відповідає за серіалізацію, завантаження та історію змін (`HistoryManager`).
    *   `GeometryService`: Абстракція над бібліотекою `JSTS` для складних геометричних операцій.
5.  **UI Контролери:** Класи, що пов'язують HTML-розмітку з логікою додатку (`ToolbarManager`, `PropertiesController` тощо).
6.  **Потоки Даних:** Стрілки показують, як інформація рухається системою. Наприклад:
    *   `InputHandler` отримує клік і передає його **Активному інструменту**.
    *   Інструмент використовує `SceneService` для зміни **Об'єктів сцени**.
    *   Зміна стану зберігається в `ProjectStateService`.
    *   `SceneService` дає команду `CanvasController` перемалювати сцену.
    *   `SelectionService` сповіщає `PropertiesController` про зміну виділення, щоб той оновив панель властивостей.
