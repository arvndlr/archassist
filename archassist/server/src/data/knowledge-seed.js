// Initial architecture knowledge base for Archassist.
// Ratings are 1 (poor) to 5 (excellent) and represent typical, not absolute,
// support for each quality attribute. Admins can refine them in the UI.

// Order: performance, scalability, availability, security, maintainability,
//        testability, interoperability, deployability, cost_efficiency, simplicity
function qa(...r) {
  const keys = ['performance', 'scalability', 'availability', 'security', 'maintainability',
    'testability', 'interoperability', 'deployability', 'cost_efficiency', 'simplicity'];
  return Object.fromEntries(keys.map((k, i) => [k, r[i]]));
}

const S = 'Bass, Clements & Kazman, Software Architecture in Practice (4th ed.); Richards & Ford, Fundamentals of Software Architecture';

export const STYLES = [
  {
    title: 'Layered (N-tier) Architecture',
    summary: 'Organizes the system into horizontal layers (presentation, business logic, data access, database), where each layer only depends on the layer below it.',
    attributes: {
      qa: qa(3, 2, 3, 4, 4, 4, 3, 2, 4, 5), complexity: 1, min_team: 1,
      project_types: ['web', 'desktop', 'enterprise', 'mobile'],
      structure: [
        { name: 'Presentation layer', responsibility: 'User interface: pages, forms, and views; handles user input and displays results.' },
        { name: 'Business logic layer', responsibility: 'Application rules, validation, and workflows; independent of UI and storage details.' },
        { name: 'Data access layer', responsibility: 'Reads and writes data through repositories or data-access objects.' },
        { name: 'Database layer', responsibility: 'Persistent storage of application data (usually a relational database).' },
      ],
    },
    tags: ['layers', 'n-tier', 'three-tier', 'monolith', 'information system', 'crud'],
    content: `The layered style separates concerns into layers of related responsibility. A request flows from the presentation layer down to the business layer, then to the data layer, and the response flows back up. Layers can be "closed" (a request must pass through each layer) which keeps dependencies simple and makes each layer replaceable.

When to use: information systems, management systems, CRUD-heavy web or desktop applications, and projects where the team is new to software architecture. It is the most widely taught style and maps naturally to typical student capstone systems such as inventory, enrollment, reservation, or record-management systems.

When to avoid: systems that must scale individual features independently, or systems with heavy real-time event processing. Large layered applications can become a "big ball of mud" if layer rules are not enforced, and every change requires redeploying the whole application.

Student project fit: excellent for beginner and intermediate teams with 8–20 week timelines. Easy to document with a package or component diagram, easy to split work (one member per layer or per module), and cheap to host on a single server.`,
  },
  {
    title: 'Modular Monolith',
    summary: 'A single deployable application internally divided into well-bounded modules by business capability, each with its own internal layers and a clear public interface.',
    attributes: {
      qa: qa(4, 3, 3, 4, 4, 4, 3, 3, 5, 4), complexity: 2, min_team: 2,
      project_types: ['web', 'enterprise', 'mobile'],
      structure: [
        { name: 'Feature modules', responsibility: 'One module per business capability (e.g. accounts, orders, reports), each owning its logic and data tables.' },
        { name: 'Module interfaces', responsibility: 'Public services or events a module exposes; other modules may only use these.' },
        { name: 'Shared kernel', responsibility: 'Cross-cutting utilities: authentication, logging, configuration.' },
        { name: 'Single database', responsibility: 'One database with schema or table ownership per module.' },
      ],
    },
    tags: ['monolith', 'modular', 'bounded context', 'domain-driven design', 'vertical slice'],
    content: `A modular monolith keeps the operational simplicity of a single deployable unit while organizing code by business capability instead of only by technical layer. Each module hides its internals and communicates with others through explicit interfaces, which prevents tangled dependencies.

When to use: medium-sized applications with several distinct features, teams that want clear ownership of features, and projects that might evolve toward services later. It gives most of the maintainability benefits of microservices without distributed-system complexity.

When to avoid: very small applications where modules add ceremony, or systems that truly require independent scaling or deployment of components.

Student project fit: strong choice for intermediate teams of 3–6. Each member can own a module end-to-end (UI, logic, data), which makes task division and grading of individual contribution straightforward.`,
  },
  {
    title: 'Model-View-Controller (MVC)',
    summary: 'Separates an interactive application into Model (data and rules), View (presentation), and Controller (handles input and coordinates model and view).',
    attributes: {
      qa: qa(3, 2, 3, 3, 4, 4, 3, 3, 5, 5), complexity: 1, min_team: 1,
      project_types: ['web', 'desktop'],
      structure: [
        { name: 'Models', responsibility: 'Domain data, validation rules, and persistence mapping.' },
        { name: 'Views', responsibility: 'Templates or UI components that render model data.' },
        { name: 'Controllers', responsibility: 'Receive requests, call models, choose the view to render.' },
        { name: 'Routing', responsibility: 'Maps URLs or UI actions to controller actions.' },
      ],
    },
    tags: ['mvc', 'web framework', 'laravel', 'django', 'rails', 'asp.net', 'interactive'],
    content: `MVC is an architectural pattern for interactive applications. It is built into many popular frameworks (Laravel, Django, Ruby on Rails, ASP.NET MVC, Spring MVC), so adopting it often means following the framework's conventions.

When to use: server-rendered web applications and desktop GUIs where the UI and data logic should be kept separate; teams using an MVC framework.

When to avoid: as the only architectural decision for complex systems — controllers tend to become "fat" if business logic is not moved to a separate service layer. For large systems, combine MVC (for the presentation tier) with a layered or modular structure.

Student project fit: excellent for beginners. Frameworks provide scaffolding, and the separation is easy to explain in documentation and defense.`,
  },
  {
    title: 'Client-Server Architecture',
    summary: 'Clients (web, mobile, desktop) request services from a central server over a network; the server hosts shared data and business logic, often exposed as a REST or GraphQL API.',
    attributes: {
      qa: qa(3, 3, 3, 3, 3, 3, 4, 3, 4, 4), complexity: 2, min_team: 2,
      project_types: ['web', 'mobile', 'desktop', 'game', 'iot'],
      structure: [
        { name: 'Client applications', responsibility: 'Web SPA, mobile, or desktop apps that present UI and call the API.' },
        { name: 'API server', responsibility: 'Exposes REST/GraphQL endpoints, enforces authentication and business rules.' },
        { name: 'Database', responsibility: 'Central shared data store.' },
      ],
    },
    tags: ['client-server', 'rest api', 'spa', 'backend', 'frontend', 'mobile app'],
    content: `Client-server is the foundation of most networked applications. A modern variant is a single-page application or mobile app (client) talking to a REST or GraphQL API (server). The server is typically itself organized in layers.

When to use: systems with multiple client types (web and mobile) sharing the same data; applications that need a central source of truth.

When to avoid: fully offline systems or peer-to-peer scenarios. A single server can be a bottleneck and single point of failure unless scaled.

Student project fit: very common for web + mobile capstones. Frontend and backend work can be split between team members once the API contract is agreed.`,
  },
  {
    title: 'Microservices Architecture',
    summary: 'The system is composed of small, independently deployable services, each owning one business capability and its own data, communicating over the network.',
    attributes: {
      qa: qa(3, 5, 5, 3, 4, 4, 4, 5, 2, 1), complexity: 5, min_team: 6,
      project_types: ['web', 'enterprise'],
      structure: [
        { name: 'API gateway', responsibility: 'Single entry point; routing, authentication, rate limiting.' },
        { name: 'Business services', responsibility: 'Independent services per capability, each with its own database.' },
        { name: 'Messaging / event bus', responsibility: 'Asynchronous communication between services.' },
        { name: 'Service discovery & observability', responsibility: 'Service registry, centralized logging, metrics, and tracing.' },
        { name: 'Container orchestration', responsibility: 'Deploys and scales services (e.g. Docker, Kubernetes).' },
      ],
    },
    tags: ['microservices', 'distributed', 'docker', 'kubernetes', 'cloud native', 'independent deployment'],
    content: `Microservices split a system into services aligned with business capabilities. Each service can be developed, deployed, and scaled independently, and can use different technology. This enables high scalability and availability for large organizations with many teams.

When to use: large systems with many teams, parts that need very different scaling, or strict independent-release requirements.

When to avoid: small teams, short timelines, or unclear domain boundaries. Microservices introduce distributed-system problems: network failures, data consistency across services, complex testing, deployment pipelines, monitoring, and higher hosting cost. "You must be this tall to use microservices."

Student project fit: usually NOT recommended for student projects unless the project's explicit goal is to study distributed systems and the team is experienced. A modular monolith delivers most maintainability benefits with far less overhead.`,
  },
  {
    title: 'Event-Driven Architecture',
    summary: 'Components communicate by producing and reacting to events through a broker or event bus, enabling loose coupling and asynchronous, real-time processing.',
    attributes: {
      qa: qa(5, 5, 4, 3, 3, 2, 4, 3, 3, 2), complexity: 4, min_team: 3,
      project_types: ['iot', 'web', 'data', 'enterprise', 'game'],
      structure: [
        { name: 'Event producers', responsibility: 'Components or devices that publish events when something happens.' },
        { name: 'Event broker', responsibility: 'Message broker or bus that routes events (e.g. MQTT, RabbitMQ, Kafka, Redis Streams).' },
        { name: 'Event consumers / processors', responsibility: 'Services that react to events: update state, send notifications, run workflows.' },
        { name: 'Event store / database', responsibility: 'Persists events or the resulting state.' },
      ],
    },
    tags: ['event-driven', 'real-time', 'asynchronous', 'broker', 'mqtt', 'kafka', 'notifications', 'streaming'],
    content: `In event-driven architecture, producers emit events without knowing who consumes them. A broker delivers events to interested consumers. This decouples components in time and space and supports real-time responsiveness.

When to use: real-time dashboards, notifications, IoT sensor streams, chat, monitoring and alerting, and workflows triggered by state changes.

When to avoid: simple request-response CRUD systems. Event flows are harder to trace, test, and debug; ordering and duplicate delivery must be handled; eventual consistency can confuse users.

Student project fit: appropriate when real-time behaviour is a core requirement (e.g. IoT monitoring, live tracking). Keep it small: one broker, a few clearly named event types, and a conventional database for state.`,
  },
  {
    title: 'Service-Oriented Architecture (SOA)',
    summary: 'Business functions are exposed as reusable, coarse-grained services with standardized contracts, often integrated through an enterprise service bus.',
    attributes: {
      qa: qa(3, 4, 4, 4, 3, 3, 5, 3, 2, 2), complexity: 4, min_team: 5,
      project_types: ['enterprise'],
      structure: [
        { name: 'Service consumers', responsibility: 'Applications and portals that use business services.' },
        { name: 'Service bus / integration layer', responsibility: 'Routes, transforms, and orchestrates service calls.' },
        { name: 'Business services', responsibility: 'Reusable enterprise services with formal contracts.' },
        { name: 'Service registry', responsibility: 'Catalog of available services and their contracts.' },
      ],
    },
    tags: ['soa', 'esb', 'enterprise integration', 'web services', 'soap', 'reuse'],
    content: `SOA focuses on integration and reuse across an organization: existing systems expose services that new applications compose. Contracts (WSDL, OpenAPI) and a service bus provide interoperability between heterogeneous systems.

When to use: integrating multiple existing institutional systems (e.g. registrar, accounting, library) behind shared services.

When to avoid: greenfield single-application projects; the governance and integration infrastructure is heavy.

Student project fit: rarely a fit unless the project is specifically about integrating several existing systems of an institution.`,
  },
  {
    title: 'Serverless Architecture',
    summary: 'Application logic runs as managed cloud functions triggered by events or HTTP requests, with managed services (BaaS) for authentication, storage, and databases.',
    attributes: {
      qa: qa(3, 5, 4, 3, 3, 3, 4, 4, 4, 3), complexity: 3, min_team: 1,
      project_types: ['web', 'mobile', 'data', 'ai_ml'],
      structure: [
        { name: 'Client apps', responsibility: 'Web or mobile frontends calling functions or BaaS directly.' },
        { name: 'Cloud functions', responsibility: 'Stateless functions for business logic, triggered by HTTP or events.' },
        { name: 'Managed services', responsibility: 'Authentication, database (e.g. Firebase, Supabase), file storage, queues.' },
      ],
    },
    tags: ['serverless', 'faas', 'firebase', 'supabase', 'aws lambda', 'cloud functions', 'baas'],
    content: `Serverless removes server management: the cloud provider runs and scales functions on demand and charges per use. Backend-as-a-Service platforms such as Firebase or Supabase provide ready-made authentication, databases, and storage.

When to use: apps with spiky or low traffic, mobile apps needing a quick backend, event-triggered processing (image resize, notifications), small teams without DevOps experience.

When to avoid: long-running or CPU-heavy processing, strict latency requirements (cold starts), systems that must run offline or on-premise, or where vendor lock-in is unacceptable.

Student project fit: good for mobile capstones and prototypes with small teams. Free tiers keep cost low, but make sure the project still demonstrates clear architectural structure (not just "Firebase does everything").`,
  },
  {
    title: 'Microkernel (Plug-in) Architecture',
    summary: 'A minimal core system provides essential functionality, and features are added as independent plug-in modules through a well-defined extension interface.',
    attributes: {
      qa: qa(3, 2, 3, 3, 5, 4, 3, 3, 4, 3), complexity: 3, min_team: 2,
      project_types: ['desktop', 'enterprise', 'game', 'ai_ml'],
      structure: [
        { name: 'Core system', responsibility: 'Minimal essential functionality and the plug-in lifecycle.' },
        { name: 'Plug-in interface / registry', responsibility: 'Contract that plug-ins implement; discovers and loads them.' },
        { name: 'Plug-in modules', responsibility: 'Independent features, rules, or integrations added without changing the core.' },
      ],
    },
    tags: ['microkernel', 'plugin', 'extensibility', 'rules engine', 'ide', 'customization'],
    content: `The microkernel style isolates variation in plug-ins. Examples are IDEs, browsers with extensions, and rule-based systems where each rule set is a plug-in. It supports customization per client or institution.

When to use: product-like systems that must be extended or customized, rule-heavy systems (grading rules, tax rules), tools with optional features.

When to avoid: systems without meaningful variation points — the plug-in contract adds design effort.

Student project fit: suitable when extensibility is an explicit requirement. Design the plug-in contract early and keep the number of plug-ins small but real.`,
  },
  {
    title: 'Pipe-and-Filter Architecture',
    summary: 'Data flows through a sequence of independent processing steps (filters) connected by pipes; each filter transforms its input and passes the result on.',
    attributes: {
      qa: qa(4, 3, 3, 3, 4, 5, 3, 3, 4, 4), complexity: 2, min_team: 1,
      project_types: ['data', 'ai_ml', 'iot'],
      structure: [
        { name: 'Data source', responsibility: 'Input: files, sensors, APIs, or user uploads.' },
        { name: 'Filters (processing stages)', responsibility: 'Independent steps such as cleaning, feature extraction, inference, formatting.' },
        { name: 'Pipes', responsibility: 'Connections or queues passing data between stages.' },
        { name: 'Data sink', responsibility: 'Output: database, report, dashboard, or API response.' },
      ],
    },
    tags: ['pipeline', 'etl', 'data processing', 'machine learning pipeline', 'image processing', 'nlp'],
    content: `Pipe-and-filter suits data transformation. Each filter has a single responsibility and can be tested, replaced, or reordered independently. ETL jobs, compilers, image processing, and machine learning pipelines (preprocess → extract features → infer → post-process) follow this style.

When to use: batch or streaming data processing, ML inference pipelines, report generation, document processing.

When to avoid: highly interactive systems with complex shared state.

Student project fit: a natural choice for the processing core of AI/ML and data-analytics capstones, usually wrapped by a client-server or layered application for the user interface.`,
  },
  {
    title: 'Hexagonal (Ports and Adapters) / Clean Architecture',
    summary: 'Places the domain logic at the center, independent of frameworks, UI, and databases; external concerns connect through ports (interfaces) and adapters.',
    attributes: {
      qa: qa(3, 3, 3, 4, 5, 5, 4, 3, 4, 2), complexity: 3, min_team: 2,
      project_types: ['web', 'mobile', 'enterprise'],
      structure: [
        { name: 'Domain core', responsibility: 'Entities and business rules with no framework dependencies.' },
        { name: 'Application / use cases', responsibility: 'Orchestrates use cases through ports (interfaces).' },
        { name: 'Inbound adapters', responsibility: 'REST controllers, UI, CLI that drive the use cases.' },
        { name: 'Outbound adapters', responsibility: 'Database repositories, email/SMS gateways, external APIs.' },
      ],
    },
    tags: ['hexagonal', 'clean architecture', 'ports and adapters', 'onion', 'dependency inversion', 'testable'],
    content: `Hexagonal and Clean Architecture invert dependencies so the business core does not depend on infrastructure. Databases, frameworks, and third-party services become replaceable details. The core can be unit-tested without a database or UI.

When to use: systems with rich business rules, long expected lifetime, multiple external integrations, or high testability requirements.

When to avoid: simple CRUD applications — the extra interfaces and mapping add boilerplate that slows beginners.

Student project fit: good for intermediate/advanced teams that value testability and plan to swap integrations (e.g. payment or SMS providers). Beginners may find the indirection difficult.`,
  },
  {
    title: 'Model-View-ViewModel (MVVM)',
    summary: 'Client-side pattern that separates UI (View) from presentation state and logic (ViewModel) and data (Model), using data binding; standard in modern mobile and desktop apps.',
    attributes: {
      qa: qa(3, 2, 3, 3, 4, 4, 3, 3, 5, 4), complexity: 2, min_team: 1,
      project_types: ['mobile', 'desktop'],
      structure: [
        { name: 'Views', responsibility: 'Screens and widgets bound to ViewModel state.' },
        { name: 'ViewModels', responsibility: 'Screen state and presentation logic; survive UI changes.' },
        { name: 'Repositories', responsibility: 'Single source of data for ViewModels; combine local cache and remote API.' },
        { name: 'Data sources', responsibility: 'Local database (e.g. SQLite/Room) and remote API client.' },
      ],
    },
    tags: ['mvvm', 'android', 'jetpack', 'flutter', 'swiftui', 'wpf', 'mobile architecture'],
    content: `MVVM is the recommended client architecture for Android (Jetpack), and is common in Flutter, SwiftUI, and WPF. The ViewModel exposes observable state; the View renders it and forwards user actions. A repository layer hides whether data comes from a local cache or a remote server.

When to use: mobile or desktop clients with non-trivial UI state, offline caching, or multiple screens.

When to avoid: as the whole-system architecture — MVVM describes the client; pair it with a client-server backend.

Student project fit: strong for mobile capstones. Combine with a client-server backend (or serverless BaaS) for shared data.`,
  },
  {
    title: 'IoT Layered Architecture (Device–Edge–Cloud)',
    summary: 'Organizes IoT systems into perception (sensors/actuators), network/edge gateway, and cloud/application layers, usually with publish-subscribe messaging between them.',
    attributes: {
      qa: qa(4, 4, 4, 3, 3, 3, 5, 3, 3, 2), complexity: 3, min_team: 2,
      project_types: ['iot'],
      structure: [
        { name: 'Perception layer', responsibility: 'Sensors and actuators on microcontrollers (e.g. ESP32, Arduino).' },
        { name: 'Edge / gateway layer', responsibility: 'Collects device data, filters or aggregates locally, buffers when offline, forwards via MQTT/HTTP.' },
        { name: 'Cloud / server layer', responsibility: 'Message broker, data storage, rules and alert processing.' },
        { name: 'Application layer', responsibility: 'Web or mobile dashboard for monitoring and control.' },
      ],
    },
    tags: ['iot', 'embedded', 'sensor', 'esp32', 'arduino', 'raspberry pi', 'mqtt', 'edge computing', 'monitoring'],
    content: `IoT systems combine constrained devices, unreliable networks, and cloud applications. The layered IoT reference architecture separates device concerns from connectivity and application concerns. MQTT publish-subscribe is the typical protocol between devices and the broker because it is lightweight.

When to use: monitoring and automation systems with physical sensors or actuators (smart farming, environment monitoring, smart home, tracking, attendance with RFID).

When to avoid: purely software systems.

Student project fit: the standard choice for hardware capstones. Plan for offline buffering at the device or gateway, device authentication, and a simple dashboard. Keep firmware and server responsibilities clearly separated.`,
  },
  {
    title: 'Entity-Component-System (ECS) / Game Loop Architecture',
    summary: 'Game architecture where entities are composed of data components and processed each frame by systems inside a main game loop.',
    attributes: {
      qa: qa(5, 3, 3, 2, 4, 4, 2, 3, 5, 3), complexity: 3, min_team: 1,
      project_types: ['game'],
      structure: [
        { name: 'Game loop', responsibility: 'Processes input, updates systems, renders each frame at a fixed or variable timestep.' },
        { name: 'Entities & components', responsibility: 'Game objects defined by composable data (position, health, sprite).' },
        { name: 'Systems', responsibility: 'Logic that operates on entities with specific components (physics, AI, rendering).' },
        { name: 'Asset & scene management', responsibility: 'Loading levels, textures, and audio.' },
      ],
    },
    tags: ['game', 'ecs', 'unity', 'godot', 'game loop', 'real-time rendering'],
    content: `Game engines such as Unity and Godot use component-based designs, and ECS pushes this further for performance. Composition over inheritance keeps game objects flexible.

When to use: games and simulations.

When to avoid: business applications.

Student project fit: follow the engine's conventions; for multiplayer games add a client-server layer for authoritative game state.`,
  },
];

