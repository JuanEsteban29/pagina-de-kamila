# Guía de Despliegue en Railway (KARA Makeup)

Este proyecto está configurado y listo para ser subido a Git y desplegado en **Railway**.

---

## ⚠️ Advertencia Importante: Persistencia de Datos
El panel de administración guarda los cambios directamente en el archivo `js/productos.json` usando el sistema de archivos del servidor.
* **En Railway el almacenamiento es efímero (temporal):** Cada vez que la aplicación se reinicie, se reconstruya o se despliegue una nueva versión, cualquier cambio hecho desde el panel de administración web se perderá y el catálogo volverá al estado del archivo `productos.json` que esté subido en GitHub.
* **Recomendación:** Para modificar los productos de forma permanente, edita el archivo `js/productos.json` en tu computadora local, haz un commit con los cambios y súbelos a GitHub (`git push`).

---

## Paso 1: Subir el proyecto a GitHub

Si aún no lo has hecho, sigue estos pasos para subir tu código a GitHub:

1. **Crea un repositorio en GitHub:**
   - Ve a [GitHub](https://github.com/) e inicia sesión.
   - Haz clic en **New** (Nuevo repositorio).
   - Ponle un nombre (ej. `kara-makeup`) y manténlo público o privado según prefieras.
   - **No** agregues README, `.gitignore` ni licencia (ya creamos el `.gitignore` localmente).
   - Haz clic en **Create repository**.

2. **Vincula este proyecto local con tu repositorio de GitHub:**
   Abre una terminal en esta carpeta y ejecuta los siguientes comandos (reemplazando con la URL de tu repositorio de GitHub):
   ```bash
   # Vincula tu repositorio remoto (cambia el enlace por el tuyo)
   git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

   # Sube el código a GitHub
   git push -u origin main
   ```

---

## Paso 2: Desplegar en Railway

1. **Crea una cuenta o inicia sesión en Railway:**
   - Ve a [Railway.app](https://railway.app/).

2. **Crea un nuevo proyecto:**
   - Haz clic en **New Project** (Nuevo Proyecto).
   - Selecciona **Deploy from GitHub repo** (Desplegar desde repositorio de GitHub).
   - Si es la primera vez, tendrás que autorizar a Railway para acceder a tus repositorios de GitHub.
   - Selecciona tu repositorio `kara-makeup`.

3. **Configuración del despliegue:**
   - Railway detectará automáticamente que es un proyecto de **Node.js** porque tiene un archivo `package.json`.
   - Utilizará automáticamente el comando `npm start` que ya está configurado en `package.json` para ejecutar `server.js`.
   - Railway asigna automáticamente un puerto (`process.env.PORT`), el cual ya está configurado en tu archivo `server.js` (`const PORT = process.env.PORT || 3000;`).

4. **Generar un enlace público (Dominio):**
   - Una vez finalizado el despliegue, haz clic en tu servicio en el panel de control de Railway.
   - Ve a la pestaña **Settings** (Configuración).
   - En la sección **Networking** (Redes), haz clic en **Generate Domain** (Generar Dominio) para obtener una URL pública gratuita (ej. `kara-makeup-production.up.railway.app`).
   - ¡Listo! Tu sitio estará activo y accesible para todos.

---

## Modificaciones futuras

Cada vez que quieras hacer un cambio en el diseño, código o catálogo de productos:
```bash
# 1. Guarda los cambios localmente
git add .

# 2. Crea un punto de restauración (commit)
git commit -m "Actualización del catálogo o diseño"

# 3. Sube los cambios a GitHub
git push origin main
```
*Railway detectará automáticamente el cambio en GitHub y volverá a desplegar la web en segundos con las actualizaciones.*
