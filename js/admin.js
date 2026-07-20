/**
 * KARA Makeup — Back-Office & AI Image Cataloging Logic
 * =======================================================
 */

// Contraseña sencilla para el panel de Kamila
const CONTRASEÑA_CORRECTA = "KARA2026";

// Estado global del catálogo en administración
let catalogoCompleto = [];
let localAddedProducts = JSON.parse(localStorage.getItem('KARA_ADMIN_ADDED')) || [];
let localDeletedIds = JSON.parse(localStorage.getItem('KARA_ADMIN_DELETED')) || [];
let serverSyncActive = false;
let tfModel = null;
let currentUploadedImageBase64 = "";
let currentSecondUploadedImageBase64 = "";

document.addEventListener("DOMContentLoaded", () => {
    initAdmin();
});

async function initAdmin() {
    setupImageUpload();
    setupProductForm();
    await setupSyncMode();
    loadAIModel();
    await loadCatalog();
}

// ==========================================
// 1. CONTROL DE ACCESO (PASS GATE)
// ==========================================
function setupPassGate() {
    // Pantalla de login removida para acceso directo
}

// ==========================================
// 2. MODO DE SINCRONIZACIÓN (SERVIDOR VS ESTÁTICO)
// ==========================================
async function setupSyncMode() {
    const modeText = document.getElementById("syncModeText");
    const descText = document.getElementById("syncDescText");
    const exportBtn = document.getElementById("btnExportJSON");

    try {
        const res = await fetch("/api/ping");
        if (res.ok) {
            serverSyncActive = true;
            if (modeText) {
                modeText.textContent = "Conexión local: SERVIDOR ACTIVO 🚀";
                if (modeText.parentElement) {
                    modeText.parentElement.style.backgroundColor = "#F2FFF5";
                    modeText.parentElement.style.borderColor = "rgba(37, 211, 102, 0.2)";
                    modeText.parentElement.style.color = "#1E6B34";
                }
            }
            if (descText) descText.textContent = "Los cambios se guardan automáticamente en js/productos.json en tiempo real.";
            if (exportBtn) exportBtn.style.display = "none";
        } else {
            throw new Error("No server endpoint");
        }
    } catch (e) {
        serverSyncActive = false;
        if (modeText) modeText.textContent = "Conexión local: MODO HOSTING ESTÁTICO 🥥";
        if (descText) descText.textContent = "Los cambios se guardan localmente en tu navegador.";
        if (exportBtn) exportBtn.style.display = "inline-flex";
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", exportarJsonCompleto);
    }
}

// ==========================================
// 3. CARGA DE MODELO IA TENSORFLOW.JS (MOBILENET)
// ==========================================
function loadAIModel() {
    const aiStatusMsg = document.getElementById("aiStatusMsg");
    showAIStatus("Inicializando Inteligencia Artificial...", "loading");

    let retries = 0;
    const checkInterval = setInterval(() => {
        retries++;
        if (window.tf && window.mobilenet) {
            clearInterval(checkInterval);
            mobilenet.load().then(model => {
                tfModel = model;
                showAIStatus("Inteligencia Artificial lista para escanear. ✨", "success");
            }).catch(err => {
                console.error("Error al cargar MobileNet:", err);
                showAIStatus("Modo manual activo.", "info");
            });
        } else if (retries >= 6) { // máximo 3 segundos de espera
            clearInterval(checkInterval);
            showAIStatus("Modo catalogación manual listo. ✨", "info");
        }
    }, 500);
}

function showAIStatus(msg, type = "info") {
    const statusMsg = document.getElementById("aiStatusMsg");
    if (!statusMsg) return;
    statusMsg.textContent = msg;
    if (type === "success") {
        statusMsg.style.color = "var(--success)";
    } else if (type === "error") {
        statusMsg.style.color = "var(--danger)";
    } else if (type === "loading") {
        statusMsg.style.color = "var(--primary)";
    } else {
        statusMsg.style.color = "var(--text-muted)";
    }
}

