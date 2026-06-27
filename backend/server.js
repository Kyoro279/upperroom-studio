require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Menyajikan file statis frontend (HTML, CSS, JS) di root URL (/)
app.use(express.static(path.join(__dirname, '../frontend')));

// KUNCI AKSES SUPABASE (Akan kita isi bareng di langkah berikutnya)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Setup Multer Storage
const uploadDir = path.join(__dirname, '../frontend/assets/uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage: storage });

// API Endpoint untuk mengambil semua produk dari database Supabase
app.get('/api/produk', async (req, res) => {
    try {
        const { data, error } = await supabase.from('produk').select('*');
        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil data database', error: error.message });
    }
});

// API Endpoint untuk mengambil satu produk berdasarkan ID
app.get('/api/produk/:id', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('produk')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengambil detail produk', error: error.message });
    }
});

// API Endpoint untuk MENAMBAH produk baru (termasuk upload multiple gambar)
app.post('/api/produk', upload.array('gambar', 5), async (req, res) => {
    try {
        const payload = { ...req.body };

        // Jika ada banyak file yang diupload, kita kumpulkan jalurnya menjadi array
        if (req.files && req.files.length > 0) {
            payload.gambar_url = req.files.map(file => 'assets/uploads/' + file.filename);
        }

        const { data, error } = await supabase
            .from('produk')
            .insert([payload])
            .select();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ message: 'Gagal menambah produk', error: error.message });
    }
});
// API Endpoint untuk UPDATE produk (termasuk update gambar)
app.put('/api/produk/:id', upload.array('gambar', 5), async (req, res) => {
    try {
        const payload = { ...req.body };

        // Jika ada banyak file baru yang diupload, kita update array gambar_url-nya
        // Jika tidak ada gambar baru, kita biarkan data gambar lama (tidak dimasukkan ke payload)
        if (req.files && req.files.length > 0) {
            payload.gambar_url = req.files.map(file => 'assets/uploads/' + file.filename);
        }

        const { data, error } = await supabase
            .from('produk')
            .update(payload)
            .eq('id', req.params.id)
            .select();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Gagal mengubah produk', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server Express berjalan lancar di http://localhost:${PORT}`);
});