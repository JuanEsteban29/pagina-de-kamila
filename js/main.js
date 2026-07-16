/**
 * KARA Makeup — Core Logic + GSAP ScrollTrigger Parallax
 * =========================================================
 */

// ==========================================
// 1. BASE DE DATOS DE PRODUCTOS (Desde Inventario final (1)_2.xlsx)
// ==========================================
const dbProductosFallback = [
    {
        id: 1,
        title: "Pinza para planchado",
        price: 0.80,
        category: "accesorios",
        img: "assets/images/pinza-planchado.jpeg",
        stock: 13,
        tones: ""
    },
    {
        id: 2,
        title: "Guantes exfoliante",
        price: 2.50,
        category: "accesorios",
        img: "assets/images/guantes.jpeg",
        stock: 1,
        tones: ""
    },
    {
        id: 3,
        title: "Blush Dolce Bella con brillo",
        price: 4.56,
        category: "rostro",
        img: "assets/images/blush brillo.jpeg",
        stock: 3,
        tones: ""
    },
    {
        id: 4,
        title: "Bases matte",
        price: 10.15,
        category: "rostro",
        img: "assets/images/base matte.jpeg",
        stock: 5,
        tones: "1 Carmel, 1 Vainilla, 1 Tam, 1 Nutmeg, 1 Golden"
    },
    {
        id: 5,
        title: "Máscaras de pestaña Dolce Bella Moradas",
        price: 4.56,
        category: "ojos",
        img: "assets/images/mascara.jpeg",
        stock: 4,
        tones: ""
    },
    {
        id: 6,
        title: "Máscara definición Dolce Bella Amarilla",
        price: 4.56,
        category: "ojos",
        img: "assets/images/mascara-amarilla.jpeg",
        stock: 1,
        tones: ""
    },
    {
        id: 7,
        title: "Gel de cejas Salome",
        price: 5.80,
        category: "ojos",
        img: "assets/images/GEL DE CEJA.jpeg",
        stock: 2,
        tones: ""
    },
    {
        id: 8,
        title: "Gorros de satín",
        price: 7.00,
        category: "accesorios",
        img: "assets/images/gorros.jpeg",
        stock: 3,
        tones: ""
    },
    {
        id: 9,
        title: "Polvo compacto Dolce Bella",
        price: 5.60,
        category: "rostro",
        img: "assets/images/polvo.jpeg",
        stock: 1,
        tones: "N°10"
    },
    {
        id: 10,
        title: "Vinyl Lasting Dolce Bella",
        price: 5.60,
        category: "labios",
        img: "assets/images/vinyl.jpeg",
        stock: 2,
        tones: ""
    },
    {
        id: 11,
        title: "Juicy Flush Tinted Lip & Cheek",
        price: 5.80,
        category: "labios",
        img: "assets/images/tinta.jpeg",
        stock: 4,
        tones: "2 Poppy, 1 Lily, 1 Iris"
    },
    {
        id: 12,
        title: "Lipgloss Juicy Bomb",
        price: 3.00,
        category: "labios",
        img: "assets/images/brillo.jpeg",
        stock: 3,
        tones: ""
    },
    {
        id: 13,
        title: "Lápices para cejas negros",
        price: 2.00,
        category: "ojos",
        img: "assets/images/lapiz-negro.jpeg",
        stock: 3,
        tones: ""
    },
    {
        id: 14,
        title: "Lápices para cejas marrones",
        price: 2.00,
        category: "ojos",
        img: "assets/images/lapiz-marron.jpeg",
        stock: 2,
        tones: ""
    },
    {
        id: 15,
        title: "Polvo translúcido finishing powder",
        price: 5.60,
        category: "rostro",
        img: "assets/images/POLVO TRANSLUCIDO.jpeg",
        stock: 1,
        tones: ""
    },
    {
        id: 16,
        title: "Correctores",
        price: 5.20,
        category: "rostro",
        img: "assets/images/corrector.jpeg",
        stock: 8,
        tones: "1 Brown, 2 Honey, 2 Ivory, 2 Carmel, 1 Beige"
    },
    {
        id: 17,
        title: "Blush sencillos",
        price: 4.00,
        category: "rostro",
        img: "assets/images/BLUSH SENCILLOS.jpeg",
        stock: 3,
        tones: "Tono 07, 04, 11"
    },
    {
        id: 18,
        title: "Bases de borlas",
        price: 4.00,
        category: "accesorios",
        img: "assets/images/borlas.jpeg",
        stock: 2,
        tones: ""
    },
    {
        id: 19,
        title: "Esponja de maquillaje",
        price: 1.50,
        category: "accesorios",
        img: "assets/images/esponja.jpeg",
        stock: 1,
        tones: ""
    },
    {
        id: 20,
        title: "Pinza Hawaiana",
        price: 3.50,
        category: "accesorios",
        img: "assets/images/pinza-hawaiana.jpeg",
        stock: 1,
        tones: ""
    },
    {
        id: 21,
        title: "Lip Gloss Dolce Bella",
        price: 4.00,
        category: "labios",
        img: "assets/images/LIP GLOSS.jpeg",
        stock: 13,
        tones: "C02, D3, D4, D6, D5, 06, 04, D1, 01, 03"
    }
];