// ==========================================
// 4. CARGA DE IMÁGENES Y ANÁLISIS IA
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

    // EVENTOS FOTO PRINCIPAL
    if (uploadArea && fileInput) {
        uploadArea.addEventListener("click", (e) => {
            if (e.target !== btnRemove && !btnRemove?.contains(e.target)) {
                fileInput.click();
            }
        });

        if (btnPickMain) {
            btnPickMain.addEventListener("click", (e) => {
                e.stopPropagation();
                fileInput.click();
            });
        }

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
            if (e.dataTransfer.files.length > 0) {
                procesarImagenPrincipal(e.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                procesarImagenPrincipal(e.target.files[0]);
            }
        });

        if (btnRemove) {
            btnRemove.addEventListener("click", (e) => {
                e.stopPropagation();
                fileInput.value = "";
                previewContainer.style.display = "none";
                imagePreview.src = "";
                currentUploadedImageBase64 = "";
                uploadPrompt.style.display = "block";
                if (btnPickMain) btnPickMain.style.display = "inline-block";
                showAIStatus("Foto principal removida.", "info");
            });
        }
    }

    function procesarImagenPrincipal(file) {
        if (!file || !file.type.startsWith("image/")) {
            alert("Por favor, selecciona un archivo de imagen válido (JPEG, PNG, WEBP).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            currentUploadedImageBase64 = e.target.result;
            imagePreview.src = currentUploadedImageBase64;
            previewContainer.style.display = "flex";
            uploadPrompt.style.display = "none";
            if (btnPickMain) btnPickMain.style.display = "none";

            // Lanzar animación de escaneo e IA
            ejecutarAnalisisIA(file.name);
        };
        reader.readAsDataURL(file);
    }

    // EVENTOS SEGUNDA FOTO
    if (uploadAreaSecond && fileInputSecond) {
        uploadAreaSecond.addEventListener("click", (e) => {
            if (e.target !== btnRemoveSecond && !btnRemoveSecond?.contains(e.target)) {
                fileInputSecond.click();
            }
        });

        if (btnPickSecond) {
            btnPickSecond.addEventListener("click", (e) => {
                e.stopPropagation();
                fileInputSecond.click();
            });
        }

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
            if (e.dataTransfer.files.length > 0) {
                procesarSegundaImagen(e.dataTransfer.files[0]);
            }
        });

        fileInputSecond.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                procesarSegundaImagen(e.target.files[0]);
            }
        });

        if (btnRemoveSecond) {
            btnRemoveSecond.addEventListener("click", (e) => {
                e.stopPropagation();
                fileInputSecond.value = "";
                previewContainerSecond.style.display = "none";
                imagePreviewSecond.src = "";
                currentSecondUploadedImageBase64 = "";
                uploadPromptSecond.style.display = "block";
                if (btnPickSecond) btnPickSecond.style.display = "inline-block";
            });
        }
    }

    function procesarSegundaImagen(file) {
        if (!file || !file.type.startsWith("image/")) {
            alert("Por favor, selecciona una imagen válida para la segunda foto.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            currentSecondUploadedImageBase64 = e.target.result;
            imagePreviewSecond.src = currentSecondUploadedImageBase64;
            previewContainerSecond.style.display = "flex";
            uploadPromptSecond.style.display = "none";
            if (btnPickSecond) btnPickSecond.style.display = "none";
        };
        reader.readAsDataURL(file);
    }
}

// ==========================================
// 5. ESCANEO Y CLASIFICACIÓN CON INTELIGENCIA ARTIFICIAL
// ==========================================
let scanTimeline = null;

