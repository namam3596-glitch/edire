const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin Password Constant
const ADMIN_PASSWORD = '#233038@MAN#';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS, and uploads) from the root directory
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer for product image uploads
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

// API Endpoint: Get all products
app.get('/api/products', (req, res) => {
    fs.readFile(productsFile, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read products' });
        }
        try {
            const products = JSON.parse(data || '[]');
            res.json(products);
        } catch (parseErr) {
            res.json([]);
        }
    });
});

// API Endpoint: Add a new product (Protected with Password Check)
app.post('/api/products', upload.single('image'), (req, res) => {
    const providedPassword = req.body.password || req.headers['x-admin-password'];

    if (providedPassword !== ADMIN_PASSWORD) {
        return res.status(403).json({ error: 'Unauthorized: Incorrect admin password' });
    }

    fs.readFile(productsFile, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read products' });
        }
        
        let products = [];
        try {
            products = JSON.parse(data || '[]');
        } catch (e) {
            products = [];
        }
        
        const newProduct = {
            id: Date.now(),
            title: req.body.title || 'Untitled',
            price: req.body.price || '0',
            category: req.body.category || 'General',
            sellerPhone: req.body.sellerPhone || '',
            displayOrder: parseInt(req.body.displayOrder) || 0,
            imageUrl: req.file ? `/uploads/${req.file.filename}` : (req.body.imageUrl || '')
        };

        products.push(newProduct);

        fs.writeFile(productsFile, JSON.stringify(products, null, 2), (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ error: 'Failed to save product' });
            }
            res.json({ success: true, product: newProduct });
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`E-Dire server running smoothly on port ${PORT}`);
});
  
 
