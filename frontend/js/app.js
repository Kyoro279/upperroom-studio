const API_BASE = 'https://upperroom-studio.vercel.app/api/produk';

async function fetchAPI(url, options = {}) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Jaringan bermasalah');
        return await response.json();
    } catch (error) {
        console.error("Gagal memuat data dari API:", error);
        return null;
    }
}

function formatHarga(harga) {
    return harga ? `Rp ${harga.toLocaleString('id-ID')}` : 'Hubungi Kami';
}

function createCardHTML(produk, index = 0) {
    const fallbackImage = 'https://images.unsplash.com/photo-1612015900986-4c4d017d1648?auto=format&fit=crop&w=400&q=80';
    let mainImg = fallbackImage;
    if (Array.isArray(produk.gambar_url) && produk.gambar_url.length > 0) {
        mainImg = produk.gambar_url[0];
    } else if (typeof produk.gambar_url === 'string' && produk.gambar_url.trim() !== '') {
        mainImg = produk.gambar_url;
    }

    const media = produk.model3d
        ? `<model-viewer src="${produk.model3d}" camera-controls auto-rotate touch-action="pan-y"></model-viewer>`
        : `<img src="${mainImg}" alt="${produk.nama}" class="detail-model" style="height:280px; object-fit:cover;">`;

    return `
        <a href="detail-produk.html?id=${produk.id}" class="card animate-on-scroll" style="transition-delay: ${index * 0.08}s">
            ${media}
            <div class="card-tag">${produk.kategori || produk.bahan || 'DEKORASI'}</div>
            <div class="card-title-row">
                <h4>${produk.nama}</h4>
                <span class="harga">${formatHarga(produk.harga)}</span>
            </div>
        </a>
    `;
}

// 1. Fungsi Hero Katalog
async function muatHeroKatalog() {
    const container = document.getElementById('tempat-hero-katalog');
    if (!container) return;

    const produkList = await fetchAPI(API_BASE);
    if (!produkList || produkList.length === 0) {
        container.innerHTML = '';
        return;
    }

    // Ambil beberapa produk untuk hero (misalnya 4 produk terbaru)
    const heroProducts = produkList.sort((a, b) => b.id - a.id).slice(0, 4);

    const fallbackImage = 'https://images.unsplash.com/photo-1612015900986-4c4d017d1648?auto=format&fit=crop&w=400&q=80';

    container.innerHTML = `
        <div class="hero-katalog-grid">
            ${heroProducts.map((produk, index) => {
        let mainImg = fallbackImage;
        if (Array.isArray(produk.gambar_url) && produk.gambar_url.length > 0) {
            mainImg = produk.gambar_url[0];
        } else if (typeof produk.gambar_url === 'string' && produk.gambar_url.trim() !== '') {
            mainImg = produk.gambar_url;
        }
        return `
                    <a href="detail-produk.html?id=${produk.id}" class="hero-katalog-item animate-on-scroll" style="transition-delay: ${index * 0.15}s">
                        <img src="${mainImg}" alt="${produk.nama}" class="hero-katalog-img">
                    </a>
                `;
    }).join('')}
        </div>
    `;
}

// 2. Fungsi Beranda (Index)
async function muatBeranda() {
    const container = document.getElementById('tempat-produk-terbaru');
    if (!container) return;

    const produkList = await fetchAPI(API_BASE);
    if (!produkList || produkList.length === 0) {
        container.innerHTML = '<div class="loading">Belum ada koleksi.</div>';
        return;
    }

    // Ambil 4 produk terbaru (asumsi id lebih besar = lebih baru)
    const terbaru = produkList.sort((a, b) => b.id - a.id).slice(0, 4);
    container.innerHTML = terbaru.map(createCardHTML).join('');
}

// Cek apakah user sudah login hanya untuk halaman admin (tambah/edit)
if (typeof supabase !== 'undefined') {
    supabase.auth.onAuthStateChange((event, session) => {
        const adminPages = ['tambah-produk.html', 'edit-produk.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (!session && adminPages.includes(currentPage)) {
            // Jika tidak ada session (belum login) dan berada di halaman admin terproteksi, tendang ke kelola
            window.location.href = 'kelola.html';
        }
    });
}