function ejecutarAnalisisIA(filename) {
    const scanOverlay = document.getElementById("scanOverlay");
    const scanLine = document.getElementById("scanLine");
    const imgEl = document.getElementById("imagePreview");

    // Iniciar animación de escaneo láser (GSAP)
    scanOverlay.style.display = "block";
    if (scanTimeline) scanTimeline.kill();
    scanTimeline = gsap.timeline({ repeat: -1 });
    scanTimeline.fromTo(scanLine, { top: "0%" }, { top: "100%", duration: 1.2, ease: "power1.inOut" })
                .to(scanLine, { top: "0%", duration: 1.2, ease: "power1.inOut" });

    showAIStatus("Escaneando e identificando el producto con IA...", "loading");

    // 1. Aplicamos heurística basada en el nombre del archivo primero (muy rápida y precisa para nombres conocidos)
    const heuristica = analizarHeuristicaFilename(filename);

    // 2. Ejecutar clasificación TensorFlow.js en paralelo (con delay sutil para mejorar la sensación de escaneo/UX)
    setTimeout(async () => {
        let clasificacionIA = null;
        if (tfModel && imgEl) {
            try {
                const predictions = await tfModel.classify(imgEl);
                console.log("Predicciones de TensorFlow.js:", predictions);
                clasificacionIA = procesarPrediccionesIA(predictions);
            } catch (err) {
                console.error("Error clasificando con TensorFlow:", err);
            }
        }

        // Combinamos la heurística y la clasificación por modelo
        const resultadoFinal = clasificacionIA || heuristica || { category: "", title: "", confidence: 0 };

        // Detener animación de escaneo
        gsap.to(scanOverlay, {
            opacity: 0,
            duration: 0.3,
            onComplete: () => {
                scanOverlay.style.display = "none";
                scanOverlay.style.opacity = 1;
                if (scanTimeline) scanTimeline.kill();
            }
        });

        // Rellenar formulario automáticamente si se detectó algo
        if (resultadoFinal.category) {
            document.getElementById("prodCategory").value = resultadoFinal.category;
            document.getElementById("prodTitle").value = resultadoFinal.title;
            
            showAIStatus(`¡Producto detectado! Es un(a) "${resultadoFinal.title}" en la categoría "${resultadoFinal.category.toUpperCase()}"`, "success");
            
            // Animación de feedback para indicar que se llenaron los campos
            gsap.fromTo("#prodTitle, #prodCategory", 
                { backgroundColor: "rgba(37, 211, 102, 0.1)" }, 
                { backgroundColor: "var(--bg-main)", duration: 1.2 }
            );
        } else {
            showAIStatus("No se pudo identificar automáticamente. Por favor ingresa los datos a mano.", "info");
        }
    }, 1800);
}

// Analizador heurístico rápido de nombres de archivo
function analizarHeuristicaFilename(filename) {
    const fn = filename.toLowerCase();
    
    if (fn.includes("labial") || fn.includes("brillo") || fn.includes("gloss") || fn.includes("lip") || fn.includes("tinta") || fn.includes("vinyl") || fn.includes("rouge")) {
        return { category: "labios", title: "Lip Gloss / Labial Premium" };
    }
    if (fn.includes("base") || fn.includes("polvo") || fn.includes("compacto") || fn.includes("corrector") || fn.includes("suede") || fn.includes("matte")) {
        return { category: "rostro", title: "Base de Maquillaje Matte" };
    }
    if (fn.includes("blush") || fn.includes("rubor") || fn.includes("velvet") || fn.includes("iluminador")) {
        return { category: "rostro", title: "Blush Compacto" };
    }
    if (fn.includes("ceja") || fn.includes("pestaña") || fn.includes("mascara") || fn.includes("delineador") || fn.includes("lapiz") || fn.includes("ojo") || fn.includes("gel")) {
        // Diferenciar si es delineador o máscara
        if (fn.includes("lapiz") || fn.includes("pencil")) {
            return { category: "ojos", title: "Lápiz para Cejas / Ojos" };
        }
        if (fn.includes("gel")) {
            return { category: "ojos", title: "Gel de Cejas" };
        }
        return { category: "ojos", title: "Máscara de Pestañas" };
    }
    if (fn.includes("pinza") || fn.includes("guante") || fn.includes("gorro") || fn.includes("borla") || fn.includes("esponja") || fn.includes("brocha") || fn.includes("accesorio")) {
        if (fn.includes("guante") || fn.includes("glove")) {
            return { category: "accesorios", title: "Guantes Exfoliantes" };
        }
        if (fn.includes("pinza")) {
            return { category: "accesorios", title: "Pinza de Cabello" };
        }
        if (fn.includes("brocha") || fn.includes("brush")) {
            return { category: "accesorios", title: "Kit de Brochas Profesionales" };
        }
        if (fn.includes("esponja") || fn.includes("sponge")) {
            return { category: "accesorios", title: "Esponja de Maquillaje" };
        }
        return { category: "accesorios", title: "Accesorio de Belleza" };
    }
    return null;
}