export const PATTERNS = [
  {
    title: 'API Gateway',
    summary: 'A single entry point in front of backend services that handles routing, authentication, rate limiting, and response aggregation.',
    attributes: { qa: { security: 4, interoperability: 4, scalability: 4 } },
    tags: ['gateway', 'reverse proxy', 'nginx', 'routing'],
    content: `Clients call one gateway instead of many services. The gateway centralizes cross-cutting concerns such as authentication, TLS termination, rate limiting, and logging. A reverse proxy such as Nginx can play this role for smaller systems.

Trade-offs: it can become a bottleneck or single point of failure if not scaled; avoid putting business logic in it.`,
  },
  {
    title: 'Repository Pattern',
    summary: 'Encapsulates data access behind a collection-like interface so business logic does not depend on database details.',
    attributes: { qa: { maintainability: 5, testability: 5 } },
    tags: ['data access', 'dao', 'orm', 'persistence'],
    content: `A repository exposes methods such as findById, save, or listByStatus. Business logic uses the repository interface; the implementation uses SQL or an ORM. This makes it possible to test business logic with in-memory fakes and to change the database later.

Trade-offs: adds a layer of indirection; avoid generic repositories that simply mirror the ORM.`,
  },
  {
    title: 'Publish-Subscribe',
    summary: 'Publishers send messages to topics without knowing subscribers; a broker delivers each message to all interested subscribers.',
    attributes: { qa: { scalability: 5, performance: 4, interoperability: 4 } },
    tags: ['pub-sub', 'mqtt', 'messaging', 'broker', 'real-time', 'notifications', 'websocket'],
    content: `Pub-sub decouples senders and receivers. MQTT is common for IoT devices; Redis pub/sub, RabbitMQ, or WebSockets are common for real-time web features such as live dashboards and notifications.

Trade-offs: delivery guarantees, ordering, and duplicate messages must be considered; debugging message flows needs good logging.`,
  },
  {
    title: 'Command Query Responsibility Segregation (CQRS)',
    summary: 'Separates the model used to update data (commands) from the model used to read data (queries), allowing each to be optimized independently.',
    attributes: { qa: { performance: 4, scalability: 4 } },
    tags: ['cqrs', 'read model', 'reporting', 'analytics'],
    content: `Write operations go through a domain model with validation; read operations use denormalized views or read-optimized tables. Useful for reporting-heavy systems where dashboards would otherwise slow down transactional tables.

Trade-offs: more moving parts and possible eventual consistency. A lightweight version — database views or summary tables for reports — is often enough for student projects.`,
  },
  {
    title: 'Circuit Breaker',
    summary: 'Stops calling a failing remote service for a period, returning a fallback instead, to prevent cascading failures.',
    attributes: { qa: { availability: 5 } },
    tags: ['resilience', 'fault tolerance', 'external api'],
    content: `The circuit breaker tracks failures of calls to an external dependency (payment gateway, SMS API, AI API). After a threshold, it "opens" and fails fast, then periodically tries again. Combine with timeouts and fallbacks.

Trade-offs: requires deciding sensible fallbacks and thresholds.`,
  },
  {
    title: 'Cache-Aside',
    summary: 'The application checks a cache first and loads from the database on a miss, storing the result in the cache for later requests.',
    attributes: { qa: { performance: 5, scalability: 4 } },
    tags: ['cache', 'redis', 'performance'],
    content: `Frequently read, rarely changed data (catalogs, settings, dashboard aggregates) is cached in memory or Redis. Set expiration times and invalidate on updates.

Trade-offs: stale data and cache invalidation complexity.`,
  },
  {
    title: 'Backend for Frontend (BFF)',
    summary: 'A dedicated backend API per client type (web, mobile) that shapes data specifically for that client.',
    attributes: { qa: { performance: 4, maintainability: 3, interoperability: 4 } },
    tags: ['bff', 'mobile', 'api design'],
    content: `Mobile clients often need smaller payloads and different flows than web clients. A BFF tailors endpoints per client and keeps client-specific logic out of core services.

Trade-offs: code duplication across BFFs; only worthwhile when client needs truly differ.`,
  },
  {
    title: 'Adapter / Anti-Corruption Layer',
    summary: 'Wraps an external system or legacy API behind an interface expressed in your own domain terms.',
    attributes: { qa: { interoperability: 5, maintainability: 4 } },
    tags: ['adapter', 'integration', 'third-party api', 'legacy'],
    content: `When integrating with third-party APIs (payment, SMS, government systems, AI providers), an adapter translates between their model and yours. Switching providers only requires a new adapter.

Trade-offs: extra mapping code.`,
  },
  {
    title: 'Model Serving Layer',
    summary: 'Hosts trained machine learning models behind a dedicated inference service or module with a stable API, separate from training code.',
    attributes: { qa: { maintainability: 4, scalability: 4, deployability: 4 }, project_types: ['ai_ml', 'data'] },
    tags: ['ai', 'machine learning', 'inference', 'model deployment', 'mlops', 'llm'],
    content: `Separate training (offline, notebooks, pipelines) from inference (online, serving predictions). The serving layer loads a versioned model and exposes predictions via an API, so the application does not depend on training code. For LLM-based features, the serving layer wraps the provider API with prompt templates, retries, and cost limits.

Trade-offs: model versioning and monitoring accuracy over time.`,
  },
  {
    title: 'Retrieval-Augmented Generation (RAG)',
    summary: 'Grounds large language model answers in documents retrieved from a knowledge base at query time.',
    attributes: { qa: { maintainability: 4, interoperability: 4 }, project_types: ['ai_ml'] },
    tags: ['rag', 'llm', 'vector database', 'embeddings', 'chatbot', 'ai'],
    content: `A RAG system embeds documents into vectors, retrieves the most relevant chunks for a user query (often combined with keyword search), and passes them to an LLM as context. This reduces hallucination and allows knowledge to be updated without retraining.

Typical structure: ingestion pipeline (chunk → embed → store), retriever (vector + lexical search), prompt builder, LLM client, and response post-processing with citations.

Trade-offs: retrieval quality determines answer quality; needs evaluation and content curation.`,
  },
];