// 2. Fungsi Katalog dengan Filter
async function muatKatalog() {
    const container = document.getElementById('tempat-produk');
    if (!container) return;

    let produkList = await fetchAPI(API_BASE);
    if (!produkList) {
        container.innerHTML = '<div class="loading">Gagal memuat katalog produk. Pastikan Server Express berjalan.</div>';
        return;
    }

    let currentKategori = 'Semua';
    let currentKegunaan = 'Semua';
    let maxPrice = 385000;

    const countEl = document.getElementById('product-count');

    function render() {
        let filtered = produkList.filter(p => {
            const matchKat = currentKategori === 'Semua' || p.kategori === currentKategori;
            const matchKeg = currentKegunaan === 'Semua' || p.kegunaan === currentKegunaan;
            const matchPrice = (p.harga || 0) <= maxPrice;
            return matchKat && matchKeg && matchPrice;
        });

        const sortVal = document.getElementById('sort-select')?.value || 'terbaru';
        if (sortVal === 'termurah') filtered.sort((a, b) => a.harga - b.harga);
        if (sortVal === 'termahal') filtered.sort((a, b) => b.harga - a.harga);
        if (sortVal === 'terbaru') filtered.sort((a, b) => b.id - a.id);

        if (countEl) countEl.innerText = `${filtered.length} produk`;

        if (filtered.length === 0) {
            container.innerHTML = '<div class="loading">Tidak ada produk yang cocok dengan filter.</div>';
        } else {
            container.innerHTML = filtered.map(createCardHTML).join('');
        }

        // Update sidebar counts
        const allKats = ['Semua', 'Dekorasi', 'Miniatur', 'Aksesoris', 'Custom'];
        allKats.forEach(kat => {
            const c = (kat === 'Semua') ? produkList.length : produkList.filter(p => p.kategori === kat).length;
            const el = document.getElementById(`count-${kat.toLowerCase()}`);
            if (el) el.innerText = c;
        });
    }

    // Setup events
    document.querySelectorAll('#filter-kategori .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#filter-kategori .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentKategori = btn.dataset.filter;
            render();
        });
    });

    document.querySelectorAll('#filter-kegunaan .filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('#filter-kegunaan .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentKegunaan = btn.dataset.filter;
            render();
        });
    });

    const priceSlider = document.getElementById('price-slider');
    const priceValue = document.getElementById('price-value');
    if (priceSlider) {
        priceSlider.addEventListener('input', (e) => {
            maxPrice = parseInt(e.target.value);
            priceValue.innerText = formatHarga(maxPrice);
            render();
        });
    }

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', render);
    }

    render();
}