// Procesamiento de las etiquetas de MobileNet
function procesarPrediccionesIA(predictions) {
    // Tomamos la primera predicción con mayor confianza
    const top = predictions[0];
    if (!top || top.probability < 0.1) return null;

    const className = top.className.toLowerCase();
    
    // Lipstick
    if (className.includes("lipstick") || className.includes("lip rouge") || className.includes("makeup") && className.includes("lip")) {
        return { category: "labios", title: "Lip Gloss / Labial Premium" };
    }
    // Hairpin / Hair slide / Accessories
    if (className.includes("hair slide") || className.includes("hairpin") || className.includes("pin") || className.includes("barrette")) {
        return { category: "accesorios", title: "Pinza Premium" };
    }
    // Glove / Mittens
    if (className.includes("glove") || className.includes("mitten") || className.includes("hand wear")) {
        return { category: "accesorios", title: "Guantes Exfoliantes" };
    }
    // Brush
    if (className.includes("brush") || className.includes("paint brush") || className.includes("toothbrush")) {
        return { category: "accesorios", title: "Kit de Brochas Profesionales" };
    }
    // Sponge
    if (className.includes("sponge")) {
        return { category: "accesorios", title: "Esponja de Maquillaje" };
    }
    // Lotion / Face powder / Perfume / Cosmetic container
    if (className.includes("powder") || className.includes("lotion") || className.includes("sunscreen") || className.includes("cream") || className.includes("perfume") || className.includes("cosmetic")) {
        if (className.includes("powder")) {
            return { category: "rostro", title: "Polvo Compacto Premium" };
        }
        return { category: "rostro", title: "Base de Maquillaje Matte" };
    }
    // Mascara / Eyeliner (Sometimes predicted as office supplies, writing utensils or makeup)
    if (className.includes("mascara") || className.includes("pencil") || className.includes("fountain pen") || className.includes("ballpoint")) {
        return { category: "ojos", title: "Lápiz / Máscara de Ojos" };
    }

    return null;
}

// ==========================================
// 6. CARGA Y GESTIÓN DEL CATÁLOGO
// ==========================================
async function loadCatalog() {
    const listContainer = document.getElementById("catalogList");
    if (!listContainer) return;

    listContainer.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);">Cargando catálogo...</div>`;

    // Catálogo base hardcodeado (fallback para modo file:// sin servidor)
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

    // Combinar con localStorage (modo estático) o usar el JSON del servidor
    if (!serverSyncActive) {
        catalogoCompleto = dbOrig.filter(p => !localDeletedIds.includes(p.id));
        catalogoCompleto = [...catalogoCompleto, ...localAddedProducts];
    } else {
        catalogoCompleto = dbOrig;
    }

    renderCatalogList();
}


// Estado del creador de tonos
let currentToneObjects = [];

// Diccionario de colores automáticos para nombres de tonos de maquillaje
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
    if (!name) return "#EC1C80";
    const lower = name.toLowerCase().trim();
    
    // Buscar coincidencia directa por palabra clave
    for (const [key, hex] of Object.entries(DIC_COLORES_TONOS)) {
        if (lower.includes(key)) {
            return hex;
        }
    }

    // Fallback determinístico suave
    let hash = 0;
    for (let i = 0; i < lower.length; i++) {
        hash = lower.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return hslToHex(hue, 65, 62);
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

let userManuallySelectedColor = false;

function setupToneBuilder() {
    const btnAdd = document.getElementById("btnAddToneChip");
    const nameInput = document.getElementById("newToneName");
    const colorInput = document.getElementById("newToneColor");
    const chipsContainer = document.getElementById("toneChipsList");

    if (!btnAdd || !nameInput || !colorInput || !chipsContainer) return;

    // Si el usuario toca o cambia la paleta de colores manualmente, recordar su elección
    colorInput.addEventListener("input", () => {
        userManuallySelectedColor = true;
    });

    colorInput.addEventListener("change", () => {
        userManuallySelectedColor = true;
    });

    // Al escribir el nombre del tono, auto-detectar solo si el usuario no eligió un color manualmente
    nameInput.addEventListener("input", () => {
        const val = nameInput.value.trim();
        if (val.length > 0 && !userManuallySelectedColor) {
            const detectedColor = autoDetectToneColor(val);
            colorInput.value = detectedColor;
        }
    });

    // Permitir agregar el tono al presionar Enter en la caja de texto
    nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            btnAdd.click();
        }
    });

    btnAdd.addEventListener("click", () => {
        const name = nameInput.value.trim();
        const color = colorInput.value || autoDetectToneColor(name);
        if (!name) return;

        currentToneObjects.push({ name, color });
        nameInput.value = "";
        colorInput.value = "#EC1C80";
        userManuallySelectedColor = false;
        renderToneChips();
    });
}