let dbProductos = [];

async function cargarProductosDB() {
    try {
        const res = await fetch("js/productos.json");
        if (res.ok) {
            dbProductos = await res.json();
        } else {
            throw new Error("No se pudo cargar el archivo");
        }
    } catch (e) {
        console.warn("CORS o JSON no disponible. Cargando catálogo por defecto:", e);
        dbProductos = [...dbProductosFallback];
    }

    // Cargar adiciones y eliminaciones locales hechas desde admin
    const localAdded = JSON.parse(localStorage.getItem('KARA_ADMIN_ADDED')) || [];
    const localDeleted = JSON.parse(localStorage.getItem('KARA_ADMIN_DELETED')) || [];

    // Filtrar los que fueron marcados como borrados
    dbProductos = dbProductos.filter(p => !localDeleted.includes(p.id));

    // Agregar los productos añadidos desde admin, resolviendo marcadores de imagen
    const localAddedResolved = localAdded.map(p => {
        let imgFinal = p.img;
        // Si la imagen es un marcador de sessionStorage, resolverla
        if (typeof imgFinal === "string" && imgFinal.startsWith("KARA_SESSIMG:")) {
            const imgId = imgFinal.replace("KARA_SESSIMG:", "");
            imgFinal = sessionStorage.getItem(`KARA_IMG_${imgId}`) || "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400";
        }
        return { ...p, img: imgFinal };
    });

    // Agregar los que fueron añadidos, evitando IDs duplicados
    // (los del admin tienen IDs >= 1001 por diseño, no deben colisionar)
    const idsExistentes = new Set(dbProductos.map(p => p.id));
    const addedSinDuplicar = localAddedResolved.filter(p => !idsExistentes.has(p.id));
    dbProductos = [...dbProductos, ...addedSinDuplicar];
}


// Estado global[cite: 6]
let carrito    = JSON.parse(localStorage.getItem('KARA_CART')) || []; //[cite: 6]
let favoritos  = JSON.parse(localStorage.getItem('KARA_FAVS')) || []; //[cite: 6]
let productosVisibles = 4; //[cite: 6]
const META_ENVIO_GRATIS = 15.00; //[cite: 6]

document.addEventListener("DOMContentLoaded", () => {
    initApp(); //[cite: 6]
});

async function initApp() {
    // Migración: limpiar productos admin con IDs <= 1000 que colisionan con el catálogo base
    migrarProductosAdminLegacy();
    await cargarProductosDB();
    renderProductos();
    actualizarInsignias();
    setupCoreEventListeners();
    setupServicesDropdown();
    setupCartPanelEvents();
    initGSAP();
}

// Limpia del localStorage cualquier producto del admin con ID <= 1000
// (IDs de versiones anteriores que colisionaban con el catálogo base de 21 productos)
function migrarProductosAdminLegacy() {
    try {
        const localAdded = JSON.parse(localStorage.getItem('KARA_ADMIN_ADDED')) || [];
        const sinDuplicados = localAdded.filter(p => p.id > 1000);
        if (sinDuplicados.length !== localAdded.length) {
            localStorage.setItem('KARA_ADMIN_ADDED', JSON.stringify(sinDuplicados));
            console.info(`[KARA] Migración: eliminados ${localAdded.length - sinDuplicados.length} productos con IDs legacy duplicados.`);
        }
    } catch(e) {
        console.warn("[KARA] Error en migración de legacy IDs:", e);
    }
}

