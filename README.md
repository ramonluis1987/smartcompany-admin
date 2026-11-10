# smartcompany-admin

Panel de administración de Smart Company (TanStack Start en modo SPA, TanStack Query, TipTap). Ver el README de la carpeta raíz.

- Se compila a archivos estáticos (`dist/client`) servidos por nginx en Docker.
- `.env.local`: `VITE_API_URL`, `VITE_WEB_URL`.

```bash
npm run dev    # http://localhost:3001, con la API corriendo en :4000
```

## Edición visual

En **Textos del sitio**, seleccione palabras dentro de los títulos y textos de la portada, el pie de página o el centro de consultas para abrir la barra contextual. Permite elegir fuente, tamaño, color, resaltado, énfasis y enlaces. **Formato** abre los mismos controles de forma permanente para usarlos con teclado. Los datos de contacto, metadatos y campos de búsqueda siguen siendo texto simple.

En **Artículos** y **Áreas de práctica**, el editor de contenido también permite cambiar encabezados, alineación, listas e interlineado del bloque. Deshacer, rehacer y limpiar formato actúan sobre el editor activo. Los cambios se publican con el guardado habitual de cada formulario; los artículos conservan su selector de borrador/publicado.

Los estilos requieren la versión correspondiente de la API, que conserva únicamente el formato permitido, y de la web, que renderiza los textos enriquecidos. No se requiere una migración de base de datos.
