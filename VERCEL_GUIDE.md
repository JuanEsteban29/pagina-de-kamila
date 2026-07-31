# 🚀 Guía de Despliegue en Vercel - KARA Makeup

Esta guía te explica paso a paso cómo subir tu proyecto **KARA Makeup** a **Vercel**.

---

## 🛠️ Archivos de Configuración Incluidos

1. **`vercel.json`**: Configura Vercel para ejecutar tu servidor Express (`server.js`) mediante funciones Serverless y enrutar todas las peticiones correctamente.
2. **`server.js`**: Actualizado con `module.exports = app;` para que sea compatible 100% con Serverless y Railway al mismo tiempo.

---

## 📌 Opción 1: Despliegue Automático conectando con GitHub (Recomendado)

1. Sube tus cambios a GitHub (ya realizados).
2. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta.
3. Haz clic en **"Add New..."** -> **"Project"**.
4. Selecciona tu repositorio de GitHub `pagina-de-kamila`.
5. En la sección **Environment Variables** (Variables de Entorno), agrega las mismas variables de tu base de datos MySQL (las mismas que usas en Railway, si aplicas MySQL):
   - `MYSQLHOST`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
   - `MYSQLPORT`
6. Haz clic en **"Deploy"**. ¡Listo! En menos de 1 minuto tu página estará activa en Vercel.

---

## 📌 Opción 2: Despliegue desde la Terminal usando Vercel CLI

Si tienes instalado Vercel CLI en tu computadora:

```bash
# 1. Instalar Vercel CLI si no lo tienes
npm i -g vercel

# 2. Iniciar sesión en Vercel
vercel login

# 3. Desplegar el proyecto en producción
vercel --prod
```

---

## ✅ Comprobación
Tu proyecto servirá automáticamente tanto el frontend (`index.html`, imágenes, CSS, JS) como la API REST (`/api/productos`, `/api/admin`, etc.) sin necesidad de configuraciones adicionales.