// ==========================================
// 2. RENDERIZADO DINÁMICO DE PRODUCTOS
// ==========================================
function renderProductos(filtrados = null) {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;

    grid.innerHTML = "";
    // Usar dbProductos que fue cargado dinámicamente, con fallback
    const lista = filtrados || dbProductos.slice(0, productosVisibles);

    if (lista.length === 0) {
        grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted);">
            No se encontraron productos en esta sección.</p>`;
        return;
    }

    lista.forEach((prod, i) => {
        const isFav = favoritos.includes(prod.id);
        const card  = document.createElement("div");
        card.className = "product-card";
        card.style.setProperty('--card-index', i);

        const htmlTonos = prod.tones 
            ? `<div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px; line-height:1.2;"><strong>Tonos:</strong> ${prod.tones}</div>` 
            : '';

        card.innerHTML = `
            <div class="product-image-container">
                <img src="${prod.img}" alt="${prod.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400'">
                <button class="fav-card-btn ${isFav ? 'active' : ''}" data-id="${prod.id}" aria-label="Favorito">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                         fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>
            <div class="product-info">
                <span class="product-category">${prod.category.toUpperCase()}</span>
                <h3 class="product-title">${prod.title}</h3>
                ${htmlTonos}
                <span class="product-price">$${prod.price.toFixed(2)}</span>
                <button type="button" class="btn-huda-primary btn-add-cart" data-id="${prod.id}">
                    Añadir a la bolsa
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    if (window.gsap && window.ScrollTrigger) {
        animateProductCards();
    }
}

function setupCardHoverAnimations() {
    if (typeof gsap === "undefined") return;
    const cards = document.querySelectorAll(".product-card");
    cards.forEach(card => {
        const img = card.querySelector(".product-image-container img");
        const btn = card.querySelector(".btn-add-cart");
        card.addEventListener("mouseenter", () => {
            gsap.to(card, { y: -6, boxShadow: "0 20px 50px rgba(0,0,0,0.08)", duration: 0.4, ease: "power2.out" });
            if (img) gsap.to(img, { scale: 1.08, duration: 0.6, ease: "power2.out" });
            if (btn) gsap.to(btn, { backgroundColor: "transparent", color: "#000000", duration: 0.3, ease: "power2.out" });
        });
        card.addEventListener("mouseleave", () => {
            gsap.to(card, { y: 0, boxShadow: "none", duration: 0.4, ease: "power2.out" });
            if (img) gsap.to(img, { scale: 1, duration: 0.6, ease: "power2.out" });
            if (btn) gsap.to(btn, { backgroundColor: "#000000", color: "#ffffff", duration: 0.3, ease: "power2.out" });
        });
    });
}

// ==========================================
// 3. EVENTOS CORE
// ==========================================
function setupCoreEventListeners() {
    // Hamburguesa móvil
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const navMenu      = document.getElementById("navMenu");
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener("click", () => {
            hamburgerBtn.classList.toggle("active");
            navMenu.classList.toggle("active");
        });

        // Cerrar el menú móvil al hacer clic en cualquier enlace (UX impecable)
        navMenu.querySelectorAll(".nav-link").forEach(link => {
            link.addEventListener("click", () => {
                hamburgerBtn.classList.remove("active");
                navMenu.classList.remove("active");
            });
        });
    }

    // Delegación en grid de productos[cite: 6]
    const productsGrid = document.getElementById("productsGrid"); //[cite: 6]
    if (productsGrid) {
        productsGrid.addEventListener("click", (e) => {
            const btnAdd = e.target.closest(".btn-add-cart"); //[cite: 6]
            const btnFav = e.target.closest(".fav-card-btn"); //[cite: 6]

            if (btnAdd) {
                const id = parseInt(btnAdd.dataset.id); //[cite: 6]
                agregarAlCarrito(id); //[cite: 6]
                btnAdd.textContent = "Añadido ✓"; //[cite: 6]
                btnAdd.style.backgroundColor = "#25D366"; //[cite: 6]
                setTimeout(() => {
                    btnAdd.textContent = "Añadir a la bolsa"; //[cite: 6]
                    btnAdd.style.backgroundColor = "#1c1c1c"; //[cite: 6]
                }, 1200); //[cite: 6]
            }

            if (btnFav) {
                const id = parseInt(btnFav.dataset.id); //[cite: 6]
                toggleFavorito(id, btnFav); //[cite: 6]
            }
        });
    }

    // Ver más productos[cite: 6]
    const loadMoreBtn = document.getElementById("loadMoreBtn"); //[cite: 6]
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", (e) => {
            e.preventDefault(); //[cite: 6]
            productosVisibles = dbProductos.length; //[cite: 6]
            renderProductos(); //[cite: 6]
            loadMoreBtn.innerHTML = "<span>🌴 ¡Colección Completa!</span>"; //[cite: 6]
            loadMoreBtn.style.opacity = "0.6"; //[cite: 6]
            loadMoreBtn.style.pointerEvents = "none"; //[cite: 6]
        });
    }

    // Modales[cite: 6]
    setupModalEvents("favsToggle",       "favsModal",  "closeFavs",  actualizarVistaFavoritos); //[cite: 6]
    setupModalEvents("btnAbrirEncuesta", "quizModal",  "closeQuiz",  lanzarEncuestaDinamica); //[cite: 6]

    // Buscador[cite: 6]
    const searchToggle   = document.getElementById("searchToggle"); //[cite: 6]
    const searchDropdown = document.getElementById("searchDropdown"); //[cite: 6]
    const searchInput    = document.getElementById("searchInput"); //[cite: 6]

    if (searchToggle && searchDropdown && searchInput) {
        searchToggle.addEventListener("click", (e) => {
            e.stopPropagation(); //[cite: 6]
            searchDropdown.classList.toggle("active"); //[cite: 6]
            if (searchDropdown.classList.contains("active")) searchInput.focus(); //[cite: 6]
        });

        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim(); //[cite: 6]
            if (query === "") {
                renderProductos(); //[cite: 6]
            } else {
                const filtrados = dbProductos.filter(p =>
                    p.title.toLowerCase().includes(query) ||
                    p.category.toLowerCase().includes(query)
                ); //[cite: 6]
                renderProductos(filtrados); //[cite: 6]
            }
        });
    }

    // Filtrado por categoría[cite: 6]
    document.querySelectorAll(".category-card").forEach(card => {
        card.addEventListener("click", () => {
            const cat = card.dataset.category; //[cite: 6]
            const filtrados = dbProductos.filter(p =>
                p.category.toLowerCase() === cat.toLowerCase()
            ); //[cite: 6]
            renderProductos(filtrados); //[cite: 6]
            document.getElementById("productos").scrollIntoView({ behavior: "smooth" }); //[cite: 6]
        });
    });

    // WhatsApp checkout[cite: 6]
    const checkoutBtn = document.getElementById("checkoutBtn"); //[cite: 6]
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", () => {
            if (carrito.length === 0) {
                alert("Tu carrito playero está vacío."); //[cite: 6]
                return; //[cite: 6]
            }
            let msg = "¡Hola KARA! 🌴 Quiero proceder con la compra de mi pedido:\n\n"; //[cite: 6]
            let total = 0; //[cite: 6]
            carrito.forEach(item => {
                const detTono = item.selectedTone ? ` (Tono: ${item.selectedTone})` : "";
                msg += `• ${item.title}${detTono} (x${item.cantidad}) - $${(item.price * item.cantidad).toFixed(2)}\n`;
                total += item.price * item.cantidad; //[cite: 6]
            });
            if (total >= META_ENVIO_GRATIS) msg += `\n¡Envío Gratis Garantizado! 🥥`; //[cite: 6]
            msg += `\nTotal Neto: $${total.toFixed(2)}`; //[cite: 6]
            window.open("https://wa.me/584122665492?text=" + encodeURIComponent(msg), "_blank"); //[cite: 6]
        });
    }
}

// ==========================================
// 4. PANEL LATERAL DEL CARRITO
// ==========================================
function setupCartPanelEvents() {
    const cartToggle = document.getElementById("cartToggle"); //[cite: 6]
    const cartModal  = document.getElementById("cartModal"); //[cite: 6]
    const closeCart  = document.getElementById("closeCart"); //[cite: 6]

    if (cartToggle && cartModal && closeCart) {
        cartToggle.addEventListener("click", (e) => {
            e.preventDefault(); //[cite: 6]
            cartModal.classList.add("open-panel"); //[cite: 6]
            actualizarVistaCarrito(); //[cite: 6]
        });
        closeCart.addEventListener("click", () => cartModal.classList.remove("open-panel")); //[cite: 6]
        cartModal.addEventListener("click", (e) => {
            if (e.target === cartModal) cartModal.classList.remove("open-panel"); //[cite: 6]
        });
    }
}

// ==========================================
// 5. ACORDEÓN DE SERVICIOS
// ==========================================
function setupServicesDropdown() {
    const wrapper      = document.getElementById("servicesWrapper"); //[cite: 6]
    const toggleBtn    = document.getElementById("serviciosToggle"); //[cite: 6]
    const dropdownMenu = document.getElementById("servicesDropdown"); //[cite: 6]
    if (!toggleBtn || !dropdownMenu) return; //[cite: 6]

    toggleBtn.addEventListener("click", (e) => {
        e.preventDefault(); //[cite: 6]
        e.stopPropagation(); //[cite: 6]
        wrapper.classList.toggle("active"); //[cite: 6]
    });

    dropdownMenu.addEventListener("click", (e) => e.stopPropagation()); //[cite: 6]
    document.addEventListener("click", () => {
        wrapper.classList.remove("active"); //[cite: 6]
        cerrarTodosLosAcordeones(); //[cite: 6]
    });

    const togglesAcordeon = dropdownMenu.querySelectorAll(".accordion-toggle"); //[cite: 6]
    togglesAcordeon.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault(); //[cite: 6]
            e.stopPropagation(); //[cite: 6]
            const itemPadre = btn.closest(".dropdown-accordion-item"); //[cite: 6]
            const estaActivo = itemPadre.classList.contains("active"); //[cite: 6]
            cerrarTodosLosAcordeones(); //[cite: 6]
            if (!estaActivo) itemPadre.classList.add("active"); //[cite: 6]
        });
    });

    dropdownMenu.querySelectorAll(".btn-reserva-servicio").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault(); //[cite: 6]
            const modelo = btn.getAttribute("data-service"); //[cite: 6]
            const nombre = modelo === "dia"
                ? "Maquillaje de Día (Sunset Glow)"
                : "Maquillaje de Noche (Tropical Night)"; //[cite: 6]
            const msg = `¡Hola KARA! 🌴 Me encantaría reservar una cita para el estilo de *${nombre}*. ¿Cuáles son tus próximas fechas disponibles?`; //[cite: 6]
            const textoOriginal = btn.textContent; //[cite: 6]
            btn.textContent = "Abriendo... 🌴"; //[cite: 6]
            btn.style.backgroundColor = "#25D366"; //[cite: 6]
            btn.style.color = "#ffffff"; //[cite: 6]
            window.open("https://wa.me/584122665492?text=" + encodeURIComponent(msg), "_blank"); //[cite: 6]
            setTimeout(() => {
                btn.textContent = textoOriginal; //[cite: 6]
                btn.style.backgroundColor = ""; //[cite: 6]
                btn.style.color = ""; //[cite: 6]
                wrapper.classList.remove("active"); //[cite: 6]
                cerrarTodosLosAcordeones(); //[cite: 6]
            }, 1000); //[cite: 6]
        });
    });

    const btnAgendar = document.getElementById("btnAgendarMaquilladora"); //[cite: 6]
    if (btnAgendar) {
        btnAgendar.addEventListener("click", (e) => {
            e.preventDefault(); //[cite: 6]
            const msg = "¡Hola KARA! Me gustaría solicitar información para agendar una Maquilladora Profesional a domicilio."; //[cite: 6]
            const contenidoOriginal = btnAgendar.innerHTML; //[cite: 6]
            btnAgendar.innerHTML = "<span>💬</span> Abriendo WhatsApp..."; //[cite: 6]
            btnAgendar.style.color = "#25D366"; //[cite: 6]
            window.open("https://wa.me/584122665492?text=" + encodeURIComponent(msg), "_blank"); //[cite: 6]
            setTimeout(() => {
                btnAgendar.innerHTML = contenidoOriginal; //[cite: 6]
                btnAgendar.style.color = ""; //[cite: 6]
                wrapper.classList.remove("active"); //[cite: 6]
            }, 1000); //[cite: 6]
        });
    }

    function cerrarTodosLosAcordeones() {
        dropdownMenu.querySelectorAll(".dropdown-accordion-item").forEach(item => {
            item.classList.remove("active"); //[cite: 6]
        });
    }
}

// ==========================================
// 6. CARRITO, FAVORITOS E INSIGNIAS
// ==========================================
function agregarAlCarrito(id) {
    const prod = dbProductos.find(p => p.id === id); //[cite: 6]
    if (!prod) return; //[cite: 6]
    
    // Preguntar tono de manera sencilla si el producto posee variantes[cite: 4]
    let tonoSeleccionado = "";
    if (prod.tones) {
        tonoSeleccionado = prompt(`Selecciona una variante/tono para ${prod.title}:\n(${prod.tones})`);
        if (tonoSeleccionado === null) return; // Cancelar acción si cierra la ventana
    }

    const existe = carrito.find(item => item.id === id && item.selectedTone === tonoSeleccionado); //[cite: 6]
    if (existe) {
        existe.cantidad += 1; //[cite: 6]
    } else {
        carrito.push({ ...prod, cantidad: 1, selectedTone: tonoSeleccionado }); //[cite: 6]
    }
    localStorage.setItem('KARA_CART', JSON.stringify(carrito)); //[cite: 6]
    actualizarInsignias(); //[cite: 6]
    const cartModal = document.getElementById("cartModal"); //[cite: 6]
    if (cartModal && cartModal.classList.contains("open-panel")) actualizarVistaCarrito(); //[cite: 6]
}

function toggleFavorito(id, element) {
    const index = favoritos.indexOf(id); //[cite: 6]
    if (index > -1) {
        favoritos.splice(index, 1); //[cite: 6]
        element.classList.remove("active"); //[cite: 6]
        element.querySelector("svg").setAttribute("fill", "none"); //[cite: 6]
    } else {
        favoritos.push(id); //[cite: 6]
        element.classList.add("active"); //[cite: 6]
        element.querySelector("svg").setAttribute("fill", "currentColor"); //[cite: 6]
    }
    localStorage.setItem('KARA_FAVS', JSON.stringify(favoritos)); //[cite: 6]
    actualizarInsignias(); //[cite: 6]
}

// ==========================================
// 7. ACTUALIZACIÓN DE INSIGNIAS Y VISTAS
// ==========================================
function actualizarInsignias() {
    const cartCount = document.getElementById("cartCount"); //[cite: 6]
    const favsCount = document.getElementById("favsCount"); //[cite: 6]
    if (cartCount) cartCount.textContent = carrito.reduce((acc, item) => acc + item.cantidad, 0); //[cite: 6]
    if (favsCount) favsCount.textContent = favoritos.length; //[cite: 6]
}

function setupModalEvents(triggerId, modalId, closeId, callbackOpen = null) {
    const trigger = document.getElementById(triggerId); //[cite: 6]
    const modal   = document.getElementById(modalId); //[cite: 6]
    const close   = document.getElementById(closeId); //[cite: 6]
    if (trigger && modal && close) {
        trigger.addEventListener("click", (e) => {
            e.preventDefault(); //[cite: 6]
            modal.style.display = "flex"; //[cite: 6]
            if (callbackOpen) callbackOpen(); //[cite: 6]
        });
        close.addEventListener("click",   () => modal.style.display = "none"); //[cite: 6]
        modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; }); //[cite: 6]
    }
}

function actualizarVistaCarrito() {
    const body = document.getElementById("cartModalBody"); //[cite: 6]
    const totalElem = document.getElementById("cartTotalAmount"); //[cite: 6]
    if (!body || !totalElem) return; //[cite: 6]

    body.innerHTML = ""; //[cite: 6]
    let acumulado = 0; //[cite: 6]
    carrito.forEach(item => { acumulado += item.price * item.cantidad; }); //[cite: 6]

    const shippingContainer = document.createElement("div"); //[cite: 6]
    shippingContainer.className = "shipping-progress-container"; //[cite: 6]
    let restante = META_ENVIO_GRATIS - acumulado; //[cite: 6]
    let porcentaje = Math.min((acumulado / META_ENVIO_GRATIS) * 100, 100); //[cite: 6]
    let mensajeEnvio = restante > 0
        ? `¡Estás a solo <span>$${restante.toFixed(2)}</span> de conseguir envío gratis!`
        : `¡Felicidades! Tienes <span>Envío Gratis</span> garantizado. 🌴`; //[cite: 6]

    shippingContainer.innerHTML = `
        <div class="shipping-progress-text">${mensajeEnvio}</div>
        <div class="shipping-bar-bg">
            <div class="shipping-bar-fill" style="width:${porcentaje}%"></div>
        </div>`; //[cite: 6]
    body.appendChild(shippingContainer); //[cite: 6]

    if (carrito.length === 0) {
        const txtVacio = document.createElement("p"); //[cite: 6]
        txtVacio.style.cssText = "text-align:center;padding:2rem 1rem;color:#666;font-size:0.9rem;"; //[cite: 6]
        txtVacio.textContent = "Tu bolsa playera está vacía."; //[cite: 6]
        body.appendChild(txtVacio); //[cite: 6]
        totalElem.textContent = "$0.00"; //[cite: 6]
        return; //[cite: 6]
    }

    carrito.forEach((item, index) => {
        const txtTono = item.selectedTone ? `<span style="font-size:0.75rem; display:block; color:#777;">Tono: ${item.selectedTone}</span>` : "";
        const row = document.createElement("div"); //[cite: 6]
        row.className = "cart-item-row"; //[cite: 6]
        row.style.cssText = "display:flex;flex-direction:column;gap:6px;padding:14px 0;border-bottom:1px solid var(--border-color);"; //[cite: 6]
        row.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:600;font-size:0.88rem;">🥥 ${item.title}</span>
                    ${txtTono}
                </div>
                <strong style="color:var(--primary);font-size:0.9rem;">$${(item.price * item.cantidad).toFixed(2)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <button class="btn-qty-minus" data-index="${index}" style="background:#f0f0f0;border:none;width:24px;height:24px;border-radius:4px;font-weight:bold;cursor:pointer;">-</button>
                    <span style="font-size:0.85rem;font-weight:600;min-width:16px;text-align:center;">${item.cantidad}</span>
                    <button class="btn-qty-plus" data-index="${index}" style="background:#f0f0f0;border:none;width:24px;height:24px;border-radius:4px;font-weight:bold;cursor:pointer;">+</button>
                </div>
                <button class="btn-remove-item" data-index="${index}" style="font-size:0.75rem;color:#FF3B30;background:none;border:none;text-decoration:underline;cursor:pointer;">Quitar</button>
            </div>`; //[cite: 6]
        body.appendChild(row); //[cite: 6]
    });

    body.querySelectorAll(".btn-qty-minus").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index);
            if (carrito[idx]) {
                carrito[idx].cantidad -= 1;
                if (carrito[idx].cantidad <= 0) carrito.splice(idx, 1);
                localStorage.setItem('KARA_CART', JSON.stringify(carrito));
                actualizarInsignias();
                actualizarVistaCarrito();
            }
        });
    });

    body.querySelectorAll(".btn-qty-plus").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index);
            if (carrito[idx]) {
                carrito[idx].cantidad += 1;
                localStorage.setItem('KARA_CART', JSON.stringify(carrito));
                actualizarInsignias();
                actualizarVistaCarrito();
            }
        });
    });

    body.querySelectorAll(".btn-remove-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const idx = parseInt(btn.dataset.index);
            carrito.splice(idx, 1);
            localStorage.setItem('KARA_CART', JSON.stringify(carrito));
            actualizarInsignias();
            actualizarVistaCarrito();
        });
    });

    totalElem.textContent = `$${acumulado.toFixed(2)}`; //[cite: 6]
}

