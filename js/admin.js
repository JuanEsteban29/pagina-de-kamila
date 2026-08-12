/**
 * KARA Makeup — Back-Office & AI Image Cataloging Logic
 * =======================================================
 * Refactored & Stabilized CRUD Engine (Create, Edit, Delete, Sync)
 */

// Contraseña de acceso
const CONTRASEÑA_CORRECTA = "KARA2026";

// Estado global de Administración y CRUD
let editingProductId = null; // null = Modo Creación | ID = Modo Edición
let catalogoCompleto = [];
let localAddedProducts = JSON.parse(localStorage.getItem('KARA_ADMIN_ADDED')) || [];
let localUpdatedProducts = JSON.parse(localStorage.getItem('KARA_ADMIN_UPDATED')) || {};
let localDeletedIds = JSON.parse(localStorage.getItem('KARA_ADMIN_DELETED')) || [];
let serverSyncActive = false;
let tfModel = null;

// Manejo de Imágenes de Producto (Búferes de subida)
let currentUploadedImageBase64 = "";
let currentSecondUploadedImageBase64 = "";
let editingOriginalImg = "";
let editingOriginalImages = [];

// Estado del Creador de Tonos
let currentToneObjects = [];

// Inicialización cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    initAdmin();
});

async function initAdmin() {
    autoDeduplicarLocalStorage();
    setupPassGate();
    setupDynamicGreeting();
    setupImageUpload();
    setupToneBuilder();
    setupProductForm();
    setupCatalogListDelegation();
    setupMultiDeviceSync();
    await setupSyncMode();
    loadAIModel();
    await loadCatalog();
}

// Limpia automáticamente duplicados legacy del localStorage generados antes de la refactorización
function autoDeduplicarLocalStorage() {
    try {
        let localAdded = JSON.parse(localStorage.getItem('KARA_ADMIN_ADDED')) || [];
        if (!Array.isArray(localAdded)) localAdded = [];

        // 1. Eliminar ediciones viejas con ID <= 1000 que pertenecían a productos base
        let limpios = localAdded.filter(p => p && p.id && Number(p.id) > 1000);

        // 2. Eliminar duplicados entre sí por ID (manteniendo la versión más reciente)
        const mapUnicos = new Map();
        for (const p of limpios) {
            mapUnicos.set(Number(p.id), p);
        }
        limpios = Array.from(mapUnicos.values());

        // 3. Sobrescribir en localStorage si hubo elementos depurados
        if (localAdded.length !== limpios.length) {
            localStorage.setItem('KARA_ADMIN_ADDED', JSON.stringify(limpios));
            localAddedProducts = limpios;
            console.info(`[KARA Admin] Limpieza ejecutada: ${localAdded.length - limpios.length} duplicados antiguos borrados del almacenamiento.`);
        }
    } catch (e) {
        console.warn("[KARA Admin] Error en auto-deduplicación:", e);
    }
}

// Saludo dinámico según hora local
function setupDynamicGreeting() {
    const greetingElem = document.getElementById("adminGreeting");
    if (!greetingElem) return;

    const hour = new Date().getHours();
    let saludo = "Buenos días";

    if (hour >= 12 && hour < 19) {
        saludo = "Buenas tardes";
    } else if (hour >= 19 || hour < 5) {
        saludo = "Buenas noches";
    }

    greetingElem.textContent = `${saludo}, Kamila`;
}

// ==========================================
// 1. CONTROL DE ACCESO CON CLAVE (KARA2026)
// ==========================================
function setupPassGate() {
    const loginScreen = document.getElementById("loginScreen");
    const loginForm = document.getElementById("loginForm");
    const passInput = document.getElementById("adminPassword");
    const errorMsg = document.getElementById("loginErrorMessage");
    const btnLogout = document.getElementById("btnLogout");

    if (!loginScreen || !loginForm || !passInput) return;

    const isAuth = sessionStorage.getItem('KARA_ADMIN_AUTH') === 'true';
    if (isAuth) {
        loginScreen.style.display = "none";
    } else {
        loginScreen.style.display = "flex";
        passInput.focus();
    }

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const enteredPass = passInput.value.trim();

        if (enteredPass === CONTRASEÑA_CORRECTA) {
            sessionStorage.setItem('KARA_ADMIN_AUTH', 'true');
            if (errorMsg) errorMsg.style.display = "none";

            loginScreen.style.opacity = "0";
            setTimeout(() => {
                loginScreen.style.display = "none";
                loginScreen.style.opacity = "1";
            }, 300);

            mostrarNotificacion("Bienvenida, Kamila. Sesión iniciada. 🌸");
        } else {
            if (errorMsg) {
                errorMsg.textContent = "Contraseña incorrecta. Por favor intenta de nuevo.";
                errorMsg.style.display = "block";
            }
            passInput.value = "";
            passInput.focus();

            const box = loginScreen.querySelector(".login-box");
            if (box && typeof gsap !== "undefined") {
                gsap.fromTo(box, { x: -10 }, { x: 10, duration: 0.08, repeat: 5, yoyo: true });
            }
        }
    });

    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            sessionStorage.removeItem('KARA_ADMIN_AUTH');
            location.reload();
        });
    }
}

// ==========================================
// 2. DETECCIÓN DE MODO DE SINCRONIZACIÓN
// ==========================================
async function setupSyncMode() {
    const modeText = document.getElementById("syncModeText");
    const descText = document.getElementById("syncDescText");
    const exportBtn = document.getElementById("btnExportJSON");

    try {
        const res = await fetch("/api/ping", { cache: "no-store" });
        if (res.ok) {
            serverSyncActive = true;
            if (modeText) modeText.innerHTML = `🟢 <strong>Servidor KARA Activo</strong>`;
            if (descText) descText.textContent = "Los cambios se guardan directamente en el servidor y la base de datos MySQL.";
            if (exportBtn) exportBtn.textContent = "📦 Respaldar JSON";
        } else {
            throw new Error("No ping OK");
        }
    } catch (e) {
        serverSyncActive = false;
        if (modeText) modeText.innerHTML = `🟠 <strong>Modo Local / Estático Activo</strong>`;
        if (descText) descText.textContent = "Sin servidor detectado. Los cambios se guardan localmente en tu navegador.";
        if (exportBtn) exportBtn.textContent = "📥 Exportar productos.json";
    }

    if (exportBtn && !exportBtn.dataset.listened) {
        exportBtn.dataset.listened = "true";
        exportBtn.addEventListener("click", exportarJsonCompleto);
    }
}

