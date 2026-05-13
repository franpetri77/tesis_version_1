# Diagramas Mermaid — Tesis Tele Import S.A.

> Copiar cada bloque en [mermaid.live](https://mermaid.live) para renderizarlo.

---

## 1. Diagrama general de casos de uso

```mermaid
flowchart LR
    classDef actor  fill:#dae8fc,stroke:#6c8ebf,color:#000
    classDef uc     fill:#fff2cc,stroke:#d6b656,color:#000
    classDef ext    fill:#f8cecc,stroke:#b85450,color:#000

    CL((Cliente))
    AD((Administrador))
    MP((Mercado\nPago))

    subgraph SIS["Sistema Tele Import S.A."]
        direction TB

        subgraph PUB["Área pública"]
            UC1([Ver catálogo y filtrar])
            UC2([Ver detalle de producto])
            UC3([Registrarse])
            UC4([Iniciar sesión])
        end

        subgraph SHOP["Proceso de compra"]
            UC5([Gestionar carrito])
            UC6([Realizar checkout])
            UC7([Pagar en línea])
            UC8([Ver historial de pedidos])
            UC9([Gestionar direcciones])
            UC10([Escribir reseña])
        end

        subgraph ADM["Panel administrativo"]
            UC11([Gestionar productos y stock])
            UC12([Gestionar pedidos])
            UC13([Gestionar usuarios])
            UC14([Gestionar promociones])
            UC15([Ver reportes y métricas])
            UC16([Consultar auditoría])
            UC17([Moderar reseñas])
        end
    end

    CL --> UC1
    CL --> UC2
    CL --> UC3
    CL --> UC4
    CL --> UC5
    CL --> UC6
    CL --> UC7
    CL --> UC8
    CL --> UC9
    CL --> UC10

    AD --> UC11
    AD --> UC12
    AD --> UC13
    AD --> UC14
    AD --> UC15
    AD --> UC16
    AD --> UC17

    UC7 --> MP

    class CL,AD actor
    class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9,UC10,UC11,UC12,UC13,UC14,UC15,UC16,UC17 uc
    class MP ext
```

---

## 2. Diagrama de clases conceptual

```mermaid
classDiagram
    direction TB

    class Usuario {
        +String id
        +String email
        +String nombre
        +Enum rol
        +DateTime creadoEn
    }

    class Categoria {
        +String id
        +String nombre
        +String slug
        +String parentId
    }

    class Producto {
        +String id
        +String nombre
        +String sku
        +Decimal precio
        +Int stock
        +Boolean activo
        +Boolean destacado
    }

    class ImagenProducto {
        +String id
        +String url
        +Int orden
    }

    class EtiquetaProducto {
        +String id
        +String nombre
        +String slug
    }

    class Direccion {
        +String id
        +String calle
        +String ciudad
        +Boolean predeterminada
    }

    class Pedido {
        +String id
        +String numero
        +Enum estado
        +Decimal subtotal
        +Decimal descuento
        +Decimal costoEnvio
        +Decimal total
        +Enum metodoEntrega
    }

    class ItemPedido {
        +String id
        +Int cantidad
        +Decimal precioUnitario
        +Decimal totalLinea
    }

    class Pago {
        +String id
        +Enum estado
        +Decimal monto
        +String mpPaymentId
        +String mpPreferenceId
    }

    class Promocion {
        +String id
        +String codigo
        +Enum tipo
        +Decimal valor
        +Int usosMaximos
        +Int usosCorrientes
    }

    class MovimientoStock {
        +String id
        +Enum tipo
        +Int cantidad
        +Int stockAnterior
        +Int stockNuevo
        +String motivo
    }

    class ResenaProducto {
        +String id
        +Int calificacion
        +String titulo
        +String cuerpo
        +Boolean aprobada
    }

    class Notificacion {
        +String id
        +Enum tipo
        +String titulo
        +Boolean leida
    }

    class RegistroAuditoria {
        +String id
        +String accion
        +String entidadTipo
        +String entidadId
        +String valorAnterior
        +String valorNuevo
    }

    Usuario "1" --> "0..*" Pedido            : realiza
    Usuario "1" --> "0..*" Direccion         : registra
    Usuario "1" --> "0..*" ResenaProducto    : escribe
    Usuario "1" --> "0..*" Notificacion      : recibe
    Usuario "1" --> "0..*" MovimientoStock   : registra
    Usuario "1" --> "0..*" RegistroAuditoria : genera

    Pedido  "1"    *-- "1..*" ItemPedido  : contiene
    Pedido  "1"    -->  "0..1" Pago       : tiene
    Pedido  "0..*" -->  "0..1" Promocion  : aplica

    ItemPedido "0..*" --> "1" Producto : referencia

    Categoria "0..*" --> "0..1" Categoria       : es subcategoría de
    Producto  "0..*" --> "1"    Categoria        : pertenece a
    Producto  "1"    --> "0..*" ImagenProducto   : tiene
    Producto  "1"    --> "0..*" EtiquetaProducto : etiquetado con
    Producto  "1"    --> "0..*" MovimientoStock  : afecta
    Producto  "1"    --> "0..*" ResenaProducto   : recibe
```

---

## 3. Diagrama de despliegue

```mermaid
graph TB
    subgraph USR["Dispositivo del usuario"]
        BR["Navegador Web\nChrome · Safari · Firefox"]
    end

    subgraph CLOUD["Render.com — Nube"]
        subgraph FE["Servicio: Frontend"]
            NEXT["Next.js 14\nApp Router · SSR\nPuerto 3001"]
        end
        subgraph BE["Servicio: Backend"]
            API["Node.js · Express\nAPI REST · JWT\nPuerto 4000"]
        end
        subgraph DB["Base de datos"]
            MYSQL[("MySQL 8.4\nInnoDB · utf8mb4")]
        end
    end

    subgraph EXT["Servicios externos"]
        MP["Mercado Pago\nAPI de pagos"]
    end

    BR   -->|"HTTPS"| NEXT
    NEXT -->|"HTTP (fetch)"| API
    API  -->|"TCP 3306"| MYSQL
    API  -->|"HTTPS"| MP
    MP   -->|"Webhook HTTPS"| API
```

---

## 4. Diagrama entidad-relación simplificado

```mermaid
erDiagram
    users {
        varchar id PK
        varchar email
        varchar password
        enum    role
        varchar first_name
        varchar last_name
    }
    categories {
        varchar  id PK
        varchar  name
        varchar  slug
        varchar  parent_id FK
        tinyint  is_active
    }
    products {
        varchar  id PK
        varchar  name
        varchar  sku
        decimal  price
        int      stock_quantity
        varchar  category_id FK
        tinyint  is_active
        tinyint  is_featured
    }
    product_images {
        varchar id PK
        varchar product_id FK
        text    image_url
        int     sort_order
    }
    product_tags {
        varchar id PK
        varchar name
        varchar slug
    }
    product_tag_map {
        varchar product_id PK
        varchar tag_id     PK
    }
    addresses {
        varchar  id PK
        varchar  user_id FK
        varchar  street
        varchar  city
        varchar  province
        tinyint  is_default
    }
    orders {
        varchar  id PK
        varchar  order_number
        varchar  user_id FK
        enum     status
        decimal  subtotal
        decimal  discount_amount
        decimal  shipping_cost
        decimal  total
        enum     delivery_method
    }
    order_items {
        varchar id PK
        varchar order_id   FK
        varchar product_id FK
        int     quantity
        decimal unit_price
        decimal total_price
    }
    payments {
        varchar  id PK
        varchar  order_id         FK
        varchar  mp_payment_id
        varchar  mp_preference_id
        enum     status
        decimal  amount
    }
    promotions {
        varchar  id PK
        varchar  code
        enum     type
        decimal  value
        int      max_uses
        int      current_uses
        tinyint  is_active
    }
    stock_movements {
        varchar  id PK
        varchar  product_id FK
        varchar  user_id    FK
        enum     type
        int      quantity
        int      previous_quantity
        int      new_quantity
    }
    product_reviews {
        varchar  id PK
        varchar  product_id FK
        varchar  user_id    FK
        tinyint  rating
        text     body
        tinyint  is_approved
    }
    notifications {
        varchar  id PK
        varchar  user_id FK
        enum     type
        varchar  title
        tinyint  is_read
    }
    audit_logs {
        varchar  id PK
        varchar  user_id     FK
        varchar  entity_type
        varchar  entity_id
        varchar  action
    }
    product_views {
        varchar  id PK
        varchar  product_id FK
        varchar  user_id
        datetime created_at
    }

    users         ||--o{ orders           : "realiza"
    users         ||--o{ addresses        : "registra"
    users         ||--o{ product_reviews  : "escribe"
    users         ||--o{ notifications    : "recibe"
    users         ||--o{ stock_movements  : "registra"
    users         ||--o{ audit_logs       : "genera"

    categories    ||--o{ categories       : "subcategoria_de"
    categories    ||--o{ products         : "clasifica"

    products      ||--o{ product_images   : "tiene"
    products      ||--o{ product_tag_map  : "etiquetado_en"
    product_tags  ||--o{ product_tag_map  : "asignada_en"
    products      ||--o{ order_items      : "incluido_en"
    products      ||--o{ stock_movements  : "afecta"
    products      ||--o{ product_reviews  : "recibe"
    products      ||--o{ product_views    : "registra"

    orders        ||--o{ order_items      : "contiene"
    orders        ||--o| payments         : "tiene"
```