function actualizarVistaFavoritos() {
    const body = document.getElementById("favsModalBody"); //[cite: 6]
    if (!body) return; //[cite: 6]
    body.innerHTML = ""; //[cite: 6]
    const listaFavs = dbProductos.filter(p => favoritos.includes(p.id)); //[cite: 6]
    if (listaFavs.length === 0) {
        body.innerHTML = `<p style="text-align:center;padding:1rem;color:#666;">No tienes productos guardados.</p>`; //[cite: 6]
        return; //[cite: 6]
    }
    listaFavs.forEach(item => {
        const row = document.createElement("div"); //[cite: 6]
        row.className = "cart-item-row"; //[cite: 6]
        row.innerHTML = `<span>💖 ${item.title}</span><strong style="color:var(--primary);">$${item.price.toFixed(2)}</strong>`; //[cite: 6]
        body.appendChild(row); //[cite: 6]
    });
}

// ==========================================
// 8. SHADE FINDER QUIZ
// ==========================================
function lanzarEncuestaDinamica() {
    const container = document.getElementById("quizContainer"); //[cite: 6]
    if (!container) return; //[cite: 6]

    container.innerHTML = `
        <div class="quiz-progress-wrapper">
            <span class="quiz-progress-text">Paso 1 de 1 — Tu Perfil Personalizado</span>
        </div>
        <h3 class="quiz-title">¿Qué tipo de acabado prefieres lucir bajo el sol tropical?</h3>
        <div class="quiz-options-list">
            <button class="quiz-option-btn" data-type="glow">✨ Acabado Glow / Destellante Satinado</button>
            <button class="quiz-option-btn" data-type="natural">🥥 Sutil / Efecto Hidratación de Coco Natural</button>
        </div>`; //[cite: 6]

    container.querySelectorAll(".quiz-option-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.classList.add("selected"); //[cite: 6]
            const tipo = btn.dataset.type; //[cite: 6]
            // Selecciona un match idóneo dentro del inventario real (id 3: Blush con brillo o id 11: Tinta para labios)[cite: 4, 6]
            const prod = dbProductos.find(p => p.id === (tipo === "glow" ? 3 : 11)); //[cite: 6]
            setTimeout(() => {
                container.innerHTML = `
                    <div style="text-align:center;padding:0.5rem;">
                        <span style="font-size:3rem;">🌴</span>
                        <h4 style="margin:10px 0;color:var(--primary);font-family:'Playfair Display',serif;font-size:1.4rem;">¡Tu Look Ideal Encontrado!</h4>
                        <p style="font-size:0.88rem;line-height:1.5;color:var(--text-muted);margin-bottom:1.5rem;">
                            Basado en tu preferencia, tu match perfecto es:
                        </p>
                        <div style="background:var(--bg-main);padding:1rem;border-radius:16px;border:1px solid var(--border-color);display:flex;gap:12px;align-items:center;text-align:left;margin-bottom:1.5rem;">
                            <img src="${prod.img}" style="width:70px;height:70px;object-fit:cover;border-radius:10px;" onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=100'">
                            <div style="flex-grow:1;">
                                <h5 style="font-size:0.9rem;font-weight:600;margin-bottom:4px;">${prod.title}</h5>
                                <strong style="color:var(--primary);font-size:0.95rem;">$${prod.price.toFixed(2)}</strong>
                            </div>
                            <button id="btnQuizAddCart" class="compact-btn" data-id="${prod.id}"
                                    style="width:auto!important;padding:8px 12px!important;white-space:nowrap;">Llevarlo</button>
                        </div>
                        <p style="font-size:0.75rem;color:#999;">Esta ventana se cerrará automáticamente.</p>
                    </div>`; //[cite: 6]

                const btnAddQuiz = document.getElementById("btnQuizAddCart"); //[cite: 6]
                if (btnAddQuiz) {
                    btnAddQuiz.addEventListener("click", () => {
                        agregarAlCarrito(prod.id); //[cite: 6]
                        btnAddQuiz.textContent = "¡Añadido! ✓"; //[cite: 6]
                        btnAddQuiz.style.background = "#25D366"; //[cite: 6]
                    });
                }
                setTimeout(() => {
                    document.getElementById("quizModal").style.display = "none"; //[cite: 6]
                }, 5000); //[cite: 6]
            }, 400); //[cite: 6]
        });
    });
}