// 3. Fungsi Detail Produk
async function muatDetail() {
    const container = document.getElementById('detail-container');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        container.innerHTML = '<div class="loading">ID Produk tidak ditemukan.</div>';
        return;
    }

    const produk = await fetchAPI(`${API_BASE}/${id}`);
    if (!produk) {
        container.innerHTML = '<div class="loading">Gagal memuat detail produk.</div>';
        return;
    }

    const fallbackImage = 'https://images.unsplash.com/photo-1612015900986-4c4d017d1648?auto=format&fit=crop&w=800&q=80';

    let media = '';
    if (produk.model3d) {
        media = `<model-viewer src="${produk.model3d}" class="detail-model" camera-controls auto-rotate touch-action="pan-y"></model-viewer>`;
    } else {
        let images = [];
        if (Array.isArray(produk.gambar_url) && produk.gambar_url.length > 0) {
            images = produk.gambar_url;
        } else if (typeof produk.gambar_url === 'string' && produk.gambar_url.trim() !== '') {
            images = [produk.gambar_url];
        } else {
            images = [fallbackImage];
        }

        if (images.length > 1) {
            media = `
            <div class="slider-container" id="product-slider" data-images='${JSON.stringify(images)}' data-index="0">
                <button class="slider-btn prev" onclick="ubahSlider(-1)">❮</button>
                <img src="${images[0]}" alt="${produk.nama}" id="main-product-img" class="detail-img">
                <button class="slider-btn next" onclick="ubahSlider(1)">❯</button>
            </div>
            `;
            media += `<div class="thumbnail-gallery">`;
            images.forEach((img, i) => {
                media += `<img src="${img}" class="thumbnail-img ${i === 0 ? 'active' : ''}" onclick="setSlider(${i})" id="thumb-${i}">`;
            });
            media += `</div>`;
        } else {
            media = `<img src="${images[0]}" alt="${produk.nama}" id="main-product-img" class="detail-img">`;
        }
    }

    container.innerHTML = `
        <div class="detail-left">
            ${media}
        </div>
        <div class="detail-right">
            <h1 class="detail-title">${produk.nama}</h1>
            <div class="detail-price">${formatHarga(produk.harga)}</div>
            <p class="detail-desc">${produk.deskripsi || 'Tidak ada deskripsi rinci untuk produk ini.'}</p>
            
            <table class="spec-table">
                <tr>
                    <td class="spec-label">KATEGORI</td>
                    <td class="spec-value">${produk.kategori || produk.bahan || '-'}</td>
                </tr>
                <tr>
                    <td class="spec-label">DIMENSI</td>
                    <td class="spec-value">${produk.dimensi || 'Hubungi kami untuk ukuran pasti'}</td>
                </tr>
                <tr>
                    <td class="spec-label">FINISHING</td>
                    <td class="spec-value">${produk.finishing || 'Matte Standard'}</td>
                </tr>
                <tr>
                    <td class="spec-label">KEGUNAAN</td>
                    <td class="spec-value">${produk.kegunaan || '-'}</td>
                </tr>
            </table>
            ${produk.link_tokopedia ? `<a href="${produk.link_tokopedia}" target="_blank" class="btn-primary">Pesan di Tokopedia</a>` : `<a href="#" class="btn-primary" style="opacity: 0.5; cursor: not-allowed;" onclick="return false;">Pemesanan Ditutup</a>`}
        </div>
    `;
}

// 4. Fungsi Kelola (Admin)
async function muatKelola() {
    const container = document.getElementById('tempat-kelola');
    if (!container) return;

    let token = '';
    if (typeof supabase !== 'undefined') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            // Karena kelola.html sekarang menghandle login, jangan redirect di sini.
            // Biarkan script di kelola.html yang menampilkan form login.
            return;
        }
        token = session.access_token;
    }
    
    const produkList = await fetchAPI(API_BASE, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!produkList || produkList.length === 0) {
        container.innerHTML = '<div class="loading">Belum ada produk di database.</div>';
        return;
    }

    const fallbackImage = 'https://images.unsplash.com/photo-1612015900986-4c4d017d1648?auto=format&fit=crop&w=100&q=80';

    container.innerHTML = produkList.map((p, index) => {
        let mainImg = fallbackImage;
        if (Array.isArray(p.gambar_url) && p.gambar_url.length > 0) {
            mainImg = p.gambar_url[0];
        } else if (typeof p.gambar_url === 'string' && p.gambar_url.trim() !== '') {
            mainImg = p.gambar_url;
        }

        return `
        <div class="admin-item animate-on-scroll" style="transition-delay: ${index * 0.05}s">
            <img src="${mainImg}" alt="${p.nama}" class="admin-item-img">
            <div class="admin-item-info">
                <div class="admin-item-title">${p.nama}</div>
                <div class="admin-item-meta">${p.kategori || p.bahan || 'Tanpa Kategori'} &middot; ${formatHarga(p.harga)}</div>
            </div>
            <div class="admin-actions">
                <a href="edit-produk.html?id=${p.id}" class="btn-edit">Edit</a>
                <a href="#" class="btn-delete">Hapus</a>
            </div>
        </div>
        `;
    }).join('');
}