// ==========================================
// 3. IA CON TENSORFLOW.JS (MOBILENET)
// ==========================================
function loadAIModel() {
    let retries = 0;
    const checkInterval = setInterval(() => {
        if (typeof mobilenet !== "undefined") {
            clearInterval(checkInterval);
            showAIStatus("🧠 Inicializando IA visión...", "info");
            mobilenet.load({ version: 2, alpha: 1.0 })
                .then(model => {
                    tfModel = model;
                    showAIStatus("✨ IA Visión lista para auto-detectar productos", "success");
                })
                .catch(err => {
                    console.warn("[KARA AI] Error cargando modelo MobileNet:", err);
                    showAIStatus("⚡ IA limitada (detección heurística activa)", "warning");
                });
        } else {
            retries++;
            if (retries > 30) {
                clearInterval(checkInterval);
                showAIStatus("⚡ Detección por nombre de archivo activa", "warning");
            }
        }
    }, 200);
}

function showAIStatus(msg, type = "info") {
    const statusMsg = document.getElementById("aiStatusMsg");
    if (!statusMsg) return;

    statusMsg.textContent = msg;
    statusMsg.className = "ai-status-msg " + type;

    if (type === "success") {
        setTimeout(() => {
            statusMsg.textContent = "✨ Arrastra una foto para autocompletar categoría y tonos";
            statusMsg.className = "ai-status-msg info";
        }, 5000);
    }
}

