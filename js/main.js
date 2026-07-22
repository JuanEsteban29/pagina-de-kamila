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
        // Intentar primero desde el API en vivo del servidor
        let res = await fetch("/api/productos", { cache: "no-store" });
        if (!res.ok) {
            // Fallback con parametro no-cache
            res = await fetch("js/productos.json?v=" + Date.now());
        }
        if (res.ok) {
            dbProductos = await res.json();
        } else {
            throw new Error("No se pudo cargar el catálogo");
        }
    } catch (e) {
        console.warn("CORS o servidor no disponible. Cargando catálogo por defecto:", e);
        dbProductos = [...dbProductosFallback];
    }

    // Cargar adiciones y eliminaciones locales hechas desde admin
    const localAdded = JSON.parse(localStorage.getItem('KARA_ADMIN_ADDED')) || [];
    const localDeleted = JSON.parse(localStorage.getItem('KARA_ADMIN_DELETED')) || [];

    // Filtrar los que fueron marcados como borrados
    dbProductos = dbProductos.filter(p => !localDeleted.includes(p.id));

    // Agregar o actualizar los productos añadidos/editados desde admin
    localAdded.forEach(localProd => {
        let imgFinal = localProd.img;
        if (typeof imgFinal === "string" && imgFinal.startsWith("KARA_SESSIMG:")) {
            const imgId = imgFinal.replace("KARA_SESSIMG:", "");
            imgFinal = sessionStorage.getItem(`KARA_IMG_${imgId}`) || "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400";
        }
        const resolvedProd = { ...localProd, img: imgFinal };
        
        const idx = dbProductos.findIndex(p => p.id === resolvedProd.id);
        if (idx !== -1) {
            dbProductos[idx] = { ...dbProductos[idx], ...resolvedProd };
        } else {
            dbProductos.push(resolvedProd);
        }
    });
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