function renderToneChips() {
    const chipsContainer = document.getElementById("toneChipsList");
    const hiddenTones = document.getElementById("prodTones");
    if (!chipsContainer) return;

    chipsContainer.innerHTML = "";

    currentToneObjects.forEach((t, index) => {
        const chip = document.createElement("div");
        chip.className = "tone-chip-item";
        chip.innerHTML = `
            <span class="tone-chip-color" style="background: ${t.color}"></span>
            <span>${t.name}</span>
            <button type="button" class="tone-chip-remove" data-index="${index}">&times;</button>
        `;
        chipsContainer.appendChild(chip);
    });

    chipsContainer.querySelectorAll(".tone-chip-remove").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(e.target.dataset.index);
            currentToneObjects.splice(idx, 1);
            renderToneChips();
        });
    });

    if (hiddenTones) {
        hiddenTones.value = currentToneObjects.map(t => t.name).join(", ");
    }
}

function renderCatalogList(filtrados = null) {
    const listContainer = document.getElementById("catalogList");
    const searchCatalogInput = document.getElementById("searchCatalogInput");
    if (!listContainer) return;

    // Actualizar Widget de Estadísticas de Inventario
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

    // Ordenar por ID descendente para ver los últimos agregados primero
    const ordenados = [...items].sort((a, b) => b.id - a.id);

    ordenados.forEach(prod => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "catalog-item";

        // Determinar badge de inventario
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
                <div class="item-price">$${prod.price.toFixed(2)}</div>
            </div>
            <div class="item-actions">
                <button class="btn-edit" data-id="${prod.id}" title="Editar producto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Editar
                </button>
                <button class="btn-delete" data-id="${prod.id}" title="Eliminar producto">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    Borrar
                </button>
            </div>
        `;

        listContainer.appendChild(itemDiv);
    });

    // Eventos de editar
    listContainer.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            cargarProductoParaEditar(id);
        });
    });

    // Eventos de eliminar
    listContainer.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            const nombreProd = btn.closest(".catalog-item")?.querySelector(".item-title")?.textContent || "este producto";
            if (confirm(`¿Eliminar "${nombreProd}" del catálogo?\n\nEsta acción se puede deshacer volviendo a agregar el producto.`)) {
                eliminarProducto(id);
            }
        });
    });

    // Buscador
    if (searchCatalogInput && !searchCatalogInput.dataset.listened) {
        searchCatalogInput.dataset.listened = "true";
        searchCatalogInput.addEventListener("input", (e) => {
            const q = e.target.value.toLowerCase().trim();
            if (q === "") {
                renderCatalogList();
            } else {
                const filtrados = catalogoCompleto.filter(p => 
                    p.title.toLowerCase().includes(q) || 
                    p.category.toLowerCase().includes(q)
                );
                renderCatalogList(filtrados);
            }
        });
    }
}

// Cargar producto existente en el formulario para editar
function cargarProductoParaEditar(id) {
    const prod = catalogoCompleto.find(p => p.id === id);
    if (!prod) return;

    document.getElementById("editProdId").value = prod.id;
    document.getElementById("prodTitle").value = prod.title || "";
    document.getElementById("prodPrice").value = prod.price || 0;
    document.getElementById("prodCategory").value = prod.category || "labios";
    document.getElementById("prodStock").value = typeof prod.stock === "number" ? prod.stock : 1;
    document.getElementById("prodBadge").value = prod.badge || "";
    
    // Cargar fotos adicionales de forma segura sin lanzar errores
    const extraInput = document.getElementById("prodExtraImages");
    if (extraInput) {
        extraInput.value = (prod.images && Array.isArray(prod.images)) ? prod.images.join(", ") : "";
    }

    // Cargar tonos y dibujar chips visuales de los tonos actuales
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

    // Cargar vista previa de Foto Principal
    const imagePreview = document.getElementById("imagePreview");
    const previewContainer = document.getElementById("previewContainer");
    const uploadPrompt = document.getElementById("uploadPrompt");
    const btnPickMain = document.getElementById("btnPickMainImage");

    if (prod.img) {
        currentUploadedImageBase64 = prod.img;
        imagePreview.src = prod.img;
        previewContainer.style.display = "flex";
        uploadPrompt.style.display = "none";
        if (btnPickMain) btnPickMain.style.display = "none";
    }

    // Cargar vista previa de Segunda Foto
    const imagePreviewSecond = document.getElementById("imagePreviewSecond");
    const previewContainerSecond = document.getElementById("previewContainerSecond");
    const uploadPromptSecond = document.getElementById("uploadPromptSecond");
    const btnPickSecond = document.getElementById("btnPickSecondImage");

    if (prod.images && prod.images.length > 0 && prod.images[0]) {
        currentSecondUploadedImageBase64 = prod.images[0];
        if (imagePreviewSecond) imagePreviewSecond.src = prod.images[0];
        if (previewContainerSecond) previewContainerSecond.style.display = "flex";
        if (uploadPromptSecond) uploadPromptSecond.style.display = "none";
        if (btnPickSecond) btnPickSecond.style.display = "none";
    } else {
        currentSecondUploadedImageBase64 = "";
        if (previewContainerSecond) previewContainerSecond.style.display = "none";
        if (uploadPromptSecond) uploadPromptSecond.style.display = "block";
        if (btnPickSecond) btnPickSecond.style.display = "inline-block";
    }

    // Cambiar UI a modo edición
    document.getElementById("stepBadgeText").textContent = `✏️ Modificando Producto #${prod.id}`;
    document.getElementById("btnSubmitForm").textContent = "Actualizar Producto ✨";
    document.getElementById("btnCancelEdit").style.display = "inline-flex";

    // Scroll suave al formulario
    document.querySelector(".studio-panel").scrollIntoView({ behavior: "smooth" });
}

function cancelarEdicion() {
    document.getElementById("productForm").reset();
    document.getElementById("editProdId").value = "";
    document.getElementById("stepBadgeText").textContent = "02 · Detalles del Producto";
    document.getElementById("btnSubmitForm").textContent = "Guardar Producto ✨";
    document.getElementById("btnCancelEdit").style.display = "none";
    currentUploadedImageBase64 = "";
    currentSecondUploadedImageBase64 = "";
    currentToneObjects = [];
    renderToneChips();
    
    // Reset foto 1
    const previewContainer = document.getElementById("previewContainer");
    const uploadPrompt = document.getElementById("uploadPrompt");
    if (previewContainer && uploadPrompt) {
        previewContainer.style.display = "none";
        uploadPrompt.style.display = "block";
    }

    // Reset foto 2
    const previewContainerSecond = document.getElementById("previewContainerSecond");
    const uploadPromptSecond = document.getElementById("uploadPromptSecond");
    if (previewContainerSecond && uploadPromptSecond) {
        previewContainerSecond.style.display = "none";
        uploadPromptSecond.style.display = "block";
    }
}

// ==========================================
// 7. AÑADIR / ELIMINAR / EDITAR PRODUCTOS
// ==========================================
function setupProductForm() {
    setupToneBuilder();

    const form = document.getElementById("productForm");
    const btnCancel = document.getElementById("btnCancelEdit");

    if (btnCancel) {
        btnCancel.addEventListener("click", cancelarEdicion);
    }

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const editIdVal = document.getElementById("editProdId").value;
        const isEditing = Boolean(editIdVal);
        const editId = isEditing ? parseInt(editIdVal) : null;

        const title = document.getElementById("prodTitle").value.trim();
        const price = parseFloat(document.getElementById("prodPrice").value);
        const category = document.getElementById("prodCategory").value;
        const stockRaw = document.getElementById("prodStock").value;
        const stock = (stockRaw !== "" && !isNaN(parseInt(stockRaw))) ? parseInt(stockRaw) : 0;
        const badge = document.getElementById("prodBadge").value || "";
        const extraImgsVal = document.getElementById("prodExtraImages") ? document.getElementById("prodExtraImages").value.trim() : "";
        let extraImages = extraImgsVal ? extraImgsVal.split(",").map(s => s.trim()).filter(Boolean) : [];

        const tonesStr = currentToneObjects.map(t => t.name).join(", ");

        // Comprimir Foto 1 a Alta Nitidez (HD 1200px)
        let imgFinal = "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400";
        if (currentUploadedImageBase64) {
            try {
                imgFinal = await comprimirImagen(currentUploadedImageBase64, 1200);
            } catch(e) {
                imgFinal = currentUploadedImageBase64;
            }
        }

        // Comprimir Foto 2 a Alta Nitidez (HD 1200px)
        if (currentSecondUploadedImageBase64) {
            let imgSecondFinal = currentSecondUploadedImageBase64;
            try {
                imgSecondFinal = await comprimirImagen(currentSecondUploadedImageBase64, 1200);
            } catch(e) {
                imgSecondFinal = currentSecondUploadedImageBase64;
            }
            // Asegurar que la 2da foto esté en primer lugar del arreglo de imágenes
            extraImages = [imgSecondFinal, ...extraImages.filter(img => img !== imgSecondFinal)];
        }

        if (isEditing) {
            // EDITAR PRODUCTO EXISTENTE
            const prodIndex = catalogoCompleto.findIndex(p => p.id === editId);
            if (prodIndex !== -1) {
                const prodExistente = catalogoCompleto[prodIndex];
                const prodActualizado = {
                    ...prodExistente,
                    title: title,
                    price: price,
                    category: category,
                    img: currentUploadedImageBase64 ? imgFinal : prodExistente.img,
                    images: extraImages.length > 0 ? extraImages : prodExistente.images,
                    stock: stock,
                    badge: badge,
                    tones: tonesStr,
                    toneObjects: currentToneObjects
                };

                if (serverSyncActive) {
                    catalogoCompleto[prodIndex] = prodActualizado;
                    const guardado = await guardarEnServidor(catalogoCompleto);
                    if (guardado) {
                        mostrarNotificacion(`Producto "${title}" actualizado en el servidor. ✓`);
                        cancelarEdicion();
                        loadCatalog();
                    } else {
                        alert("No se pudo guardar la actualización en el servidor.");
                    }
                } else {
                    // Modo estático (localStorage)
                    catalogoCompleto[prodIndex] = prodActualizado;
                    // Si estaba en añadidos locales, actualizarlo
                    const localIdx = localAddedProducts.findIndex(p => p.id === editId);
                    if (localIdx !== -1) {
                        localAddedProducts[localIdx] = prodActualizado;
                    } else {
                        localAddedProducts.push(prodActualizado);
                    }
                    localStorage.setItem('KARA_ADMIN_ADDED', JSON.stringify(localAddedProducts));
                    mostrarNotificacion(`Producto "${title}" actualizado localmente. ✓`);
                    cancelarEdicion();
                    loadCatalog();
                }
            }
        } else {
            // CREAR NUEVO PRODUCTO
            const baseMaxId = Math.max(
                catalogoCompleto.reduce((max, p) => p.id > max ? p.id : max, 0),
                1000
            );
            const newId = baseMaxId + 1;

            const nuevoProducto = {
                id: newId,
                title: title,
                price: price,
                category: category,
                img: imgFinal,
                images: extraImages,
                stock: stock,
                badge: badge,
                tones: tonesStr,
                toneObjects: currentToneObjects
            };

            if (serverSyncActive) {
                catalogoCompleto.push(nuevoProducto);
                const guardado = await guardarEnServidor(catalogoCompleto);
                if (guardado) {
                    mostrarNotificacion("Producto creado permanentemente. ✓");
                    cancelarEdicion();
                    loadCatalog();
                } else {
                    catalogoCompleto.pop();
                    alert("Hubo un error al guardar el producto en el servidor.");
                }
            } else {
                // Modo estático (localStorage)
                localAddedProducts.push(nuevoProducto);
                try {
                    localStorage.setItem('KARA_ADMIN_ADDED', JSON.stringify(localAddedProducts));
                } catch(e) {
                    nuevoProducto.img = "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400";
                    localAddedProducts[localAddedProducts.length - 1] = nuevoProducto;
                    localStorage.setItem('KARA_ADMIN_ADDED', JSON.stringify(localAddedProducts));
                    mostrarNotificacion("⚠️ Imagen no guardada (almacenamiento lleno). Producto agregado sin foto.");
                }

                localDeletedIds = localDeletedIds.filter(id => id !== newId);
                localStorage.setItem('KARA_ADMIN_DELETED', JSON.stringify(localDeletedIds));

                mostrarNotificacion("Producto creado. ✓ — Ya aparece en la tienda y catálogo.");
                cancelarEdicion();
                loadCatalog();
            }
        }
    });
}

