# Assets Folder - SmartHotels Dashboard

## Logo

Para usar tu logo personalizado:

1. **Coloca tu archivo de logo** en esta carpeta (`public/assets/images/`)
2. **Formato recomendado:** PNG con fondo transparente
3. **Nombre del archivo:** `smarthotels-logo.png` (ya configurado)
4. **Tamaño recomendado:** Al menos 200x60 píxeles para buena calidad

## Estructura de archivos

```
public/
├── assets/
│   ├── images/
│   │   └── smarthotels-logo.png  ← Tu logo va aquí
│   ├── FX/
│   │   ├── click.mp3             ← Sonido de clic
│   │   └── success.mp3           ← Sonido de éxito
│   └── README.md                 ← Este archivo
└── ...
```

## Configuración de Usuarios

Los usuarios y sus nombres se configuran en `config/users.json`:

```json
{
  "users": {
    "sergio@smarthotels.es": {
      "id": "sergio",
      "name": "Sergio",
      "full_name": "Sergio García",
      "hotel_id": "test",
      "role": "admin",
      "status": "active"
    }
  }
}
```

### Campos disponibles:
- **`id`**: Identificador único del usuario
- **`name`**: Nombre corto para mostrar
- **`full_name`**: Nombre completo del usuario
- **`hotel_id`**: ID del hotel asociado
- **`role`**: Rol del usuario (admin, user, etc.)
- **`status`**: Estado del usuario (active, inactive)

## Cómo cambiar el logo

1. **Reemplaza** el archivo `smarthotels-logo.png` con tu logo real
2. **El nombre del archivo ya está configurado** en el código
3. **No necesitas cambiar nada más** - solo sustituir el archivo

## Archivos donde se usa el logo

- `components/dashboard/Header.tsx` (línea ~48)
- `app/login/page.tsx` (línea ~70)
- `app/layout.tsx` (favicon)

## Ejemplo de uso actual

```tsx
<Image
  src="/assets/images/smarthotels-logo.png"  // ← Ya configurado
  alt="SmartHotels Logo"
  width={150}
  height={40}
  className="h-10 object-contain"
/>
```

## Sonidos disponibles

- **`click.mp3`**: Sonido de clic para botones
- **`success.mp3`**: Sonido de éxito para operaciones completadas

## Notas importantes

- El logo se mostrará automáticamente en el header del dashboard
- También aparecerá en la página de login
- Usa `object-contain` para mantener las proporciones
- Ajusta `width` y `height` según necesites
- **Solo sustituye el archivo PNG** - todo lo demás ya está listo
- **Los nombres de usuario** se configuran en `config/users.json`
- **No es necesario modificar código** para cambiar nombres de usuario