// Genera un color determinístico o usa el color hex del objeto de tono
function getToneColor(toneItem) {
    if (toneItem && toneItem.color) {
        return toneItem.color;
    }
    const name = typeof toneItem === 'string' ? toneItem : (toneItem.name || '');
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 62%)`;
}

function renderProductos(filtrados = null) {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;

    grid.innerHTML = "";
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

        // Renderizado de Tonos con Colores Reales
        let htmlTonos = '';
        let toneList = [];

        if (prod.toneObjects && Array.isArray(prod.toneObjects) && prod.toneObjects.length > 0) {
            toneList = prod.toneObjects;
        } else if (prod.tones) {
            toneList = prod.tones.split(',').map(t => ({ name: t.trim(), color: toneToColor(t.trim()) })).filter(t => t.name);
        }

        if (toneList.length > 0) {
            const maxDots = 7;
            const dotsHtml = toneList.slice(0, maxDots).map((t, tIdx) => {
                const colorHex = getToneColor(t);
                const toneName = typeof t === 'string' ? t : t.name;
                const toneImg = t.img || '';
                return `<span class="tone-dot ${tIdx === 0 ? 'active' : ''}" style="background:${colorHex}" title="${toneName}" data-tone="${toneName}" data-img="${toneImg}"></span>`;
            }).join('');
            
            const extra = toneList.length > maxDots
                ? `<span class="tone-more">+${toneList.length - maxDots}</span>`
                : '';
            htmlTonos = `<div class="product-tones"><div class="tone-dots">${dotsHtml}${extra}</div></div>`;
        }

        // Insignias Huda (VEGAN FRIENDLY, AHORRA 10%, etc.)
        let htmlBadge = '';
        if (prod.badge === 'VEGAN FRIENDLY') {
            htmlBadge = `<div class="badge-vegan-circle" title="Fórmula Vegana"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"></polyline></svg><span>VEGAN</span></div>`;
        } else if (prod.badge) {
            htmlBadge = `<span class="badge-discount-banner">${prod.badge}</span>`;
        }

        // Estrellas de Valoración
        const ratingVal = prod.rating || 5.0;
        const reviewsCount = prod.reviews || Math.floor(Math.abs(Math.sin(prod.id) * 80) + 12);
        const htmlRating = `<div class="product-rating"><span class="stars">★★★★★</span> <span>${ratingVal.toFixed(1)} (${reviewsCount})</span></div>`;

        // Fotos adicionales para hover swap
        const secondaryImg = (prod.images && prod.images.length > 0) ? prod.images[0] : prod.img;

        // Control de Agotado / InStock
        const isAgotado = typeof prod.stock === "number" && prod.stock <= 0;
        const btnText = isAgotado ? "AGOTADO 🚫" : "AÑADIR A LA CESTA";
        const btnDisabledAttr = isAgotado ? "disabled style='opacity: 0.55; cursor: not-allowed; filter: grayscale(1);'" : "";

        card.innerHTML = `
            <div class="product-image-container">
                <img src="${prod.img}" alt="${prod.title}" loading="lazy" class="main-prod-img" data-orig-img="${prod.img}" data-second-img="${secondaryImg}" onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400'">
                ${htmlBadge}
                <button class="fav-card-btn ${isFav ? 'active' : ''}" data-id="${prod.id}" aria-label="Favorito">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                         fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>
            <div class="product-info">
                <h3 class="product-title">${prod.title}</h3>
                <span class="product-price">$${prod.price.toFixed(2)}</span>
                ${htmlTonos}
                ${htmlRating}
                <button type="button" class="btn-huda-primary btn-add-cart" data-id="${prod.id}" ${btnDisabledAttr}>
                    ${btnText}
                </button>
            </div>
        `;

        // Eventos para swatches de tonos
        const toneDots = card.querySelectorAll(".tone-dot");
        toneDots.forEach(dot => {
            dot.addEventListener("click", (e) => {
                toneDots.forEach(d => d.classList.remove("active"));
                dot.classList.add("active");

                // Si el tono tiene foto personalizada, cambiarla
                const toneImg = dot.dataset.img;
                const mainImg = card.querySelector(".main-prod-img");
                if (toneImg && mainImg) {
                    mainImg.src = toneImg;
                }
            });
        });

        // Evento Hover para intercambiar foto secundaria si existe
        if (prod.images && prod.images.length > 0) {
            const mainImg = card.querySelector(".main-prod-img");
            card.addEventListener("mouseenter", () => {
                if (mainImg && secondaryImg) {
                    mainImg.src = secondaryImg;
                }
            });
            card.addEventListener("mouseleave", () => {
                if (mainImg) {
                    mainImg.src = mainImg.dataset.origImg;
                }
            });
        }

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
            gsap.to(card, { y: -6, boxShadow: "0 15px 35px rgba(236, 28, 128, 0.15)", duration: 0.3, ease: "power2.out" });
            if (img) gsap.to(img, { scale: 1.06, duration: 0.5, ease: "power2.out" });
        });
        card.addEventListener("mouseleave", () => {
            gsap.to(card, { y: 0, boxShadow: "none", duration: 0.3, ease: "power2.out" });
            if (img) gsap.to(img, { scale: 1, duration: 0.5, ease: "power2.out" });
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
    setupModalEvents("quizFloatingBtn",  "quizModal",  "closeQuiz",  lanzarEncuestaDinamica); //[cite: 6]

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

    // Filtrado por categoría
    document.querySelectorAll(".category-card").forEach(card => {
        card.addEventListener("click", () => {
            const cat = card.dataset.category;
            if (cat === "maquillaje") {
                const servicesModal = document.getElementById("servicesModal");
                if (servicesModal) servicesModal.style.display = "flex";
                return;
            }
            const filtrados = dbProductos.filter(p =>
                p.category && p.category.toLowerCase() === cat.toLowerCase()
            );
            renderProductos(filtrados);
            document.getElementById("productos").scrollIntoView({ behavior: "smooth" });
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
// 5. MODAL DE SERVICIOS + COMPOSITOR DE RESERVA
// ==========================================
function setupServicesDropdown() {
    const servicesModal = document.getElementById("servicesModal");
    setupModalEvents("serviciosToggle", "servicesModal", "closeServices");

    let selectedOccasion = null;
    let selectedLook = null;

    const occasionChips = document.querySelectorAll("#occasionChips .occasion-chip");
    const lookCards = document.querySelectorAll("#lookCards .service-card");
    const preview = document.getElementById("composerPreview");
    const btnSend = document.getElementById("btnEnviarWhatsapp");

    function actualizarVistaPreviaMensaje() {
        if (!preview || !btnSend) return;
        if (selectedOccasion && selectedLook) {
            preview.textContent = `¡Hola Kamila! 🌴 Quiero agendar un ${selectedLook} para ${selectedOccasion}. ¿Cuáles son tus próximas fechas disponibles?`;
            btnSend.disabled = false;
        } else {
            preview.textContent = "Selecciona una ocasión y un look arriba para ver aquí tu mensaje...";
            btnSend.disabled = true;
        }
    }

    occasionChips.forEach(chip => {
        chip.addEventListener("click", () => {
            occasionChips.forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            selectedOccasion = chip.dataset.occasion;
            actualizarVistaPreviaMensaje();
        });
    });

    lookCards.forEach(card => {
        const seleccionar = () => {
            lookCards.forEach(c => c.classList.remove("selected"));
            card.classList.add("selected");
            selectedLook = card.dataset.look;
            actualizarVistaPreviaMensaje();
        };
        card.addEventListener("click", seleccionar);
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                seleccionar();
            }
        });
    });

    // Conectar las tarjetas de la sección de la página principal con el modal
    const homeServiceElements = document.querySelectorAll(".home-service-card, .btn-book-service");
    homeServiceElements.forEach(el => {
        el.addEventListener("click", (e) => {
            const lookToSelect = el.dataset.look || el.closest(".home-service-card")?.dataset.look;
            if (servicesModal) {
                servicesModal.style.display = "flex";
                if (lookToSelect) {
                    lookCards.forEach(c => {
                        if (c.dataset.look === lookToSelect) {
                            c.click();
                        }
                    });
                }
            }
        });
    });

    if (btnSend) {
        btnSend.addEventListener("click", () => {
            if (!selectedOccasion || !selectedLook || !preview) return;
            window.open("https://wa.me/584122665492?text=" + encodeURIComponent(preview.textContent), "_blank");
            if (servicesModal) servicesModal.style.display = "none";
        });
    }

    const btnAgendar = document.getElementById("btnAgendarMaquilladora");
    if (btnAgendar) {
        btnAgendar.addEventListener("click", (e) => {
            e.preventDefault();
            const msg = "¡Hola KARA! Me gustaría solicitar información para agendar una Maquilladora Profesional a domicilio.";
            const contenidoOriginal = btnAgendar.innerHTML;
            btnAgendar.innerHTML = "<span>💬</span> Abriendo WhatsApp...";
            btnAgendar.style.color = "#25D366";
            window.open("https://wa.me/584122665492?text=" + encodeURIComponent(msg), "_blank");
            setTimeout(() => {
                btnAgendar.innerHTML = contenidoOriginal;
                btnAgendar.style.color = "";
                if (servicesModal) servicesModal.style.display = "none";
            }, 1000);
        });
    }

}

// ==========================================
// 6. CARRITO, FAVORITOS E INSIGNIAS
// ==========================================
// ==========================================
// 6. CARRITO, FAVORITOS E INSIGNIAS CON SELECCIÓN INTERACTIVA DE TONO
// ==========================================

let productoPendienteTono = null;
let tonoSeleccionadoActual = "";

function abrirModalSeleccionTono(prod) {
    const toneModal = document.getElementById("toneSelectorModal");
    const toneBody = document.getElementById("toneSelectorBody");
    const closeBtn = document.getElementById("closeToneModal");

    if (!toneModal || !toneBody) return;

    productoPendienteTono = prod;

    // Obtener lista de tonos
    let toneList = [];
    if (prod.toneObjects && Array.isArray(prod.toneObjects) && prod.toneObjects.length > 0) {
        toneList = prod.toneObjects;
    } else if (prod.tones) {
        toneList = prod.tones.split(",").map(t => ({ name: t.trim(), color: getToneColor(t.trim()) })).filter(t => t.name);
    }

    if (toneList.length === 0) {
        confirmarAgregarConTono(prod, "");
        return;
    }

    // Tono seleccionado por defecto (el primero)
    const primerTono = typeof toneList[0] === "string" ? toneList[0] : (toneList[0].name || "");
    tonoSeleccionadoActual = primerTono;

    // Renderizar HTML del modal
    const swatchesHtml = toneList.map((t, idx) => {
        const name = typeof t === "string" ? t : (t.name || "");
        const color = getToneColor(t);
        const isActive = idx === 0 ? "active" : "";
        return `
            <button type="button" class="tone-option-btn ${isActive}" data-tone="${name}" style="display: flex; align-items: center; gap: 8px; padding: 0.6rem 1rem; border-radius: 25px; border: 1.5px solid ${idx === 0 ? 'var(--primary)' : '#EAEAEA'}; background: #fff; cursor: pointer; transition: all 0.2s ease;">
                <span style="width: 18px; height: 18px; border-radius: 50%; background: ${color}; box-shadow: 0 0 0 1px rgba(0,0,0,0.15);"></span>
                <span style="font-size: 0.82rem; font-weight: 600;">${name}</span>
            </button>
        `;
    }).join("");

    toneBody.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <img src="${prod.img}" alt="${prod.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 14px; margin-bottom: 0.8rem; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.3rem;">${prod.title}</h3>
            <span style="font-size: 1.15rem; font-weight: 800; color: var(--primary);">$${prod.price.toFixed(2)}</span>
        </div>

        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.8rem;">Selecciona tu tono preferido:</p>
        
        <div class="tone-options-grid" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 1.2rem; max-height: 200px; overflow-y: auto; padding: 4px;">
            ${swatchesHtml}
        </div>

        <div style="font-size: 0.82rem; margin-bottom: 1.2rem; background: #F8F4FC; padding: 0.6rem 1rem; border-radius: 12px; color: var(--primary); font-weight: 600;" id="selectedToneLabel">
            ✨ Tono seleccionado: <strong>${primerTono}</strong>
        </div>

        <button type="button" class="btn-huda-primary" id="btnConfirmToneAdd" style="width: 100%; padding: 0.85rem; border-radius: 25px; font-weight: 700;">
            Añadir a la bolsa 🛍️
        </button>
    `;

    toneModal.style.display = "flex";

    // Eventos para seleccionar tonos dentro del modal
    const toneButtons = toneBody.querySelectorAll(".tone-option-btn");
    const label = toneBody.getElementById ? toneBody.getElementById("selectedToneLabel") : toneBody.querySelector("#selectedToneLabel");
    
    toneButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            toneButtons.forEach(b => {
                b.classList.remove("active");
                b.style.borderColor = "#EAEAEA";
            });
            btn.classList.add("active");
            btn.style.borderColor = "var(--primary)";
            tonoSeleccionadoActual = btn.dataset.tone;
            if (label) {
                label.innerHTML = `✨ Tono seleccionado: <strong>${tonoSeleccionadoActual}</strong>`;
            }
        });
    });

    const btnConfirm = toneBody.querySelector("#btnConfirmToneAdd");
    if (btnConfirm) {
        btnConfirm.addEventListener("click", () => {
            confirmarAgregarConTono(prod, tonoSeleccionadoActual);
            toneModal.style.display = "none";
        });
    }

    if (closeBtn) {
        closeBtn.onclick = () => toneModal.style.display = "none";
    }

    toneModal.onclick = (e) => {
        if (e.target === toneModal) toneModal.style.display = "none";
    };
}

function confirmarAgregarConTono(prod, tono) {
    const existe = carrito.find(item => item.id === prod.id && item.selectedTone === tono);
    if (existe) {
        existe.cantidad += 1;
    } else {
        carrito.push({ ...prod, cantidad: 1, selectedTone: tono });
    }
    localStorage.setItem('KARA_CART', JSON.stringify(carrito));
    actualizarInsignias();
    
    // Abrir panel lateral del carrito para mostrar la prenda agregada
    const cartModal = document.getElementById("cartModal");
    if (cartModal) {
        cartModal.classList.add("open-panel");
        actualizarVistaCarrito();
    }
}

function agregarAlCarrito(id) {
    const prod = dbProductos.find(p => p.id === id);
    if (!prod) return;
    
    if (typeof prod.stock === "number" && prod.stock <= 0) {
        alert("Lo sentimos, este producto se encuentra actualmente agotado.");
        return;
    }
    
    // Si tiene tonos, abrir el modal interactivo de selección de tono
    let toneList = [];
    if (prod.toneObjects && Array.isArray(prod.toneObjects) && prod.toneObjects.length > 0) {
        toneList = prod.toneObjects;
    } else if (prod.tones && prod.tones.trim().length > 0) {
        toneList = prod.tones.split(",").map(t => t.trim()).filter(Boolean);
    }

    if (toneList.length > 0) {
        abrirModalSeleccionTono(prod);
    } else {
        confirmarAgregarConTono(prod, "");
    }
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
        txtVacio.style.cssText = "text-align:center;padding:2rem 1rem;color:rgba(255,255,255,0.9);font-size:0.9rem;"; //[cite: 6]
        txtVacio.textContent = "Tu bolsa playera está vacía."; //[cite: 6]
        body.appendChild(txtVacio); //[cite: 6]
        totalElem.textContent = "$0.00"; //[cite: 6]
        return; //[cite: 6]
    }

    carrito.forEach((item, index) => {
        const txtTono = item.selectedTone ? `<span style="font-size:0.72rem; display:block; color:#777;">Tono: ${item.selectedTone}</span>` : "";
        const row = document.createElement("div"); //[cite: 6]
        row.className = "cart-item-card"; //[cite: 6]
        row.innerHTML = `
            <img src="${item.img}" onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=100'">
            <div class="cart-item-info">
                <h5>${item.title}</h5>
                ${txtTono}
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button class="qty-btn btn-qty-minus" data-index="${index}">-</button>
                        <span style="font-size:0.85rem;font-weight:600;min-width:16px;text-align:center;">${item.cantidad}</span>
                        <button class="qty-btn btn-qty-plus" data-index="${index}">+</button>
                    </div>
                    <strong class="cart-item-price">$${(item.price * item.cantidad).toFixed(2)}</strong>
                </div>
                <button class="btn-remove-item" data-index="${index}" style="margin-top:4px;">Quitar</button>
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
        body.innerHTML = `<p style="text-align:center;padding:1rem;color:rgba(255,255,255,0.9);">No tienes productos guardados.</p>`; //[cite: 6]
        return; //[cite: 6]
    }
    listaFavs.forEach(item => {
        const row = document.createElement("div"); //[cite: 6]
        row.className = "fav-item-card"; //[cite: 6]
        row.innerHTML = `
            <img src="${item.img}" onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=100'">
            <div class="fav-item-info">
                <h5>💖 ${item.title}</h5>
                <span class="fav-item-price">$${item.price.toFixed(2)}</span>
            </div>`; //[cite: 6]
        body.appendChild(row); //[cite: 6]
    });
}

// ==========================================
// 8. SHADE FINDER QUIZ — Mini quiz de 4 pasos con matching real
// ==========================================
const QUIZ_PREGUNTAS = [
    {
        key: "categoria",
        titulo: "¿Qué buscas hoy?",
        opciones: [
            { label: "💄 Rostro (bases, blush, correctores)", value: "rostro" },
            { label: "👁️ Ojos (máscaras, cejas)", value: "ojos" },
            { label: "💋 Labios (gloss, tintas)", value: "labios" },
            { label: "🌴 Sorpréndeme, de todo un poco", value: "todas" }
        ]
    },
    {
        key: "acabado",
        titulo: "¿Qué acabado prefieres lucir?",
        opciones: [
            { label: "✨ Glow / Destellante", value: "glow" },
            { label: "🥥 Natural / Mate", value: "natural" },
            { label: "🤷‍♀️ Da igual, muéstrame lo mejor", value: "any" }
        ]
    },
    {
        key: "presupuesto",
        titulo: "¿Cuál es tu presupuesto aproximado?",
        opciones: [
            { label: "💵 Hasta $5", value: "economico" },
            { label: "💎 Entre $5 y $10", value: "premium" },
            { label: "🚀 Sin límite", value: "sinlimite" }
        ]
    },
    {
        key: "ocasion",
        titulo: "¿Para qué ocasión es?",
        opciones: [
            { label: "☀️ Uso diario", value: "Uso Diario" },
            { label: "🎉 Fiesta o evento", value: "una Fiesta" },
            { label: "🎁 Es un regalo", value: "un Regalo" }
        ]
    }
];

let quizRespuestas = {};
let quizPaso = 0;

function lanzarEncuestaDinamica() {
    quizRespuestas = {};
    quizPaso = 0;
    renderQuizPaso();
}

function renderQuizPaso() {
    const container = document.getElementById("quizContainer");
    if (!container) return;

    if (quizPaso >= QUIZ_PREGUNTAS.length) {
        renderQuizResultado();
        return;
    }

    const pregunta = QUIZ_PREGUNTAS[quizPaso];
    const porcentaje = Math.round(((quizPaso) / QUIZ_PREGUNTAS.length) * 100);

    container.innerHTML = `
        <div class="quiz-progress-wrapper">
            <span class="quiz-progress-text">Paso ${quizPaso + 1} de ${QUIZ_PREGUNTAS.length} — Encuentra tu producto ideal</span>
            <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${porcentaje}%;"></div></div>
        </div>
        <h3 class="quiz-title">${pregunta.titulo}</h3>
        <div class="quiz-options-list">
            ${pregunta.opciones.map(op => `<button class="quiz-option-btn" data-value="${op.value}">${op.label}</button>`).join("")}
        </div>
        ${quizPaso > 0 ? `<button class="quiz-back-btn" id="quizBackBtn">← Volver</button>` : ""}
    `;

    container.querySelectorAll(".quiz-option-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            quizRespuestas[pregunta.key] = btn.dataset.value;
            quizPaso += 1;
            renderQuizPaso();
        });
    });

    const backBtn = document.getElementById("quizBackBtn");
    if (backBtn) {
        backBtn.addEventListener("click", () => {
            quizPaso = Math.max(0, quizPaso - 1);
            renderQuizPaso();
        });
    }
}