// Comprime una imagen base64 con alta nitidez (HD 1200px)
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

async function eliminarProducto(id) {
    if (serverSyncActive) {
        const nuevoCatalogo = catalogoCompleto.filter(p => p.id !== id);
        const guardado = await guardarEnServidor(nuevoCatalogo);
        if (guardado) {
            mostrarNotificacion("Producto eliminado permanentemente. ✓");
            loadCatalog();
        } else {
            alert("No se pudo guardar la eliminación en el servidor.");
        }
    } else {
        // Buscar si estaba en añadidos locales
        const esLocal = localAddedProducts.some(p => p.id === id);
        if (esLocal) {
            localAddedProducts = localAddedProducts.filter(p => p.id !== id);
            localStorage.setItem('KARA_ADMIN_ADDED', JSON.stringify(localAddedProducts));
        } else {
            // Si es de los originales, registrar su ID como borrado
            if (!localDeletedIds.includes(id)) {
                localDeletedIds.push(id);
                localStorage.setItem('KARA_ADMIN_DELETED', JSON.stringify(localDeletedIds));
            }
        }
        mostrarNotificacion("Producto eliminado localmente. ✓ (Exporta el JSON para sincronizar)");
        loadCatalog();
    }
}

// Guardar array en el servidor local
async function guardarEnServidor(lista) {
    try {
        const res = await fetch("/api/productos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(lista)
        });
        return res.ok;
    } catch (e) {
        console.error("Error en guardarEnServidor:", e);
        return false;
    }
}