// ==========================================
// 4. SUBIDA Y VISTA PREVIA DE IMÁGENES
// ==========================================
function setupImageUpload() {
    // Foto Principal
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("prodImageFile");
    const previewContainer = document.getElementById("previewContainer");
    const imagePreview = document.getElementById("imagePreview");
    const btnRemove = document.getElementById("btnRemovePreview");
    const uploadPrompt = document.getElementById("uploadPrompt");
    const btnPickMain = document.getElementById("btnPickMainImage");

    // Segunda Foto
    const uploadAreaSecond = document.getElementById("uploadAreaSecond");
    const fileInputSecond = document.getElementById("prodSecondImageFile");
    const previewContainerSecond = document.getElementById("previewContainerSecond");
    const imagePreviewSecond = document.getElementById("imagePreviewSecond");
    const btnRemoveSecond = document.getElementById("btnRemovePreviewSecond");
    const uploadPromptSecond = document.getElementById("uploadPromptSecond");
    const btnPickSecond = document.getElementById("btnPickSecondImage");

    if (btnPickMain && fileInput) {
        btnPickMain.addEventListener("click", (e) => {
            e.stopPropagation();
            fileInput.click();
        });
    }

    if (btnPickSecond && fileInputSecond) {
        btnPickSecond.addEventListener("click", (e) => {
            e.stopPropagation();
            fileInputSecond.click();
        });
    }

    if (uploadArea && fileInput) {
        uploadArea.addEventListener("click", (e) => {
            if (e.target !== btnPickMain && e.target !== btnRemove) {
                fileInput.click();
            }
        });

        uploadArea.addEventListener("dragover", (e) => {
            e.preventDefault();
            uploadArea.classList.add("dragover");
        });

        uploadArea.addEventListener("dragleave", () => {
            uploadArea.classList.remove("dragover");
        });

        uploadArea.addEventListener("drop", (e) => {
            e.preventDefault();
            uploadArea.classList.remove("dragover");
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                procesarImagenPrincipal(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener("change", () => {
            if (fileInput.files && fileInput.files[0]) {
                procesarImagenPrincipal(fileInput.files[0]);
            }
        });
    }

    if (btnRemove) {
        btnRemove.addEventListener("click", (e) => {
            e.stopPropagation();
            currentUploadedImageBase64 = "";
            editingOriginalImg = "";
            if (imagePreview) imagePreview.src = "";
            if (previewContainer) previewContainer.style.display = "none";
            if (uploadPrompt) uploadPrompt.style.display = "block";
            if (btnPickMain) btnPickMain.style.display = "inline-block";
            if (fileInput) fileInput.value = "";
        });
    }

    if (uploadAreaSecond && fileInputSecond) {
        uploadAreaSecond.addEventListener("click", (e) => {
            if (e.target !== btnPickSecond && e.target !== btnRemoveSecond) {
                fileInputSecond.click();
            }
        });

        uploadAreaSecond.addEventListener("dragover", (e) => {
            e.preventDefault();
            uploadAreaSecond.classList.add("dragover");
        });

        uploadAreaSecond.addEventListener("dragleave", () => {
            uploadAreaSecond.classList.remove("dragover");
        });

        uploadAreaSecond.addEventListener("drop", (e) => {
            e.preventDefault();
            uploadAreaSecond.classList.remove("dragover");
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                procesarSegundaImagen(e.dataTransfer.files[0]);
            }
        });

        fileInputSecond.addEventListener("change", () => {
            if (fileInputSecond.files && fileInputSecond.files[0]) {
                procesarSegundaImagen(fileInputSecond.files[0]);
            }
        });
    }

    if (btnRemoveSecond) {
        btnRemoveSecond.addEventListener("click", (e) => {
            e.stopPropagation();
            currentSecondUploadedImageBase64 = "";
            if (editingOriginalImages.length > 0) {
                editingOriginalImages.shift();
            }
            if (imagePreviewSecond) imagePreviewSecond.src = "";
            if (previewContainerSecond) previewContainerSecond.style.display = "none";
            if (uploadPromptSecond) uploadPromptSecond.style.display = "block";
            if (btnPickSecond) btnPickSecond.style.display = "inline-block";
            if (fileInputSecond) fileInputSecond.value = "";
        });
    }

    function procesarImagenPrincipal(file) {
        if (!file.type.startsWith("image/")) {
            alert("Por favor selecciona un archivo de imagen válido.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            currentUploadedImageBase64 = e.target.result;
            if (imagePreview) imagePreview.src = currentUploadedImageBase64;
            if (previewContainer) previewContainer.style.display = "flex";
            if (uploadPrompt) uploadPrompt.style.display = "none";
            if (btnPickMain) btnPickMain.style.display = "none";

            ejecutarAnalisisIA(file.name);
        };
        reader.readAsDataURL(file);
    }

    function procesarSegundaImagen(file) {
        if (!file.type.startsWith("image/")) {
            alert("Por favor selecciona un archivo de imagen válido para la 2da foto.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            currentSecondUploadedImageBase64 = e.target.result;
            if (imagePreviewSecond) imagePreviewSecond.src = currentSecondUploadedImageBase64;
            if (previewContainerSecond) previewContainerSecond.style.display = "flex";
            if (uploadPromptSecond) uploadPromptSecond.style.display = "none";
            if (btnPickSecond) btnPickSecond.style.display = "none";
        };
        reader.readAsDataURL(file);
    }
}

// Detección asistida por IA
function ejecutarAnalisisIA(filename) {
    const categoryInput = document.getElementById("prodCategory");
    const titleInput = document.getElementById("prodTitle");
    const scanOverlay = document.getElementById("scanOverlay");

    if (scanOverlay) scanOverlay.style.display = "block";
    showAIStatus("🔍 Analizando imagen con IA...", "info");

    analizarHeuristicaFilename(filename);

    const imgElem = document.getElementById("imagePreview");
    if (tfModel && imgElem && imgElem.complete && imgElem.naturalWidth > 0) {
        tfModel.classify(imgElem)
            .then(predictions => {
                if (scanOverlay) scanOverlay.style.display = "none";
                procesarPrediccionesIA(predictions);
            })
            .catch(err => {
                if (scanOverlay) scanOverlay.style.display = "none";
                showAIStatus("✓ Detección asistida completada", "success");
            });
    } else {
        setTimeout(() => {
            if (scanOverlay) scanOverlay.style.display = "none";
            showAIStatus("✓ Detección asistida completada", "success");
        }, 600);
    }
}

function analizarHeuristicaFilename(filename) {
    const fname = filename.toLowerCase();
    const categoryInput = document.getElementById("prodCategory");
    const titleInput = document.getElementById("prodTitle");

    if (!categoryInput) return;

    if (fname.includes("lip") || fname.includes("labial") || fname.includes("gloss") || fname.includes("tinta") || fname.includes("vinyl")) {
        categoryInput.value = "labios";
        if (titleInput && !titleInput.value) titleInput.value = "Lip Gloss Dolce Bella";
    } else if (fname.includes("base") || fname.includes("blush") || fname.includes("polvo") || fname.includes("corrector") || fname.includes("rubor")) {
        categoryInput.value = "rostro";
        if (titleInput && !titleInput.value && fname.includes("blush")) titleInput.value = "Blush Dolce Bella";
        if (titleInput && !titleInput.value && fname.includes("base")) titleInput.value = "Base Matte Dolce Bella";
    } else if (fname.includes("mascara") || fname.includes("pestaña") || fname.includes("ceja") || fname.includes("lapiz") || fname.includes("delineador")) {
        categoryInput.value = "ojos";
        if (titleInput && !titleInput.value && fname.includes("mascara")) titleInput.value = "Máscara de Pestañas Dolce Bella";
    } else if (fname.includes("pinza") || fname.includes("guante") || fname.includes("gorro") || fname.includes("esponja") || fname.includes("brocha")) {
        categoryInput.value = "accesorios";
    }

    categoryInput.dispatchEvent(new Event("change"));
}

function procesarPrediccionesIA(predictions) {
    if (!predictions || predictions.length === 0) return;
    const categoryInput = document.getElementById("prodCategory");
    if (!categoryInput) return;

    const topClass = predictions[0].className.toLowerCase();

    if (topClass.includes("lipstick") || topClass.includes("lotion") || topClass.includes("perfume") || topClass.includes("cosmetic")) {
        if (!categoryInput.value || categoryInput.value === "labios") {
            showAIStatus("✨ IA detectó Cosmético / Maquillaje", "success");
        }
    }
}

// ==========================================
// 5. CARGA Y GESTIÓN DEL CATÁLOGO
// ==========================================
async function loadCatalog() {
    const listContainer = document.getElementById("catalogList");
    if (!listContainer) return;

    listContainer.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);">Cargando catálogo...</div>`;

    // Catálogo base fallback
    const dbFallback = [
        { id: 1,  title: "Pinza para planchado",                  price: 0.80,  category: "accesorios", img: "assets/images/pinza-planchado.jpeg",   stock: 13, tones: "" },
        { id: 2,  title: "Guantes exfoliante",                    price: 2.50,  category: "accesorios", img: "assets/images/guantes.jpeg",            stock: 1,  tones: "" },
        { id: 3,  title: "Blush Dolce Bella con brillo",          price: 4.56,  category: "rostro",     img: "assets/images/blush brillo.jpeg",       stock: 3,  tones: "" },
        { id: 4,  title: "Bases matte",                           price: 10.15, category: "rostro",     img: "assets/images/base matte.jpeg",         stock: 5,  tones: "1 Carmel, 1 Vainilla, 1 Tam, 1 Nutmeg, 1 Golden" },
        { id: 5,  title: "Máscaras de pestaña Dolce Bella Moradas",price: 4.56, category: "ojos",       img: "assets/images/mascara.jpeg",            stock: 4,  tones: "" },
        { id: 6,  title: "Máscara definición Dolce Bella Amarilla",price: 4.56, category: "ojos",       img: "assets/images/mascara-amarilla.jpeg",   stock: 1,  tones: "" },
        { id: 7,  title: "Gel de cejas Salome",                   price: 5.80,  category: "ojos",       img: "assets/images/GEL DE CEJA.jpeg",        stock: 2,  tones: "" },
        { id: 8,  title: "Gorros de satín",                       price: 7.00,  category: "accesorios", img: "assets/images/gorros.jpeg",             stock: 3,  tones: "" },
        { id: 9,  title: "Polvo compacto Dolce Bella",            price: 5.60,  category: "rostro",     img: "assets/images/polvo.jpeg",              stock: 1,  tones: "N°10" },
        { id: 10, title: "Vinyl Lasting Dolce Bella",             price: 5.60,  category: "labios",     img: "assets/images/vinyl.jpeg",              stock: 2,  tones: "" },
        { id: 11, title: "Juicy Flush Tinted Lip & Cheek",        price: 5.80,  category: "labios",     img: "assets/images/tinta.jpeg",              stock: 4,  tones: "2 Poppy, 1 Lily, 1 Iris" },
        { id: 12, title: "Lipgloss Juicy Bomb",                   price: 3.00,  category: "labios",     img: "assets/images/brillo.jpeg",             stock: 3,  tones: "" },
        { id: 13, title: "Lápices para cejas negros",             price: 2.00,  category: "ojos",       img: "assets/images/lapiz-negro.jpeg",        stock: 3,  tones: "" },
        { id: 14, title: "Lápices para cejas marrones",           price: 2.00,  category: "ojos",       img: "assets/images/lapiz-marron.jpeg",       stock: 2,  tones: "" },
        { id: 15, title: "Polvo translúcido finishing powder",    price: 5.60,  category: "rostro",     img: "assets/images/POLVO TRANSLUCIDO.jpeg",  stock: 1,  tones: "" },
        { id: 16, title: "Correctores",                           price: 5.20,  category: "rostro",     img: "assets/images/corrector.jpeg",          stock: 8,  tones: "1 Brown, 2 Honey, 2 Ivory, 2 Carmel, 1 Beige" },
        { id: 17, title: "Blush sencillos",                       price: 4.00,  category: "rostro",     img: "assets/images/BLUSH SENCILLOS.jpeg",    stock: 3,  tones: "Tono 07, 04, 11" },
        { id: 18, title: "Bases de borlas",                       price: 4.00,  category: "accesorios", img: "assets/images/borlas.jpeg",             stock: 2,  tones: "" },
        { id: 19, title: "Esponja de maquillaje",                 price: 1.50,  category: "accesorios", img: "assets/images/esponja.jpeg",            stock: 1,  tones: "" },
        { id: 20, title: "Pinza Hawaiana",                        price: 3.50,  category: "accesorios", img: "assets/images/pinza-hawaiana.jpeg",     stock: 1,  tones: "" },
        { id: 21, title: "Lip Gloss Dolce Bella",                 price: 4.00,  category: "labios",     img: "assets/images/LIP GLOSS.jpeg",          stock: 13, tones: "C02, D3, D4, D6, D5, 06, 04, D1, 01, 03" }
    ];

    let dbOrig = [];

    // Intentar leer de /api/productos o productos.json
    try {
        let res = await fetch("/api/productos", { cache: "no-store" });
        if (!res.ok) {
            res = await fetch("js/productos.json?v=" + Date.now());
        }
        if (res.ok) {
            dbOrig = await res.json();
        } else {
            dbOrig = dbFallback;
        }
    } catch (e) {
        console.info("[KARA Admin] Sin servidor detectado. Usando catálogo base local.");
        dbOrig = dbFallback;
    }

    if (!Array.isArray(dbOrig) || dbOrig.length === 0) {
        dbOrig = dbFallback;
    }

    // Fusionar de forma limpia sin duplicados en modo local o servidor
    if (!serverSyncActive) {
        const deletedSet = new Set(localDeletedIds.map(Number));
        let list = dbOrig.filter(p => !deletedSet.has(Number(p.id)));

        // Aplicar actualizaciones locales sobre los productos base
        list = list.map(p => {
            const key = String(p.id);
            return localUpdatedProducts[key] ? { ...p, ...localUpdatedProducts[key] } : p;
        });

        // Agregar los productos nuevos creados en modo local que no existan aún en el listado
        for (const localP of localAddedProducts) {
            const numId = Number(localP.id);
            if (deletedSet.has(numId)) continue;

            const existingIndex = list.findIndex(p => Number(p.id) === numId);
            if (existingIndex !== -1) {
                list[existingIndex] = { ...list[existingIndex], ...localP };
            } else {
                list.push(localP);
            }
        }

        // Garantizar deduplicación estricta por ID
        const catalogMap = new Map();
        for (const item of list) {
            if (item && item.id) {
                catalogMap.set(Number(item.id), item);
            }
        }
        catalogoCompleto = Array.from(catalogMap.values());
    } else {
        const catalogMap = new Map();
        for (const item of dbOrig) {
            if (item && item.id) {
                catalogMap.set(Number(item.id), item);
            }
        }
        catalogoCompleto = Array.from(catalogMap.values());
    }

    renderCatalogList();
}

// Diccionario de colores automáticos para nombres de tonos
const DIC_COLORES_TONOS = {
    "carmel": "#C68642", "caramel": "#C68642", "caramelo": "#C68642",
    "vainilla": "#F5E5B8", "vanilla": "#F5E5B8",
    "nude": "#D19F86", "beige": "#E0C097", "arena": "#E5C49A",
    "rojo": "#C41E3A", "red": "#C41E3A", "carmín": "#A91B2D",
    "rosa": "#E87EA1", "rose": "#E87EA1", "pink": "#FFB6C1", "rosado": "#E87EA1",
    "fucsia": "#D91B60", "fuchsia": "#D91B60",
    "vino": "#6B1D2F", "wine": "#6B1D2F", "burgundy": "#6B1D2F", "tinto": "#521422",
    "chocolate": "#5C3A21", "brown": "#5C3A21", "marrón": "#5C3A21", "café": "#4A2E1B",
    "coral": "#FF7F50", "durazno": "#FDB99B", "peach": "#FDB99B",
    "dorado": "#E6C200", "gold": "#E6C200", "sol": "#FFD700",
    "morado": "#701C45", "purple": "#701C45", "plum": "#701C45", "uva": "#581537",
    "brillo": "#E8F4F8", "clear": "#F0F8FF", "transparente": "#F0F8FF", "gloss": "#FFEBF2",
    "bronze": "#CD7F32", "bronce": "#CD7F32",
    "nutmeg": "#9E5938", "honey": "#E6A756", "miel": "#E6A756",
    "ivory": "#FFF3E0", "marfil": "#FFF3E0", "berry": "#9B2335",
    "poppy": "#E34234", "lily": "#F4C2C2", "iris": "#5A4FCF"
};

function autoDetectToneColor(name) {
    if (!name) return "#E22963";
    const cleanName = name.toLowerCase().trim();

    for (const [key, color] of Object.entries(DIC_COLORES_TONOS)) {
        if (cleanName.includes(key)) {
            return color;
        }
    }

    let hash = 0;
    for (let i = 0; i < cleanName.length; i++) {
        hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return hslToHex(h, 60, 65);
}

function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

// Creador de Chips de Tonos
function setupToneBuilder() {
    const nameInput = document.getElementById("newToneName");
    const colorInput = document.getElementById("newToneColor");
    const addBtn = document.getElementById("btnAddToneChip");

    if (!nameInput || !colorInput || !addBtn) return;

    nameInput.addEventListener("input", () => {
        const val = nameInput.value.trim();
        if (val) {
            colorInput.value = autoDetectToneColor(val);
        }
    });

    addBtn.addEventListener("click", () => {
        const name = nameInput.value.trim();
        const color = colorInput.value;

        if (!name) {
            alert("Por favor escribe el nombre del tono.");
            return;
        }

        const existe = currentToneObjects.some(t => t.name.toLowerCase() === name.toLowerCase());
        if (existe) {
            alert(`El tono "${name}" ya está agregado.`);
            return;
        }

        currentToneObjects.push({ name: name, color: color });
        nameInput.value = "";
        colorInput.value = "#EC1C80";
        renderToneChips();
    });
}

function renderToneChips() {
    const listContainer = document.getElementById("toneChipsList");
    const hiddenTones = document.getElementById("prodTones");

    if (!listContainer) return;

    listContainer.innerHTML = "";

    currentToneObjects.forEach((tone, index) => {
        const chip = document.createElement("div");
        chip.className = "tone-chip";
        chip.innerHTML = `
            <span class="tone-color-dot" style="background-color: ${tone.color};"></span>
            <span class="tone-name-text">${tone.name}</span>
            <button type="button" class="btn-remove-chip" data-index="${index}" title="Eliminar tono">&times;</button>
        `;
        listContainer.appendChild(chip);
    });

    listContainer.querySelectorAll(".btn-remove-chip").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.index);
            currentToneObjects.splice(idx, 1);
            renderToneChips();
        });
    });

    if (hiddenTones) {
        hiddenTones.value = currentToneObjects.map(t => t.name).join(", ");
    }
}