function calcularRecomendacionesQuiz(respuestas) {
    const conStock = dbProductos.filter(p => p.stock > 0);
    const base = conStock.length > 0 ? conStock : dbProductos;

    const glowKeywords = /brillo|gloss|vinyl|shine|destell/i;
    const matteKeywords = /matte|mate|polvo|translúcido|translucido/i;

    const puntuados = base.map(p => {
        let score = 0;
        const titulo = p.title.toLowerCase();

        if (respuestas.categoria && respuestas.categoria !== "todas") {
            score += p.category === respuestas.categoria ? 4 : -2;
        }
        if (respuestas.acabado === "glow" && glowKeywords.test(titulo)) score += 3;
        if (respuestas.acabado === "natural" && matteKeywords.test(titulo)) score += 3;

        if (respuestas.presupuesto === "economico" && p.price <= 5) score += 2;
        if (respuestas.presupuesto === "premium" && p.price > 5 && p.price <= 10) score += 2;
        if (respuestas.presupuesto === "sinlimite") score += 1;

        score += Math.min(p.stock, 5) * 0.1; // leve preferencia a lo que hay más en stock

        return { producto: p, score };
    });

    puntuados.sort((a, b) => b.score - a.score);
    return puntuados.slice(0, 3).map(s => s.producto);
}