export const TACTICS = [
  { title: 'Authentication and Role-Based Access Control', summary: 'Verify user identity and restrict actions according to roles such as student, staff, and admin.', attributes: { qa: { security: 5 } }, tags: ['security', 'login', 'jwt', 'session', 'rbac', 'authorization'],
    content: 'Use proven authentication (hashed passwords with bcrypt/argon2, sessions or JWT, optional OAuth). Enforce authorization on the server for every request, not only in the UI. Define roles and permissions explicitly in the design documents.' },
  { title: 'Input Validation and Sanitization', summary: 'Validate all input on the server and use parameterized queries to prevent injection attacks.', attributes: { qa: { security: 5, availability: 3 } }, tags: ['security', 'sql injection', 'xss', 'validation', 'owasp'],
    content: 'Treat all client input as untrusted. Validate type, length, and format with a schema, use parameterized queries or an ORM, and escape output to prevent XSS. Follow the OWASP Top 10.' },
  { title: 'Encryption of Data in Transit and at Rest', summary: 'Use HTTPS/TLS for all communication and encrypt sensitive stored data.', attributes: { qa: { security: 5 } }, tags: ['security', 'https', 'tls', 'privacy', 'data privacy act', 'encryption'],
    content: 'Serve everything over HTTPS. Encrypt sensitive fields or disks, and never store secrets in source code. For systems handling personal data in the Philippines, align with the Data Privacy Act of 2012 (RA 10173).' },
  { title: 'Audit Logging', summary: 'Record who did what and when for security-relevant and business-critical actions.', attributes: { qa: { security: 4, maintainability: 3 } }, tags: ['security', 'logging', 'accountability', 'audit trail'],
    content: 'Keep an append-only audit trail of logins, data changes, and administrative actions. This supports accountability, troubleshooting, and incident investigation.' },
  { title: 'Caching', summary: 'Keep frequently used data or computed results close to where they are needed to reduce latency and load.', attributes: { qa: { performance: 5, scalability: 4, cost_efficiency: 3 } }, tags: ['performance', 'cache', 'cdn', 'redis'],
    content: 'Apply caching at several levels: browser and CDN for static assets, application cache (in-memory or Redis) for hot data, and database query caching. Define expiry and invalidation rules.' },
  { title: 'Horizontal Scaling and Load Balancing', summary: 'Run multiple stateless instances of the application behind a load balancer.', attributes: { qa: { scalability: 5, availability: 4 } }, tags: ['scalability', 'load balancer', 'nginx', 'stateless', 'replicas'],
    content: 'Keep application servers stateless (sessions in a shared store or tokens) so more instances can be added. A load balancer distributes traffic and removes unhealthy instances.' },
  { title: 'Asynchronous Processing with Queues', summary: 'Move slow or heavy work (emails, reports, AI inference) to background workers through a queue.', attributes: { qa: { performance: 4, scalability: 4, availability: 3 } }, tags: ['queue', 'background job', 'worker', 'async'],
    content: 'Return quickly to the user and process long tasks in the background. Queues also smooth traffic spikes and allow retries on failure.' },
  { title: 'Redundancy, Backups and Replication', summary: 'Keep copies of data and services so the system can recover from failures.', attributes: { qa: { availability: 5 } }, tags: ['availability', 'backup', 'replication', 'disaster recovery'],
    content: 'Schedule automatic database backups and test restores. For higher availability, use database replicas and multiple application instances across zones.' },
  { title: 'Health Monitoring and Heartbeat', summary: 'Continuously check component health and alert when something fails.', attributes: { qa: { availability: 4, maintainability: 3 } }, tags: ['monitoring', 'health check', 'heartbeat', 'observability', 'iot'],
    content: 'Expose health-check endpoints, monitor uptime, and log errors centrally. For IoT, devices send periodic heartbeats so offline devices are detected.' },
  { title: 'Timeouts and Retry with Backoff', summary: 'Bound how long calls to other components wait and retry transient failures with increasing delays.', attributes: { qa: { availability: 4 } }, tags: ['resilience', 'retry', 'timeout', 'network'],
    content: 'Every network call needs a timeout. Retry only idempotent operations, with exponential backoff and jitter, to avoid overwhelming a recovering service.' },
  { title: 'Rate Limiting', summary: 'Limit how many requests a client can make in a time window to protect against abuse and overload.', attributes: { qa: { security: 4, availability: 4, cost_efficiency: 3 } }, tags: ['security', 'rate limit', 'throttling', 'api'],
    content: 'Apply per-user or per-IP limits, especially on login and expensive endpoints (e.g. AI calls), to prevent brute-force attacks and runaway costs.' },
  { title: 'Modularization and Information Hiding', summary: 'Divide the system into cohesive modules with small, stable interfaces and hidden internals.', attributes: { qa: { maintainability: 5, testability: 4 } }, tags: ['maintainability', 'modularity', 'coupling', 'cohesion'],
    content: 'High cohesion and low coupling make changes local. Define what each module exposes and forbid reaching into another module\'s internals or tables.' },
  { title: 'Dependency Injection', summary: 'Supply a component\'s dependencies from outside instead of creating them internally.', attributes: { qa: { testability: 5, maintainability: 4 } }, tags: ['testability', 'dependency injection', 'inversion of control'],
    content: 'Injecting dependencies such as repositories or API clients allows replacing them with test doubles and swapping implementations without modifying the component.' },
  { title: 'Automated Testing Strategy', summary: 'Use a test pyramid of many unit tests, fewer integration tests, and a few end-to-end tests.', attributes: { qa: { testability: 5, maintainability: 4, deployability: 3 } }, tags: ['testing', 'unit test', 'integration test', 'qa'],
    content: 'Automated tests catch regressions and document behaviour. Prioritize testing business rules and critical flows. Include test plans and results in the project documentation.' },
  { title: 'Continuous Integration and Containerized Deployment', summary: 'Automatically build and test every change, and package the application in containers for consistent deployment.', attributes: { qa: { deployability: 5, maintainability: 3 } }, tags: ['ci/cd', 'docker', 'github actions', 'devops', 'deployment'],
    content: 'Use a CI pipeline (e.g. GitHub Actions) to run tests on each push. Docker images make the application run the same on laptops, lab servers, and the cloud.' },
  { title: 'Offline-First Data Synchronization', summary: 'Store data locally on the client or device and synchronize with the server when connectivity is available.', attributes: { qa: { availability: 5, performance: 4 } }, tags: ['offline', 'sync', 'local storage', 'connectivity', 'rural', 'mobile', 'iot'],
    content: 'For areas with unreliable internet, clients keep a local database and queue changes, then sync and resolve conflicts when online. IoT gateways buffer sensor readings during outages.' },
  { title: 'Managed / Low-cost Hosting', summary: 'Choose hosting that matches actual load, using free tiers or a single small server for low-traffic systems.', attributes: { qa: { cost_efficiency: 5, simplicity: 4 } }, tags: ['cost', 'hosting', 'vps', 'free tier', 'budget'],
    content: 'Student and small-organization systems rarely need clusters. A single VPS with a reverse proxy, or managed platforms with free tiers, keeps cost low. Scale only when measurements justify it.' },
];