// ==========================================
// 6. RENDERIZADO DEL CATÁLOGO & ESTADÍSTICAS
// ==========================================
function renderCatalogList(filtrados = null) {
    const listContainer = document.getElementById("catalogList");
    if (!listContainer) return;

    // Actualizar Estadísticas
    const statTotalElem = document.getElementById("statTotalCount");
    const statLowElem = document.getElementById("statLowCount");
    const statOutElem = document.getElementById("statOutCount");

    const totalProd = catalogoCompleto.length;
    const outProd = catalogoCompleto.filter(p => (typeof p.stock !== "number" || p.stock <= 0)).length;
    const lowProd = catalogoCompleto.filter(p => typeof p.stock === "number" && p.stock > 0 && p.stock < 3).length;

    if (statTotalElem) statTotalElem.textContent = totalProd;
    if (statOutElem) statOutElem.textContent = outProd;
    if (statLowElem) statLowElem.textContent = lowProd;

    listContainer.innerHTML = "";

    const items = filtrados || catalogoCompleto;

    if (items.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);">No se encontraron productos.</div>`;
        return;
    }

    // Ordenar por ID descendente para ver los más nuevos primero
    const ordenados = [...items].sort((a, b) => Number(b.id) - Number(a.id));

    ordenados.forEach(prod => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "catalog-item";

        const stockVal = typeof prod.stock === "number" ? prod.stock : 1;
        let stockBadgeHtml = "";
        if (stockVal <= 0) {
            stockBadgeHtml = `<span class="stock-badge badge-out">🚫 AGOTADO</span>`;
        } else if (stockVal < 3) {
            stockBadgeHtml = `<span class="stock-badge badge-low">⚠️ Poco Stock (${stockVal})</span>`;
        } else {
            stockBadgeHtml = `<span class="stock-badge badge-ok">✓ Disponible (${stockVal})</span>`;
        }

        itemDiv.innerHTML = `
            <div class="item-main">
                <img src="${prod.img}" alt="${prod.title}" class="item-thumb" onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=100'">
                <div class="item-details">
                    <h4 class="item-title">${prod.title}</h4>
                    <div class="item-meta">
                        <span>Categoría: <strong>${(prod.category || 'general').toUpperCase()}</strong></span>
                        ${stockBadgeHtml}
                        ${prod.tones ? `<span>Tonos: <strong>${prod.tones}</strong></span>` : ''}
                    </div>
                </div>
                <div class="item-price">$${Number(prod.price).toFixed(2)}</div>
            </div>
            <div class="item-actions">
                <button type="button" class="btn-edit" data-id="${prod.id}" title="Editar producto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Editar
                </button>
                <button type="button" class="btn-delete" data-id="${prod.id}" title="Eliminar producto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    Borrar
                </button>
            </div>
        `;

        listContainer.appendChild(itemDiv);
    });
}