function renderQuizResultado() {
    const container = document.getElementById("quizContainer");
    if (!container) return;

    const recomendados = calcularRecomendacionesQuiz(quizRespuestas);

    if (recomendados.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:1rem;">
                <span style="font-size:2.5rem;">🥲</span>
                <p style="margin-top:0.8rem;color:rgba(255,255,255,0.9);">No encontramos productos disponibles ahora mismo. ¡Escríbenos por WhatsApp y te ayudamos directamente!</p>
                <button class="quiz-back-btn" id="quizRestartBtn">Intentar de nuevo</button>
            </div>`;
        const restart = document.getElementById("quizRestartBtn");
        if (restart) restart.addEventListener("click", lanzarEncuestaDinamica);
        return;
    }

    container.innerHTML = `
        <div style="text-align:center;padding:0.25rem 0 0.5rem;">
            <span style="font-size:2.5rem;">🌴</span>
            <h4 style="margin:8px 0;color:#FFFFFF;font-family:'Playfair Display',serif;font-size:1.3rem;">¡Tus recomendaciones están listas!</h4>
            <p style="font-size:0.85rem;line-height:1.5;color:rgba(255,255,255,0.9);margin-bottom:0.5rem;">
                Basado en tus respuestas, esto es lo que más te conviene:
            </p>
        </div>
        <div class="quiz-results-grid">
            ${recomendados.map(prod => `
                <div class="quiz-result-card">
                    <img src="${prod.img}" onerror="this.src='https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=100'">
                    <div class="quiz-result-info">
                        <h5>${prod.title}</h5>
                        <strong style="color:var(--primary);font-size:0.9rem;">$${prod.price.toFixed(2)}</strong>
                    </div>
                    <button class="compact-btn quiz-add-btn" data-id="${prod.id}" style="width:auto!important;padding:8px 12px!important;white-space:nowrap;">Llevarlo</button>
                </div>
            `).join("")}
        </div>
        <div style="text-align:center;">
            <button class="quiz-back-btn" id="quizRestartBtn">Volver a intentar</button>
        </div>
    `;

    container.querySelectorAll(".quiz-add-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = parseInt(btn.dataset.id);
            agregarAlCarrito(id);
            btn.textContent = "¡Añadido! ✓";
            btn.style.background = "#25D366";
        });
    });

    const restartBtn = document.getElementById("quizRestartBtn");
    if (restartBtn) restartBtn.addEventListener("click", lanzarEncuestaDinamica);
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