// 6. Fungsi Tambah Produk
function muatTambahProduk() {
    const form = document.getElementById('form-tambah-produk');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('form-pesan');
        msg.innerText = 'Menyimpan...';
        msg.style.color = 'black';

        const formData = new FormData();
        formData.append('nama', document.getElementById('nama').value);
        formData.append('harga', parseInt(document.getElementById('harga').value) || 0);
        formData.append('kategori', document.getElementById('kategori').value);
        formData.append('kegunaan', document.getElementById('kegunaan').value);
        formData.append('dimensi', document.getElementById('dimensi').value);
        formData.append('finishing', document.getElementById('finishing').value);
        formData.append('model3d', document.getElementById('model3d').value);
        formData.append('link_tokopedia', document.getElementById('link_tokopedia').value);
        formData.append('deskripsi', document.getElementById('deskripsi').value);

        const gambarInput = document.getElementById('gambar');
        if (gambarInput.files.length > 0) {
            for (let i = 0; i < gambarInput.files.length; i++) {
                formData.append('gambar', gambarInput.files[i]);
            }
        }

        try {
            let token = '';
            if (typeof supabase !== 'undefined') {
                const { data: { session } } = await supabase.auth.getSession();
                token = session ? session.access_token : '';
            }

            const response = await fetch(API_BASE, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                // Do NOT set Content-Type header when sending FormData!
                // Fetch will automatically set it to multipart/form-data with the correct boundary
                body: formData
            });

            if (!response.ok) throw new Error('Gagal menyimpan');

            msg.innerText = 'Produk berhasil ditambahkan! Mengalihkan...';
            msg.style.color = 'green';
            setTimeout(() => {
                window.location.href = 'kelola.html';
            }, 1000);
        } catch (err) {
            msg.innerText = 'Terjadi kesalahan: ' + err.message;
            msg.style.color = 'red';
        }
    });
}