// Delegación de Eventos en la Lista del Catálogo (Registrado 1 sola vez)
function setupCatalogListDelegation() {
    const listContainer = document.getElementById("catalogList");
    const searchCatalogInput = document.getElementById("searchCatalogInput");

    if (!listContainer || listContainer.dataset.delegated) return;
    listContainer.dataset.delegated = "true";

    listContainer.addEventListener("click", (e) => {
        const btnEdit = e.target.closest(".btn-edit");
        if (btnEdit) {
            const id = Number(btnEdit.dataset.id);
            cargarProductoParaEditar(id);
            return;
        }

        const btnDelete = e.target.closest(".btn-delete");
        if (btnDelete) {
            const id = Number(btnDelete.dataset.id);
            const nombreProd = btnDelete.closest(".catalog-item")?.querySelector(".item-title")?.textContent || "este producto";
            if (confirm(`¿Eliminar "${nombreProd}" del catálogo?\n\nEsta acción eliminará el producto definitivamente.`)) {
                eliminarProducto(id);
            }
            return;
        }
    });

    if (searchCatalogInput && !searchCatalogInput.dataset.listened) {
        searchCatalogInput.dataset.listened = "true";
        searchCatalogInput.addEventListener("input", (e) => {
            const q = e.target.value.toLowerCase().trim();
            if (q === "") {
                renderCatalogList();
            } else {
                const filtrados = catalogoCompleto.filter(p => 
                    (p.title && p.title.toLowerCase().includes(q)) || 
                    (p.category && p.category.toLowerCase().includes(q))
                );
                renderCatalogList(filtrados);
            }
        });
    }
}