// ==========================================
// 8. EXPORTACIÓN Y UTILIDADES
// ==========================================
function exportarJsonCompleto() {
    // Limpiamos los productos para que no tengan imágenes base64 gigantes en el archivo JSON
    // si el usuario prefiere subirlas en local. Si es base64, las guardará igual, pero es mejor avisar
    // que idealmente las imágenes sean relativas
    const catalogoExportable = catalogoCompleto.map(p => {
        // Si la imagen es base64, sugerimos cambiarla por una ruta limpia local
        let imgExport = p.img;
        if (imgExport.startsWith("data:image/")) {
            // Sugerir nombre corto como "assets/images/nuevo-producto.jpeg"
            const extension = imgExport.substring("data:image/".length, imgExport.indexOf(";base64"));
            const safeTitle = p.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
            imgExport = `assets/images/${safeTitle}.${extension}`;
        }
        return {
            id: p.id,
            title: p.title,
            price: p.price,
            category: p.category,
            img: imgExport,
            stock: p.stock || 1,
            tones: p.tones || ""
        };
    });

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(catalogoExportable, null, 4));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "productos.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    mostrarNotificacion("Archivo productos.json listo. Guárdalo en la carpeta js/ 🥥");
}

function mostrarNotificacion(msg) {
    const toast = document.getElementById("notificationToast");
    const txt = document.getElementById("notificationText");
    if (!toast) return;

    txt.textContent = msg;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}