// 7. Fungsi Edit Produk
async function muatEditProduk() {
    const form = document.getElementById('form-edit-produk');
    if (!form) return;

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (!id) {
        if(window.tampilkanToast) window.tampilkanToast('ID Produk tidak ditemukan!', 'error');
        setTimeout(() => window.location.href = 'kelola.html', 1500);
        return;
    }

    // Ambil data produk saat ini
    const produk = await fetchAPI(`${API_BASE}/${id}`);
    if (!produk) {
        if(window.tampilkanToast) window.tampilkanToast('Gagal mengambil data produk!', 'error');
        return;
    }

    // Isi otomatis form
    document.getElementById('nama').value = produk.nama || '';
    document.getElementById('harga').value = produk.harga || '';
    document.getElementById('kategori').value = produk.kategori || 'Dekorasi';
    document.getElementById('kegunaan').value = produk.kegunaan || 'Rumah';
    document.getElementById('dimensi').value = produk.dimensi || '';
    document.getElementById('finishing').value = produk.finishing || '';
    document.getElementById('model3d').value = produk.model3d || '';
    document.getElementById('link_tokopedia').value = produk.link_tokopedia || '';
    document.getElementById('deskripsi').value = produk.deskripsi || '';

    // Handle submit update
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('form-pesan');
        msg.innerText = 'Menyimpan perubahan...';
        msg.style.color = 'black';

        const formData = new FormData();
        formData.append('nama', document.getElementById('nama').value);
        formData.append('harga', parseInt(document.getElementById('harga').value) || 0);
        formData.append('kategori', document.getElementById('kategori').value);
        formData.append('kegunaan', document.getElementById('kegunaan').value);
        formData.append('dimensi', document.getElementById('dimensi').value);
        formData.append('finishing', document.getElementById('finishing').value);
        formData.append('model3d', document.getElementById('model3d').value);
        formData.append('link_tokopedia', document.getElementById('link_tokopedia').value);
        formData.append('deskripsi', document.getElementById('deskripsi').value);

        const gambarInput = document.getElementById('gambar');
        if (gambarInput.files.length > 0) {
            for (let i = 0; i < gambarInput.files.length; i++) {
                formData.append('gambar', gambarInput.files[i]);
            }
        }

        try {
            let token = '';
            if (typeof supabase !== 'undefined') {
                const { data: { session } } = await supabase.auth.getSession();
                token = session ? session.access_token : '';
            }

            const response = await fetch(`${API_BASE}/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Gagal menyimpan perubahan');

            msg.innerText = 'Perubahan berhasil disimpan! Mengalihkan...';
            msg.style.color = 'green';
            setTimeout(() => {
                window.location.href = 'kelola.html';
            }, 1000);
        } catch (err) {
            msg.innerText = 'Terjadi kesalahan: ' + err.message;
            msg.style.color = 'red';
        }
    });
}

// 8. Fungsi Slider Gambar
window.ubahSlider = function (arah) {
    const slider = document.getElementById('product-slider');
    if (!slider) return;

    let images;
    try {
        images = JSON.parse(slider.getAttribute('data-images'));
    } catch (e) {
        return;
    }

    let currentIndex = parseInt(slider.getAttribute('data-index'));
    currentIndex += arah;

    if (currentIndex < 0) currentIndex = images.length - 1;
    if (currentIndex >= images.length) currentIndex = 0;

    setSlider(currentIndex);
}

window.setSlider = function (index) {
    const slider = document.getElementById('product-slider');
    if (!slider) return;

    let images;
    try {
        images = JSON.parse(slider.getAttribute('data-images'));
    } catch (e) {
        return;
    }

    slider.setAttribute('data-index', index);
    document.getElementById('main-product-img').src = images[index];

    document.querySelectorAll('.thumbnail-img').forEach(t => t.classList.remove('active'));
    const activeThumb = document.getElementById('thumb-' + index);
    if (activeThumb) activeThumb.classList.add('active');
}

// Routing sederhana saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    muatHeroKatalog();
    muatBeranda();
    muatKatalog();
    muatDetail();
    muatKelola();
    muatTambahProduk();
    muatEditProduk();

    // Muat komponen terpisah
    muatHeader();
    muatFooter();

    // Inisialisasi animasi interaktif
    initScrollAnimation();
});

// 9. Fungsi Muat Komponen Footer
async function muatFooter() {
    const placeholder = document.getElementById('footer-placeholder');
    if (!placeholder) return;

    try {
        const response = await fetch('footer.html');
        if (response.ok) {
            const html = await response.text();
            placeholder.innerHTML = html;
        }
    } catch (e) {
        console.error("Gagal memuat footer:", e);
    }
}

// 10. Fungsi Muat Komponen Header
async function muatHeader() {
    const placeholder = document.getElementById('header-placeholder');
    if (!placeholder) return;

    try {
        const response = await fetch('header.html');
        if (response.ok) {
            const html = await response.text();
            placeholder.innerHTML = html;

            // Set active class on navbar links
            let currentPage = window.location.pathname.split('/').pop() || 'index.html';
            const links = placeholder.querySelectorAll('.nav-links a');
            links.forEach(link => {
                if (link.getAttribute('href') === currentPage) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });

            // Tampilkan menu admin jika berada di halaman admin
            const adminPages = ['kelola.html', 'tambah-produk.html', 'edit-produk.html'];
            if (adminPages.includes(currentPage)) {
                const navAuth = placeholder.querySelector('.nav-auth');
                if (navAuth) {
                    navAuth.innerHTML = `
                        <a href="kelola.html" class="active">Admin</a>
                        <a href="#" id="headerBtnLogout" class="btn-logout-header">Keluar</a>
                    `;
                    
                    const headerBtnLogout = document.getElementById('headerBtnLogout');
                    if (headerBtnLogout && typeof supabase !== 'undefined') {
                        headerBtnLogout.addEventListener('click', async (e) => {
                            e.preventDefault();
                            await supabase.auth.signOut();
                            window.location.href = 'index.html';
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.error("Gagal memuat header:", e);
    }
}

// ==========================================
// FITUR INTERAKTIF (TOAST & ANIMASI)
// ==========================================

window.tampilkanToast = function(pesan, tipe = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipe}`;
    
    // Icon based on type
    let icon = 'ℹ️';
    if (tipe === 'success') icon = '✅';
    if (tipe === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${pesan}</span>`;
    container.appendChild(toast);

    // Hilangkan toast setelah 3 detik
    setTimeout(() => {
        toast.classList.add('toast-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

function initScrollAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    const setupElements = () => {
        const elements = document.querySelectorAll('.card:not(.animate-on-scroll), .hero-katalog-item:not(.animate-on-scroll), .admin-item:not(.animate-on-scroll), .hero-text:not(.animate-on-scroll), .tentang-content:not(.animate-on-scroll)');
        elements.forEach(el => {
            el.classList.add('animate-on-scroll');
            observer.observe(el);
        });
    };

    // Run initially
    setupElements();

    // Observe DOM mutations to automatically animate newly added dynamic content
    const mutationObserver = new MutationObserver(() => {
        setupElements();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
}