// ==========================================
// 7. MODO EDICIÓN Y CANCELACIÓN
// ==========================================
function cargarProductoParaEditar(id) {
    const numId = Number(id);
    const prod = catalogoCompleto.find(p => Number(p.id) === numId);
    if (!prod) return;

    // ESTABLECER ESTADO DE EDICIÓN EXPLÍCITO
    editingProductId = prod.id;

    document.getElementById("editProdId").value = prod.id;
    document.getElementById("prodTitle").value = prod.title || "";
    document.getElementById("prodPrice").value = prod.price !== undefined ? prod.price : 0;
    document.getElementById("prodCategory").value = prod.category || "labios";
    document.getElementById("prodStock").value = typeof prod.stock === "number" ? prod.stock : 1;
    document.getElementById("prodBadge").value = prod.badge || "";
    
    const extraInput = document.getElementById("prodExtraImages");
    if (extraInput) {
        extraInput.value = (prod.images && Array.isArray(prod.images)) ? prod.images.join(", ") : "";
    }

    // Cargar tonos existentes
    if (prod.toneObjects && Array.isArray(prod.toneObjects) && prod.toneObjects.length > 0) {
        currentToneObjects = prod.toneObjects.map(t => ({
            name: typeof t === "string" ? t : t.name,
            color: (t && t.color) ? t.color : autoDetectToneColor(typeof t === "string" ? t : t.name)
        }));
    } else if (prod.tones && prod.tones.trim().length > 0) {
        currentToneObjects = prod.tones.split(",").map(t => {
            const name = t.trim();
            return { name: name, color: autoDetectToneColor(name) };
        }).filter(t => t.name);
    } else {
        currentToneObjects = [];
    }
    renderToneChips();

    // Guardar referencias a las imágenes originales
    editingOriginalImg = prod.img || "";
    editingOriginalImages = Array.isArray(prod.images) ? [...prod.images] : [];
    currentUploadedImageBase64 = "";
    currentSecondUploadedImageBase64 = "";

    // Previsualización Foto 1
    const imagePreview = document.getElementById("imagePreview");
    const previewContainer = document.getElementById("previewContainer");
    const uploadPrompt = document.getElementById("uploadPrompt");
    const btnPickMain = document.getElementById("btnPickMainImage");

    if (prod.img) {
        imagePreview.src = prod.img;
        previewContainer.style.display = "flex";
        uploadPrompt.style.display = "none";
        if (btnPickMain) btnPickMain.style.display = "none";
    } else {
        previewContainer.style.display = "none";
        uploadPrompt.style.display = "block";
        if (btnPickMain) btnPickMain.style.display = "inline-block";
    }

    // Previsualización Foto 2
    const imagePreviewSecond = document.getElementById("imagePreviewSecond");
    const previewContainerSecond = document.getElementById("previewContainerSecond");
    const uploadPromptSecond = document.getElementById("uploadPromptSecond");
    const btnPickSecond = document.getElementById("btnPickSecondImage");

    if (prod.images && prod.images.length > 0 && prod.images[0]) {
        if (imagePreviewSecond) imagePreviewSecond.src = prod.images[0];
        if (previewContainerSecond) previewContainerSecond.style.display = "flex";
        if (uploadPromptSecond) uploadPromptSecond.style.display = "none";
        if (btnPickSecond) btnPickSecond.style.display = "none";
    } else {
        if (previewContainerSecond) previewContainerSecond.style.display = "none";
        if (uploadPromptSecond) uploadPromptSecond.style.display = "block";
        if (btnPickSecond) btnPickSecond.style.display = "inline-block";
    }

    // Cambiar UI a modo edición
    const badgeText = document.getElementById("stepBadgeText");
    const submitBtn = document.getElementById("btnSubmitForm");
    const cancelBtn = document.getElementById("btnCancelEdit");

    if (badgeText) badgeText.textContent = `✏️ Modificando Producto #${prod.id}`;
    if (submitBtn) submitBtn.textContent = "Actualizar Producto";
    if (cancelBtn) cancelBtn.style.display = "inline-flex";

    // Disparar evento input para actualizar la vista previa en vivo (mirror)
    const titleInput = document.getElementById("prodTitle");
    if (titleInput) titleInput.dispatchEvent(new Event("input"));

    document.querySelector(".studio-panel")?.scrollIntoView({ behavior: "smooth" });
}

function cancelarEdicion() {
    const form = document.getElementById("productForm");
    if (form) form.reset();

    // RESTABLECER ESTADO A MODO CREACIÓN
    editingProductId = null;
    editingOriginalImg = "";
    editingOriginalImages = [];
    currentUploadedImageBase64 = "";
    currentSecondUploadedImageBase64 = "";
    currentToneObjects = [];

    document.getElementById("editProdId").value = "";
    const badgeText = document.getElementById("stepBadgeText");
    const submitBtn = document.getElementById("btnSubmitForm");
    const cancelBtn = document.getElementById("btnCancelEdit");

    if (badgeText) badgeText.textContent = "02 · Detalles del Producto";
    if (submitBtn) submitBtn.textContent = "Guardar Producto";
    if (cancelBtn) cancelBtn.style.display = "none";

    renderToneChips();

    // Reset foto 1
    const previewContainer = document.getElementById("previewContainer");
    const uploadPrompt = document.getElementById("uploadPrompt");
    const btnPickMain = document.getElementById("btnPickMainImage");
    if (previewContainer) previewContainer.style.display = "none";
    if (uploadPrompt) uploadPrompt.style.display = "block";
    if (btnPickMain) btnPickMain.style.display = "inline-block";

    // Reset foto 2
    const previewContainerSecond = document.getElementById("previewContainerSecond");
    const uploadPromptSecond = document.getElementById("uploadPromptSecond");
    const btnPickSecond = document.getElementById("btnPickSecondImage");
    if (previewContainerSecond) previewContainerSecond.style.display = "none";
    if (uploadPromptSecond) uploadPromptSecond.style.display = "block";
    if (btnPickSecond) btnPickSecond.style.display = "inline-block";

    // Actualizar espejo en vivo
    const titleInput = document.getElementById("prodTitle");
    if (titleInput) titleInput.dispatchEvent(new Event("input"));
}

