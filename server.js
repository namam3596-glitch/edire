const express = require('express');
const multer = require('multer'); 
const cors = require('cors'); 
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = "#233830@MAN#";

app.use(cors()); 
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const DATA_FILE = path.join(__dirname, 'products.json');

function loadProducts() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
    return [];
  }
  try {
    const products = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    // Sort products by sortOrder ascending (lowest number first)
    return products.sort((a, b) => (a.sortOrder || 100) - (b.sortOrder || 100));
  } catch {
    return [];
  }
}

function saveProducts(products) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

app.get('/api/products', (req, res) => {
  res.json(loadProducts());
});

app.get('/api/products/:id', (req, res) => {
  const products = loadProducts();
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (product) res.json(product);
  else res.status(404).json({ message: 'Product not found.' });
});

app.post('/api/admin-login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, message: 'Login successful!' });
  } else {
    res.status(401).json({ success: false, message: 'Incorrect password.' });
  }
});

// Upload Product with Custom Display Order
app.post('/api/products', upload.array('productImages', 3), (req, res) => {
  if (req.headers['admin-password'] !== ADMIN_PASSWORD) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const products = loadProducts();
  const imageUrls = req.files ? req.files.map(file => `http://localhost:3000/uploads/${file.filename}`) : [];

  let category = req.body.category;
  if (!category || category.trim() === '') {
    const text = (req.body.name + ' ' + (req.body.description || '')).toLowerCase();
    if (text.includes('laptop') || text.includes('macbook')) category = 'Laptops';
    else if (text.includes('phone') || text.includes('iphone')) category = 'Smartphones';
    else if (text.includes('men') || text.includes('male')) category = 'Clothing (Male)';
    else if (text.includes('women') || text.includes('female') || text.includes('dress')) category = 'Clothing (Female)';
    else if (text.includes('home') || text.includes('furniture') || text.includes('chair')) category = 'Home Goods';
    else category = 'Electronics';
  }

  const newProduct = {
    id: Date.now(), 
    name: req.body.name, 
    description: req.body.description || '', 
    price: req.body.price || 'Contact for Price',
    phone: req.body.phone || 'Not Provided',
    sortOrder: req.body.sortOrder ? parseInt(req.body.sortOrder) : 0, // Custom placement priority
    category,
    imageUrls
  };
  
  products.push(newProduct); 
  saveProducts(products);
  
  res.json({ message: 'Product uploaded successfully!', product: newProduct });
});

// Edit / Update Product (Description, Price, Phone, or Display Order)
app.put('/api/products/:id', (req, res) => {
  if (req.headers['admin-password'] !== ADMIN_PASSWORD) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  let products = loadProducts();
  const productId = parseInt(req.params.id);
  const product = products.find(p => p.id === productId);
  
  if (!product) return res.status(404).json({ message: 'Product not found.' });

  if (req.body.description !== undefined) product.description = req.body.description;
  if (req.body.price) product.price = req.body.price;
  if (req.body.phone) product.phone = req.body.phone;
  if (req.body.sortOrder !== undefined) product.sortOrder = parseInt(req.body.sortOrder);

  saveProducts(products);
  res.json({ message: 'Product updated successfully!', product });
});

app.delete('/api/products/:id', (req, res) => {
  if (req.headers['admin-password'] !== ADMIN_PASSWORD) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  let products = loadProducts();
  const productId = parseInt(req.params.id);
  const index = products.findIndex(p => p.id === productId);
  
  if (index !== -1) {
    products.splice(index, 1);
    saveProducts(products);
    res.json({ message: 'Product deleted successfully!' });
  } else {
    res.status(404).json({ message: 'Product not found.' });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));