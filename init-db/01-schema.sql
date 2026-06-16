-- Demo e-commerce database for MySQL DBRE Copilot
CREATE DATABASE IF NOT EXISTS demo;
USE demo;

-- Products table
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Customers table
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  phone VARCHAR(20),
  city VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders table
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'shipped', 'delivered', 'returned') DEFAULT 'pending',
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  INDEX idx_customer (customer_id),
  INDEX idx_status (status),
  INDEX idx_order_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order items table
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_order (order_id),
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample data
INSERT INTO products (name, category, price, stock_quantity) VALUES
('iPhone 15 Pro', 'Electronics', 999.99, 150),
('MacBook Air M3', 'Electronics', 1299.99, 80),
('AirPods Pro 2', 'Electronics', 249.99, 300),
('Nike Air Max', 'Shoes', 159.99, 200),
('Adidas Ultraboost', 'Shoes', 179.99, 120),
('Levi''s 501 Jeans', 'Clothing', 69.99, 500),
('North Face Jacket', 'Clothing', 249.99, 90),
('Sony WH-1000XM5', 'Electronics', 349.99, 175),
('iPad Air', 'Electronics', 599.99, 110),
('Samsung Galaxy S24', 'Electronics', 899.99, 130),
('Dyson V15', 'Home', 749.99, 60),
('Instant Pot', 'Home', 89.99, 400),
('Kindle Paperwhite', 'Electronics', 139.99, 250),
('Bose QC Ultra', 'Electronics', 429.99, 85),
('Columbia Hiking Boots', 'Shoes', 129.99, 160);

INSERT INTO customers (name, email, phone, city) VALUES
('Alice Johnson', 'alice@example.com', '555-0101', 'New York'),
('Bob Smith', 'bob@example.com', '555-0102', 'Los Angeles'),
('Carol Williams', 'carol@example.com', '555-0103', 'Chicago'),
('David Brown', 'david@example.com', '555-0104', 'Houston'),
('Eva Martinez', 'eva@example.com', '555-0105', 'Phoenix'),
('Frank Garcia', 'frank@example.com', '555-0106', 'New York'),
('Grace Lee', 'grace@example.com', '555-0107', 'San Francisco'),
('Henry Wilson', 'henry@example.com', '555-0108', 'Seattle'),
('Iris Taylor', 'iris@example.com', '555-0109', 'Boston'),
('Jack Anderson', 'jack@example.com', '555-0110', 'Denver');

INSERT INTO orders (customer_id, total_amount, status, order_date) VALUES
(1, 1249.98, 'delivered', '2025-05-01 10:00:00'),
(2, 999.99, 'delivered', '2025-05-03 14:30:00'),
(3, 429.98, 'shipped', '2025-05-10 09:15:00'),
(4, 1549.98, 'delivered', '2025-05-12 16:45:00'),
(5, 249.99, 'returned', '2025-05-15 11:20:00'),
(1, 349.99, 'delivered', '2025-05-18 08:30:00'),
(6, 899.99, 'shipped', '2025-05-20 13:00:00'),
(7, 1299.99, 'delivered', '2025-05-22 10:45:00'),
(8, 159.99, 'pending', '2025-05-25 15:30:00'),
(3, 749.99, 'delivered', '2025-05-28 09:00:00'),
(2, 139.99, 'delivered', '2025-06-01 12:00:00'),
(9, 1199.98, 'shipped', '2025-06-03 14:15:00'),
(10, 429.99, 'pending', '2025-06-05 10:30:00'),
(4, 249.99, 'delivered', '2025-06-08 16:00:00'),
(5, 599.99, 'shipped', '2025-06-10 11:45:00');

INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 1, 999.99),
(1, 3, 1, 249.99),
(2, 1, 1, 999.99),
(3, 3, 1, 249.99),
(3, 5, 1, 179.99),
(4, 2, 1, 1299.99),
(4, 3, 1, 249.99),
(5, 3, 1, 249.99),
(6, 8, 1, 349.99),
(7, 10, 1, 899.99),
(8, 2, 1, 1299.99),
(9, 4, 1, 159.99),
(10, 11, 1, 749.99),
(11, 13, 1, 139.99),
(12, 1, 1, 999.99),
(12, 9, 1, 599.99),
(13, 14, 1, 429.99),
(14, 3, 1, 249.99),
(15, 9, 1, 599.99);