// ==========================================
// 8. PROCESAMIENTO DEL FORMULARIO (CRUD)
// ==========================================
function setupProductForm() {
    const form = document.getElementById("productForm");
    const btnCancel = document.getElementById("btnCancelEdit");

    if (btnCancel && !btnCancel.dataset.listened) {
        btnCancel.dataset.listened = "true";
        btnCancel.addEventListener("click", cancelarEdicion);
    }

    if (!form || form.dataset.listened) return;
    form.dataset.listened = "true";

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("prodTitle").value.trim();
        const price = parseFloat(document.getElementById("prodPrice").value) || 0;
        const category = document.getElementById("prodCategory").value;
        const stockRaw = document.getElementById("prodStock").value;
        const stock = (stockRaw !== "" && !isNaN(parseInt(stockRaw))) ? parseInt(stockRaw) : 0;
        const badge = document.getElementById("prodBadge").value || "";
        const extraImgsVal = document.getElementById("prodExtraImages") ? document.getElementById("prodExtraImages").value.trim() : "";
        let extraImages = extraImgsVal ? extraImgsVal.split(",").map(s => s.trim()).filter(Boolean) : [];

        const tonesStr = currentToneObjects.map(t => t.name).join(", ");

        // Determinar Foto 1 final
        let imgFinal = "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400";
        if (currentUploadedImageBase64) {
            try {
                imgFinal = await comprimirImagen(currentUploadedImageBase64, 1200);
            } catch(err) {
                imgFinal = currentUploadedImageBase64;
            }
        } else if (editingProductId !== null) {
            imgFinal = editingOriginalImg || imgFinal;
        }

        // Determinar Foto 2 final
        if (currentSecondUploadedImageBase64) {
            let imgSecondFinal = currentSecondUploadedImageBase64;
            try {
                imgSecondFinal = await comprimirImagen(currentSecondUploadedImageBase64, 1200);
            } catch(err) {
                imgSecondFinal = currentSecondUploadedImageBase64;
            }
            extraImages = [imgSecondFinal, ...extraImages.filter(img => img !== imgSecondFinal)];
        } else if (editingProductId !== null && editingOriginalImages.length > 0) {
            extraImages = Array.from(new Set([...editingOriginalImages, ...extraImages]));
        }

        const productData = {
            title: title,
            price: price,
            category: category,
            img: imgFinal,
            images: extraImages,
            stock: stock,
            badge: badge,
            tones: tonesStr,
            toneObjects: [...currentToneObjects]
        };

        // SEPARACIÓN ESTRICTA: EDITAR vs CREAR
        if (editingProductId !== null) {
            await actualizarProducto(editingProductId, productData);
        } else {
            await crearProducto(productData);
        }
    });
}