export const REFERENCES = [
  { title: 'ISO/IEC 25010 Software Product Quality Model', summary: 'International standard that defines software quality characteristics such as performance efficiency, compatibility, usability, reliability, security, maintainability, and portability.',
    attributes: {}, tags: ['quality attributes', 'iso 25010', 'non-functional requirements'],
    content: 'Use ISO/IEC 25010 terminology when documenting non-functional requirements and quality attributes. Each quality characteristic should be stated as a measurable scenario: source, stimulus, environment, response, and response measure (e.g. "Under 200 concurrent users, the search page responds within 2 seconds").' },
  { title: 'Architecture Decision Records (ADR)', summary: 'Short documents that capture an important architectural decision, its context, the options considered, and its consequences.',
    attributes: {}, tags: ['documentation', 'adr', 'decision making'],
    content: 'Write one ADR per significant decision (architecture style, database, authentication approach). Record context, decision, alternatives considered, and consequences. ADRs make the rationale defensible during project defense.' },
  { title: 'C4 Model for Architecture Diagrams', summary: 'A hierarchical way to diagram software architecture at four levels: context, containers, components, and code.',
    attributes: {}, tags: ['documentation', 'diagram', 'c4', 'visualization'],
    content: 'Start with a System Context diagram (users and external systems), then a Container diagram (web app, API, database, broker), then Component diagrams for complex containers. This complements DFDs and use case diagrams in systems analysis and design documents.' },
  { title: 'Architecture Trade-off Analysis for Student Projects', summary: 'A simplified ATAM approach: prioritise quality attribute scenarios and check how each candidate architecture satisfies them.',
    attributes: {}, tags: ['atam', 'trade-off', 'evaluation', 'quality attribute scenarios'],
    content: 'List the top quality attribute scenarios, rank them with stakeholders, and for each candidate architecture identify sensitivity points, trade-offs, and risks. Choose the architecture that satisfies the highest-priority scenarios within the team\'s capability and timeline.' },
];

export const SEED_ENTRIES = [
  ...STYLES.map((e) => ({ ...e, category: 'style', source: S })),
  ...PATTERNS.map((e) => ({ ...e, category: 'pattern', source: S })),
  ...TACTICS.map((e) => ({ ...e, category: 'tactic', source: 'Bass, Clements & Kazman, Software Architecture in Practice — architectural tactics' })),
  ...REFERENCES.map((e) => ({ ...e, category: 'reference', source: null })),
];