// ==========================================
// 9. ANIMACIONES GSAP SCROLLTRIGGER
// ==========================================
function initGSAP() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
        console.warn("KARA: GSAP o ScrollTrigger no disponibles."); //[cite: 6]
        document.querySelectorAll(
            '.hero-title, .hero-subtitle, .hero-text, .hero-actions, .gsap-reveal, ' +
            '.product-card, .parallax-banner__text h2, .parallax-banner__text .pb-eyebrow'
        ).forEach(el => {
            el.style.opacity = "1"; //[cite: 6]
            el.style.transform = "none"; //[cite: 6]
        });
        return; //[cite: 6]
    }

    gsap.registerPlugin(ScrollTrigger); //[cite: 6]

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return; //[cite: 6]
    }

    const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } }); //[cite: 6]
    heroTl
        .to(".hero-subtitle", { opacity: 1, y: 0, duration: 0.8, delay: 0.3 }) //[cite: 6]
        .to(".hero-title", { opacity: 1, y: 0, duration: 1 }, "-=0.4") //[cite: 6]
        .to(".hero-text", { opacity: 1, y: 0, duration: 0.8 }, "-=0.5") //[cite: 6]
        .to(".hero-actions", { opacity: 1, y: 0, duration: 0.7 }, "-=0.4"); //[cite: 6]

    gsap.utils.toArray(".gsap-reveal").forEach((el) => {
        gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
                trigger: el,
                start: "top 85%",
                toggleActions: "play none none none",
            }
        }); //[cite: 6]
    });

    gsap.utils.toArray(".category-card").forEach((card, i) => {
        gsap.fromTo(card,
            { opacity: 0, scale: 0.92, y: 30 },
            {
                opacity: 1,
                scale: 1,
                y: 0,
                duration: 0.75,
                ease: "power3.out",
                delay: i * 0.12,
                scrollTrigger: {
                    trigger: card,
                    start: "top 88%",
                    toggleActions: "play none none none",
                }
            }
        ); //[cite: 6]
    });

    animateProductCards(); //[cite: 6]
}

function animateProductCards() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return; //[cite: 6]
    gsap.utils.toArray(".product-card").forEach((card, i) => {
        ScrollTrigger.getAll().filter(st => st.trigger === card).forEach(st => st.kill()); //[cite: 6]
        gsap.to(card, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            delay: (i % 4) * 0.1,
            scrollTrigger: {
                trigger: card,
                start: "top 92%",
                toggleActions: "play none none none",
            }
        }); //[cite: 6]
    });
}