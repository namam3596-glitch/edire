const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD = '#233038@MAN#';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from root directory
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer for up to 4 product image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Ensure products.json exists
const productsFile = path.join(__dirname, 'products.json');
if (!fs.existsSync(productsFile)) {
    fs.writeFileSync(productsFile, JSON.stringify([]));
}

// Explicit routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Admin Login Endpoint
app.post('/api/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Incorrect password' });
    }
});

// API Endpoint: Get all products (sorted by display order ascending)
app.get('/api/products', (req, res) => {
    fs.readFile(productsFile, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read products' });
        }
        try {
            const products = JSON.parse(data || '[]');
            products.sort((a, b) => (parseInt(a.displayOrder) || 0) - (parseInt(b.displayOrder) || 0));
            res.json(products);
        } catch (parseErr) {
            res.json([]);
        }
    });
});

// API Endpoint: Add a new product (Up to 4 images)
app.post('/api/products', upload.array('productImages', 4), (req, res) => {
    const password = req.headers['admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(403).json({ success: false, message: 'Unauthorized: Incorrect admin password' });
    }

    fs.readFile(productsFile, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to read products' });
        }
        
        let products = [];
        try {
            products = JSON.parse(data || '[]');
        } catch (e) {
            products = [];
        }
        
        const imageUrls = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const newProduct = {
            id: Date.now(),
            name: req.body.name || 'Untitled',
            price: req.body.price || '0',
            category: req.body.category || 'General',
            phone: req.body.phone || '',
            description: req.body.description || '',
            displayOrder: parseInt(req.body.displayOrder) || 0,
            imageUrls: imageUrls
        };

        products.push(newProduct);

        fs.writeFile(productsFile, JSON.stringify(products, null, 2), (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ success: false, message: 'Failed to save product' });
            }
            res.json({ success: true, message: 'Product added successfully!', product: newProduct });
        });
    });
});

// API Endpoint: Update product description (Protected)
app.put('/api/products/:id', (req, res) => {
    const password = req.headers['admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const productId = Number(req.params.id);
    const { description } = req.body;

    fs.readFile(productsFile, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to read products' });

        let products = JSON.parse(data || '[]');
        const product = products.find(p => p.id === productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        product.description = description;

        fs.writeFile(productsFile, JSON.stringify(products, null, 2), (writeErr) => {
            if (writeErr) return res.status(500).json({ success: false, message: 'Failed to save update' });
            res.json({ success: true, message: 'Product updated successfully!' });
        });
    });
});

// API Endpoint: Delete product (Protected)
app.delete('/api/products/:id', (req, res) => {
    const password = req.headers['admin-password'];
    if (password !== ADMIN_PASSWORD) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const productId = Number(req.params.id);

    fs.readFile(productsFile, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ success: false, message: 'Failed to read products' });

        let products = JSON.parse(data || '[]');
        const filteredProducts = products.filter(p => p.id !== productId);

        fs.writeFile(productsFile, JSON.stringify(filteredProducts, null, 2), (writeErr) => {
            if (writeErr) return res.status(500).json({ success: false, message: 'Failed to delete product' });
            res.json({ success: true, message: 'Product deleted successfully!' });
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`E-Dire server running on port ${PORT}`);
});