// ACTUALIZAR PRODUCTO EXISTENTE
async function actualizarProducto(id, data) {
    const targetId = Number(id);
    const index = catalogoCompleto.findIndex(p => Number(p.id) === targetId);

    if (index === -1) {
        alert("Error: No se encontró el producto a actualizar en la lista.");
        return;
    }

    const prodActualizado = {
        ...catalogoCompleto[index],
        ...data,
        id: targetId // PRESERVAR ID ORIGINAL
    };

    if (serverSyncActive) {
        catalogoCompleto[index] = prodActualizado;

        // Intentar actualizar vía PUT o POST en servidor
        let guardado = false;
        try {
            const res = await fetch(`/api/productos/${targetId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(prodActualizado)
            });
            guardado = res.ok;
        } catch(e) {
            guardado = false;
        }

        if (!guardado) {
            guardado = await guardarEnServidor(catalogoCompleto);
        }

        if (guardado) {
            mostrarNotificacion(`Producto "${data.title}" actualizado con éxito. ✓`);
            cancelarEdicion();
            renderCatalogList();
        } else {
            alert("No se pudo guardar la actualización en el servidor.");
        }
    } else {
        // MODO ESTÁTICO (localStorage)
        catalogoCompleto[index] = prodActualizado;

        // Si pertenece a productos agregados localmente, actualizarlo ahí
        const localIdx = localAddedProducts.findIndex(p => Number(p.id) === targetId);
        if (localIdx !== -1) {
            localAddedProducts[localIdx] = prodActualizado;
            localStorage.setItem('KARA_ADMIN_ADDED', JSON.stringify(localAddedProducts));
        } else {
            // Si es un producto base original, guardar su actualización aislada
            localUpdatedProducts[String(targetId)] = prodActualizado;
            localStorage.setItem('KARA_ADMIN_UPDATED', JSON.stringify(localUpdatedProducts));
        }

        mostrarNotificacion(`Producto "${data.title}" actualizado localmente. ✓`);
        cancelarEdicion();
        renderCatalogList();
    }
}

// CREAR NUEVO PRODUCTO
async function crearProducto(data) {
    // Generar un ID único mayor al máximo existente
    const allIds = [
        ...catalogoCompleto.map(p => Number(p.id) || 0),
        ...localAddedProducts.map(p => Number(p.id) || 0),
        1000
    ];
    const newId = Math.max(...allIds) + 1;

    const nuevoProducto = {
        ...data,
        id: newId
    };

    if (serverSyncActive) {
        catalogoCompleto.unshift(nuevoProducto);
        const guardado = await guardarEnServidor(catalogoCompleto);
        if (guardado) {
            mostrarNotificacion(`Producto "${data.title}" creado permanentemente. ✓`);
            cancelarEdicion();
            renderCatalogList();
        } else {
            catalogoCompleto.shift();
            alert("Hubo un error al crear el producto en el servidor.");
        }
    } else {
        // MODO ESTÁTICO (localStorage)
        localAddedProducts.unshift(nuevoProducto);
        try {
            localStorage.setItem('KARA_ADMIN_ADDED', JSON.stringify(localAddedProducts));
        } catch(e) {
            // Si supera la cuota de localStorage, asignar imagen liviana
            nuevoProducto.img = "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400";
            localAddedProducts[0] = nuevoProducto;
            localStorage.setItem('KARA_ADMIN_ADDED', JSON.stringify(localAddedProducts));
            mostrarNotificacion("⚠️ Imagen optimizada por límite de memoria local.");
        }

        // Limpiar de eliminados si existía una id previa igual
        localDeletedIds = localDeletedIds.filter(id => Number(id) !== newId);
        localStorage.setItem('KARA_ADMIN_DELETED', JSON.stringify(localDeletedIds));

        // Insertar en catálogo actual
        catalogoCompleto.unshift(nuevoProducto);

        mostrarNotificacion(`Producto "${data.title}" creado con éxito. ✓`);
        cancelarEdicion();
        renderCatalogList();
    }
}

// ELIMINAR PRODUCTO
async function eliminarProducto(id) {
    const numId = Number(id);

    if (serverSyncActive) {
        let guardado = false;
        try {
            const res = await fetch(`/api/productos/${numId}`, { method: "DELETE" });
            guardado = res.ok;
        } catch(e) {
            guardado = false;
        }

        if (!guardado) {
            const nuevoCatalogo = catalogoCompleto.filter(p => Number(p.id) !== numId);
            guardado = await guardarEnServidor(nuevoCatalogo);
        }

        if (guardado) {
            catalogoCompleto = catalogoCompleto.filter(p => Number(p.id) !== numId);
            mostrarNotificacion("Producto eliminado con éxito. ✓");
            renderCatalogList();
        } else {
            alert("No se pudo eliminar el producto en el servidor.");
        }
    } else {
        // MODO ESTÁTICO (localStorage)
        const esLocal = localAddedProducts.some(p => Number(p.id) === numId);

        if (esLocal) {
            localAddedProducts = localAddedProducts.filter(p => Number(p.id) !== numId);
            localStorage.setItem('KARA_ADMIN_ADDED', JSON.stringify(localAddedProducts));
        }

        if (localUpdatedProducts[String(numId)]) {
            delete localUpdatedProducts[String(numId)];
            localStorage.setItem('KARA_ADMIN_UPDATED', JSON.stringify(localUpdatedProducts));
        }

        if (!esLocal && !localDeletedIds.includes(numId)) {
            localDeletedIds.push(numId);
            localStorage.setItem('KARA_ADMIN_DELETED', JSON.stringify(localDeletedIds));
        }

        catalogoCompleto = catalogoCompleto.filter(p => Number(p.id) !== numId);
        mostrarNotificacion("Producto eliminado localmente. ✓");
        renderCatalogList();
    }
}

// Guardar array completo en el servidor
async function guardarEnServidor(lista) {
    try {
        const res = await fetch("/api/productos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lista)
        });
        return res.ok;
    } catch (e) {
        console.error("[KARA Admin] Error al guardar en servidor:", e);
        return false;
    }
}

// Compresión de imagen Base64
function comprimirImagen(base64, maxSize = 1200) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            let w = img.width, h = img.height;
            if (w > h) { if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; } }
            else        { if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; } }
            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext("2d");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, w, h);

            resolve(canvas.toDataURL("image/jpeg", 0.92));
        };
        img.onerror = reject;
        img.src = base64;
    });
}

// Exportar respaldos JSON
function exportarJsonCompleto() {
    const catalogoExportable = catalogoCompleto.map(p => ({
        id: Number(p.id),
        title: p.title || "",
        price: Number(p.price) || 0,
        category: p.category || "labios",
        img: p.img || "",
        images: p.images || [],
        stock: p.stock !== undefined ? Number(p.stock) : 1,
        tones: p.tones || "",
        toneObjects: p.toneObjects || [],
        badge: p.badge || ""
    }));

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(catalogoExportable, null, 4));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "productos.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    mostrarNotificacion("Archivo productos.json respaldado con éxito. 📦");
}

// Configuración de la barra de sincronización multi-dispositivo
function setupMultiDeviceSync() {
    const btnExport = document.getElementById("btnExportJSON");
    const btnImportTrigger = document.getElementById("btnImportJSONTrigger");
    const inputImport = document.getElementById("inputImportJSON");
    const btnCopy = document.getElementById("btnCopySyncData");
    const btnPaste = document.getElementById("btnPasteSyncData");

    if (btnExport && !btnExport.dataset.listened) {
        btnExport.dataset.listened = "true";
        btnExport.addEventListener("click", exportarJsonCompleto);
    }

    if (btnImportTrigger && inputImport && !btnImportTrigger.dataset.listened) {
        btnImportTrigger.dataset.listened = "true";
        btnImportTrigger.addEventListener("click", () => inputImport.click());

        inputImport.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const parsed = JSON.parse(event.target.result);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            await aplicarListaSincronizada(parsed, "Archivo productos.json cargado correctamente. 📥");
                        } else {
                            alert("El archivo cargado no contiene un catálogo válido.");
                        }
                    } catch(err) {
                        alert("Error al leer el archivo JSON: " + err.message);
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    if (btnCopy && !btnCopy.dataset.listened) {
        btnCopy.dataset.listened = "true";
        btnCopy.addEventListener("click", () => {
            const jsonStr = JSON.stringify(catalogoCompleto);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(jsonStr)
                    .then(() => mostrarNotificacion("📋 Código de catálogo copiado. Pégalo en tu teléfono."))
                    .catch(() => alert("Copia manualmente el catálogo desde exportar JSON."));
            } else {
                prompt("Copia este código de sincronización:", jsonStr);
            }
        });
    }

    if (btnPaste && !btnPaste.dataset.listened) {
        btnPaste.dataset.listened = "true";
        btnPaste.addEventListener("click", async () => {
            let pastedText = "";
            if (navigator.clipboard && navigator.clipboard.readText) {
                try {
                    pastedText = await navigator.clipboard.readText();
                } catch(e) {}
            }
            if (!pastedText) {
                pastedText = prompt("Pega aquí el código o contenido JSON del catálogo enviado desde el otro dispositivo:");
            }

            if (pastedText) {
                try {
                    const parsed = JSON.parse(pastedText.trim());
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        await aplicarListaSincronizada(parsed, "📲 Catálogo sincronizado desde otro dispositivo con éxito. ✓");
                    } else {
                        alert("El texto pegado no es un catálogo válido.");
                    }
                } catch(err) {
                    alert("Formato de sincronización inválido. Asegúrate de haber copiado todo el código.");
                }
            }
        });
    }
}

// Aplica una lista importada a la memoria local y al servidor
async function aplicarListaSincronizada(lista, msgExito) {
    catalogoCompleto = lista;
    localAddedProducts = lista.filter(p => Number(p.id) > 1000);
    localUpdatedProducts = {};
    lista.forEach(p => {
        if (Number(p.id) <= 1000) {
            localUpdatedProducts[String(p.id)] = p;
        }
    });

    localStorage.setItem('KARA_ADMIN_ADDED', JSON.stringify(localAddedProducts));
    localStorage.setItem('KARA_ADMIN_UPDATED', JSON.stringify(localUpdatedProducts));

    await guardarEnServidor(lista);
    renderCatalogList();
    mostrarNotificacion(msgExito);
}

// Toast de notificación
function mostrarNotificacion(msg) {
    const toast = document.getElementById("notificationToast");
    const txt = document.getElementById("notificationText");
    if (!toast) return;

    if (txt) txt.textContent = msg;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}
